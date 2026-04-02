import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  variant?: 'full' | 'icon';
}

export const Logo: React.FC<LogoProps> = ({ 
  className = "", 
  size = 40, 
  showText = false,
  variant = 'full'
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div 
        style={{ width: size, height: size }}
        className="relative flex items-center justify-center group"
      >
        {/* Shield Background with Glow */}
        <div className="absolute inset-0 bg-blue-600/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-2xl"
        >
          {/* Definitions for Gradients */}
          <defs>
            <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E3A8A" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>
            <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="50%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
            <linearGradient id="trophyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="50%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
          </defs>

          {/* Shield Shape */}
          <path 
            d="M50 5 L15 20 V45 C15 65 30 85 50 95 C70 85 85 65 85 45 V20 L50 5Z" 
            fill="url(#shieldGradient)"
            stroke="url(#borderGradient)"
            strokeWidth="4"
            strokeLinejoin="round"
          />

          {/* Trophy Icon */}
          <g transform="translate(25, 25) scale(0.5)">
            {/* Trophy Cup */}
            <path 
              d="M20 10 H80 V40 C80 56.5 66.5 70 50 70 C33.5 70 20 56.5 20 40 V10Z" 
              fill="url(#trophyGradient)" 
            />
            {/* Trophy Handles */}
            <path 
              d="M20 20 H5 V35 C5 43.3 11.7 50 20 50 V20Z" 
              fill="#2563EB" 
            />
            <path 
              d="M80 20 H95 V35 C95 43.3 88.3 50 80 50 V20Z" 
              fill="#2563EB" 
            />
            {/* Trophy Stem */}
            <rect x="42" y="70" width="16" height="15" fill="#1D4ED8" />
            {/* Trophy Base */}
            <path 
              d="M30 85 H70 L75 95 H25 L30 85Z" 
              fill="#1E40AF" 
            />
            {/* Shine/Highlight */}
            <path 
              d="M30 15 H40 V35 C40 40.5 35.5 45 30 45 V15Z" 
              fill="white" 
              fillOpacity="0.2" 
            />
          </g>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col -space-y-1">
          <div className="flex items-baseline italic">
            <span className="text-xl font-black text-white tracking-tighter uppercase">Arena</span>
            <span className="text-xl font-black text-blue-500 tracking-tighter uppercase">Comp</span>
          </div>
          <span className="text-[8px] font-bold text-blue-400/60 uppercase tracking-[0.3em] pl-0.5">Competition Platform</span>
        </div>
      )}
    </div>
  );
};
