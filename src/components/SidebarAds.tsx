import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink, ChevronRight, ChevronLeft } from 'lucide-react';
import { ArenaAd, ArenaProfile } from '../types';
import { trackAdEvent } from '../services/adService';

interface SidebarAdsProps {
  ads: ArenaAd[];
  userProfile?: ArenaProfile | null;
}

export const SidebarAds: React.FC<SidebarAdsProps> = ({ ads, userProfile }) => {
  const sidebarAds = ads.filter(ad => (ad.placement || '').toLowerCase().includes('sidebar'));
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (sidebarAds.length <= 1) return;

    const currentAd = sidebarAds[currentIndex];
    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % sidebarAds.length);
    }, (currentAd?.display_time || 10) * 1000);

    return () => clearTimeout(timer);
  }, [sidebarAds.length, currentIndex]);

  useEffect(() => {
    if (sidebarAds.length > 0 && sidebarAds[currentIndex]) {
      trackAdEvent(sidebarAds[currentIndex].id, 'impression', userProfile?.id);
    }
  }, [currentIndex, sidebarAds.length, userProfile?.id]);

  if (sidebarAds.length === 0) return null;

  const currentAd = sidebarAds[currentIndex];
  const adMediaUrl = currentAd.media_url_sidebar || currentAd.media_url;
  const isVideo = adMediaUrl?.match(/\.(mp4|webm|ogg|mov)$/i) || adMediaUrl?.includes('video');

  return (
    <div className="sticky top-[104px] space-y-6 max-h-[calc(100vh-120px)] overflow-y-auto pr-2 custom-scrollbar pb-10">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentAd.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.5 }}
          className="group relative bg-[var(--surface)]/40 backdrop-blur-xl border border-[var(--border-ui)] rounded-[2.5rem] overflow-hidden hover:border-[var(--primary)]/40 transition-all duration-500 shadow-2xl"
        >
          <a 
            href={currentAd.link_url} 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={() => trackAdEvent(currentAd.id, 'click', userProfile?.id)}
            className="block"
          >
            {adMediaUrl && (
              <div className="aspect-[4/5] relative overflow-hidden bg-black">
                {isVideo ? (
                  <video 
                    src={adMediaUrl} 
                    className="w-full h-full object-cover" 
                    autoPlay 
                    muted 
                    loop 
                    playsInline 
                  />
                ) : (
                  <img 
                    src={adMediaUrl} 
                    alt={currentAd.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
              </div>
            )}

            <div className="p-6 space-y-3">
              <h4 className="text-lg font-black uppercase tracking-tight text-[var(--text-main)] italic leading-tight group-hover:text-[var(--primary)] transition-colors">
                {currentAd.title}
              </h4>
              <p className="text-xs text-[var(--text-muted)] line-clamp-3 leading-relaxed">
                {currentAd.content}
              </p>
              
              <div className="pt-4 flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[9px] font-black uppercase tracking-widest text-[var(--primary)]">
                  Ver Detalhes
                </span>
                <ExternalLink size={14} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
              </div>
            </div>
          </a>
        </motion.div>
      </AnimatePresence>

      {/* Mini Stats / Trust Badges */}
      <div className="grid grid-cols-2 gap-3 px-2">
        <div className="p-3 rounded-2xl bg-[var(--surface)]/20 border border-[var(--border-ui)] text-center">
          <p className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Alcance</p>
          <p className="text-xs font-black text-[var(--text-main)]">100% Real</p>
        </div>
        <div className="p-3 rounded-2xl bg-[var(--surface)]/20 border border-[var(--border-ui)] text-center">
          <p className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Seguro</p>
          <p className="text-xs font-black text-[var(--text-main)]">Verificado</p>
        </div>
      </div>
    </div>
  );
};
