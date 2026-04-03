import React, { useState, useRef } from 'react';
import { Share2, Download, Trophy, X, Loader2, MessageCircle, Link as LinkIcon, Instagram, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CardData, generateCard, shareCard, shareWhatsApp, shareToSocial, shareToArenaComp } from '../services/arenaService';
import { CardPreview } from './CardPreview';
import { toPng } from 'html-to-image';

import { toast } from 'sonner';

interface AchievementCardProps {
  isOpen: boolean;
  onClose: () => void;
  data: CardData;
}

export const AchievementCard: React.FC<AchievementCardProps> = ({ isOpen, onClose, data }) => {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sharingSocial, setSharingSocial] = useState(false);
  const [sharingArena, setSharingArena] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setShareUrl(null);
      setLoading(false);
      setSharingSocial(false);
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

  const handleInstagramShare = async () => {
    if (!cardRef.current) return;
    
    setSharingSocial(true);
    try {
      // 1. Garantir que a imagem está carregada e gerar o PNG do card
      // Usamos cacheBust para evitar problemas de cache com CORS
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#000', // Garantir fundo se houver transparência
      });

      if (!dataUrl || dataUrl.length < 100) {
        throw new Error('Imagem gerada é inválida');
      }

      // 2. Compartilhar usando a função universal
      const result = await shareToSocial(dataUrl, "Minha conquista no ArenaComp 🔥");
      
      if (result.method === 'download') {
        toast.info('Imagem baixada! Agora você pode compartilhar no Instagram.');
        alert("Baixe a imagem e compartilhe no Instagram");
      } else {
        toast.success('Compartilhamento iniciado!');
      }
    } catch (error: any) {
      console.error('Erro ao compartilhar no Instagram:', error);
      toast.error(`Falha ao preparar imagem: ${error.message || 'Erro desconhecido'}`);
      
      // Fallback: Se o toPng falhar, tentamos baixar a imagem original se houver
      if (data.mainImageUrl) {
        try {
          toast.info('Tentando compartilhar imagem original...');
          await shareToSocial(data.mainImageUrl, "Minha conquista no ArenaComp 🔥");
        } catch (fallbackError) {
          alert("Não foi possível preparar a imagem. Tente baixar manualmente.");
        }
      } else {
        alert("Baixe a imagem e compartilhe no Instagram");
      }
    } finally {
      setSharingSocial(false);
    }
  };

  const handleArenaShare = async () => {
    if (!shareUrl) return;
    setSharingArena(true);
    try {
      await shareToArenaComp(data, shareUrl);
      toast.success('Compartilhado com sucesso no ArenaComp!');
    } catch (error: any) {
      console.error('Erro ao compartilhar no ArenaComp:', error);
      toast.error('Falha ao compartilhar no ArenaComp.');
    } finally {
      setSharingArena(false);
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
            className="bg-[#111] border border-white/10 rounded-[2.5rem] overflow-hidden max-w-lg md:max-w-2xl w-full shadow-2xl flex flex-col max-h-[95vh] md:max-h-[90vh]"
          >
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5 flex-shrink-0">
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

            <div className="p-6 flex flex-col md:flex-row items-center md:items-start gap-8 overflow-y-auto custom-scrollbar">
              {/* Real-time Preview */}
              <div 
                ref={cardRef}
                className="w-full max-w-[280px] sm:max-w-[320px] md:max-w-[340px] shadow-2xl rounded-3xl overflow-hidden border border-white/10 bg-black flex-shrink-0"
              >
                <CardPreview data={data} />
              </div>
              
              <div className="flex-1 w-full flex flex-col">
                {!shareUrl ? (
                  <div className="w-full">
                    <h4 className="text-white font-black uppercase italic text-sm mb-4 tracking-tight">Personalize seu Card</h4>
                    <div className="space-y-4 mb-8">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Atleta</p>
                        <p className="text-sm font-bold text-white uppercase">{data.athleteName}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Conquista</p>
                        <p className="text-sm font-bold text-[#D4AF37] uppercase italic">"{data.achievement}"</p>
                      </div>
                    </div>

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
                    <p className="mt-4 text-[10px] font-medium text-zinc-500 text-center md:text-left uppercase tracking-widest">
                      O link incluirá o preview visual para redes sociais
                    </p>
                  </div>
                ) : (
                  <div className="w-full space-y-4">
                    <h4 className="text-white font-black uppercase italic text-sm mb-4 tracking-tight">Compartilhar</h4>
                    
                    {/* ArenaComp Internal Share */}
                    <button
                      onClick={handleArenaShare}
                      disabled={sharingArena}
                      className="w-full p-4 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-500 font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500 text-black flex items-center justify-center">
                          <Trophy size={20} />
                        </div>
                        <div className="text-left">
                          <span className="block">Compartilhar no ArenaComp</span>
                          <span className="text-[8px] text-amber-500/60 font-bold tracking-normal">Postar no feed da comunidade</span>
                        </div>
                      </div>
                      {sharingArena ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Plus size={16} />
                        </div>
                      )}
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={handleCopyLink}
                        className="py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all flex items-center justify-center gap-2"
                      >
                        <LinkIcon className="w-4 h-4" />
                        Copiar Link
                      </button>
                      <button
                        onClick={handleWhatsApp}
                        className="py-4 bg-[#25D366] hover:bg-[#128C7E] text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
                      >
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={handleInstagramShare}
                        disabled={sharingSocial}
                        className="py-4 bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] hover:opacity-90 disabled:opacity-50 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-pink-600/20"
                      >
                        {sharingSocial ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Instagram className="w-4 h-4" />
                        )}
                        Instagram
                      </button>
                      <button
                        onClick={handleShare}
                        className="py-4 bg-[#0066FF] hover:bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                      >
                        <Share2 className="w-4 h-4" />
                        Outros
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
