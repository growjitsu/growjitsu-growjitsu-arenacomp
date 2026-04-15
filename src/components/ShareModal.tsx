import React, { useState } from 'react';
import { Share2, Copy, Trophy, X, Check, Award, Plus, Loader2, Instagram, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { shareToArenaComp, CardData } from '../services/arenaService';
import { toast } from 'sonner';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: () => void;
  url: string;
  title: string;
  subtitle?: string;
  followerCount: number;
  imageUrl?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({ 
  isOpen, 
  onClose, 
  onGenerate, 
  url, 
  title,
  subtitle,
  followerCount,
  imageUrl
}) => {
  const [copied, setCopied] = useState(false);
  const [sharingArena, setSharingArena] = useState(false);

  const handleArenaShare = async () => {
    setSharingArena(true);
    try {
      const cardData: CardData = {
        title: title,
        athleteName: subtitle || title,
        achievement: 'Confira este conteúdo no ArenaComp!',
        modality: 'Arena',
        profileUrl: url,
        type: 'post',
        mainImageUrl: imageUrl
      };
      await shareToArenaComp(cardData, url);
      toast.success('Compartilhado com sucesso no ArenaComp!');
      onClose();
    } catch (error: any) {
      console.error('Erro ao compartilhar no ArenaComp:', error);
      toast.error('Falha ao compartilhar no ArenaComp.');
    } finally {
      setSharingArena(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Link copiado!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`🔥 ${title}\n${subtitle ? subtitle + '\n' : ''}\nConfira na ArenaComp: ${url}`);
    const whatsappUrl = `https://wa.me/?text=${text}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleInstagramShare = async () => {
    // Instagram deep link logic
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    // Copy link first as it's the most reliable way to share to Instagram (via Bio or Stories Link Sticker)
    await handleCopyLink();
    
    if (isAndroid) {
      // Android Intent for Instagram
      const intentUrl = `intent://instagram.com/#Intent;package=com.instagram.android;end`;
      window.location.href = intentUrl;
      toast.info('Link copiado! Abra o Instagram e cole nos seus Stories.');
    } else if (isIOS) {
      // iOS URL Scheme
      const iosUrl = `instagram://app`;
      window.location.href = iosUrl;
      toast.info('Link copiado! Abra o Instagram e cole nos seus Stories.');
    } else if (navigator.share) {
      // Web Share API fallback for mobile browsers
      try {
        await navigator.share({
          title: title,
          text: subtitle || 'Confira este conteúdo na ArenaComp!',
          url: url,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      // Desktop fallback
      window.open('https://www.instagram.com', '_blank');
      toast.info('Link copiado! Compartilhe no seu perfil do Instagram.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden max-w-sm w-full shadow-2xl"
          >
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-[var(--primary)]" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-white italic">Compartilhar</h3>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest truncate max-w-[180px]">
                    {subtitle || title}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              {/* Option 0: Share on ArenaComp */}
              <button
                onClick={handleArenaShare}
                disabled={sharingArena}
                className="w-full p-4 rounded-2xl border bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-500 text-black">
                    {sharingArena ? <Loader2 className="w-6 h-6 animate-spin" /> : <Trophy size={24} />}
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase italic text-amber-500">Compartilhar no ArenaComp</h4>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      Postar no feed da comunidade
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                  <Plus size={16} />
                </div>
              </button>

              {/* Option 1: WhatsApp Direct */}
              <button
                onClick={handleWhatsAppShare}
                className="w-full p-4 rounded-2xl border bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500 text-white">
                    <MessageCircle size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase italic text-emerald-500">WhatsApp</h4>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      Enviar para contatos ou grupos
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                  <Plus size={16} />
                </div>
              </button>

              {/* Option 2: Instagram Direct */}
              <button
                onClick={handleInstagramShare}
                className="w-full p-4 rounded-2xl border bg-pink-500/10 border-pink-500/20 hover:bg-pink-500/20 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-tr from-amber-500 via-pink-500 to-violet-600 text-white">
                    <Instagram size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase italic text-pink-500">Instagram</h4>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      Compartilhar no Stories ou Feed
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-500 group-hover:scale-110 transition-transform">
                  <Plus size={16} />
                </div>
              </button>

              {/* Option 3: Generate Card */}
              <button
                onClick={() => {
                  onGenerate();
                  onClose();
                }}
                className="w-full p-4 rounded-2xl border bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-500 text-black">
                    <Trophy size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase italic text-amber-500">Card Visual</h4>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      Preview estilizado para redes
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                  <Award size={16} />
                </div>
              </button>

              {/* Option 2: Copy Link */}
              <button
                onClick={handleCopyLink}
                className="w-full p-4 rounded-2xl bg-zinc-800/50 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-12 h-12 rounded-xl bg-zinc-700 text-white flex items-center justify-center">
                    <Copy size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase italic text-white">Copiar Link</h4>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Link direto para compartilhar</p>
                  </div>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${copied ? 'bg-emerald-500/20 text-emerald-500' : 'bg-zinc-700/50 text-zinc-400 group-hover:scale-110'}`}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </div>
              </button>
            </div>

            <div className="p-4 bg-zinc-950/50 border-t border-zinc-800">
              <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] text-center">
                ArenaComp • Onde os campeões se encontram
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
