import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Trophy, Search, User, Dumbbell, Sun, Moon, Edit3, Bell, Zap, ChevronRight, Menu, X, LogOut, Settings, PlusSquare } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ArenaProfile } from '../types';

interface ArenaNavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userProfile?: ArenaProfile | null;
  unreadNotifications?: number;
}

export const ArenaNavbar: React.FC<ArenaNavbarProps> = ({ activeTab, setActiveTab, userProfile, unreadNotifications = 0 }) => {
  const { theme, toggleTheme } = useTheme();
  
  const tabs = [
    { id: 'feed', icon: Home, label: 'Feed' },
    { id: 'rankings', icon: Trophy, label: 'Rankings' },
    { id: 'search', icon: Search, label: 'Busca' },
    { id: 'notifications', icon: Bell, label: 'Notificações' },
    { id: 'profile', icon: User, label: 'Meu Perfil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--surface)]/60 backdrop-blur-2xl border-t border-[var(--border-ui)] z-50 md:top-0 md:bottom-auto md:h-screen md:w-24 md:flex-col md:border-r md:border-t-0 transition-all duration-500 shadow-2xl">
      <div className="flex justify-around items-center h-20 md:flex-col md:h-full md:py-10">
        <div className="hidden md:block mb-12">
          <div className="relative group cursor-pointer" onClick={() => setActiveTab('feed')}>
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
        
        <div className="flex flex-1 justify-around items-center w-full md:flex-col md:justify-center md:space-y-10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center transition-all relative group ${
                activeTab === tab.id ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <div className={`p-3 rounded-2xl transition-all duration-500 ${
                activeTab === tab.id ? 'bg-[var(--primary)]/10 shadow-[0_0_20px_rgba(37,99,235,0.2)]' : 'group-hover:bg-[var(--bg)]'
              }`}>
                <tab.icon size={24} strokeWidth={activeTab === tab.id ? 2.5 : 2} className={activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110 transition-transform'} />
              </div>
              <span className="text-[8px] font-black uppercase tracking-[0.2em] mt-2 md:hidden">{tab.label}</span>
              
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute -bottom-2 md:bottom-auto md:-right-4 w-1 h-1 md:w-1 md:h-8 bg-[var(--primary)] rounded-full shadow-[0_0_10px_var(--primary)]"
                />
              )}

              {tab.id === 'notifications' && unreadNotifications > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 bg-rose-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-[var(--surface)] shadow-lg">
                  {unreadNotifications}
                </span>
              )}
            </button>
          ))}
        </div>

        <button 
          onClick={toggleTheme}
          className="flex flex-col items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all md:mt-auto group"
          title={theme === 'light' ? 'Ativar Modo Escuro' : 'Ativar Modo Claro'}
        >
          <div className="p-3 rounded-2xl group-hover:bg-[var(--bg)] transition-all">
            {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
          </div>
          <span className="text-[8px] font-black uppercase tracking-[0.2em] mt-2 md:hidden">
            {theme === 'light' ? 'Escuro' : 'Claro'}
          </span>
        </button>
      </div>
    </nav>
  );
};
