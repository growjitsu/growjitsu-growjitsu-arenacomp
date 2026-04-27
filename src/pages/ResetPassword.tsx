import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Logo } from '../components/Logo';
import { Toaster, toast } from 'sonner';

export const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // If no session, wait a bit as it might be loading from URL
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (!retrySession) {
             toast.error('Sessão expirada ou inválida. Solicite um novo link.');
             // Small delay to let toast show
             setTimeout(() => navigate('/login'), 3000);
          }
        }, 1000);
      }
    };
    checkSession();
  }, [navigate]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      toast.success('Senha alterada com sucesso!');
      
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      console.error('Error updating password:', err);
      toast.error(err.message || 'Erro ao atualizar senha');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
        <Toaster position="top-center" theme="dark" />
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-[var(--surface)] border border-[var(--border-ui)] p-12 rounded-3xl max-w-md w-full text-center space-y-6 shadow-2xl"
        >
          <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl mx-auto flex items-center justify-center text-emerald-500 shadow-inner">
            <CheckCircle2 size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[var(--text-main)]">Senha Redefinida</h2>
            <p className="text-[var(--text-muted)] text-sm font-medium">Sua conta foi protegida com sucesso. Redirecionando para o login...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
      <Toaster position="top-center" theme="dark" />
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-4">
          <Logo size={80} showText={true} className="flex-col !gap-4" />
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
            <ShieldCheck size={14} className="text-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Protocolo de Recuperação</span>
          </div>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-[var(--surface)] border border-[var(--border-ui)] p-8 rounded-3xl space-y-6 shadow-2xl backdrop-blur-xl"
        >
          <div className="space-y-1">
            <h1 className="text-xl font-black uppercase italic text-[var(--text-main)]">Nova Senha</h1>
            <p className="text-xs text-[var(--text-muted)] font-medium">Defina uma senha forte para sua segurança</p>
          </div>

          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Nova Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[var(--bg)]/50 border border-[var(--border-ui)] rounded-2xl py-3 pl-12 pr-12 text-sm text-[var(--text-main)] focus:border-[var(--primary)] outline-none transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-blue-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirmar Nova Senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[var(--bg)]/50 border border-[var(--border-ui)] rounded-2xl py-3 pl-12 pr-12 text-sm text-[var(--text-main)] focus:border-[var(--primary)] outline-none transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-blue-500 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--primary)] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center space-x-2 hover:opacity-90 transition-all disabled:opacity-50"
            >
              <span>{loading ? 'Atualizando...' : 'Redefinir Senha'}</span>
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};
