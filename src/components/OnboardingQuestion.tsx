import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Users, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

interface OnboardingQuestionProps {
  userId: string;
  onComplete: (tipo: 'atleta' | 'nao_atleta') => void;
}

export const OnboardingQuestion: React.FC<OnboardingQuestionProps> = ({ userId, onComplete }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSelection = async (tipo: 'atleta' | 'nao_atleta') => {
    setIsLoading(true);
    try {
      // 1. Update Supabase
      const { error: supabaseError } = await supabase
        .from('profiles')
        .update({ tipo, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (supabaseError) throw supabaseError;

      // 2. Synchronize with Firebase Firestore for validation consistency
      try {
        await setDoc(doc(db, "users", userId), {
          uid: userId,
          tipo: tipo,
          updated_at: new Date().toISOString()
        }, { merge: true });
        console.log('[FIREBASE] Tipo de usuário sincronizado com Firestore');
      } catch (fsError) {
        console.error('[FIREBASE] Erro ao sincronizar tipo de usuário:', fsError);
        // We don't block the flow if Firebase sync fails, but we log it
      }

      onComplete(tipo);
    } catch (err) {
      console.error('Erro ao salvar tipo de usuário:', err);
      alert('Ocorreu um erro ao salvar sua escolha. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--bg)] p-6 overflow-y-auto">
      <div className="max-w-2xl w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-[var(--primary)] to-blue-700 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/20 border border-white/10">
            <Trophy size={40} className="text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter mb-4 text-[var(--text-main)]">
            Bem-vindo à <span className="text-[var(--primary)]">ArenaComp</span>
          </h1>
          <p className="text-[var(--text-muted)] font-medium max-w-md mx-auto">
            Para começarmos, conte-nos um pouco sobre como você pretende usar a plataforma.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Opção Atleta */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            disabled={isLoading}
            onClick={() => handleSelection('atleta')}
            className="group relative bg-[var(--surface)] border-2 border-[var(--border-ui)] hover:border-[var(--primary)] p-8 rounded-[2.5rem] text-left transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl hover:shadow-[var(--primary)]/10"
          >
            <div className="w-14 h-14 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">
              <Trophy size={28} className="text-[var(--primary)] group-hover:text-white" />
            </div>
            <h3 className="text-xl font-black uppercase italic mb-2 text-[var(--text-main)]">Sou Atleta</h3>
            <p className="text-sm text-[var(--text-muted)] mb-6 leading-relaxed">
              Pratico esportes, participo de competições e quero gerenciar meu histórico, conquistas e ranking.
            </p>
            <ul className="space-y-2 mb-8">
              <li className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                <CheckCircle2 size={14} className="text-[var(--primary)]" />
                <span>Ranking Global</span>
              </li>
              <li className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                <CheckCircle2 size={14} className="text-[var(--primary)]" />
                <span>Histórico de Lutas</span>
              </li>
              <li className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                <CheckCircle2 size={14} className="text-[var(--primary)]" />
                <span>Certificados Digitais</span>
              </li>
            </ul>
            <div className="flex items-center text-[var(--primary)] font-black uppercase italic text-xs tracking-widest">
              <span>Selecionar</span>
              <ArrowRight size={16} className="ml-2 group-hover:translate-x-2 transition-transform" />
            </div>
          </motion.button>

          {/* Opção Não-Atleta */}
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            disabled={isLoading}
            onClick={() => handleSelection('nao_atleta')}
            className="group relative bg-[var(--surface)] border-2 border-[var(--border-ui)] hover:border-emerald-500 p-8 rounded-[2.5rem] text-left transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl hover:shadow-emerald-500/10"
          >
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <Users size={28} className="text-emerald-500 group-hover:text-white" />
            </div>
            <h3 className="text-xl font-black uppercase italic mb-2 text-[var(--text-main)]">Sou Apoiador</h3>
            <p className="text-sm text-[var(--text-muted)] mb-6 leading-relaxed">
              Sou pai, amigo, fã ou apenas quero acompanhar atletas, eventos e notícias do mundo esportivo.
            </p>
            <ul className="space-y-2 mb-8">
              <li className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>Seguir Atletas</span>
              </li>
              <li className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>Acompanhar Eventos</span>
              </li>
              <li className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>Acesso Imediato</span>
              </li>
            </ul>
            <div className="flex items-center text-emerald-500 font-black uppercase italic text-xs tracking-widest">
              <span>Selecionar</span>
              <ArrowRight size={16} className="ml-2 group-hover:translate-x-2 transition-transform" />
            </div>
          </motion.button>
        </div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]"
        >
          Você poderá alterar sua escolha nas configurações do perfil futuramente.
        </motion.p>
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-[var(--bg)]/80 backdrop-blur-sm flex items-center justify-center z-[110]">
          <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};
