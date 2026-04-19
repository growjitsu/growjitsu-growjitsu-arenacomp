import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Trophy, Clock, CheckCircle2, XCircle, ChevronDown, Send, Edit2, Trash2, Award } from 'lucide-react';
import { challengeService } from '../services/challengeService';
import { supabase } from '../services/supabase';
import { ArenaChallenge, ChallengeResult, ArenaProfile } from '../types';
import { toast } from 'sonner';

interface ChallengeSectionProps {
  userId: string;
  isOwnProfile: boolean;
}

export const ChallengeSection: React.FC<ChallengeSectionProps> = ({ userId, isOwnProfile }) => {
  const [challenges, setChallenges] = useState<ArenaChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'declined' | 'finished'>('all');

  const loadChallenges = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select(`
          *,
          challenger:profiles!challenges_challenger_id_fkey(*),
          challenged:profiles!challenges_challenged_id_fkey(*)
        `)
        .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setChallenges(data || []);
    } catch (err) {
      console.error('Error loading challenges:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChallenges();
  }, [userId]);

  const filteredChallenges = challenges.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'finished') return c.status === 'finished' || c.status === 'completed';
    return c.status === filter;
  });

  return (
    <div className="space-y-4 md:space-y-6 px-1 md:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[var(--primary)]/10 rounded-xl flex items-center justify-center text-[var(--primary)] shrink-0">
            <Target size={20} />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-black uppercase italic tracking-tighter text-[var(--text-main)]">Desafios 1x1</h3>
            <p className="text-[var(--text-muted)] text-[7px] md:text-[8px] font-bold uppercase tracking-widest leading-none">Gestão de confrontos diretos</p>
          </div>
        </div>
        
        {/* Responsive Tabs */}
        <div className="flex bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--border-ui)] overflow-x-auto no-scrollbar">
          {(['all', 'pending', 'accepted', 'declined', 'finished'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                filter === t 
                  ? 'bg-[var(--primary)] text-white shadow-lg' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {t === 'all' ? 'Todos' : 
               t === 'pending' ? 'Pendentes' : 
               t === 'accepted' ? 'Aceitos' : 
               t === 'declined' ? 'Recusados' : 'Finalizados'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="h-48 bg-[var(--surface-ui)]/30 rounded-[2rem] animate-pulse border border-[var(--border-ui)]" />
          ))}
        </div>
      ) : filteredChallenges.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-10">
          {filteredChallenges.map((challenge) => (
            <ChallengeCard 
              key={challenge.id} 
              challenge={challenge} 
              currentUserId={userId}
              isOwnProfile={isOwnProfile}
              onUpdate={loadChallenges} 
            />
          ))}
        </div>
      ) : (
        <div className="bg-[var(--surface-ui)]/30 rounded-[2.5rem] p-12 text-center border border-dashed border-[var(--border-ui)]">
          <Target size={48} className="mx-auto text-[var(--text-muted)]/20 mb-4" />
          <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest italic">Nenhum desafio encontrado nesta categoria</p>
        </div>
      )}
    </div>
  );
};

interface ChallengeCardProps {
  challenge: ArenaChallenge;
  currentUserId: string;
  isOwnProfile: boolean;
  onUpdate: () => void;
}

