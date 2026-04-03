import React from 'react';
import { Trophy, Medal, Star, Target, Award } from 'lucide-react';

interface RankingCardPreviewProps {
  data: {
    athleteName: string;
    profilePhoto?: string;
    position: number;
    totalAthletes?: number;
    modality: string;
    score: number;
    category?: string;
    scope: string; // 'Mundial', 'Nacional', 'Cidade'
    location?: string;
  };
  className?: string;
}

export const RankingCardPreview: React.FC<RankingCardPreviewProps> = ({ data, className = "" }) => {
  const {
    athleteName,
    profilePhoto,
    position,
    modality,
    score,
    category,
    scope,
    location
  } = data;

  const getPositionText = (pos: number) => {
    if (pos === 1) return "TOP 1";
    if (pos <= 10) return `TOP 10`;
    if (pos <= 50) return `TOP 50`;
    if (pos <= 100) return `TOP 100`;
    return `#${pos}`;
  };

  const getRankColor = (pos: number) => {
    if (pos === 1) return "from-yellow-400 via-yellow-600 to-yellow-800";
    if (pos <= 3) return "from-zinc-300 via-zinc-400 to-zinc-500";
    if (pos <= 10) return "from-amber-600 via-amber-700 to-amber-800";
    return "from-blue-600 via-blue-700 to-blue-800";
  };

  return (
    <div className={`relative w-full aspect-[9/16] bg-zinc-950 overflow-hidden shadow-2xl [container-type:inline-size] ${className}`}>
      {/* Dynamic Background based on rank */}
      <div className={`absolute inset-0 bg-gradient-to-br ${getRankColor(position)} opacity-20`} />
      
      {/* Texture/Pattern Overlay */}
      <div className="absolute inset-0 opacity-10 mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

      {/* Decorative Elements */}
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[var(--primary)]/10 rounded-full blur-3xl" />

      <div className="relative h-full p-8 flex flex-col items-center justify-between z-10">
        {/* Header */}
        <div className="w-full flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Trophy size={16} className="text-white" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 italic">Arena Rankings</span>
          </div>
          <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
            <span className="text-[8px] font-black uppercase tracking-widest text-white">{scope}</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-grow flex flex-col items-center justify-center w-full gap-6 py-4">
          {/* Profile Photo with Rank Badge */}
          <div className="relative flex-shrink-0">
            <div className="w-32 h-32 md:w-36 md:h-36 rounded-full p-1 bg-gradient-to-tr from-[var(--primary)] to-white/20 shadow-2xl">
              <div className="w-full h-full rounded-full bg-zinc-900 overflow-hidden border-4 border-zinc-950">
                {profilePhoto ? (
                  <img 
                    src={profilePhoto} 
                    alt={athleteName} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                    <Star size={40} className="text-zinc-600" />
                  </div>
                )}
              </div>
            </div>
            
            {/* Rank Badge */}
            <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-xl shadow-2xl border border-white/20 flex items-center gap-2 bg-gradient-to-r ${getRankColor(position)} z-20`}>
              {position <= 3 ? <Award size={16} className="text-white" /> : <Target size={16} className="text-white" />}
              <span className="text-base font-black text-white italic tracking-tighter">
                {getPositionText(position)}
              </span>
            </div>
          </div>

          {/* Athlete Info */}
          <div className="text-center w-full px-4 flex flex-col items-center gap-3">
            <h2 className="text-[1.5rem] md:text-[1.75rem] font-black uppercase italic text-white tracking-tighter leading-[1.1] max-w-full break-words">
              {athleteName}
            </h2>
            <div className="flex flex-col items-center gap-2">
              <div className="flex flex-wrap justify-center items-center gap-2">
                <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10">
                  <span className="text-[9px] font-black text-[var(--primary)] uppercase tracking-[0.15em]">
                    {modality}
                  </span>
                </div>
                {category && (
                  <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10">
                    <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest">
                      {category}
                    </span>
                  </div>
                )}
              </div>
              {location && (
                <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] italic">
                  {location}
                </p>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 w-full max-w-[260px] px-4">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center">
              <p className="text-[7px] font-black text-white/40 uppercase tracking-widest mb-1">Pontuação</p>
              <p className="text-lg font-black text-white tracking-tighter italic">{Math.round(score)}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center">
              <p className="text-[7px] font-black text-white/40 uppercase tracking-widest mb-1">Status</p>
              <p className="text-lg font-black text-[var(--primary)] tracking-tighter italic uppercase">Elite</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full pt-6 border-t border-white/10 flex justify-between items-end">
          <div className="space-y-1">
            <div className="text-xl font-black tracking-tighter text-white italic leading-none">
              ARENA<span className="text-[var(--primary)]">COMP</span>
            </div>
            <p className="text-[7px] font-black uppercase tracking-[0.3em] text-white/30">Protocolo de Elite v3.0</p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-[8px] font-black text-white uppercase tracking-widest leading-none">Ranking</p>
              <p className="text-[10px] font-black text-[var(--primary)] uppercase italic leading-none">Oficial</p>
            </div>
            <div className="w-10 h-10 bg-white/10 rounded-xl border border-white/20 flex items-center justify-center">
              <Star size={20} className="text-[var(--primary)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
