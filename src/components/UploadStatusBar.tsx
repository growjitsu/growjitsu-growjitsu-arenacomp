import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useUpload } from '../context/UploadContext';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export const UploadStatusBar: React.FC = () => {
  const { status, progress, message, error } = useUpload();

  if (status === 'idle') return null;

  const getStatusColor = () => {
    switch (status) {
      case 'error': return 'bg-rose-500';
      case 'completed': return 'bg-emerald-500';
      default: return 'bg-[var(--primary)]';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'error': return <AlertCircle size={14} className="text-rose-500" />;
      case 'completed': return <CheckCircle2 size={14} className="text-emerald-500" />;
      default: return <Loader2 size={14} className="text-[var(--primary)] animate-spin" />;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-0 inset-x-0 z-[1000] p-4 pointer-events-none"
      >
        <div className="max-w-xl mx-auto pointer-events-auto">
          <div className="bg-[#0f0f0f]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            {/* Status Info */}
            <div className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-1.5 bg-white/5 rounded-lg">
                  {getStatusIcon()}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
                    {message}
                  </p>
                  {(status === 'uploading' || status === 'preparing' || status === 'processing' || status === 'finalizing') && (
                    <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                      {Math.round(progress)}% Concluído
                    </p>
                  )}
                  {status === 'error' && (
                    <p className="text-[8px] font-bold text-rose-500 uppercase tracking-widest mt-0.5">
                      {error}
                    </p>
                  )}
                </div>
              </div>
              
              {status !== 'error' && status !== 'completed' && (
                <div className="text-[10px] font-black text-[var(--primary)] italic">
                  ARENA PRO
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="h-1 w-full bg-white/5 relative">
              <motion.div
                className={`absolute inset-y-0 left-0 ${getStatusColor()} shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ type: 'spring', stiffness: 50, damping: 20 }}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
