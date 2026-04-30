import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { Logo } from '../components/Logo';

export const ConfirmEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token de verificação ausente.');
      return;
    }

    const confirmEmail = async () => {
      try {
        const response = await fetch(`/api/email/confirm?token=${token}`);
        const data = await response.json();

        if (response.ok && data.success) {
          setStatus('success');
          setMessage(data.message || 'E-mail confirmado com sucesso!');
        } else {
          setStatus('error');
          setMessage(data.error || 'Erro ao confirmar e-mail. O link pode ter expirado ou já ter sido utilizado.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Erro de conexão com o servidor.');
      }
    };

    confirmEmail();
  }, [token]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="max-w-md w-full bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden"
      >
        {/* Glow Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1/2 bg-blue-600/20 blur-[100px] -z-10" />

        <div className="flex justify-center mb-10">
          <Logo size={48} showText={true} />
        </div>

        <div className="flex flex-col items-center">
          {status === 'loading' && (
            <>
              <div className="w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mb-8">
                <Loader2 size={40} className="animate-spin" />
              </div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-4">Verificando...</h1>
              <p className="text-gray-400 text-sm font-medium leading-relaxed">
                Aguarde enquanto processamos sua confirmação de e-mail.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-8"
              >
                <CheckCircle2 size={40} />
              </motion.div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-4">Sucesso!</h1>
              <p className="text-gray-400 text-sm font-medium leading-relaxed mb-10">
                {message}
              </p>
              <button
                onClick={() => navigate('/')}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2 group"
              >
                <span>Acessar Plataforma</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-8"
              >
                <XCircle size={40} />
              </motion.div>
              <h1 className="text-2xl font-black uppercase italic tracking-tighter mb-4">Ops!</h1>
              <p className="text-gray-400 text-sm font-medium leading-relaxed mb-10">
                {message}
              </p>
              <Link
                to="/"
                className="w-full py-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center space-x-2"
              >
                <span>Voltar ao Início</span>
              </Link>
            </>
          )}
        </div>
      </motion.div>
      
      <p className="mt-10 text-[10px] font-black uppercase tracking-[0.4em] text-gray-600">
        ArenaComp Protocol © 2024
      </p>
    </div>
  );
};
