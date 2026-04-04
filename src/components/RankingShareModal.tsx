import React, { useState, useRef, useEffect } from 'react';
import { Share2, Download, Trophy, X, Loader2, MessageCircle, Link as LinkIcon, Instagram, Plus, Award, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateCard, shareCard, shareWhatsApp, shareToSocial, shareToArenaComp, CardData } from '../services/arenaService';
import { RankingCardPreview } from './RankingCardPreview';
import { supabase } from '../services/supabase';
import { toPng, toJpeg } from 'html-to-image';
import { toast } from 'sonner';

interface RankingShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    athleteName: string;
    profilePhoto?: string;
    position: number;
    totalAthletes?: number;
    modality: string;
    score: number;
    category?: string;
    scope: string;
    location?: string;
    profileUrl: string;
  };
}

export const RankingShareModal: React.FC<RankingShareModalProps> = ({ isOpen, onClose, data }) => {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sharingSocial, setSharingSocial] = useState(false);
  const [sharingArena, setSharingArena] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setShareUrl(null);
      setLoading(false);
      setSharingSocial(false);
    }
  }, [isOpen]);

  const handleGenerateShareLink = async () => {
    if (!cardRef.current) return;
    setLoading(true);
    try {
      // 1. Gerar a imagem do card visual para o preview social
      // Usamos JPEG com qualidade 0.8 para reduzir o tamanho do arquivo (melhor para WhatsApp)
      const dataUrl = await toJpeg(cardRef.current, {
        cacheBust: true,
        quality: 0.8,
        pixelRatio: 1.5,
        backgroundColor: '#000',
      });

      if (!dataUrl) throw new Error('Falha ao gerar imagem do card');

      // 2. Converter dataUrl para Blob
      const imgResponse = await fetch(dataUrl);
      const blob = await imgResponse.blob();

      // 3. Upload para o Supabase Storage
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const fileName = `ranking-share-${user.id}-${Date.now()}.jpg`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // 4. Obter a URL pública da imagem do card
      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath);

      // 5. Gerar o link com a URL da imagem do card
      const cardData: CardData = {
        title: `TOP ${data.position} NO RANKING ${data.scope.toUpperCase()}`,
        athleteName: data.athleteName,
        achievement: `Estou no ${getPositionText(data.position)} do Ranking ${data.scope} de ${data.modality}${data.category ? ` (${data.category})` : ''}!`,
        modality: data.modality,
        profileUrl: data.profileUrl,
        mainImageUrl: publicUrl, // Agora usamos a imagem real do card!
        type: 'ranking' // Mudamos para 'ranking' para melhor identificação
      };
      const url = await generateCard(cardData);
      setShareUrl(url);
      toast.success('Link de compartilhamento gerado com preview!');
    } catch (error: any) {
      console.error('Erro ao gerar link:', error);
      toast.error('Falha ao gerar o link de compartilhamento.');
    } finally {
      setLoading(false);
    }
  };

  const getPositionText = (pos: number) => {
    if (pos === 1) return "TOP 1";
    if (pos <= 10) return `TOP 10`;
    if (pos <= 50) return `TOP 50`;
    if (pos <= 100) return `TOP 100`;
    return `#${pos}`;
  };

  const handleInstagramShare = async () => {
    if (!cardRef.current) return;
    
    setSharingSocial(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#000',
      });

      if (!dataUrl || dataUrl.length < 100) {
        throw new Error('Imagem gerada é inválida');
      }

      const result = await shareToSocial(dataUrl, `Minha posição no Ranking ArenaComp 🔥`);
      
      if (result.method === 'download') {
        toast.info('Imagem baixada! Agora você pode compartilhar no Instagram.');
        alert("Baixe a imagem e compartilhe no Instagram");
      } else {
        toast.success('Compartilhamento iniciado!');
      }
    } catch (error: any) {
      console.error('Erro ao compartilhar no Instagram:', error);
      toast.error(`Falha ao preparar imagem: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setSharingSocial(false);
    }
  };

  const handleArenaShare = async () => {
    if (!shareUrl || !cardRef.current) return;
    setSharingArena(true);
    try {
      // 1. Gerar a imagem do card visual
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#000',
      });

      if (!dataUrl) throw new Error('Falha ao gerar imagem do card');

      // 2. Converter dataUrl para Blob
      const imgResponse = await fetch(dataUrl);
      const blob = await imgResponse.blob();

      // 3. Upload para o Supabase Storage
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const fileName = `ranking-${user.id}-${Date.now()}.png`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, blob, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // 4. Obter a URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath);

      // 5. Preparar dados e compartilhar
      const cardData: CardData = {
        title: `TOP ${data.position} NO RANKING ${data.scope.toUpperCase()}`,
        athleteName: data.athleteName,
        achievement: `Estou no ${getPositionText(data.position)} do Ranking ${data.scope} de ${data.modality}${data.category ? ` (${data.category})` : ''}!`,
        modality: data.modality,
        profileUrl: data.profileUrl,
        mainImageUrl: data.profilePhoto,
        type: 'profile'
      };
      
      await shareToArenaComp(cardData, shareUrl, publicUrl);
      toast.success('Compartilhado com sucesso no ArenaComp!');
    } catch (error: any) {
      console.error('Erro ao compartilhar no ArenaComp:', error);
      toast.error('Falha ao compartilhar no ArenaComp.');
    } finally {
      setSharingArena(false);
    }
  };

  const handleWhatsApp = () => {
    if (!shareUrl) return;
    shareWhatsApp(shareUrl, `Confira minha posição no Ranking ArenaComp 🔥`);
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
                  <h3 className="text-lg font-black uppercase italic text-white tracking-tighter">Compartilhar Ranking</h3>
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
                <RankingCardPreview data={data} />
              </div>
              
              <div className="flex-1 w-full flex flex-col">
                {!shareUrl ? (
                  <div className="w-full">
                    <h4 className="text-white font-black uppercase italic text-sm mb-4 tracking-tight">Seu Card de Elite</h4>
                    <div className="space-y-4 mb-8">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Posição</p>
                        <p className="text-sm font-bold text-white uppercase italic">{getPositionText(data.position)} {data.scope}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Modalidade</p>
                        <p className="text-sm font-bold text-[#D4AF37] uppercase italic">{data.modality}</p>
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
                        onClick={() => shareCard(shareUrl, `Minha posição no Ranking ArenaComp 🔥`)}
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
