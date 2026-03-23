import React from 'react';
import { Trophy, MapPin, Calendar } from 'lucide-react';
import { CardData } from '../services/arenaService';

interface CardPreviewProps {
  data: CardData;
  className?: string;
}

export const CardPreview: React.FC<CardPreviewProps> = ({ data, className = "" }) => {
  const {
    athleteName,
    achievement,
    modality,
    date,
    mainImageUrl,
    profileUrl
  } = data;

  return (
    <div className={`relative w-full aspect-[4/5] bg-gradient-to-br from-[#001F3F] via-[#003366] to-[#D4AF37] overflow-hidden shadow-2xl ${className}`}>
      {/* Background Overlay for texture */}
      <div className="absolute inset-0 opacity-30 mix-blend-overlay">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,_rgba(255,255,255,0.2)_0%,_transparent_50%)]" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,_rgba(0,0,0,0.4)_0%,_transparent_50%)]" />
      </div>

      {/* Main Image (if exists) */}
      {mainImageUrl && (
        <div className="absolute inset-0 z-0">
          <img 
            src={mainImageUrl} 
            alt="Achievement" 
            className="w-full h-full object-cover opacity-40 grayscale-[50%]"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#001F3F] via-transparent to-transparent" />
        </div>
      )}

      {/* Badge */}
      <div className="absolute top-6 right-6 w-14 h-14 bg-[#D4AF37] rounded-2xl flex items-center justify-center shadow-xl z-20 rotate-12 border border-white/20">
        <Trophy className="w-7 h-7 text-black" />
      </div>

      <div className="relative h-full p-8 flex flex-col justify-between z-10">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center">
            <Trophy size={18} className="text-[#D4AF37]" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4AF37]">Arena Protocol</p>
            <p className="text-[12px] font-black uppercase tracking-[0.1em] text-white">Achievement Card</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-grow flex flex-col justify-center space-y-4">
          <div className="space-y-1">
            <h1 className="text-5xl font-black uppercase leading-[0.85] text-white tracking-tighter drop-shadow-2xl">
              {athleteName}
            </h1>
            <div className="inline-block px-3 py-1 bg-[#D4AF37] rounded-md">
              <span className="text-[10px] font-black text-black uppercase tracking-widest">
                {modality}
              </span>
            </div>
          </div>
          
          <div className="max-w-[90%]">
            <p className="text-2xl font-black uppercase italic text-white leading-tight drop-shadow-lg">
              "{achievement}"
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-end pt-6 border-t border-white/10">
          <div className="space-y-1">
            <div className="text-2xl font-black tracking-tighter text-white italic">
              ARENA<span className="text-[#D4AF37]">COMP</span>
            </div>
            {date && (
              <div className="flex items-center gap-2 text-white/60 font-bold uppercase text-[9px] tracking-widest">
                <Calendar className="w-3 h-3" />
                {date}
              </div>
            )}
          </div>

          {/* Verification Badge */}
          <div className="flex flex-col items-end">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex items-center justify-center mb-1">
               <div className="w-8 h-8 bg-[#D4AF37] rounded-lg flex items-center justify-center">
                  <span className="text-[8px] font-black text-black">V3</span>
               </div>
            </div>
            <span className="text-[7px] font-black uppercase tracking-widest text-white/40">Verified Protocol</span>
          </div>
        </div>
      </div>
    </div>
  );
};
