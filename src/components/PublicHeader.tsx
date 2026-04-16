import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Search, Sun, Moon, LogIn, Menu, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from './Logo';

export const PublicHeader: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 md:h-20 bg-[var(--header-bg)] backdrop-blur-xl border-b border-[var(--header-border)] flex items-center justify-between px-4 md:px-12 z-50 transition-all duration-500">
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
        className="flex-1 max-w-[150px] sm:max-w-md mx-2 md:mx-12 relative group"
      >
        <div className="absolute inset-0 bg-blue-500/10 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
        <div className="relative flex items-center">
          <Search className="absolute left-3 md:left-4 text-[var(--text-muted)] group-focus-within:text-blue-400 transition-colors w-3.5 h-3.5 md:w-5 md:h-5" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar..."
            className="w-full bg-[var(--header-search-bg)] border border-[var(--header-border)] rounded-2xl py-1.5 md:py-2.5 pl-8 md:pl-12 pr-3 md:pr-4 text-[10px] md:text-sm text-[var(--header-text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-500/50 focus:bg-[var(--header-search-bg)] transition-all"
          />
        </div>
      </form>

      {/* Right: Actions */}
      <div className="flex items-center space-x-2 md:space-x-4 shrink-0">
        <div className="hidden sm:flex items-center space-x-2 md:space-x-4">
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

        <button 
          className="sm:hidden p-2 text-[var(--text-muted)] hover:text-[var(--header-text)]"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 top-16 bg-[var(--bg)] z-40 p-6 sm:hidden"
          >
            <nav className="flex flex-col gap-4">
              <button 
                onClick={() => { toggleTheme(); setIsMenuOpen(false); }}
                className="flex items-center justify-between p-4 bg-[var(--surface)] rounded-2xl border border-[var(--border-ui)]"
              >
                <span className="text-sm font-bold">Modo {theme === 'light' ? 'Escuro' : 'Claro'}</span>
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <button 
                onClick={() => { navigate('/login'); setIsMenuOpen(false); }}
                className="flex items-center justify-center space-x-2 p-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs"
              >
                <LogIn size={18} />
                <span>Entrar na Plataforma</span>
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
