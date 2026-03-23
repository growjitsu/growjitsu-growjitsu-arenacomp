import React, { useState } from 'react';
import { Share2, Download, Trophy, X, Loader2, MessageCircle, Link as LinkIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CardData, generateCard, shareCard, shareWhatsApp } from '../services/arenaService';
import { CardPreview } from './CardPreview';

import { toast } from 'sonner';

interface AchievementCardProps {
  isOpen: boolean;
  onClose: () => void;
  data: CardData;
}

export const AchievementCard: React.FC<AchievementCardProps> = ({ isOpen, onClose, data }) => {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setShareUrl(null);
      setLoading(false);
    }
  }, [isOpen]);

  const handleGenerateShareLink = async () => {
    setLoading(true);
    try {
      const url = await generateCard(data);
      setShareUrl(url);
      toast.success('Link de compartilhamento gerado!');
    } catch (error: any) {
      console.error('Erro ao gerar link:', error);
      toast.error('Falha ao gerar o link de compartilhamento.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!shareUrl) return;
    await shareCard(shareUrl, `Minha conquista no ArenaComp: ${data.title}`);
  };

  const handleWhatsApp = () => {
    if (!shareUrl) return;
    shareWhatsApp(shareUrl, `Confira minha conquista na ArenaComp 🔥`);
  };

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copiado para a área de transferência!');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-[#111] border border-white/10 rounded-[2.5rem] overflow-hidden max-w-lg w-full shadow-2xl"
          >
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/20">
                  <Trophy className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase italic text-white tracking-tighter">Card de Conquista</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">Preview em tempo real</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center">
              {/* Real-time Preview */}
              <div className="w-full max-w-[320px] shadow-2xl rounded-3xl overflow-hidden border border-white/10">
                <CardPreview data={data} />
              </div>
              
              {!shareUrl && (
                <div className="mt-8 w-full">
                  <button
                    onClick={handleGenerateShareLink}
                    disabled={loading}
                    className="w-full py-4 bg-[#0066FF] hover:bg-blue-600 disabled:bg-zinc-800 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-600/20"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Gerando Link...
                      </>
                    ) : (
                      <>
                        <Share2 className="w-5 h-5" />
                        Gerar Link de Compartilhamento
                      </>
                    )}
                  </button>
                  <p className="mt-4 text-[10px] font-medium text-zinc-500 text-center uppercase tracking-widest">
                    O link incluirá o preview visual para redes sociais
                  </p>
                </div>
              )}
            </div>

            {shareUrl && (
              <div className="p-6 bg-white/5 border-t border-white/5 flex flex-col gap-4">
                <div className="flex gap-3">
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all flex items-center justify-center gap-2"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Copiar Link
                  </button>
                  <button
                    onClick={handleWhatsApp}
                    className="flex-1 py-4 bg-[#25D366] hover:bg-[#128C7E] text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </button>
                </div>
                <button
                  onClick={handleShare}
                  className="w-full py-4 bg-[#0066FF] hover:bg-blue-600 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-600/20"
                >
                  <Share2 className="w-5 h-5" />
                  Compartilhar Agora
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
