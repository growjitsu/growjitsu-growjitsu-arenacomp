import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Trophy, Clock, CheckCircle2, XCircle, ChevronDown, Send, Edit2, Trash2, Award, X, Info } from 'lucide-react';
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
      <div className="p-6 md:p-7 flex items-start justify-between bg-[var(--surface-ui)]/30 border-b border-[var(--border-ui)]">
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-2xl ${
            challenge.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
            challenge.status === 'accepted' ? 'bg-indigo-500/10 text-indigo-500' :
            (challenge.status === 'finished' || challenge.status === 'completed') ? 'bg-emerald-500/10 text-emerald-500' :
            'bg-rose-500/10 text-rose-500'
          }`}>
            {challenge.status === 'pending' ? <Clock size={18} /> :
             challenge.status === 'accepted' ? <Target size={18} /> :
             (challenge.status === 'finished' || challenge.status === 'completed') ? <Trophy size={18} /> :
             <XCircle size={18} />}
          </div>
          <div className="min-w-0">
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)] block mb-1">
              {challenge.challenge_type === 'category_absolute' ? 'Categoria + Absoluto' : 'Categoria'}
            </span>
            <h4 className="text-xs md:text-sm font-black uppercase italic tracking-tighter text-[var(--text-main)] truncate max-w-[180px]">
              {challenge.event_name}
            </h4>
          </div>
        </div>

        {/* Action icons for creator */}
        {challenge.status === 'pending' && isChallenger && isOwnProfile && (
          <div className="flex items-center space-x-2">
            <button onClick={handleDelete} className="p-2.5 hover:bg-rose-500/10 text-rose-500 rounded-xl transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Opponents Section */}
      <div className="p-8 md:p-10 flex items-center justify-between relative overflow-hidden">
        <div className="flex flex-col items-center space-y-3 relative z-10 w-[42%]">
           <div className="relative">
             <div className="absolute -inset-2 bg-gradient-to-br from-[var(--primary)]/20 to-transparent rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
             <img 
               src={challenge.challenger?.profile_photo || challenge.challenger?.avatar_url || 'https://via.placeholder.com/150'} 
               alt="" 
               className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl object-cover border-2 shadow-2xl relative z-10 ${challenge.winner_id === challenge.challenger_id ? 'border-emerald-500 ring-4 ring-emerald-500/20' : 'border-[var(--border-ui)]'}`}
             />
             {challenge.winner_id === challenge.challenger_id && (
               <div className="absolute -top-3 -right-3 bg-emerald-500 text-white p-1.5 rounded-full shadow-lg z-20 animate-bounce">
                 <Award size={14} />
               </div>
             )}
           </div>
           <div className="text-center w-full min-w-0">
             <span className="text-[10px] md:text-xs font-black uppercase block text-[var(--text-main)] truncate tracking-tight">
               {challenge.challenger?.full_name}
             </span>
             <span className="text-[8px] md:text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest block opacity-60">@{challenge.challenger?.username}</span>
             <div className="mt-2 bg-[var(--primary)]/10 px-3 py-1 rounded-full inline-block">
               <span className="text-[10px] md:text-xs font-black text-[var(--primary)]">{challenge.challenger_points || 0} PTS</span>
             </div>
           </div>
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0 opacity-10 pointer-events-none">
          <Target size={120} strokeWidth={1} className="text-[var(--primary)]" />
        </div>
        
        <div className="flex flex-col items-center justify-center z-10 mx-2">
          <div className="w-12 h-12 rounded-full bg-[var(--surface-ui)]/50 border border-[var(--border-ui)] flex items-center justify-center">
            <span className="text-[var(--text-muted)] font-black italic text-sm">VS</span>
          </div>
          <div className="h-12 w-px bg-gradient-to-b from-transparent via-[var(--border-ui)] to-transparent mt-2" />
        </div>

        <div className="flex flex-col items-center space-y-3 relative z-10 w-[42%]">
           <div className="relative">
             <div className="absolute -inset-2 bg-gradient-to-br from-[var(--primary)]/20 to-transparent rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
             <img 
               src={challenge.challenged?.profile_photo || challenge.challenged?.avatar_url || 'https://via.placeholder.com/150'} 
               alt="" 
               className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl object-cover border-2 shadow-2xl relative z-10 ${challenge.winner_id === challenge.challenged_id ? 'border-emerald-500 ring-4 ring-emerald-500/20' : 'border-[var(--border-ui)]'}`}
             />
             {challenge.winner_id === challenge.challenged_id && (
               <div className="absolute -top-3 -right-3 bg-emerald-500 text-white p-1.5 rounded-full shadow-lg z-20 animate-bounce">
                 <Award size={14} />
               </div>
             )}
           </div>
           <div className="text-center w-full min-w-0">
             <span className="text-[10px] md:text-xs font-black uppercase block text-[var(--text-main)] truncate tracking-tight">
               {challenge.challenged?.full_name}
             </span>
             <span className="text-[8px] md:text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest block opacity-60">@{challenge.challenged?.username}</span>
             <div className="mt-2 bg-[var(--primary)]/10 px-3 py-1 rounded-full inline-block">
               <span className="text-[10px] md:text-xs font-black text-[var(--primary)]">{challenge.challenged_points || 0} PTS</span>
             </div>
           </div>
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
  const [currentView, setCurrentView] = useState<'selection' | 'filling'>('selection');
  const [activeType, setActiveType] = useState<'category' | 'absolute'>('category');

  const placements = [
    { id: '1st', label: '1º Lugar', points: 100 },
    { id: '2nd', label: '2º Lugar', points: 50 },
    { id: '3rd', label: '3º Lugar', points: 25 },
    { id: 'none', label: 'Participação', points: 5 },
  ] as const;

  const isDual = challenge.challenge_type === 'category_absolute';
  const isComplete = !isDual || (categoryResult !== 'none' && absoluteResult !== 'none') || (isDual && categoryResult !== 'none' && absoluteResult !== 'none');
  // Logic: if category only, any choice except 'none' is completion? 
  // User says "bloquear se não houver os dois". For dual challenges, we check both. For single, just category.
  const canSubmit = isDual ? (categoryResult !== 'none' && absoluteResult !== 'none') : (categoryResult !== 'none');

  const handleSelectType = (type: 'category' | 'absolute') => {
    setActiveType(type);
    setCurrentView('filling');
  };

  const handleSelection = (id: typeof placements[number]['id']) => {
    if (activeType === 'category') {
      setCategoryResult(id);
    } else {
      setAbsoluteResult(id);
    }
    
    // Auto-transition logic
    if (isDual) {
      if (activeType === 'category' && absoluteResult === 'none') {
        setActiveType('absolute');
      } else if (activeType === 'absolute' && categoryResult === 'none') {
        setActiveType('category');
      } else {
        setCurrentView('selection');
      }
    } else {
      setCurrentView('selection');
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[var(--surface)] w-full max-w-sm rounded-[3rem] border border-[var(--border-ui)] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="p-7 border-b border-[var(--border-ui)] flex items-center justify-between bg-[var(--surface-ui)]/50">
           <div>
             <h3 className="text-sm font-black uppercase italic tracking-tighter text-[var(--text-main)]">Finalizar Desafio</h3>
             <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{challenge.event_name}</p>
           </div>
           <button onClick={onClose} className="p-2.5 hover:bg-white/5 rounded-2xl transition-all">
              <X size={20} className="text-[var(--text-muted)]" />
           </button>
        </div>

        <div className="p-8 space-y-8 min-h-[300px]">
          {currentView === 'selection' ? (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)]">Etapa de Preenchimento</p>
                <h4 className="text-xs font-bold text-[var(--text-main)]">Selecione qual resultado deseja informar:</h4>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={() => handleSelectType('category')}
                  className={`w-full p-6 rounded-[2rem] border transition-all flex items-center justify-between group ${
                    categoryResult !== 'none' 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                      : 'bg-[var(--surface-ui)] border-[var(--border-ui)] text-[var(--text-main)]'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-2xl ${categoryResult !== 'none' ? 'bg-emerald-500/20' : 'bg-black/20'}`}>
                      <Award size={20} />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-black uppercase italic block tracking-tighter">Categoria</span>
                      <span className="text-[9px] font-bold opacity-60 uppercase">{categoryResult === 'none' ? 'Pendente' : placements.find(p => p.id === categoryResult)?.label}</span>
                    </div>
                  </div>
                  {categoryResult !== 'none' ? <CheckCircle2 size={20} /> : <div className="w-5 h-5 rounded-full border-2 border-[var(--border-ui)]" />}
                </button>

                {isDual && (
                  <button
                    onClick={() => handleSelectType('absolute')}
                    className={`w-full p-6 rounded-[2rem] border transition-all flex items-center justify-between group ${
                      absoluteResult !== 'none' 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                        : 'bg-[var(--surface-ui)] border-[var(--border-ui)] text-[var(--text-main)]'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-2xl ${absoluteResult !== 'none' ? 'bg-emerald-500/20' : 'bg-black/20'}`}>
                        <Trophy size={20} />
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-black uppercase italic block tracking-tighter">Absoluto</span>
                        <span className="text-[9px] font-bold opacity-60 uppercase">{absoluteResult === 'none' ? 'Pendente' : placements.find(p => p.id === absoluteResult)?.label}</span>
                      </div>
                    </div>
                    {absoluteResult !== 'none' ? <CheckCircle2 size={20} /> : <div className="w-5 h-5 rounded-full border-2 border-[var(--border-ui)]" />}
                  </button>
                )}
              </div>
              
              {isDual && !canSubmit && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start space-x-3">
                  <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold text-amber-500 leading-relaxed uppercase">
                    Atenção: Este é um desafio Categoria + Absoluto. Você deve informar o resultado de ambos para finalizar.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setCurrentView('selection')}
                  className="p-2 hover:bg-white/5 rounded-xl text-[var(--text-muted)] group flex items-center space-x-2"
                >
                  <ChevronDown className="rotate-90" size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Voltar</span>
                </button>
                <div className="flex flex-col items-end">
                  <span className="text-[8px] font-black uppercase tracking-widest text-[var(--primary)]">Editando</span>
                  <span className="text-[10px] font-black uppercase text-[var(--text-main)]">{activeType === 'category' ? 'Categoria' : 'Absoluto'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {placements.map(p => {
                  const isSelected = activeType === 'category' ? categoryResult === p.id : absoluteResult === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelection(p.id)}
                      className={`py-5 px-4 rounded-3xl border-2 transition-all text-left flex flex-col items-center justify-center space-y-1 ${
                        isSelected 
                          ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] scale-[1.05] shadow-xl' 
                          : 'border-[var(--border-ui)] bg-[var(--surface-ui)]/50 text-[var(--text-muted)] hover:border-[var(--text-muted)]/30'
                      }`}
                    >
                      <span className="text-xs font-black uppercase italic tracking-tighter">{p.label}</span>
                      <span className="text-[8px] font-bold opacity-70 uppercase tracking-widest">{p.points} PTS</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-7 bg-[var(--surface-ui)]/30 border-t border-[var(--border-ui)]">
          <button
            onClick={() => onSubmit({ category: categoryResult, absolute: absoluteResult })}
            disabled={!canSubmit}
            className={`w-full py-4.5 rounded-[2rem] font-black uppercase tracking-widest text-[11px] transition-all flex items-center justify-center space-x-2 shadow-2xl ${
              canSubmit 
                ? 'bg-[var(--primary)] text-white hover:bg-[var(--primary-highlight)] hover:scale-[1.02] shadow-[var(--primary)]/20' 
                : 'bg-[var(--surface-ui)] text-[var(--text-muted)] border border-[var(--border-ui)] opacity-50 cursor-not-allowed'
            }`}
          >
            <Send size={16} />
            <span>Confirmar e Enviar</span>
          </button>
          
          {!canSubmit && isDual && (
             <p className="text-[9px] text-center font-bold text-[var(--text-muted)] uppercase tracking-widest mt-4 animate-pulse italic">
                Aguardando preenchimento total...
             </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};
