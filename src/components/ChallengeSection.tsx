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
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'finished'>('all');

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
    return c.status === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[var(--primary)]/10 rounded-xl flex items-center justify-center text-[var(--primary)]">
            <Target size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase italic tracking-tighter text-[var(--text-main)]">Desafios 1x1</h3>
            <p className="text-[var(--text-muted)] text-[8px] font-bold uppercase tracking-widest">Gestão de confrontos diretos</p>
          </div>
        </div>

        <div className="flex items-center bg-[var(--surface-ui)]/50 rounded-xl p-1 border border-[var(--border-ui)]">
          {(['all', 'pending', 'accepted', 'finished'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all ${
                filter === f
                  ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendentes' : f === 'accepted' ? 'Aceitos' : 'Histórico'}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
      className="bg-[var(--surface)] border border-[var(--border-ui)] rounded-[2.5rem] overflow-hidden flex flex-col shadow-sm hover:shadow-xl hover:border-[var(--primary)]/30 transition-all group"
    >
      {/* Header Info */}
      <div className="p-5 flex items-start justify-between bg-[var(--surface-ui)]/30 border-b border-[var(--border-ui)]">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-xl ${
            challenge.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
            challenge.status === 'accepted' ? 'bg-indigo-500/10 text-indigo-500' :
            (challenge.status === 'finished' || challenge.status === 'completed') ? 'bg-emerald-500/10 text-emerald-500' :
            'bg-rose-500/10 text-rose-500'
          }`}>
            {challenge.status === 'pending' ? <Clock size={16} /> :
             challenge.status === 'accepted' ? <Target size={16} /> :
             (challenge.status === 'finished' || challenge.status === 'completed') ? <Trophy size={16} /> :
             <XCircle size={16} />}
          </div>
          <div>
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] block mb-0.5">
              {challenge.challenge_type === 'category_absolute' ? 'Categoria + Absoluto' : 'Categoria'}
            </span>
            <h4 className="text-[10px] font-black uppercase italic tracking-tighter text-[var(--text-main)] truncate max-w-[120px]">
              {challenge.event_name}
            </h4>
          </div>
        </div>

        {/* Action icons for creator */}
        {challenge.status === 'pending' && isChallenger && isOwnProfile && (
          <div className="flex items-center space-x-1">
            <button onClick={handleDelete} className="p-2 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Opponents Section */}
      <div className="p-6 flex items-center justify-between relative overflow-hidden">
        <div className="flex flex-col items-center space-y-2 relative z-10 w-1/2">
           <div className="relative">
             <img 
               src={challenge.challenger?.profile_photo || challenge.challenger?.avatar_url || 'https://via.placeholder.com/150'} 
               alt="" 
               className={`w-14 h-14 rounded-2xl object-cover border-2 ${challenge.winner_id === challenge.challenger_id ? 'border-emerald-500' : 'border-[var(--border-ui)]'}`}
             />
             {challenge.winner_id === challenge.challenger_id && (
               <div className="absolute -top-2 -right-2 bg-emerald-500 text-white p-1 rounded-full shadow-lg">
                 <Award size={10} />
               </div>
             )}
           </div>
           <span className="text-[8px] font-black uppercase text-center truncate w-full text-[var(--text-main)]">
             {challenge.challenger?.username}
           </span>
           <span className="text-[9px] font-black text-[var(--primary)]">{challenge.challenger_points || 0} PTS</span>
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0 opacity-10">
          <Target size={80} strokeWidth={1} />
        </div>
        <div className="text-[var(--text-muted)] font-black italic text-sm z-10 mt-[-20px]">VS</div>

        <div className="flex flex-col items-center space-y-2 relative z-10 w-1/2">
           <div className="relative">
             <img 
               src={challenge.challenged?.profile_photo || challenge.challenged?.avatar_url || 'https://via.placeholder.com/150'} 
               alt="" 
               className={`w-14 h-14 rounded-2xl object-cover border-2 ${challenge.winner_id === challenge.challenged_id ? 'border-emerald-500' : 'border-[var(--border-ui)]'}`}
             />
             {challenge.winner_id === challenge.challenged_id && (
               <div className="absolute -top-2 -right-2 bg-emerald-500 text-white p-1 rounded-full shadow-lg">
                 <Award size={10} />
               </div>
             )}
           </div>
           <span className="text-[8px] font-black uppercase text-center truncate w-full text-[var(--text-main)]">
             {challenge.challenged?.username}
           </span>
           <span className="text-[9px] font-black text-[var(--primary)]">{challenge.challenged_points || 0} PTS</span>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 bg-[var(--surface-ui)]/20 mt-auto border-t border-[var(--border-ui)]">
        {challenge.status === 'pending' && isChallenged && isOwnProfile && (
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => handleStatusUpdate('accepted')}
              disabled={loading}
              className="py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-all flex items-center justify-center space-x-1"
            >
              <CheckCircle2 size={12} />
              <span>Aceitar</span>
            </button>
            <button 
              onClick={() => handleStatusUpdate('declined')}
              disabled={loading}
              className="py-2 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-rose-500/20 hover:scale-[1.02] transition-all flex items-center justify-center space-x-1"
            >
              <XCircle size={12} />
              <span>Recusar</span>
            </button>
          </div>
        )}

        {challenge.status === 'accepted' && isOwnProfile && (
          <button 
            onClick={() => setShowResultForm(true)}
            disabled={hasSubmitted}
            className={`w-full py-3 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center space-x-2 transition-all ${
              hasSubmitted 
                ? 'bg-[var(--surface-ui)] text-[var(--text-muted)] cursor-not-allowed border border-[var(--border-ui)]' 
                : 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20 hover:scale-[1.02]'
            }`}
          >
            {hasSubmitted ? (
               <><CheckCircle2 size={14} /> <span>Aguardando Oponente</span></>
            ) : (
               <><Trophy size={14} /> <span>Finalizar Desafio</span></>
            )}
          </button>
        )}

        {challenge.status === 'finished' && (
           <div className="text-center py-2">
             <p className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">Encerrado em</p>
             <p className="text-[10px] font-bold text-[var(--text-main)]">{new Date(challenge.updated_at).toLocaleDateString()}</p>
           </div>
        )}

        {challenge.status === 'declined' && (
           <div className="text-center py-2">
             <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter italic">Desafio Recusado</p>
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
  const [categoryResult, setCategoryResult] = useState<ChallengeResult['category']>('none');
  const [absoluteResult, setAbsoluteResult] = useState<ChallengeResult['absolute']>('none');

  const placements = [
    { id: '1st', label: '1º Lugar', points: 100 },
    { id: '2nd', label: '2º Lugar', points: 50 },
    { id: '3rd', label: '3º Lugar', points: 25 },
    { id: 'none', label: 'Participação', points: 5 },
  ] as const;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-[var(--surface)] w-full max-w-sm rounded-[2.5rem] border border-[var(--border-ui)] overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-[var(--border-ui)] flex items-center justify-between">
           <h3 className="text-sm font-black uppercase italic tracking-tighter text-[var(--text-main)]">Informar Resultados</h3>
           <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
              <XCircle size={20} className="text-[var(--text-muted)]" />
           </button>
        </div>

        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
          {/* Category Result */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
               <Award size={14} className="text-[var(--primary)]" />
               <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Pódio Categoria</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {placements.map(p => (
                <button
                  key={p.id}
                  onClick={() => setCategoryResult(p.id)}
                  className={`py-3 px-4 rounded-2xl border transition-all text-left flex flex-col ${
                    categoryResult === p.id 
                      ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]' 
                      : 'border-[var(--border-ui)] bg-[var(--surface-ui)]/50 text-[var(--text-muted)]'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase">{p.label}</span>
                  <span className="text-[8px] font-bold opacity-70">{p.points} PTS</span>
                </button>
              ))}
            </div>
          </div>

          {/* Absolute Result (If eligible) */}
          {challenge.challenge_type === 'category_absolute' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                 <Trophy size={14} className="text-[var(--primary)]" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Pódio Absoluto</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {placements.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setAbsoluteResult(p.id)}
                    className={`py-3 px-4 rounded-2xl border transition-all text-left flex flex-col ${
                      absoluteResult === p.id 
                        ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]' 
                        : 'border-[var(--border-ui)] bg-[var(--surface-ui)]/50 text-[var(--text-muted)]'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase">{p.label}</span>
                    <span className="text-[8px] font-bold opacity-70">{p.points} PTS</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-[var(--surface-ui)]/30 border-t border-[var(--border-ui)]">
          <button
            onClick={() => onSubmit({ category: categoryResult, absolute: absoluteResult })}
            className="w-full py-4 bg-[var(--primary)] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] transition-all flex items-center justify-center space-x-2 shadow-lg shadow-[var(--primary)]/20"
          >
            <Send size={16} />
            <span>Confirmar e Enviar</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
