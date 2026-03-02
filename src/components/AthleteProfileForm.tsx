import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Calendar, Weight, Users, ShieldCheck, ExternalLink, AlertCircle, Save, Loader2, VenusAndMars } from 'lucide-react';
import { supabase } from '../services/supabase';
import { AthleteProfile, Belt, Gender, Equipe } from '../types';

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
  const [profile, setProfile] = useState<Partial<AthleteProfile>>({
    usuario_id: userId,
    nome_completo: '',
    genero: 'Masculino',
    graduacao: 'Branca',
    data_nascimento: '',
    peso_kg: 0,
    equipe: '',
    equipe_id: '',
    perfil_completo: false
  });

  useEffect(() => {
    fetchProfile();
    fetchTeams();
  }, [userId]);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('equipes')
        .select('*')
        .order('nome', { ascending: true });
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
      }
    } catch (err: any) {
      console.error('Erro ao buscar perfil do atleta:', err);
      setError('Não foi possível carregar os dados do perfil.');
    } finally {
      setLoading(false);
    }
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

    setSaving(true);
    try {
      const payload = {
        ...profile,
        usuario_id: userId,
        perfil_completo: true,
        atualizado_em: new Date().toISOString()
      };

      // 1. Salvar no Supabase
      const { error: upsertError } = await supabase
        .from('atletas')
        .upsert(payload);

      if (upsertError) throw upsertError;

      // 2. Pequeno delay para garantir que o banco processou (opcional mas seguro para RLS/Cache)
      await new Promise(resolve => setTimeout(resolve, 500));

      // 3. Notificar sucesso e disparar callback de conclusão
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nome Completo */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-2">
                Nome Completo (Igual ao Documento)
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                <input
                  type="text"
                  value={profile.nome_completo}
                  onChange={(e) => setProfile({ ...profile, nome_completo: e.target.value })}
                  disabled={isLocked}
                  className={`w-full bg-[var(--bg-app)] border border-[var(--border-ui)] rounded-xl py-3 pl-12 pr-4 text-[var(--text-main)] focus:border-bjj-blue outline-none transition-all ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
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
              <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-2">
                Gênero
              </label>
              <div className="relative">
                <VenusAndMars className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                <select
                  value={profile.genero}
                  onChange={(e) => setProfile({ ...profile, genero: e.target.value as Gender })}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-ui)] rounded-xl py-3 pl-12 pr-4 text-[var(--text-main)] focus:border-bjj-blue outline-none transition-all"
                >
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                </select>
              </div>
            </div>

            {/* Data de Nascimento */}
            <div>
              <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-2">
                Data de Nascimento
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                <input
                  type="date"
                  value={profile.data_nascimento}
                  onChange={(e) => setProfile({ ...profile, data_nascimento: e.target.value })}
                  disabled={isLocked}
                  className={`w-full bg-[var(--bg-app)] border border-[var(--border-ui)] rounded-xl py-3 pl-12 pr-4 text-[var(--text-main)] focus:border-bjj-blue outline-none transition-all ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
              </div>
            </div>

            {/* Graduação */}
            <div>
              <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-2">
                Graduação (Faixa)
              </label>
              <select
                value={profile.graduacao}
                onChange={(e) => setProfile({ ...profile, graduacao: e.target.value })}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-ui)] rounded-xl py-3 px-4 text-[var(--text-main)] focus:border-bjj-blue outline-none transition-all"
              >
                {BELTS.map(belt => (
                  <option key={belt} value={belt}>{belt}</option>
                ))}
              </select>
            </div>

            {/* Peso */}
            <div>
              <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-2">
                Peso (kg)
              </label>
              <div className="relative">
                <Weight className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                <input
                  type="number"
                  step="0.1"
                  value={profile.peso_kg || ''}
                  onChange={(e) => setProfile({ ...profile, peso_kg: parseFloat(e.target.value) })}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-ui)] rounded-xl py-3 pl-12 pr-4 text-[var(--text-main)] focus:border-bjj-blue outline-none transition-all"
                  placeholder="0.0"
                />
              </div>
            </div>

            {/* Equipe */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-2">
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
                      equipe: team?.nome || ''
                    });
                  }}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-ui)] rounded-xl py-3 pl-12 pr-4 text-[var(--text-main)] focus:border-bjj-blue outline-none transition-all"
                >
                  <option value="">Selecione sua equipe...</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.nome}</option>
                  ))}
                </select>
              </div>
              <p className="mt-2 text-[10px] text-[var(--text-muted)]">
                Se sua equipe não aparece, peça ao seu professor para cadastrá-la como Responsável.
              </p>
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