const ChallengeCard: React.FC<ChallengeCardProps> = ({ challenge, currentUserId, isOwnProfile, onUpdate }) => {
  const [showResultForm, setShowResultForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const isChallenger = currentUserId === challenge.challenger_id;
  const isChallenged = currentUserId === challenge.challenged_id;
  
  const opponent = isChallenger ? challenge.challenged : challenge.challenger;
  const userResult = isChallenger ? challenge.challenger_result : challenge.challenged_result;
  const hasSubmitted = !!userResult;

  const handleStatusUpdate = async (status: any) => {
    setLoading(true);
    try {
      await challengeService.updateChallengeStatus(challenge.id, status);
      toast.success(`Desafio ${status === 'accepted' ? 'aceito' : 'recusado'}!`);
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar desafio');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja excluir este desafio?')) return;
    setLoading(true);
    try {
      await challengeService.deleteChallenge(challenge.id);
      toast.success('Desafio excluído com sucesso');
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir desafio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      layout
      className="bg-[var(--surface)] border border-[var(--border-ui)] rounded-[2rem] overflow-hidden md:overflow-visible flex flex-col shadow-sm hover:shadow-xl hover:border-[var(--primary)]/30 transition-all group md:h-auto md:pb-3"
    >
      {/* Header Info */}
      <div className="p-4 md:p-8 flex items-start justify-between md:flex-col md:items-center md:text-center md:justify-center bg-[var(--surface-ui)]/30 border-b border-[var(--border-ui)] relative md:space-y-4 md:rounded-t-[2rem]">
        <div className="flex items-center space-x-3 md:space-x-0 md:flex-col md:space-y-3">
          <div className={`p-2 md:p-4 rounded-xl md:rounded-[1.5rem] transition-all ${
            challenge.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
            challenge.status === 'accepted' ? 'bg-indigo-500/10 text-indigo-500' :
            (challenge.status === 'finished' || challenge.status === 'completed') ? 'bg-emerald-500/10 text-emerald-500' :
            'bg-rose-500/10 text-rose-500'
          }`}>
            {challenge.status === 'pending' ? <Clock size={16} className="md:w-6 md:h-6" /> :
             challenge.status === 'accepted' ? <Target size={16} className="md:w-6 md:h-6" /> :
             (challenge.status === 'finished' || challenge.status === 'completed') ? <Trophy size={16} className="md:w-6 md:h-6" /> :
             <XCircle size={16} className="md:w-6 md:h-6" />}
          </div>
          <div>
            <span className="text-[8px] md:text-xs font-black uppercase tracking-[0.2em] text-[var(--text-muted)] block mb-0.5 md:mb-2">
              {challenge.challenge_type === 'category_absolute' ? 'Categoria + Absoluto' : 'Categoria'}
            </span>
            <h4 className="text-[10px] md:text-xl font-black uppercase italic tracking-tighter text-[var(--text-main)] line-clamp-2 md:max-w-none leading-tight">
              {challenge.event_name}
            </h4>
          </div>
        </div>

        {/* Action icons for creator */}
        {challenge.status === 'pending' && isChallenger && isOwnProfile && (
          <div className="flex items-center space-x-1 md:absolute md:top-4 md:right-4">
            <button onClick={handleDelete} className="p-2 md:p-3 hover:bg-rose-500/10 text-rose-500 rounded-lg md:rounded-xl transition-colors">
              <Trash2 size={14} className="md:w-5 md:h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Opponents Section */}
      <div className="p-6 md:p-10 flex items-center justify-between relative overflow-hidden flex-1 md:overflow-visible">
        <div className="flex flex-col items-center space-y-3 md:space-y-5 relative z-10 w-1/2">
           <div className="relative group/avatar">
             <img 
               src={challenge.challenger?.profile_photo || challenge.challenger?.avatar_url || 'https://via.placeholder.com/150'} 
               alt="" 
               className={`w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-full object-cover border-2 md:border-4 transition-transform group-hover/avatar:scale-105 ${challenge.winner_id === challenge.challenger_id ? 'border-emerald-500 shadow-xl shadow-emerald-500/20' : 'border-[var(--border-ui)]'}`}
             />
             {challenge.winner_id === challenge.challenger_id && (
               <div className="absolute -top-2 -right-2 md:-top-3 md:-right-3 bg-emerald-500 text-white p-1.5 md:p-2 rounded-full shadow-lg animate-bounce">
                 <Award size={10} className="md:w-4 md:h-4" />
               </div>
             )}
           </div>
           <div className="text-center w-full">
             <span className="text-[8px] md:text-sm font-black uppercase text-center truncate block w-full text-[var(--text-main)] max-sm:px-2">
               {challenge.challenger?.username}
             </span>
             <span className="text-[9px] md:text-sm font-black text-[var(--primary)] mt-0.5 md:mt-2 block bg-[var(--primary)]/10 md:py-1 md:px-3 md:rounded-full md:inline-block tracking-widest leading-none">{challenge.challenger_points || 0} PTS</span>
           </div>
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0">
          <Target size={120} strokeWidth={0.5} className="text-[var(--text-muted)]/10 md:w-56 md:h-56" />
        </div>
        <div className="text-[var(--text-muted)] font-black italic text-sm md:text-4xl z-10 md:mt-[-40px] drop-shadow-xl">VS</div>

        <div className="flex flex-col items-center space-y-3 md:space-y-5 relative z-10 w-1/2">
           <div className="relative group/avatar">
             <img 
               src={challenge.challenged?.profile_photo || challenge.challenged?.avatar_url || 'https://via.placeholder.com/150'} 
               alt="" 
               className={`w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-full object-cover border-2 md:border-4 transition-transform group-hover/avatar:scale-105 ${challenge.winner_id === challenge.challenged_id ? 'border-emerald-500 shadow-xl shadow-emerald-500/20' : 'border-[var(--border-ui)]'}`}
             />
             {challenge.winner_id === challenge.challenged_id && (
               <div className="absolute -top-2 -right-2 md:-top-3 md:-right-3 bg-emerald-500 text-white p-1.5 md:p-2 rounded-full shadow-lg animate-bounce">
                 <Award size={10} className="md:w-4 md:h-4" />
               </div>
             )}
           </div>
           <div className="text-center w-full">
             <span className="text-[8px] md:text-sm font-black uppercase text-center truncate block w-full text-[var(--text-main)] max-sm:px-2">
               {challenge.challenged?.username}
             </span>
             <span className="text-[9px] md:text-sm font-black text-[var(--primary)] mt-0.5 md:mt-2 block bg-[var(--primary)]/10 md:py-1 md:px-3 md:rounded-full md:inline-block tracking-widest leading-none">{challenge.challenged_points || 0} PTS</span>
           </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 md:p-8 bg-[var(--surface-ui)]/20 mt-auto border-t border-[var(--border-ui)] md:rounded-b-[2rem]">
        {challenge.status === 'pending' && isChallenged && isOwnProfile && (
          <div className="grid grid-cols-2 gap-3 md:gap-6">
            <button 
              onClick={() => handleStatusUpdate('accepted')}
              disabled={loading}
              className="py-2.5 md:py-5 bg-emerald-500 text-white rounded-xl md:rounded-2xl text-[10px] md:text-sm font-black uppercase shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-2"
            >
              <CheckCircle2 size={12} className="md:w-5 md:h-5" />
              <span>Aceitar</span>
            </button>
            <button 
              onClick={() => handleStatusUpdate('declined')}
              disabled={loading}
              className="py-2.5 md:py-5 bg-rose-500 text-white rounded-xl md:rounded-2xl text-[10px] md:text-sm font-black uppercase shadow-lg shadow-rose-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-2"
            >
              <XCircle size={12} className="md:w-5 md:h-5" />
              <span>Recusar</span>
            </button>
          </div>
        )}

        {challenge.status === 'accepted' && isOwnProfile && (
          <button 
            onClick={() => setShowResultForm(true)}
            disabled={hasSubmitted}
            className={`w-full py-3 md:py-6 rounded-2xl md:rounded-[2rem] text-[10px] md:text-sm font-black uppercase flex items-center justify-center space-x-2 transition-all ${
              hasSubmitted 
                ? 'bg-[var(--surface-ui)] text-[var(--text-muted)] cursor-not-allowed border border-[var(--border-ui)] opacity-70' 
                : 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20 hover:scale-[1.02] active:scale-95'
            }`}
          >
            {hasSubmitted ? (
               <><CheckCircle2 size={14} className="md:w-6 md:h-6" /> <span>Aguardando</span></>
            ) : (
               <><Trophy size={14} className="md:w-6 md:h-6" /> <span>Finalizar Desafio</span></>
            )}
          </button>
        )}

        {challenge.status === 'finished' && (
           <div className="text-center py-2 md:py-4">
             <p className="text-[8px] md:text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-0.5 md:mb-2">Encerrado em</p>
             <p className="text-[10px] md:text-lg font-bold text-[var(--text-main)] italic">{new Date(challenge.updated_at).toLocaleDateString()}</p>
           </div>
        )}

        {challenge.status === 'declined' && (
           <div className="text-center py-2 md:py-4">
             <p className="text-[10px] md:text-lg font-black text-rose-500 uppercase tracking-tighter italic">Desafio Recusado</p>
           </div>
        )}
      </div>

      {/* Result Submission Modal/Overlay */}
      <AnimatePresence>
        {showResultForm && (
          <ResultSubmissionForm 
            challenge={challenge} 
            onClose={() => setShowResultForm(false)} 
            onSubmit={async (result) => {
               setLoading(true);
               try {
                 await challengeService.submitResult(challenge.id, result);
                 toast.success('Resultado enviado! Aguarde o oponente.');
                 onUpdate();
                 setShowResultForm(false);
               } catch (err: any) {
                 toast.error(err.message || 'Erro ao enviar resultado');
               } finally {
                 setLoading(false);
               }
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ResultSubmissionForm: React.FC<{
  challenge: ArenaChallenge;
  onClose: () => void;
  onSubmit: (result: ChallengeResult) => void;
}> = ({ challenge, onClose, onSubmit }) => {
  const [step, setStep] = useState<'category' | 'absolute'>(
    challenge.challenge_type === 'category' ? 'category' : 'category'
  );
  const [categoryResult, setCategoryResult] = useState<ChallengeResult['category'] | null>(null);
  const [absoluteResult, setAbsoluteResult] = useState<ChallengeResult['absolute'] | null>(null);

  const placements = [
    { id: '1st', label: '1º Lugar', points: 100 },
    { id: '2nd', label: '2º Lugar', points: 50 },
    { id: '3rd', label: '3º Lugar', points: 25 },
    { id: 'none', label: 'Participação', points: 5 },
  ] as const;

  const isDual = challenge.challenge_type === 'category_absolute';

  const handleNext = () => {
    if (step === 'category') {
      if (!categoryResult) {
        toast.error('Por favor, selecione seu resultado na categoria.');
        return;
      }
      if (isDual) {
        setStep('absolute');
      } else {
        onSubmit({ category: categoryResult });
      }
    } else {
      if (!absoluteResult) {
        toast.error('Por favor, selecione seu resultado no absoluto.');
        return;
      }
      onSubmit({ category: categoryResult!, absolute: absoluteResult });
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-[var(--surface)] w-full max-w-sm rounded-[3rem] border border-[var(--border-ui)] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="p-6 md:p-8 border-b border-[var(--border-ui)] flex items-center justify-between bg-[var(--surface-ui)]/30">
           <div>
             <h3 className="text-sm md:text-base font-black uppercase italic tracking-tighter text-[var(--text-main)]">
               {isDual ? `Resultado (${step === 'category' ? 'Etapa 1/2' : 'Etapa 2/2'})` : 'Informar Resultado'}
             </h3>
             <p className="text-[8px] md:text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-0.5">
               {step === 'category' ? 'Pódio da sua Categoria' : 'Pódio da sua Absoluto'}
             </p>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-2xl transition-colors">
              <XCircle size={20} className="text-[var(--text-muted)] md:w-6 md:h-6" />
           </button>
        </div>

        <div className="p-8 md:p-10 space-y-8 max-h-[70vh] overflow-y-auto">
          {/* Progress dots for dual results */}
          {isDual && (
            <div className="flex items-center justify-center space-x-3 mb-2">
              <div className={`w-10 h-1.5 rounded-full transition-all duration-500 ${step === 'category' ? 'bg-[var(--primary)]' : 'bg-[var(--primary)]/30'}`} />
              <div className={`w-10 h-1.5 rounded-full transition-all duration-500 ${step === 'absolute' ? 'bg-[var(--primary)]' : 'bg-zinc-800'}`} />
            </div>
          )}

          <div className="space-y-6">
            <div className="flex items-center space-x-3">
               <div className="w-8 h-8 md:w-10 md:h-10 bg-[var(--primary)]/10 rounded-xl flex items-center justify-center text-[var(--primary)]">
                 {step === 'category' ? <Award size={18} /> : <Trophy size={18} />}
               </div>
               <div>
                 <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-[var(--text-main)] block">
                   {step === 'category' ? 'Categoria' : 'Absoluto'}
                 </span>
                 <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Qual foi seu pódio?</span>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {placements.map(p => {
                const isSelected = step === 'category' ? categoryResult === p.id : absoluteResult === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => step === 'category' ? setCategoryResult(p.id) : setAbsoluteResult(p.id)}
                    className={`py-4 px-4 rounded-[1.5rem] border-2 transition-all text-center flex flex-col items-center justify-center space-y-1 relative group ${
                      isSelected 
                        ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] shadow-lg shadow-[var(--primary)]/10' 
                        : 'border-[var(--border-ui)] bg-[var(--surface-ui)]/50 text-[var(--text-muted)] hover:border-[var(--text-main)]/30'
                    }`}
                  >
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-tight">{p.label}</span>
                    <span className="text-[8px] md:text-[9px] font-bold opacity-60 uppercase">{p.points} PTS</span>
                    {isSelected && (
                      <motion.div layoutId="selection" className="absolute -top-2 -right-2 bg-[var(--primary)] text-white p-1 rounded-full shadow-lg">
                        <CheckCircle2 size={12} />
                      </motion.div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 bg-[var(--surface-ui)]/30 border-t border-[var(--border-ui)]">
          <button
            onClick={handleNext}
            className="w-full py-4 md:py-5 bg-[var(--primary)] text-white rounded-2xl md:rounded-[2rem] font-black uppercase tracking-widest text-[10px] md:text-xs hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-3 shadow-xl shadow-[var(--primary)]/20"
          >
            {step === 'category' && isDual ? (
               <>
                 <span>Próximo: Absoluto</span>
                 <ChevronDown size={18} className="rotate-[-90deg]" />
               </>
            ) : (
               <>
                 <Send size={18} />
                 <span>Confirmar e Enviar</span>
               </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
