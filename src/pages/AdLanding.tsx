import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { ArenaAd } from '../types';
import { motion } from 'motion/react';
import { ExternalLink, Share2, MessageCircle, Instagram, Copy, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export const AdLanding: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [ad, setAd] = useState<ArenaAd | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAd = async () => {
      if (!id) return;
      
      try {
        const adDoc = await getDoc(doc(db, 'arena_ads', id));
        
        if (adDoc.exists()) {
          const adData = { id: adDoc.id, ...adDoc.data() } as ArenaAd;
          
          if (!adData.active || !adData.landing_enabled) {
            setError('Anúncio não disponível');
          } else {
            setAd(adData);
            // Track impression
            updateDoc(doc(db, 'arena_ads', id), {
              total_impressions: increment(1)
            }).catch(err => console.error('Error tracking impression:', err));
          }
        } else {
          setError('Anúncio não encontrado');
        }
      } catch (err) {
        console.error('Error fetching ad:', err);
        setError('Erro ao carregar anúncio');
      } finally {
        setLoading(false);
      }
    };

    fetchAd();
  }, [id]);

  const handleCTA = async () => {
    if (!ad?.landing_cta_url) return;
    
    // Track click
    try {
      await updateDoc(doc(db, 'arena_ads', ad.id), {
        total_clicks: increment(1)
      });
    } catch (err) {
      console.error('Error tracking click:', err);
    }
    
    window.open(ad.landing_cta_url, '_blank', 'noreferrer');
  };

  const handleShare = (platform: 'whatsapp' | 'instagram' | 'copy') => {
    const shareUrl = `${window.location.origin}/ad/${id}`;
    const text = ad?.landing_title || ad?.title || 'Confira este anúncio na ArenaComp!';

    if (platform === 'whatsapp') {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + shareUrl)}`, '_blank');
    } else if (platform === 'copy') {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Link copiado para a área de transferência!');
    } else if (platform === 'instagram') {
      // Instagram doesn't have a direct share URL for feed/stories from web, but we can copy link as fallback
      navigator.clipboard.writeText(shareUrl);
      toast.success('Link copiado! Abra o Instagram e compartilhe.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
      </div>
    );
  }

  if (error || !ad) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white p-6">
        <AlertCircle className="w-16 h-16 text-rose-500 mb-4 opacity-50" />
        <h1 className="text-2xl font-black uppercase tracking-tight mb-2">{error || 'Indisponível'}</h1>
        <p className="text-gray-500 mb-8 max-w-xs text-center text-sm">Este anúncio pode ter sido removido ou está temporariamente fora do ar.</p>
        <button 
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all font-bold text-xs"
        >
          <ArrowLeft size={16} />
          <span>VOLTAR PARA ARENA</span>
        </button>
      </div>
    );
  }

  const renderLayout = () => {
    const layout = ad.landing_layout || 'simple';

    switch (layout) {
      case 'premium':
        return (
          <div className="max-w-4xl mx-auto py-12 px-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#111] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl"
            >
              <div className="aspect-video w-full relative">
                <img 
                  src={ad.landing_image || ad.media_url} 
                  alt={ad.landing_title} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
              </div>
              <div className="p-10 md:p-16">
                <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-6 leading-none">
                  {ad.landing_title || ad.title}
                </h1>
                <div className="h-1 w-24 bg-[var(--primary)] mb-8" />
                <p className="text-lg md:text-xl text-gray-400 font-medium leading-relaxed mb-12 whitespace-pre-wrap">
                  {ad.landing_description || ad.content}
                </p>
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <button 
                    onClick={handleCTA}
                    className="w-full md:w-auto px-12 py-5 bg-[var(--primary)] text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-[0_10px_30px_rgba(var(--primary-rgb),0.3)] hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center space-x-3"
                  >
                    <span>{ad.landing_cta_text || 'SAIBA MAIS'}</span>
                    <ExternalLink size={18} />
                  </button>
                  <div className="flex items-center space-x-4">
                    <button onClick={() => handleShare('whatsapp')} className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">
                      <MessageCircle size={22} />
                    </button>
                    <button onClick={() => handleShare('instagram')} className="p-4 bg-pink-500/10 text-pink-500 rounded-2xl border border-pink-500/20 hover:bg-pink-500/20 transition-all">
                      <Instagram size={22} />
                    </button>
                    <button onClick={() => handleShare('copy')} className="p-4 bg-white/5 text-white rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                      <Copy size={22} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        );

      case 'highlight':
        return (
          <div className="max-w-2xl mx-auto py-12 px-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#111] border border-white/10 rounded-[2.5rem] overflow-hidden"
            >
              <div className="aspect-[4/5] w-full">
                <img 
                  src={ad.landing_image || ad.media_url} 
                  alt={ad.landing_title} 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-10 text-center">
                <h1 className="text-3xl font-black uppercase tracking-tight mb-4 italic">
                  {ad.landing_title || ad.title}
                </h1>
                <p className="text-gray-400 font-medium mb-10 leading-relaxed italic">
                  {ad.landing_description || ad.content}
                </p>
                <button 
                  onClick={handleCTA}
                  className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] transition-all active:scale-95 mb-8"
                >
                  {ad.landing_cta_text || 'QUERO ME INSCREVER'}
                </button>
                <div className="flex items-center justify-center space-x-6 text-gray-500">
                  <button onClick={() => handleShare('whatsapp')} className="hover:text-emerald-500 transition-colors"><MessageCircle size={20} /></button>
                  <button onClick={() => handleShare('instagram')} className="hover:text-pink-500 transition-colors"><Instagram size={20} /></button>
                  <button onClick={() => handleShare('copy')} className="hover:text-white transition-colors"><Copy size={20} /></button>
                </div>
              </div>
            </motion.div>
          </div>
        );

      case 'simple':
      default:
        return (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#111] to-[#0a0a0a]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-sm"
            >
              <div className="aspect-square w-full rounded-3xl overflow-hidden shadow-2xl mb-8 border border-white/10">
                <img 
                  src={ad.landing_image || ad.media_url} 
                  alt={ad.landing_title} 
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-center mb-6 italic">
                {ad.landing_title || ad.title}
              </h1>
              <button 
                onClick={handleCTA}
                className="w-full py-5 bg-[var(--primary)] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-[var(--primary)]/20 hover:scale-[1.02] transition-all active:scale-95 mb-8"
              >
                {ad.landing_cta_text || 'SAIBA MAIS'}
              </button>
              <div className="flex items-center justify-center space-x-8 text-gray-500">
                <button onClick={() => handleShare('whatsapp')} className="hover:text-emerald-500 transition-colors"><MessageCircle size={20}/></button>
                <button onClick={() => handleShare('instagram')} className="hover:text-pink-500 transition-colors"><Instagram size={20}/></button>
                <button onClick={() => handleShare('copy')} className="hover:text-white transition-colors"><Copy size={20}/></button>
              </div>
            </motion.div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {renderLayout()}
      
      {/* Footer / Branding */}
      <div className="fixed bottom-8 left-0 right-0 flex justify-center opacity-30 pointer-events-none">
        <p className="text-[10px] font-black uppercase tracking-[0.4em]">ArenaComp v8.0</p>
      </div>
    </div>
  );
};
