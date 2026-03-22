import React, { useState } from 'react';
import { Share2, Download, Trophy, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateCard } from '../services/arenaService';

interface AchievementCardProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    title: string;
    athleteName: string;
    achievement: string;
    modality: string;
    profileUrl: string;
  };
}

export const AchievementCard: React.FC<AchievementCardProps> = ({ isOpen, onClose, data }) => {
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setCardUrl(null);
      setLoading(false);
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    console.log('Iniciando geração de card com dados:', data);
    setLoading(true);
    try {
      const url = await generateCard(data);
      console.log('Card gerado com sucesso:', url);
      setCardUrl(url);
    } catch (error: any) {
      console.error('Erro ao gerar card:', error);
      alert('Falha ao gerar o card. Por favor, tente novamente.\nErro: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!cardUrl) return;
    const link = document.createElement('a');
    link.href = cardUrl;
    link.download = `ArenaComp-Conquista-${data.athleteName.replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    if (!cardUrl) return;
    try {
      const response = await fetch(cardUrl);
      const blob = await response.blob();
      const file = new File([blob], 'achievement.png', { type: 'image/png' });
      
      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: 'Minha Conquista na ArenaComp',
          text: `Confira minha nova conquista na ArenaComp: ${data.achievement}!`,
        });
      } else {
        // Fallback: copy to clipboard or just download
        handleDownload();
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl"
          >
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Card de Conquista</h3>
                  <p className="text-xs text-zinc-400">Gere um card para compartilhar</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 flex flex-col items-center">
              {cardUrl ? (
                <div className="relative group">
                  <img
                    src={cardUrl}
                    alt="Achievement Card"
                    className="w-full rounded-xl shadow-2xl border border-zinc-700"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                    <p className="text-white font-medium">Visualização do Card</p>
                  </div>
                </div>
              ) : (
                <div className="w-full aspect-[4/5] bg-zinc-800/50 rounded-xl border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center p-12 text-center">
                  <Trophy className="w-16 h-16 text-zinc-600 mb-4" />
                  <h4 className="text-zinc-300 font-bold mb-2">Pronto para Gerar!</h4>
                  <p className="text-zinc-500 text-sm mb-8">
                    Vamos criar um card incrível para sua conquista: "{data.achievement}"
                  </p>
                  <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-700 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Gerando Card...
                      </>
                    ) : (
                      <>
                        <Trophy className="w-5 h-5" />
                        Gerar Card Agora
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {cardUrl && (
              <div className="p-6 bg-zinc-800/50 border-t border-zinc-800 flex gap-4">
                <button
                  onClick={handleDownload}
                  className="flex-1 py-3 bg-zinc-700 hover:bg-zinc-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Baixar
                </button>
                <button
                  onClick={handleShare}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Share2 className="w-5 h-5" />
                  Compartilhar
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
