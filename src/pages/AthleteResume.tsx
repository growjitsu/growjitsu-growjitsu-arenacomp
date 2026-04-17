import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Award, Trophy, Target, MapPin, Calendar, 
  Dumbbell, GraduationCap, Star, Share2, 
  FileText, Download, ArrowLeft, ExternalLink,
  Medal, History, TrendingUp, User
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { ArenaProfile, ArenaChampionshipResult, ArenaFight, Team, ArenaResult } from '../types';
import { getAthleteRankings, shareWhatsApp } from '../services/arenaService';
import { Toaster, toast } from 'sonner';

export const AthleteResume: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ArenaProfile | null>(null);
  const [championships, setChampionships] = useState<ArenaChampionshipResult[]>([]);
  const [fights, setFights] = useState<ArenaFight[]>([]);
  const [results, setResults] = useState<ArenaResult[]>([]);
  const [rankings, setRankings] = useState({ world: 0, national: 0, city: 0 });
  const [loading, setLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) throw profileError;
      setProfile(profileData);

      // Rankings
      const rankData = await getAthleteRankings(profileData);
      setRankings(rankData);

      // Championships
      const { data: champData } = await supabase
        .from('championship_results')
        .select('*')
        .eq('athlete_id', userId)
        .order('data_evento', { ascending: false });
      setChampionships(champData || []);

      // Fights
      const { data: fightsData } = await supabase
        .from('fights')
        .select('*')
        .eq('athlete_id', userId)
        .order('data_luta', { ascending: false });
      setFights(fightsData || []);

    } catch (err) {
      console.error('Error fetching resume data:', err);
      toast.error('Erro ao carregar currículo');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      // We'll call the server endpoint that uses puppeteer
      const response = await fetch(`/api/resume/pdf/${userId}`);
      if (!response.ok) throw new Error('Falha ao gerar PDF');
      
      const blob = await response.blob();
      console.log(`[PDF] Blob received. Size: ${blob.size} bytes`);

      if (blob.size === 0) {
        throw new Error('O arquivo PDF gerado está vazio.');
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Curriculo_${profile?.full_name.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF gerado com sucesso!');
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareWhatsApp = () => {
    const shareUrl = `${window.location.origin}/curriculo/${userId}`;
    const text = `Confira o meu currículo profissional de atleta na ArenaComp 🔥`;
    shareWhatsApp(shareUrl, text);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-black uppercase italic mb-4">Atleta não encontrado</h1>
        <button onClick={() => navigate(-1)} className="px-6 py-2 bg-[var(--primary)] text-white rounded-xl font-bold uppercase text-xs">Voltar</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-20">
      <Toaster position="top-center" theme="dark" />
      
      {/* Top Header / Actions */}
      <div className="sticky top-0 z-50 bg-[var(--bg)]/80 backdrop-blur-xl border-b border-[var(--border-ui)] px-6 py-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-[var(--text-muted)]">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleShareWhatsApp}
            className="p-2 px-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition-all flex items-center space-x-2"
          >
            <Share2 size={16} />
            <span className="hidden sm:inline">Compartilhar</span>
          </button>
          <button 
            onClick={handleGeneratePdf}
            disabled={isGeneratingPdf}
            className="p-2 px-4 bg-[var(--primary)] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[var(--primary-highlight)] transition-all flex items-center space-x-2 shadow-lg shadow-[var(--primary)]/20 disabled:opacity-50"
          >
            {isGeneratingPdf ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download size={16} />
            )}
            <span>{isGeneratingPdf ? 'Gerando...' : 'Gerar PDF'}</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8" id="resume-content">
        {/* Profile Card */}
        <div className="bg-[var(--surface)] border border-[var(--border-ui)] rounded-[3rem] overflow-hidden shadow-2xl">
          <div className="h-32 bg-[var(--primary)]/10 relative">
             <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--surface)]" />
          </div>
          <div className="px-8 pb-8 flex flex-col items-center -mt-16 relative">
            <div className="w-32 h-32 rounded-3xl bg-[var(--surface)] border-4 border-[var(--bg)] overflow-hidden shadow-2xl mb-6">
              <img 
                src={profile.profile_photo || profile.avatar_url || 'https://via.placeholder.com/150'} 
                alt="" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-black uppercase italic tracking-tighter text-[var(--text-main)]">{profile.full_name}</h1>
              <div className="flex items-center justify-center space-x-2 text-[var(--primary)] font-bold text-xs uppercase tracking-widest">
                <Target size={14} />
                <span>{profile.modality}</span>
                <span className="opacity-30">•</span>
                <GraduationCap size={14} />
                <span>{profile.graduation}</span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest mt-1">
                <MapPin size={12} />
                <span>{profile.city}, {profile.state}</span>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full mt-8">
              <div className="bg-[var(--bg)]/50 border border-[var(--border-ui)] p-4 rounded-2xl text-center space-y-1">
                <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Vitórias</p>
                <p className="text-xl font-black text-[var(--primary)] italic">{profile.wins}</p>
              </div>
              <div className="bg-[var(--bg)]/50 border border-[var(--border-ui)] p-4 rounded-2xl text-center space-y-1">
                <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Derrotas</p>
                <p className="text-xl font-black text-[var(--text-main)] italic opacity-50">{profile.losses}</p>
              </div>
              <div className="bg-[var(--bg)]/50 border border-[var(--border-ui)] p-4 rounded-2xl text-center space-y-1">
                <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Arena Score</p>
                <p className="text-xl font-black text-[var(--primary)] italic">{profile.arena_score}</p>
              </div>
              <div className="bg-[var(--bg)]/50 border border-[var(--border-ui)] p-4 rounded-2xl text-center space-y-1 sm:col-span-1">
                 <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Win Rate</p>
                <p className="text-xl font-black text-[var(--text-main)] italic">{Math.round(profile.win_rate || 0)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Team & Rankings Block */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Team Info */}
          <div className="bg-[var(--surface)] border border-[var(--border-ui)] p-8 rounded-[2.5rem] space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center text-[var(--primary)]">
                <Dumbbell size={24} />
              </div>
              <h2 className="text-lg font-black uppercase italic text-[var(--text-main)]">Equipe & Academia</h2>
            </div>
            <div className="space-y-4">
               <div>
                 <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Equipe Principal</p>
                 <p className="text-sm font-bold text-[var(--text-main)] uppercase tracking-tight">{profile.team || 'Não informado'}</p>
               </div>
               <div>
                 <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Academia / CT</p>
                 <p className="text-sm font-bold text-[var(--text-main)] uppercase tracking-tight">{profile.gym_name || 'Não informado'}</p>
               </div>
            </div>
          </div>

          {/* Rankings */}
          <div className="bg-[var(--surface)] border border-[var(--border-ui)] p-8 rounded-[2.5rem] space-y-6">
             <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
                <TrendingUp size={24} />
              </div>
              <h2 className="text-lg font-black uppercase italic text-[var(--text-main)]">Posição no Ranking</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
               <div className="text-center">
                 <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Mundo</p>
                 <p className="text-lg font-black text-amber-500 italic">#{rankings.world}</p>
               </div>
               <div className="text-center">
                 <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Nacional</p>
                 <p className="text-lg font-black text-amber-500 italic">#{rankings.national}</p>
               </div>
               <div className="text-center">
                 <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Cidade</p>
                 <p className="text-lg font-black text-amber-500 italic">#{rankings.city}</p>
               </div>
            </div>
          </div>
        </div>

        {/* Competition History */}
        <div className="bg-[var(--surface)] border border-[var(--border-ui)] p-8 rounded-[3rem] space-y-8">
           <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center text-[var(--primary)]">
              <Trophy size={24} />
            </div>
            <h2 className="text-xl font-black uppercase italic text-[var(--text-main)] tracking-tight">Histórico de Competições</h2>
          </div>

          <div className="space-y-6">
            {championships.length > 0 ? (
              championships.map((champ, idx) => (
                <div key={champ.id} className="relative pl-8 border-l-2 border-[var(--border-ui)] last:border-0 pb-6 last:pb-0">
                  <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-[var(--bg)] border-2 border-[var(--primary)] shadow-[0_0_8px_var(--primary)]" />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                       <h3 className="text-sm font-black uppercase tracking-tight text-[var(--text-main)]">{champ.championship_name}</h3>
                       <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                         champ.resultado === 'Campeão' ? 'bg-amber-500/20 text-amber-500' :
                         champ.resultado === 'Vice-campeão' ? 'bg-slate-400/20 text-slate-400' :
                         'bg-[var(--bg)] text-[var(--text-muted)]'
                       }`}>
                         {champ.resultado}
                       </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                       <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(champ.data_evento).toLocaleDateString()}</span>
                       <span className="flex items-center gap-1"><MapPin size={10} /> {champ.cidade}, {champ.pais}</span>
                       <span className="flex items-center gap-1"><Target size={10} /> {champ.modalidade}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-4 text-[var(--text-muted)] text-xs font-bold uppercase italic">Nenhum campeonato registrado no perfil.</p>
            )}
          </div>
        </div>

        {/* Fight Record Block */}
        <div className="bg-[var(--surface)] border border-[var(--border-ui)] p-8 rounded-[3rem] space-y-8">
           <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500">
                  <Medal size={24} />
                </div>
                <h2 className="text-xl font-black uppercase italic text-[var(--text-main)] tracking-tight">Registro de Combates (Fights)</h2>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Recorde Total</p>
                <p className="text-lg font-black text-rose-500 italic">{profile.wins}W - {profile.losses}L</p>
              </div>
           </div>

           <div className="grid sm:grid-cols-2 gap-4">
              {fights.slice(0, 8).map(fight => (
                <div key={fight.id} className="bg-[var(--bg)]/50 border border-[var(--border-ui)] p-4 rounded-2xl flex items-center justify-between group hover:border-[var(--primary)]/50 transition-all">
                   <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${fight.resultado === 'win' ? 'bg-green-500' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'}`} />
                      <div>
                        <p className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-tight">vs {fight.opponent_name}</p>
                        <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{fight.evento}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className={`text-[10px] font-black uppercase italic ${fight.resultado === 'win' ? 'text-green-500' : 'text-rose-500'}`}>
                        {fight.resultado === 'win' ? 'VITÓRIA' : 'DERROTA'}
                      </p>
                      <p className="text-[7px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{fight.tipo_vitoria}</p>
                   </div>
                </div>
              ))}
           </div>
           {fights.length > 8 && (
             <p className="text-center text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-4">+ {fights.length - 8} outros combates registrados</p>
           )}
        </div>

        {/* Footer Branding */}
        <div className="text-center space-y-2 py-8 opacity-50">
           <h2 className="text-xl font-black uppercase italic tracking-tighter text-[var(--text-muted)]">Arena Comp</h2>
           <p className="text-[8px] font-black uppercase tracking-[0.4em] text-[var(--text-muted)]">Athlete Management Protocol v2.0</p>
        </div>
      </div>
    </div>
  );
};
