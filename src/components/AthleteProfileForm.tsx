import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Calendar, Weight, Users, ShieldCheck, ExternalLink, AlertCircle, Save, Loader2, VenusAndMars, Award, Camera, Upload } from 'lucide-react';
import { supabase } from '../services/supabase';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { AthleteProfile, Belt, Gender, Equipe } from '../types';
import { getAutomaticCategorization } from '../services/categorization';

interface AthleteProfileFormProps {
  userId: string;
  onComplete: () => void;
}

const BELTS: Belt[] = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];

export default function AthleteProfileForm({ userId, onComplete }: AthleteProfileFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<Equipe[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [profile, setProfile] = useState<Partial<AthleteProfile>>({
    usuario_id: userId,
    nome_completo: '',
    genero: 'Masculino',
    graduacao: 'Branca',
    data_nascimento: '',
    peso_kg: 0,
    equipe: '',
    equipe_id: '',
    country_id: '',
    state_id: '',
    city_id: '',
    foto_perfil: '',
    perfil_completo: false
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  const [autoCategory, setAutoCategory] = useState({
    ageCategory: '',
    weightCategory: '',
    fullCategory: ''
  });

  useEffect(() => {
    if (profile.data_nascimento && profile.genero && profile.peso_kg > 0) {
      const result = getAutomaticCategorization(profile.data_nascimento, profile.genero, profile.peso_kg);
      setAutoCategory({
        ageCategory: result.ageCategory,
        weightCategory: result.weightCategory,
        fullCategory: result.fullCategory
      });
      
      console.log('[AUTO CATEGORY]', {
        weight: profile.peso_kg,
        gender: profile.genero,
        birthDate: profile.data_nascimento,
        category: result.fullCategory
      });
    }
  }, [profile.peso_kg, profile.genero, profile.data_nascimento]);

  useEffect(() => {
    fetchProfile();
    fetchTeams();
    fetchCountries();
  }, [userId]);

  const fetchCountries = async () => {
    const { data } = await supabase.from('countries').select('*').order('name');
    if (data) setCountries(data);
  };

  const fetchStates = async (countryId: string) => {
    const { data } = await supabase.from('states').select('*').eq('country_id', countryId).order('name');
    if (data) setStates(data);
    setCities([]);
  };

  const fetchCities = async (stateId: string) => {
    const { data } = await supabase.from('cities').select('*').eq('state_id', stateId).order('name');
    if (data) setCities(data);
  };

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setTeams(data || []);
    } catch (err) {
      console.error('Erro ao buscar equipes:', err);
    }
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('atletas')
        .select('*')
        .eq('usuario_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setProfile(data);
        if (data.foto_perfil) setPhotoPreview(data.foto_perfil);
        if (data.country_id) fetchStates(data.country_id);
        if (data.state_id) fetchCities(data.state_id);
      }
    } catch (err: any) {
      console.error('Erro ao buscar perfil do atleta:', err);
      setError('Não foi possível carregar os dados do perfil.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('A foto deve ter no máximo 2MB.');
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('profiles')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('profiles')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validações rigorosas
    if (!profile.nome_completo?.trim()) {
      setError('O Nome Completo é obrigatório.');
      return;
    }
    if (!profile.genero) {
      setError('O Gênero é obrigatório.');
      return;
    }
    if (!profile.data_nascimento) {
      setError('A Data de Nascimento é obrigatória.');
      return;
    }
    if (!profile.peso_kg || profile.peso_kg <= 0) {
      setError('O Peso deve ser um número positivo.');
      return;
    }
    if (!profile.equipe?.trim()) {
      setError('A Equipe é obrigatória.');
      return;
    }
    if (!profile.country_id || !profile.state_id || !profile.city_id) {
      setError('País, Estado e Cidade são obrigatórios.');
      return;
    }
    if (!photoPreview && !photoFile) {
      setError('A Foto de Perfil é obrigatória.');
      return;
    }

    setSaving(true);
    try {
      let foto_perfil = profile.foto_perfil;

      if (photoFile) {
        foto_perfil = await uploadPhoto(photoFile);
      }

      const payload = {
        ...profile,
        foto_perfil,
        categoria_idade: autoCategory.ageCategory,
        categoria_peso: autoCategory.weightCategory,
        usuario_id: userId,
        perfil_completo: true,
        atualizado_em: new Date().toISOString()
      };

      // 1. Salvar no Supabase (Atletas)
      const { error: upsertError } = await supabase
        .from('atletas')
        .upsert(payload);

      if (upsertError) throw upsertError;

      // 2. Salvar no Supabase (Profiles) para manter consistência
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          full_name: profile.nome_completo,
          genero: profile.genero,
          birth_date: profile.data_nascimento,
          weight: profile.peso_kg,
          team: profile.equipe,
          team_id: profile.equipe_id,
          country_id: profile.country_id,
          state_id: profile.state_id,
          city_id: profile.city_id,
          profile_photo: foto_perfil,
          perfil_completo: true
        })
        .eq('id', userId);

      if (profileUpdateError) throw profileUpdateError;
      
      // 3. Salvar no Firestore para validação de redirecionamento (ArenaComp Requirement)
      const firestorePayload = {
        uid: userId,
        modalidades: ['BJJ'], // Default para BJJ, pode ser expandido
        equipe: profile.equipe,
        genero: profile.genero,
        dataNascimento: profile.data_nascimento,
        graduacao: profile.graduacao,
        academia: profile.equipe, // Usando equipe como academia
        pais: (countries.find(c => c.id === profile.country_id))?.name || '',
        estado: (states.find(s => s.id === profile.state_id))?.name || '',
        cidade: (cities.find(c => c.id === profile.city_id))?.name || '',
        foto: foto_perfil
      };
      
      await setDoc(doc(db, "users", userId), firestorePayload);

      // 4. Pequeno delay para garantir que o banco processou (opcional mas seguro para RLS/Cache)
      await new Promise(resolve => setTimeout(resolve, 500));

      // 4. Notificar sucesso e disparar callback de conclusão
      onComplete();
    } catch (err: any) {
      console.error('Erro ao salvar perfil:', err);
      setError(err.message || 'Erro ao salvar os dados. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleSupportClick = () => {
    window.open('https://wa.me/5511961440548?text=Preciso%20corrigir%20meus%20dados%20cadastrais.', '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-bjj-blue" size={32} />
      </div>
    );
  }

  const isLocked = profile.perfil_completo;

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-surface p-8"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-bjj-blue/10 rounded-xl flex items-center justify-center text-bjj-blue">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[var(--text-main)]">
              {profile.perfil_completo ? 'Dados do Atleta' : 'Completar Perfil'}
            </h2>
            <p className="text-[var(--text-muted)] text-sm">
              {profile.perfil_completo 
                ? 'Mantenha seus dados de competição atualizados.' 
                : 'Precisamos de alguns dados obrigatórios para sua inscrição.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-sm">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Foto de Perfil */}
          <div className="flex flex-col items-center space-y-4 mb-8">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-bjj-blue/20 bg-white/5 flex items-center justify-center">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera size={40} className="text-gray-500" />
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="absolute bottom-0 right-0 w-10 h-10 bg-bjj-blue text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-blue-600 transition-all"
              >
                <Upload size={18} />
              </label>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Foto de Perfil Obrigatória</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nome Completo */}
            <div className="md:col-span-2">
              <label className="label-standard">
                Nome Completo (Igual ao Documento)
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                <input
                  type="text"
                  value={profile.nome_completo}
                  onChange={(e) => setProfile({ ...profile, nome_completo: e.target.value })}
                  disabled={isLocked}
                  className={`input-standard pl-12 ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                  placeholder="Seu nome oficial"
                />
              </div>
              {isLocked && (
                <p className="mt-2 text-[10px] text-amber-500 font-medium flex items-center gap-1">
                  <AlertCircle size={12} /> Campo bloqueado após a conclusão do perfil.
                </p>
              )}
            </div>

            {/* Gênero */}
            <div>
              <label className="label-standard">
                Sexo / Gênero <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <VenusAndMars className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                <select
                  required
                  value={profile.genero || ''}
                  onChange={(e) => setProfile({ ...profile, genero: e.target.value as Gender })}
                  className="input-standard pl-12"
                >
                  <option value="">Selecione o sexo</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                </select>
              </div>
            </div>

            {/* Data de Nascimento */}
            <div>
              <label className="label-standard">
                Data de Nascimento
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                <input
                  type="date"
                  value={profile.data_nascimento}
                  onChange={(e) => setProfile({ ...profile, data_nascimento: e.target.value })}
                  disabled={isLocked}
                  className={`input-standard pl-12 ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
              </div>
            </div>

            {/* Graduação */}
            <div>
              <label className="label-standard">
                Graduação (Faixa)
              </label>
              <select
                value={profile.graduacao}
                onChange={(e) => setProfile({ ...profile, graduacao: e.target.value })}
                className="input-standard"
              >
                {BELTS.map(belt => (
                  <option key={belt} value={belt}>{belt}</option>
                ))}
              </select>
            </div>

            {/* Peso */}
            <div>
              <label className="label-standard">
                Peso (kg) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Weight className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                <input
                  required
                  type="number"
                  step="0.1"
                  value={profile.peso_kg || ''}
                  onChange={(e) => setProfile({ ...profile, peso_kg: parseFloat(e.target.value) || 0 })}
                  className="input-standard pl-12"
                  placeholder="0.0"
                />
              </div>
            </div>

            {/* Categoria Automática */}
            <div className="md:col-span-2">
              <div className="p-4 bg-bjj-blue/5 border border-bjj-blue/20 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-bjj-blue/10 rounded-lg flex items-center justify-center text-bjj-blue">
                    <Award size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-bjj-blue">Categoria Identificada</p>
                    <p className="text-sm font-bold text-[var(--text-main)]">
                      {autoCategory.fullCategory || 'Preencha peso, sexo e nascimento'}
                    </p>
                  </div>
                </div>
                {autoCategory.fullCategory && (
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Confirmada</p>
                  </div>
                )}
              </div>
            </div>

            {/* Equipe */}
            <div className="md:col-span-2">
              <label className="label-standard">
                Equipe / Academia Oficial
              </label>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                <select
                  value={profile.equipe_id}
                  onChange={(e) => {
                    const team = teams.find(t => t.id === e.target.value);
                    setProfile({ 
                      ...profile, 
                      equipe_id: e.target.value,
                      equipe: team?.name || ''
                    });
                  }}
                  className="input-standard pl-12"
                >
                  <option value="">Selecione sua equipe...</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
              <p className="mt-2 text-[10px] text-[var(--text-muted)]">
                Se sua equipe não aparece, peça ao seu professor para cadastrá-la como Responsável.
              </p>
            </div>

            {/* Localização */}
            <div>
              <label className="label-standard">País <span className="text-red-500">*</span></label>
              <select
                value={profile.country_id || ''}
                onChange={(e) => {
                  const country = countries.find(c => c.id === e.target.value);
                  setProfile({ 
                    ...profile, 
                    country_id: e.target.value,
                    // @ts-ignore - backward compatibility
                    country: country?.name || ''
                  });
                  fetchStates(e.target.value);
                }}
                className="input-standard"
              >
                <option value="">Selecione o País</option>
                {countries.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-standard">Estado <span className="text-red-500">*</span></label>
              <select
                value={profile.state_id || ''}
                onChange={(e) => {
                  const state = states.find(s => s.id === e.target.value);
                  setProfile({ 
                    ...profile, 
                    state_id: e.target.value,
                    // @ts-ignore - backward compatibility
                    state: state?.name || ''
                  });
                  fetchCities(e.target.value);
                }}
                className="input-standard"
              >
                <option value="">Selecione o Estado</option>
                {states.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="label-standard">Cidade <span className="text-red-500">*</span></label>
              <select
                value={profile.city_id || ''}
                onChange={(e) => {
                  const city = cities.find(c => c.id === e.target.value);
                  setProfile({ 
                    ...profile, 
                    city_id: e.target.value,
                    // @ts-ignore - backward compatibility
                    city: city?.name || ''
                  });
                }}
                className="input-standard"
              >
                <option value="">Selecione a Cidade</option>
                {cities.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {isLocked && (
            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
              <p className="text-xs text-amber-500 leading-relaxed">
                Para corrigir <strong>Nome</strong> ou <strong>Data de Nascimento</strong>, entre em contato com o suporte.
              </p>
              <button
                type="button"
                onClick={handleSupportClick}
                className="mt-3 flex items-center gap-2 text-xs font-bold text-amber-500 hover:underline"
              >
                <ExternalLink size={14} /> Falar com Suporte
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-bjj-blue hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <Save size={20} />
                {profile.perfil_completo ? 'Salvar Alterações' : 'Concluir Perfil'}
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
