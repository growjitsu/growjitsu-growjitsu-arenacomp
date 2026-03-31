import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Search, Sun, Moon, LogIn } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'motion/react';
import logo from '../assets/logo.png';

export const PublicHeader: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-20 bg-[#0A1F44]/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-6 md:px-12 z-50 transition-all duration-500">
      {/* Left: Logo */}
      <div 
        className="flex items-center space-x-3 cursor-pointer group" 
        onClick={() => navigate('/')}
      >
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center font-black text-white italic overflow-hidden shadow-lg shadow-blue-500/20 border border-white/10 transform group-hover:scale-110 transition-transform duration-300">
          <img 
            src={logo} 
            alt="ArenaComp" 
            className="w-full h-full object-contain p-1.5"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling;
              if (fallback) (fallback as HTMLElement).style.display = 'block';
            }}
          />
          <Trophy size={20} className="text-white" style={{ display: 'none' }} />
        </div>
        <span className="text-sm font-black uppercase tracking-[0.2em] italic text-white hidden sm:block">ArenaComp</span>
      </div>

      {/* Center: Search */}
      <form 
        onSubmit={handleSearch}
        className="flex-1 max-w-md mx-4 md:mx-12 relative group"
      >
        <div className="absolute inset-0 bg-blue-500/10 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
        <div className="relative flex items-center">
          <Search className="absolute left-4 text-gray-400 group-focus-within:text-blue-400 transition-colors" size={18} />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar atletas, campeonatos..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-12 pr-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
          />
        </div>
      </form>

      {/* Right: Actions */}
      <div className="flex items-center space-x-4">
        <button 
          onClick={toggleTheme}
          className="p-2.5 text-gray-400 hover:text-white bg-white/5 rounded-xl border border-white/10 transition-all hover:scale-105 active:scale-95"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        
        <button 
          onClick={() => navigate('/login')}
          className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 hover:scale-105 active:scale-95"
        >
          <LogIn size={16} />
          <span className="hidden md:block">Entrar</span>
        </button>
      </div>
    </header>
  );
};
