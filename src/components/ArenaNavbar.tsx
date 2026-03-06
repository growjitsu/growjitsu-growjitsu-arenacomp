import React from 'react';
import { Home, Trophy, Search, User, Dumbbell, Bell } from 'lucide-react';

interface ArenaNavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const ArenaNavbar: React.FC<ArenaNavbarProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'feed', icon: Home, label: 'Feed' },
    { id: 'rankings', icon: Trophy, label: 'Rankings' },
    { id: 'search', icon: Search, label: 'Busca' },
    { id: 'gyms', icon: Dumbbell, label: 'Academias' },
    { id: 'profile', icon: User, label: 'Perfil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 z-50 md:top-0 md:bottom-auto md:h-screen md:w-20 md:flex-col md:border-r md:border-t-0">
      <div className="flex justify-around items-center h-16 md:flex-col md:h-full md:py-8">
        <div className="hidden md:block mb-8">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center font-black text-black">A</div>
        </div>
        
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center space-y-1 transition-all ${
              activeTab === tab.id ? 'text-emerald-500' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <tab.icon size={24} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
            <span className="text-[10px] font-bold uppercase tracking-tighter md:hidden">{tab.label}</span>
          </button>
        ))}

        <button className="hidden md:flex items-center justify-center text-zinc-500 hover:text-zinc-300 mt-auto">
          <Bell size={24} />
        </button>
      </div>
    </nav>
  );
};
