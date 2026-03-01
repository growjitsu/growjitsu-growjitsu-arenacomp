import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Plus, Minus, Trophy, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../services/supabase';

interface Score {
  points: number;
  advantages: number;
  penalties: number;
}

interface ScoreboardProps {
  lutaId?: string;
  athleteAName?: string;
  athleteBName?: string;
  logoUrl?: string;
  onFinish?: () => void;
}

export default function Scoreboard({ lutaId, athleteAName = "Atleta 1", athleteBName = "Atleta 2", logoUrl, onFinish }: ScoreboardProps) {
  const [time, setTime] = useState(300); // 5 minutes default
  const [initialTime, setInitialTime] = useState(300);
  const [isActive, setIsActive] = useState(false);
  const [athleteA, setAthleteA] = useState<Score>({ points: 0, advantages: 0, penalties: 0 });
  const [athleteB, setAthleteB] = useState<Score>({ points: 0, advantages: 0, penalties: 0 });
  const [isFinishing, setIsFinishing] = useState(false);
  const [winner, setWinner] = useState<'A' | 'B' | null>(null);
  const [reason, setReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isActive && time > 0) {
      interval = setInterval(() => {
        setTime((time) => time - 1);
      }, 1000);
    } else if (time === 0) {
      setIsActive(false);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, time]);

  // Spacebar control
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isFinishing) {
        e.preventDefault();
        setIsActive(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFinishing]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const updateScore = (athlete: 'A' | 'B', field: keyof Score, delta: number) => {
    const setter = athlete === 'A' ? setAthleteA : setAthleteB;
    setter(prev => ({
      ...prev,
      [field]: Math.max(0, prev[field] + delta)
    }));
  };

  const handleFinishMatch = async () => {
    if (!winner || !reason) {
      alert('Selecione o vencedor e o motivo da vitória.');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Update Luta status
      if (lutaId) {
        await supabase.from('lutas').update({ status: 'finalizada' }).eq('id', lutaId);
        
        // 2. Save Result
        await supabase.from('resultados').insert({
          luta_id: lutaId,
          vencedor_id: winner === 'A' ? 'atleta_a_id_placeholder' : 'atleta_b_id_placeholder', // In real app, use actual IDs
          motivo: reason,
          descricao_outro: reason === 'outros' ? otherReason : null,
          pontos_a: athleteA,
          pontos_b: athleteB
        });
      }

      alert('Luta finalizada com sucesso!');
      if (onFinish) onFinish();
      setIsFinishing(false);
    } catch (err) {
      console.error('Erro ao salvar resultado:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white p-4 md:p-8 font-display overflow-y-auto">
      {/* Header with Logo */}
      {logoUrl && (
        <div className="absolute top-8 left-8 w-24 h-24 opacity-40">
          <img src={logoUrl} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
        </div>
      )}

      {/* Timer Section */}
      <div className="flex flex-col items-center justify-center mb-12">
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={() => {
              const newTime = prompt('Defina o tempo em segundos:', time.toString());
              if (newTime) {
                const t = parseInt(newTime);
                setTime(t);
                setInitialTime(t);
              }
            }}
            className="text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
          >
            Configurar Tempo
          </button>
        </div>
        
        <motion.div 
          key={time}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`text-9xl md:text-[14rem] font-black tracking-tighter tabular-nums leading-none ${time < 30 ? 'text-red-500' : 'text-white'}`}
        >
          {formatTime(time)}
        </motion.div>
        
        <div className="flex gap-6 mt-8">
          <button 
            onClick={() => setIsActive(!isActive)}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-2xl ${isActive ? 'bg-zinc-800 text-white' : 'bg-emerald-500 text-white hover:scale-110'}`}
          >
            {isActive ? <Pause size={40} /> : <Play size={40} className="ml-2" />}
          </button>
          <button 
            onClick={() => {
              setIsActive(false);
              setTime(initialTime);
            }}
            className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors"
          >
            <RotateCcw size={40} />
          </button>
          <button 
            onClick={() => setIsFinishing(true)}
            className="px-8 h-20 rounded-full bg-bjj-purple text-white font-black uppercase tracking-widest hover:bg-bjj-purple/90 transition-colors shadow-xl"
          >
            Finalizar Luta
          </button>
        </div>
      </div>

      {/* Athletes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
        <ProfessionalScoreCard 
          name={athleteAName} 
          score={athleteA} 
          updateScore={(f, d) => updateScore('A', f, d)}
          color="bg-bjj-blue"
          isA={true}
        />
        <ProfessionalScoreCard 
          name={athleteBName} 
          score={athleteB} 
          updateScore={(f, d) => updateScore('B', f, d)}
          color="bg-white !text-black"
          isA={false}
        />
      </div>

      {/* Finalization Modal */}
      <AnimatePresence>
        {isFinishing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-xl w-full space-y-8"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black font-display text-white">Finalizar Luta</h3>
                <button onClick={() => setIsFinishing(false)} className="text-zinc-500 hover:text-white"><X size={24}/></button>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase text-zinc-500">Vencedor</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setWinner('A')}
                      className={`p-4 rounded-xl border-2 font-bold transition-all ${winner === 'A' ? 'border-bjj-blue bg-bjj-blue/20 text-bjj-blue' : 'border-zinc-800 text-zinc-500'}`}
                    >
                      {athleteAName}
                    </button>
                    <button 
                      onClick={() => setWinner('B')}
                      className={`p-4 rounded-xl border-2 font-bold transition-all ${winner === 'B' ? 'border-zinc-200 bg-white/10 text-white' : 'border-zinc-800 text-zinc-500'}`}
                    >
                      {athleteBName}
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black uppercase text-zinc-500">Motivo da Vitória</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['finalizacao', 'pontos', 'decisao', 'desclassificacao', 'outros'].map(m => (
                      <button 
                        key={m}
                        onClick={() => setReason(m)}
                        className={`p-3 rounded-lg border text-xs font-bold uppercase transition-all ${reason === m ? 'border-bjj-purple bg-bjj-purple/20 text-bjj-purple' : 'border-zinc-800 text-zinc-500'}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {reason === 'outros' && (
                  <input 
                    placeholder="Descreva o motivo..."
                    value={otherReason}
                    onChange={e => setOtherReason(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-white outline-none focus:ring-2 focus:ring-bjj-purple"
                  />
                )}
              </div>

              <button 
                onClick={handleFinishMatch}
                disabled={isSaving}
                className="w-full btn-primary bg-emerald-500 hover:bg-emerald-600 border-emerald-500 py-4 font-black flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="animate-spin" size={24}/> : <><CheckCircle2 size={24}/> Confirmar Resultado</>}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfessionalScoreCard({ name, score, updateScore, color, isA }: any) {
  return (
    <div className={`rounded-[2.5rem] p-8 flex flex-col justify-between ${color} shadow-2xl relative overflow-hidden`}>
      <div className="relative z-10">
        <h3 className="text-4xl font-black font-display mb-8 tracking-tight">{name}</h3>
        
        <div className="space-y-12">
          {/* Main Points Display */}
          <div className="flex items-center justify-between">
            <div className="space-y-4">
              <span className="text-sm font-black uppercase opacity-60 tracking-widest">Pontos</span>
              <div className="grid grid-cols-3 gap-2">
                {[2, 3, 4].map(p => (
                  <div key={p} className="flex flex-col gap-1">
                    <button 
                      onClick={() => updateScore('points', p)}
                      className="w-14 h-14 rounded-xl bg-black/20 hover:bg-black/40 flex items-center justify-center font-black text-xl"
                    >
                      +{p}
                    </button>
                    <button 
                      onClick={() => updateScore('points', -p)}
                      className="w-14 h-8 rounded-lg bg-black/10 hover:bg-black/20 flex items-center justify-center font-bold text-xs opacity-50"
                    >
                      -{p}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-[10rem] font-black leading-none tabular-nums">{score.points}</span>
            </div>
          </div>

          {/* Advantages & Penalties */}
          <div className="grid grid-cols-2 gap-8">
            <div className="bg-black/10 rounded-3xl p-6 flex flex-col items-center justify-center space-y-4">
              <span className="text-xs font-black uppercase tracking-widest opacity-60">Vantagens</span>
              <div className="flex items-center gap-6">
                <button onClick={() => updateScore('advantages', -1)} className="p-2 bg-black/10 rounded-lg"><Minus size={24}/></button>
                <span className="text-7xl font-black tabular-nums">{score.advantages}</span>
                <button onClick={() => updateScore('advantages', 1)} className="p-2 bg-black/10 rounded-lg"><Plus size={24}/></button>
              </div>
            </div>
            <div className={`${isA ? 'bg-red-500/30' : 'bg-red-500/10'} rounded-3xl p-6 flex flex-col items-center justify-center space-y-4`}>
              <span className="text-xs font-black uppercase tracking-widest opacity-60">Faltas</span>
              <div className="flex items-center gap-6">
                <button onClick={() => updateScore('penalties', -1)} className="p-2 bg-black/10 rounded-lg"><Minus size={24}/></button>
                <span className={`text-7xl font-black tabular-nums ${score.penalties > 0 ? 'text-red-500' : ''}`}>{score.penalties}</span>
                <button onClick={() => updateScore('penalties', 1)} className="p-2 bg-black/10 rounded-lg"><Plus size={24}/></button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Background Accent */}
      <div className="absolute -right-10 -bottom-10 opacity-10">
        <Trophy size={300} />
      </div>
    </div>
  );
}

function Loader2({ className, size }: any) {
  return <Play className={`${className} animate-spin`} size={size} />;
}

