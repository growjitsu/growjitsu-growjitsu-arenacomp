import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Search, Sun, Moon, LogIn } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'motion/react';
import { Logo } from './Logo';

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
    <header className="fixed top-0 left-0 right-0 h-20 bg-[var(--header-bg)] backdrop-blur-xl border-b border-[var(--header-border)] flex items-center justify-between px-4 md:px-12 z-50 transition-all duration-500">
      {/* Left: Logo */}
      <div 
        className="flex items-center cursor-pointer group shrink-0" 
        onClick={() => navigate('/')}
      >
        <Logo showText={true} />
      </div>

      {/* Center: Search */}
      <form 
        onSubmit={handleSearch}
        className="flex-1 max-w-md mx-2 md:mx-12 relative group"
      >
        <div className="absolute inset-0 bg-blue-500/10 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
        <div className="relative flex items-center">
          <Search className="absolute left-3 md:left-4 text-[var(--text-muted)] group-focus-within:text-blue-400 transition-colors w-4 h-4 md:w-5 md:h-5" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar..."
            className="w-full bg-[var(--header-search-bg)] border border-[var(--header-border)] rounded-2xl py-2 md:py-2.5 pl-10 md:pl-12 pr-3 md:pr-4 text-xs md:text-sm text-[var(--header-text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-500/50 focus:bg-[var(--header-search-bg)] transition-all"
          />
        </div>
      </form>

      {/* Right: Actions */}
      <div className="flex items-center space-x-2 md:space-x-4 shrink-0">
        <button 
          onClick={toggleTheme}
          className="p-2 md:p-2.5 text-[var(--text-muted)] hover:text-[var(--header-text)] bg-[var(--header-search-bg)] rounded-xl border border-[var(--header-border)] transition-all hover:scale-105 active:scale-95"
        >
          {theme === 'light' ? <Moon className="w-4 h-4 md:w-5 md:h-5" /> : <Sun className="w-4 h-4 md:w-5 md:h-5" />}
        </button>
        
        <button 
          onClick={() => navigate('/login')}
          className="flex items-center space-x-2 px-4 md:px-6 py-2 md:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 hover:scale-105 active:scale-95"
        >
          <LogIn className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span className="hidden md:block">Entrar</span>
        </button>
      </div>
    </header>
  );
};
