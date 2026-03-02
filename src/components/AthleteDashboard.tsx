import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { User, Trophy, Calendar, MapPin, Scale, Award, Camera, Edit3, CheckCircle, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getAutomaticCategorization } from '../services/categorization';
import { AthleteProfile, Evento, UserProfile, Inscricao } from '../types';
import { supabase } from '../services/supabase';
import AthleteProfileForm from './AthleteProfileForm';

export default function AthleteDashboard({ onPhotoUpdate }: { onPhotoUpdate?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [athleteData, setAthleteData] = useState<AthleteProfile | null>(null);
  const [signedPhotoUrl, setSignedPhotoUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [championships, setChampionships] = useState<Evento[]>([]);
  const [registrations, setRegistrations] = useState<Inscricao[]>([]);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [stats, setStats] = useState({
    competitiveAge: 0,
    ageCategory: '',
    weightCategory: '',
    fullCategory: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Fetch User Profile
      const { data: userProfile } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      setProfile(userProfile);

      // 2. Fetch Athlete Specific Data
      const { data: athlete } = await supabase
        .from('atletas')
        .select('*')
        .eq('usuario_id', session.user.id)
        .single();
      
      if (athlete) {
        setAthleteData(athlete);
        const result = getAutomaticCategorization(athlete.data_nascimento, athlete.genero, athlete.peso_kg);
        setStats(result);

        // Fetch Signed URL if photo exists
        if (athlete.foto_url) {
          const { data: signedData } = await supabase.storage
            .from('atletas-perfil')
            .createSignedUrl(athlete.foto_url, 3600);
          
          if (signedData) {
            setSignedPhotoUrl(`${signedData.signedUrl}&t=${Date.now()}`);
          }
        }
      }

      // 3. Fetch Championships
      const { data: champs } = await supabase
        .from('eventos')
        .select('*')
        .eq('status', 'aberto')
        .order('data', { ascending: true });
      
      setChampionships(champs || []);

      // 4. Fetch My Registrations
      const { data: regs } = await supabase
        .from('inscricoes')
        .select('*, eventos(*)')
        .eq('atleta_id', session.user.id);
      
      setRegistrations(regs || []);

    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // 1. Validação de Tipo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Formato inválido. Use JPG, PNG ou WebP.');
      return;
    }

    // 2. Validação de Tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB.');
      return;
    }

    // 3. Gerar Preview Local
    setPreviewFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const cancelPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewFile(null);
    setPreviewUrl(null);
  };

  const handleImageUpload = async () => {
    if (!previewFile) return;

    try {
      setUploading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada. Faça login novamente.');

      // Estrutura: {user_id}/foto-perfil.jpg
      const filePath = `${session.user.id}/foto-perfil.jpg`;

      // 1. Upload para o Storage (Bucket Privado)
      const { error: uploadError } = await supabase.storage
        .from('atletas-perfil')
        .upload(filePath, previewFile, {
          upsert: true,
          contentType: previewFile.type
        });

      if (uploadError) {
        if (uploadError.message.includes('bucket not found')) {
          throw new Error('Erro de configuração: O bucket "atletas-perfil" não existe.');
        }
        throw uploadError;
      }

      // 2. Gerar Signed URL imediata
      const { data: signedData, error: signedError } = await supabase.storage
        .from('atletas-perfil')
        .createSignedUrl(filePath, 3600);

      if (signedError) throw signedError;

      // 3. Atualizar tabela de atletas
      const { error: updateError } = await supabase
        .from('atletas')
        .update({ foto_url: filePath })
        .eq('usuario_id', session.user.id);

      if (updateError) throw updateError;

      // 4. Limpar preview e atualizar estados
      setSignedPhotoUrl(`${signedData.signedUrl}&t=${Date.now()}`);
      setAthleteData(prev => prev ? { ...prev, foto_url: filePath } : null);
      cancelPreview();
      
      // Notify parent to update header
      if (onPhotoUpdate) onPhotoUpdate();
      
    } catch (err: any) {
      console.error('Erro no upload:', err);
      alert(err.message || 'Erro ao atualizar foto de perfil.');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-bjj-blue" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Profile Card */}
        <div className="w-full md:w-80 space-y-6">
          <div className="card-surface p-6 flex flex-col items-center text-center">
            <div className="relative group">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
              />
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-bjj-blue p-1 mb-4 relative">
                {uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10 rounded-full">
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  </div>
                )}
                <img 
                  src={previewUrl || signedPhotoUrl || `https://picsum.photos/seed/${profile?.id}/200/200`} 
                  className="w-full h-full rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              {previewUrl ? (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                  <button 
                    onClick={handleImageUpload}
                    disabled={uploading}
                    className="p-2 bg-emerald-500 text-white rounded-full shadow-lg hover:bg-emerald-600 transition-colors"
                    title="Salvar Foto"
                  >
                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  </button>
                  <button 
                    onClick={cancelPreview}
                    disabled={uploading}
                    className="p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                    title="Cancelar"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleImageClick}
                  disabled={uploading}
                  className="absolute bottom-4 right-0 p-2 bg-bjj-blue text-white rounded-full shadow-lg hover:scale-110 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Camera size={16} />
                </button>
              )}
            </div>
            <h2 className="text-2xl font-black font-display text-[var(--text-main)]">{athleteData?.nome_completo || profile?.nome}</h2>
            <p className="text-bjj-blue font-bold uppercase text-xs tracking-widest mt-1">Atleta Competidor</p>
            
            <div className="w-full h-[1px] bg-[var(--border-ui)] my-6" />
            
            <div className="w-full space-y-4 text-left">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[var(--text-muted)] font-bold uppercase">Faixa</span>
                <span className="px-3 py-1 bg-blue-600 text-white text-xs font-black rounded uppercase">{athleteData?.graduacao || 'Branca'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[var(--text-muted)] font-bold uppercase">Peso</span>
                <span className="font-bold text-[var(--text-main)]">{athleteData?.peso_kg || 0} kg</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[var(--text-muted)] font-bold uppercase">Equipe</span>
                <span className="font-bold text-[var(--text-main)]">{athleteData?.equipe || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[var(--text-muted)] font-bold uppercase">Nascimento</span>
                <span className="font-bold text-[var(--text-main)]">
                  {athleteData?.data_nascimento ? new Date(athleteData.data_nascimento).toLocaleDateString('pt-BR') : '--/--/----'}
                </span>
              </div>
            </div>

            <button 
              onClick={() => setIsEditingProfile(true)}
              className="btn-outline w-full mt-8 text-sm"
            >
              <Edit3 size={16} />
              Editar Perfil
            </button>
          </div>

          <div className="card-surface p-6 bg-bjj-blue text-white">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Award size={20} />
              Minha Categoria
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs opacity-70 font-bold uppercase">Idade Competitiva</p>
                <p className="text-2xl font-black">{stats.competitiveAge} Anos</p>
              </div>
              <div>
                <p className="text-xs opacity-70 font-bold uppercase">Divisão</p>
                <p className="text-xl font-bold">{stats.ageCategory || 'Não definida'}</p>
              </div>
              <div>
                <p className="text-xs opacity-70 font-bold uppercase">Peso</p>
                <p className="text-xl font-bold">{stats.weightCategory || 'Não definido'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-black font-display tracking-tight text-[var(--text-main)]">Campeonatos Disponíveis</h2>
          </div>

          <div className="grid gap-6">
            {championships.length > 0 ? (
              championships.map(champ => (
                <ChampionshipCard 
                  key={champ.id}
                  name={champ.nome} 
                  date={new Date(champ.data).toLocaleDateString('pt-BR')} 
                  location={champ.local}
                  status={champ.status === 'aberto' ? 'Inscrições Abertas' : 'Encerrado'}
                />
              ))
            ) : (
              <div className="card-surface p-12 text-center text-[var(--text-muted)]">
                Nenhum campeonato disponível no momento.
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-bold font-display text-[var(--text-main)]">Minhas Inscrições</h3>
            {registrations.length > 0 ? (
              registrations.map(reg => (
                <div key={reg.id} className="card-surface p-6 flex items-center justify-between border-l-4 border-emerald-500">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <CheckCircle size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-[var(--text-main)]">{(reg as any).eventos?.nome}</h4>
                      <p className="text-xs text-[var(--text-muted)]">
                        {reg.status_pagamento === 'pago' ? 'Inscrição Confirmada' : 'Pendente'} • {reg.faixa}
                      </p>
                    </div>
                  </div>
                  <button className="text-bjj-blue font-bold text-sm hover:underline">Ver Detalhes</button>
                </div>
              ))
            ) : (
              <div className="card-surface p-8 text-center text-[var(--text-muted)] text-sm italic">
                Você ainda não se inscreveu em nenhum campeonato.
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Profile Edit Modal */}
      <AnimatePresence>
        {isEditingProfile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto relative"
            >
              <button 
                onClick={() => setIsEditingProfile(false)}
                className="absolute top-4 right-4 p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] z-10"
              >
                <X size={24} />
              </button>
              <AthleteProfileForm 
                userId={profile?.id || ''} 
                onComplete={() => {
                  setIsEditingProfile(false);
                  fetchData();
                }} 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChampionshipCard({ name, date, location, status }: any) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="card-surface p-6 flex flex-col md:flex-row justify-between items-center gap-6 group"
    >
      <div className="flex items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-[var(--border-ui)] flex items-center justify-center text-bjj-blue group-hover:bg-bjj-blue group-hover:text-white transition-colors">
          <Trophy size={32} />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-black font-display text-[var(--text-main)]">{name}</h3>
          <div className="flex flex-wrap gap-4 text-sm text-[var(--text-muted)]">
            <span className="flex items-center gap-1"><Calendar size={16} /> {date}</span>
            <span className="flex items-center gap-1"><MapPin size={16} /> {location}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-3">
        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase rounded-full tracking-widest">
          {status}
        </span>
        <button className="btn-primary py-2 px-8 text-sm">Inscrever-se</button>
      </div>
    </motion.div>
  );
}
