import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Trophy, Search, User, Dumbbell, Sun, Moon, Edit3, Bell, Zap, ChevronRight, Menu, X, LogOut, Settings, PlusSquare, PlaySquare } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ArenaProfile } from '../types';

interface ArenaNavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userProfile?: ArenaProfile | null;
  unreadNotifications?: number;
  onCreatePost?: () => void;
  onToggleMenu?: () => void;
}

export const ArenaNavbar: React.FC<ArenaNavbarProps> = ({ 
  activeTab, 
  setActiveTab, 
  userProfile, 
  unreadNotifications = 0, 
  onCreatePost,
  onToggleMenu
}) => {
  const { theme, toggleTheme } = useTheme();
  
  const tabs = [
    { id: 'feed', icon: Home, label: 'Feed' },
    { id: 'clips', icon: PlaySquare, label: 'Clips' },
    { id: 'post', icon: PlusSquare, label: 'Post' },
    { id: 'rankings', icon: Trophy, label: 'Rankings' },
    { id: 'menu', icon: Menu, label: 'Menu' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--surface)]/60 backdrop-blur-2xl border-t border-[var(--border-ui)] z-50 md:top-0 md:bottom-auto md:h-screen md:w-24 md:flex-col md:border-r md:border-t-0 transition-all duration-500 shadow-2xl">
      <div className="flex justify-around items-center h-20 md:flex-col md:h-full md:py-10">
        <div className="hidden md:block mb-8">
          <div className="relative group cursor-pointer" onClick={() => onToggleMenu?.()}>
            <div className="absolute inset-0 bg-[var(--primary)] rounded-2xl blur-lg opacity-0 group-hover:opacity-40 transition-opacity" />
            <div className="relative w-12 h-12 bg-gradient-to-br from-[var(--primary)] to-blue-700 rounded-2xl flex items-center justify-center font-black text-white shadow-2xl shadow-blue-500/30 border border-white/10 italic overflow-hidden transform group-hover:scale-110 transition-transform duration-500">
              {userProfile?.profile_photo || userProfile?.avatar_url ? (
                <img src={userProfile.profile_photo || userProfile.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                'A'
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-1 justify-around items-center w-full md:flex-col md:justify-center md:space-y-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'post') {
                  onCreatePost?.();
                } else if (tab.id === 'menu') {
                  onToggleMenu?.();
                } else {
                  setActiveTab(tab.id);
                }
              }}
              className={`flex flex-col items-center justify-center transition-all relative group ${
                activeTab === tab.id ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <div className={`p-3 rounded-2xl transition-all duration-500 ${
                activeTab === tab.id ? 'bg-[var(--primary)]/10 shadow-[0_0_20px_rgba(37,99,235,0.2)]' : 'group-hover:bg-[var(--bg)]'
              } ${tab.id === 'post' ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20' : ''}`}>
                <tab.icon size={24} strokeWidth={activeTab === tab.id ? 2.5 : 2} className={activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110 transition-transform'} />
              </div>
              <span className="text-[8px] font-black uppercase tracking-[0.2em] mt-2">{tab.label}</span>
              
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute -bottom-2 md:bottom-auto md:-right-4 w-1 h-1 md:w-1 md:h-8 bg-[var(--primary)] rounded-full shadow-[0_0_10px_var(--primary)]"
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};
