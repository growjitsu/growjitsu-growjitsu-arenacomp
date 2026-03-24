import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CardPreview } from '../components/CardPreview';
import { Trophy, ArrowLeft, Share2, Download } from 'lucide-react';
import { motion } from 'motion/react';

import { toast } from 'sonner';

export const SharePage = () => {
  const { type, id } = useParams<{ type?: string; id: string }>();
  const navigate = useNavigate();
  const [cardData, setCardData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    try {
      // Decode Base64 data from ID
      const decodedData = JSON.parse(atob(id));
      setCardData(decodedData);

      // Redirection logic as requested
      const contentType = type || decodedData.type;
      const realId = decodedData.realId;

      if (realId && contentType) {
        // Redirection logic as requested
        if (contentType === 'post') navigate(`/post/${realId}`);
        else if (contentType === 'certificate') navigate(`/certificate/${realId}`);
        else if (contentType === 'clip') navigate(`/clip/${realId}`);
        else if (contentType === 'profile') navigate(`/profile/${realId}`);
        else if (contentType === 'championship' || contentType === 'fight') {
          // Redirect to profile since these are part of the profile view
          if (decodedData.profileUrl) {
            const usernameMatch = decodedData.profileUrl.match(/@([^/]+)/);
            if (usernameMatch) {
              navigate(`/profile/@${usernameMatch[1]}`);
            } else {
              navigate('/');
            }
          } else {
            navigate('/');
          }
        }
        else navigate('/');
      }
    } catch (err) {
      console.error('Erro ao decodificar dados do card:', err);
      setError('Link de compartilhamento inválido ou expirado.');
    }
  }, [id, type, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-center justify-center text-rose-500 mb-6">
          <Trophy size={40} />
        </div>
        <h1 className="text-2xl font-black uppercase italic mb-4">Ops! Algo deu errado</h1>
        <p className="text-gray-400 mb-8 max-w-xs">{error}</p>
        <button 
          onClick={() => navigate('/')}
          className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all flex items-center space-x-2"
        >
          <ArrowLeft size={16} />
          <span>Voltar para ArenaComp</span>
        </button>
      </div>
    );
  }

  if (!cardData) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#0066FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate('/')}
          className="p-2 bg-white/5 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-[#0066FF] to-blue-700 rounded-lg flex items-center justify-center font-black text-white italic border border-white/10">
            <Trophy size={16} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">ArenaComp</span>
        </div>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Card Preview Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[320px] bg-[#111] rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden mb-8"
      >
        <CardPreview data={cardData} />
      </motion.div>

      {/* Actions */}
      <div className="w-full max-w-md grid grid-cols-1 gap-4">
        <button 
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: cardData.title || 'Minha conquista no ArenaComp',
                text: `Veja minha conquista na ArenaComp 🔥`,
                url: window.location.href
              });
            } else {
              navigator.clipboard.writeText(window.location.href);
              toast.success('Link copiado para a área de transferência!');
            }
          }}
          className="w-full py-4 bg-[#0066FF] text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-blue-600/20 hover:bg-blue-600 transition-all flex items-center justify-center space-x-3"
        >
          <Share2 size={18} />
          <span>Compartilhar Link</span>
        </button>
        
        <button 
          onClick={() => navigate('/')}
          className="w-full py-4 bg-white/5 text-white border border-white/10 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-white/10 transition-all flex items-center justify-center space-x-3"
        >
          <span>Criar meu próprio Card</span>
        </button>
      </div>

      <p className="mt-12 text-[9px] font-black uppercase tracking-[0.3em] text-gray-600">
        Arena Protocol v3.1 • Share System
      </p>
    </div>
  );
};
