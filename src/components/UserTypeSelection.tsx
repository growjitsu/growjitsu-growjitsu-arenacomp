import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, User, ArrowRight, Shield, Zap, Award } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useProfile } from '../context/ProfileContext';
import { toast } from 'sonner';

interface UserTypeSelectionProps {
  onComplete: () => void;
}

export const UserTypeSelection: React.FC<UserTypeSelectionProps> = ({ onComplete }) => {
  const [loading, setLoading] = useState(false);
  const { profile, checkProfile } = useProfile();

  const handleSelection = async (tipo: 'atleta' | 'nao_atleta') => {
    if (!profile?.id) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ tipo })
        .eq('id', profile.id);
      
      if (error) throw error;
      
      await checkProfile();
      toast.success('Perfil configurado com sucesso!');
      onComplete();
    } catch (err) {
      console.error('Erro ao salvar tipo de usuário:', err);
      toast.error('Erro ao salvar sua escolha. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-[var(--surface)] border border-[var(--border-ui)] rounded-[3rem] overflow-hidden shadow-2xl"
      >
        <div className="p-8 md:p-12 text-center">
          <div className="w-20 h-20 bg-[var(--primary)]/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <Shield size={40} className="text-[var(--primary)]" />
          </div>
          
          <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-[var(--text-main)] mb-4">
            Bem-vindo à ArenaComp
          </h2>
          <p className="text-[var(--text-muted)] text-sm md:text-base font-medium max-w-md mx-auto mb-12">
            Para personalizar sua experiência, precisamos saber como você pretende usar a plataforma.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Atleta Option */}
            <button
              onClick={() => handleSelection('atleta')}
              disabled={loading}
              className="group relative p-8 bg-[var(--bg)] border border-[var(--border-ui)] rounded-[2.5rem] text-left transition-all hover:border-[var(--primary)]/50 hover:shadow-[0_20px_40px_rgba(37,99,235,0.1)] active:scale-[0.98]"
            >
              <div className="absolute top-6 right-6 w-10 h-10 bg-[var(--primary)]/10 rounded-xl flex items-center justify-center text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight size={20} />
              </div>
              
              <div className="w-14 h-14 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center text-[var(--primary)] mb-6 group-hover:scale-110 transition-transform">
                <Trophy size={28} />
              </div>
              
              <h3 className="text-xl font-black uppercase italic text-[var(--text-main)] mb-2">Sou Atleta</h3>
              <p className="text-[var(--text-muted)] text-xs font-medium leading-relaxed">
                Quero gerenciar meu currículo esportivo, participar de rankings e registrar minhas conquistas.
              </p>
            </button>

            {/* Não Atleta Option */}
            <button
              onClick={() => handleSelection('nao_atleta')}
              disabled={loading}
              className="group relative p-8 bg-[var(--bg)] border border-[var(--border-ui)] rounded-[2.5rem] text-left transition-all hover:border-[var(--primary)]/50 hover:shadow-[0_20px_40px_rgba(37,99,235,0.1)] active:scale-[0.98]"
            >
              <div className="absolute top-6 right-6 w-10 h-10 bg-[var(--primary)]/10 rounded-xl flex items-center justify-center text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight size={20} />
              </div>
              
              <div className="w-14 h-14 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center text-[var(--primary)] mb-6 group-hover:scale-110 transition-transform">
                <User size={28} />
              </div>
              
              <h3 className="text-xl font-black uppercase italic text-[var(--text-main)] mb-2">Não sou Atleta</h3>
              <p className="text-[var(--text-muted)] text-xs font-medium leading-relaxed">
                Quero acompanhar amigos, atletas favoritos e ficar por dentro das novidades da Arena.
              </p>
            </button>
          </div>

          <div className="mt-12 pt-8 border-t border-[var(--border-ui)]/50">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Você poderá mudar sua escolha a qualquer momento nas configurações.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
