import React, { useState, useEffect, useCallback } from 'react';
import { Search as SearchIcon, User, Dumbbell, MapPin, ChevronRight, Globe, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { ArenaProfile, ArenaGym } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export const ArenaSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ athletes: ArenaProfile[], gyms: ArenaGym[] }>({ athletes: [], gyms: [] });
  const [initialResults, setInitialResults] = useState<{ athletes: ArenaProfile[], gyms: ArenaGym[] }>({ athletes: [], gyms: [] });
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Carregamento Inicial (Sugestões)
  const loadInitialResults = useCallback(async () => {
    try {
      // Busca atletas em destaque (ex: maior score)
      const { data: athletes } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'admin')
        .order('arena_score', { ascending: false })
        .limit(10);

      // Busca academias recentes/populares
      const { data: gyms } = await supabase
        .from('gyms')
        .select('*')
        .limit(5);

      const initial = { athletes: athletes || [], gyms: gyms || [] };
      setInitialResults(initial);
      if (!query) setResults(initial);
    } catch (error) {
      console.error('Error loading initial results:', error);
    }
  }, [query]);

  useEffect(() => {
    loadInitialResults();
  }, [loadInitialResults]);

  // Busca com Debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults(initialResults);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const cleanQuery = query.startsWith('@') ? query.slice(1) : query;
        
        // Search Athletes
        const { data: athletes } = await supabase
          .from('profiles')
          .select('*')
          .neq('role', 'admin')
          .or(`username.ilike.%${cleanQuery}%,full_name.ilike.%${cleanQuery}%,modality.ilike.%${cleanQuery}%,nickname.ilike.%${cleanQuery}%`)
          .limit(20);

        // Search Gyms
        const { data: gyms } = await supabase
          .from('gyms')
          .select('*')
          .or(`name.ilike.%${query}%,city.ilike.%${query}%`)
          .limit(10);

        setResults({ athletes: athletes || [], gyms: gyms || [] });
      } catch (error) {
        console.error('Error searching:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, initialResults]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // A busca já acontece via useEffect/debounce
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-6 md:py-8 px-4 space-y-6 md:space-y-8 min-h-[80vh] overflow-x-hidden">
      {/* Search Bar */}
      <div className="relative group">
        <div className={`absolute inset-0 bg-[var(--primary)]/10 blur-2xl rounded-full transition-opacity duration-500 ${isFocused ? 'opacity-100' : 'opacity-0'}`} />
        <form onSubmit={handleSearch} className="relative">
          <SearchIcon 
            className={`absolute left-5 md:left-6 top-1/2 -translate-y-1/2 transition-colors duration-300 ${isFocused ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`} 
            size={18} 
          />
          <input
            type="text"
            value={query}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar atletas, academias..."
            className="w-full bg-[var(--surface)] border border-[var(--border-ui)] rounded-full py-4 md:py-5 pl-14 md:pl-16 pr-6 text-sm md:text-base text-[var(--text-main)] font-medium focus:border-[var(--primary)] outline-none transition-all shadow-2xl transition-colors duration-300 placeholder:text-[var(--text-muted)]/50"
          />
          {loading && (
            <div className="absolute right-5 md:right-6 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 md:h-5 md:w-5 border-2 border-[var(--primary)] border-t-transparent" />
            </div>
          )}
        </form>
      </div>

      {/* Results Section */}
      <div className="space-y-8 md:space-y-12">
        <AnimatePresence mode="wait">
          {!query && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center space-x-2 px-2 mb-2 overflow-hidden"
            >
              <TrendingUp size={14} className="text-[var(--primary)] shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.3em] text-[var(--text-muted)] truncate">Sugestões para você</span>
            </motion.div>
          )}

          <motion.div 
            key={query ? 'search-results' : 'initial-suggestions'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8 md:space-y-12 w-full"
          >
            {/* Athletes */}
            {results.athletes.length > 0 && (
              <div className="space-y-4 w-full">
                <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-[var(--text-muted)] px-2 flex items-center justify-between gap-2 overflow-hidden">
                  <span className="truncate">Atletas</span>
                  <span className="text-[9px] opacity-50 font-bold shrink-0">{results.athletes.length} resultados</span>
                </h3>
                <div className="grid gap-3 w-full">
                  {results.athletes.map((athlete, index) => (
                    <motion.div 
                      key={athlete.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-[var(--surface)] border border-[var(--border-ui)] p-3 md:p-4 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-between gap-3 hover:bg-[var(--primary)]/5 transition-all group hover:border-[var(--primary)]/30 w-full min-w-0 overflow-hidden"
                    >
                      <div className="flex items-center space-x-3 md:space-x-4 min-w-0 flex-1">
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-[var(--bg)] overflow-hidden border border-[var(--border-ui)] shrink-0 relative group-hover:scale-105 transition-transform duration-500">
                          {(athlete.profile_photo || athlete.avatar_url) ? (
                            <img src={athlete.profile_photo || athlete.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] bg-[var(--primary)]/5">
                              <User size={20} className="md:size-6" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-black text-sm md:text-base text-[var(--text-main)] uppercase tracking-tighter italic truncate block w-full">
                            {athlete.full_name || athlete.name}
                          </h4>
                          <div className="flex items-center space-x-2 min-w-0">
                            <p className="text-[var(--primary)] font-bold text-[10px] md:text-xs truncate">@{athlete.username}</p>
                            {athlete.nickname && (
                              <span className="text-[9px] md:text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest truncate hidden sm:inline">• {athlete.nickname}</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mt-1 min-w-0">
                            <span className="text-[8px] md:text-[9px] text-[var(--text-muted)] uppercase font-black tracking-widest bg-[var(--bg)] px-2 py-0.5 rounded-full border border-[var(--border-ui)] truncate shrink-0">
                              {athlete.modality || 'Atleta'}
                            </span>
                            {athlete.city && (
                              <div className="flex items-center space-x-1 text-[8px] md:text-[9px] text-[var(--text-muted)] uppercase font-black tracking-widest truncate min-w-0">
                                <MapPin size={8} className="md:size-2.5 shrink-0" />
                                <span className="truncate">{athlete.city}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <Link 
                        to={`/user/@${athlete.username}`}
                        className="px-4 md:px-5 py-2 md:py-2.5 bg-[var(--bg)] border border-[var(--border-ui)] rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[var(--text-main)] hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] transition-all shadow-sm active:scale-95 shrink-0"
                      >
                        Perfil
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Gyms */}
            {results.gyms.length > 0 && (
              <div className="space-y-4 w-full">
                <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-[var(--text-muted)] px-2 overflow-hidden truncate">Academias</h3>
                <div className="grid gap-3 w-full">
                  {results.gyms.map((gym, index) => (
                    <motion.div 
                      key={gym.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (results.athletes.length + index) * 0.05 }}
                      className="bg-[var(--surface)] border border-[var(--border-ui)] p-3 md:p-4 rounded-[1.2rem] md:rounded-[1.5rem] flex items-center justify-between gap-3 hover:bg-[var(--primary)]/5 transition-all cursor-pointer group hover:border-[var(--primary)]/30 w-full min-w-0 overflow-hidden"
                    >
                      <div className="flex items-center space-x-3 md:space-x-4 min-w-0 flex-1">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-[var(--bg)] overflow-hidden flex items-center justify-center border border-[var(--border-ui)] shrink-0 group-hover:scale-105 transition-transform">
                          {gym.logo_url ? <img src={gym.logo_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <Dumbbell size={20} className="text-[var(--text-muted)] md:size-6" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-black text-xs md:text-sm text-[var(--text-main)] uppercase italic tracking-tight truncate block w-full">{gym.name}</h4>
                          <div className="flex items-center space-x-1 mt-0.5 min-w-0">
                            <MapPin size={8} className="text-[var(--primary)] md:size-2.5 shrink-0" />
                            <p className="text-[9px] md:text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest truncate">{gym.city}, {gym.state}</p>
                          </div>
                        </div>
                      </div>
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[var(--bg)] border border-[var(--border-ui)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--primary)] group-hover:border-[var(--primary)]/30 transition-all shrink-0">
                        <ChevronRight size={14} className="md:size-4" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {query && results.athletes.length === 0 && results.gyms.length === 0 && !loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 space-y-4"
              >
                <div className="w-20 h-20 bg-[var(--surface)] rounded-full flex items-center justify-center mx-auto border border-[var(--border-ui)]">
                  <SearchIcon size={32} className="text-[var(--text-muted)]/30" />
                </div>
                <div className="space-y-1">
                  <p className="text-[var(--text-muted)] font-black uppercase italic tracking-tighter text-lg">Nenhum resultado encontrado</p>
                  <p className="text-[10px] text-[var(--text-muted)]/60 uppercase font-bold tracking-[0.2em]">Tente buscar por nome, cidade ou modalidade</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
