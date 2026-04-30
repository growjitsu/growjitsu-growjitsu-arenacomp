import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, AlertCircle, CheckCircle2, RotateCcw, X } from 'lucide-react';
import { supabase } from '../services/supabase';
import { toast } from 'sonner';

interface EmailConfirmationBannerProps {
  user: any;
}

export const EmailConfirmationBanner: React.FC<EmailConfirmationBannerProps> = ({ user }) => {
  const [isResending, setIsResending] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (user && !user.email_confirmed_at) {
      // Small delay to feel more natural
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [user]);

  const handleResend = async () => {
    if (isResending) return;
    setIsResending(true);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: window.location.origin + '/auth/callback'
        }
      });

      if (error) throw error;

      toast.success('E-mail de confirmação reenviado!', {
        description: 'Verifique sua caixa de entrada e spam.',
      });
    } catch (error: any) {
      console.error('Erro ao reenviar e-mail:', error);
      toast.error('Erro ao reenviar e-mail', {
        description: error.message || 'Tente novamente em alguns instantes.',
      });
    } finally {
      setIsResending(false);
    }
  };

  if (!user || user.email_confirmed_at || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed top-20 md:top-24 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-2xl"
      >
        <div className="bg-[#1a1a1a]/80 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-4 shadow-2xl overflow-hidden relative group">
          {/* Animated Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
          
          <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Mail size={24} />
            </div>
            
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-[13px] font-black uppercase italic tracking-wider text-white flex items-center justify-center sm:justify-start gap-2">
                Confirme seu e-mail
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              </h3>
              <p className="text-[11px] text-gray-400 font-medium">
                Sua conta está ativa, mas você precisa confirmar seu e-mail para liberar todos os recursos da Arena.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResend}
                disabled={isResending}
                className={`
                  flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                  ${isResending 
                    ? 'bg-white/5 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98]'
                  }
                `}
              >
                {isResending ? (
                  <RotateCcw size={14} className="animate-spin" />
                ) : (
                  <RotateCcw size={14} />
                )}
                <span>{isResending ? 'Enviando...' : 'Reenviar Link'}</span>
              </button>
              
              <button 
                onClick={() => setIsVisible(false)}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-500 hover:text-white hover:bg-white/10 transition-all"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
