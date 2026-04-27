import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Search, Sun, Moon, LogIn, X, ChevronRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from './Logo';
import { supabase } from '../services/supabase';

export const PublicHeader: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Click outside to close search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchExpanded(false);
      }
    };

    if (isSearchExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchExpanded]);

  // Search logic with debounce
  useEffect(() => {
    if (!searchQuery.trim() || !isSearchExpanded) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, username, profile_photo, avatar_url, modality, arena_score')
          .eq('perfil_publico', true)
          .or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%,modality.ilike.%${searchQuery}%`)
          .order('arena_score', { ascending: false })
          .limit(5);
        
        if (error) throw error;
        setSearchResults(data || []);
      } catch (err) {
        console.error('Error searching:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, isSearchExpanded]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // If we had a public search page, we'd navigate there. 
      // For now, selecting from results is the main path.
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-20 bg-[var(--header-bg)] backdrop-blur-xl border-b border-[var(--header-border)] flex items-center justify-between px-4 md:px-12 z-50 transition-all duration-500">
      {/* Backdrop for mobile search */}
      <AnimatePresence>
        {isSearchExpanded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 md:hidden z-[-1]"
          />
        )}
      </AnimatePresence>

      {/* Left: Logo */}
      <div 
        className={`flex items-center cursor-pointer group shrink-0 ${isSearchExpanded ? 'hidden md:flex' : 'flex'}`} 
        onClick={() => navigate('/')}
      >
        <Logo showText={true} />
      </div>

      {/* Center: Search */}
      <div 
        ref={searchRef}
        className={`flex-1 flex justify-center px-4 transition-all duration-500 ${isSearchExpanded ? 'w-full md:max-w-2xl' : 'max-w-xs'}`}
      >
        <AnimatePresence mode="wait">
          {!isSearchExpanded ? (
            <motion.button
              key="search-trigger"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => setIsSearchExpanded(true)}
              className="p-3 text-[var(--text-muted)] hover:text-blue-400 bg-[var(--header-search-bg)] rounded-xl border border-[var(--header-border)] transition-all hover:scale-105 active:scale-95"
            >
              <Search size={20} />
            </motion.button>
          ) : (
            <motion.div
              key="search-container"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="relative w-full"
            >
              <form 
                onSubmit={handleSearchSubmit}
                className="relative group"
              >
                <div className="absolute inset-0 bg-blue-500/10 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <div className="relative flex items-center">
                  <Search className="absolute left-4 text-[var(--text-muted)] group-focus-within:text-blue-400 transition-colors w-5 h-5" />
                  <input 
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar atletas, modalidades..."
                    className="w-full bg-[var(--header-search-bg)] border border-[var(--header-border)] rounded-2xl py-3 pl-12 pr-12 text-sm text-[var(--header-text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      setIsSearchExpanded(false);
                      setSearchQuery('');
                    }}
                    className="absolute right-3 p-1.5 text-[var(--text-muted)] hover:text-white hover:bg-white/10 rounded-full transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              </form>

              {/* Search Results Dropdown */}
              <AnimatePresence>
                {(searchQuery.trim() && isSearchExpanded) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full mt-3 left-0 right-0 bg-[var(--surface)] border border-[var(--header-border)] rounded-3xl shadow-2xl overflow-hidden z-[60] backdrop-blur-xl"
                  >
                    <div className="p-2 space-y-1">
                      {isSearching ? (
                        <div className="p-8 flex flex-col items-center justify-center space-y-3">
                          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Buscando...</span>
                        </div>
                      ) : searchResults.length > 0 ? (
                        <>
                          <div className="px-4 py-2 border-b border-[var(--header-border)] mb-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Resultados Sugeridos</span>
                          </div>
                          {searchResults.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => navigate(`/user/@${item.username}`)}
                              className="w-full flex items-center space-x-3 p-3 hover:bg-white/5 transition-all rounded-2xl group text-left"
                            >
                              <div className="w-10 h-10 rounded-xl bg-black border border-[var(--header-border)] overflow-hidden shrink-0">
                                {(item.profile_photo || item.avatar_url) ? (
                                  <img 
                                    src={item.profile_photo || item.avatar_url} 
                                    alt="" 
                                    className="w-full h-full object-cover" 
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-blue-500 font-black text-sm">
                                    {item.full_name?.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-black uppercase italic truncate text-[var(--header-text)]">{item.full_name}</p>
                                <div className="flex items-center space-x-2">
                                  <p className="text-[10px] font-bold text-blue-500">@{item.username}</p>
                                  <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest">• {item.modality}</span>
                                </div>
                              </div>
                              <ChevronRight size={16} className="text-[var(--text-muted)] group-hover:text-blue-500 transition-colors" />
                            </button>
                          ))}
                        </>
                      ) : (
                        <div className="p-8 text-center space-y-2">
                          <p className="text-xs font-black uppercase italic text-[var(--header-text)]">Nenhum atleta encontrado</p>
                          <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Tente outro nome ou modalidade</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right: Actions */}
      <div className={`flex items-center space-x-1 md:space-x-4 shrink-0 ${isSearchExpanded ? 'hidden md:flex' : 'flex'}`}>
        <button 
          onClick={toggleTheme}
          className="p-1.5 md:p-2.5 text-[var(--text-muted)] hover:text-[var(--header-text)] bg-[var(--header-search-bg)] rounded-xl border border-[var(--header-border)] transition-all hover:scale-105 active:scale-95"
        >
          {theme === 'light' ? <Moon className="w-4 h-4 md:w-5 md:h-5" /> : <Sun className="w-4 h-4 md:w-5 md:h-5" />}
        </button>
        
        <button 
          onClick={() => navigate('/login')}
          className="flex items-center space-x-1.5 px-3 md:px-6 py-2 md:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 hover:scale-105 active:scale-95"
        >
          <LogIn className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span className="block">Entrar</span>
        </button>
      </div>
    </header>
  );
};
