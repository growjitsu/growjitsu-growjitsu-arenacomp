import React, { useState, useEffect } from 'react';
import { Search, X, User, Users, Trophy, Loader2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../services/supabase';
import { ArenaProfile, Team } from '../types';

interface RankingPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'athletes' | 'teams';
  onSelect: (entity: any) => void;
}

export const RankingPickerModal: React.FC<RankingPickerModalProps> = ({ isOpen, onClose, type, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setResults([]);
      fetchInitialResults();
    }
  }, [isOpen]);

  const fetchInitialResults = async () => {
    setLoading(true);
    try {
      if (type === 'athletes') {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .neq('role', 'admin')
          .eq('perfil_publico', true)
          .order('arena_score', { ascending: false })
          .limit(10);
        if (error) throw error;
        setResults(data || []);
      } else {
        const { data, error } = await supabase
          .from('teams')
          .select('*')
          .order('total_score', { ascending: false })
          .limit(10);
        if (error) throw error;
        setResults(data || []);
      }
    } catch (error) {
      console.error('Error fetching initial results:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.length >= 2) {
        handleSearch();
      } else if (searchTerm.length === 0 && isOpen) {
        fetchInitialResults();
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      if (type === 'athletes') {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .neq('role', 'admin')
          .eq('perfil_publico', true)
          .or(`full_name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`)
          .limit(10);
        
        if (error) throw error;
        setResults(data || []);
      } else {
        const { data, error } = await supabase
          .from('teams')
          .select('*')
          .ilike('name', `%${searchTerm}%`)
          .limit(10);
        
        if (error) throw error;
        setResults(data || []);
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-[#111] border border-white/10 rounded-[2.5rem] overflow-hidden max-w-lg w-full shadow-2xl flex flex-col max-h-[80vh]"
          >
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/10 flex items-center justify-center border border-blue-600/20">
                  {type === 'athletes' ? <User className="w-5 h-5 text-blue-500" /> : <Users className="w-5 h-5 text-blue-500" />}
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase italic text-white tracking-tighter">
                    Buscar {type === 'athletes' ? 'Atleta' : 'Equipe'}
                  </h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">Para compartilhar ranking</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="text"
                  placeholder={`Pesquisar por nome do ${type === 'athletes' ? 'atleta' : 'time'}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-zinc-500 outline-none focus:border-blue-500/50 transition-all font-bold text-sm uppercase italic"
                  autoFocus
                />
              </div>

              <div className="space-y-2 overflow-y-auto max-h-[40vh] custom-scrollbar pr-2">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Buscando na Arena...</p>
                  </div>
                ) : results.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 italic">Nenhum resultado encontrado para "{searchTerm}"</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {searchTerm.length === 0 && (
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4 px-2">Sugestões em Destaque</p>
                    )}
                    {results.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => onSelect(result)}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all group"
                      >
                        <div className="w-12 h-12 rounded-xl bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {(type === 'athletes' ? result.profile_photo || result.avatar_url : result.logo_url) ? (
                            <img 
                              src={type === 'athletes' ? result.profile_photo || result.avatar_url : result.logo_url} 
                              alt="" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            type === 'athletes' ? <User size={20} className="text-zinc-600" /> : <Users size={20} className="text-zinc-600" />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <h4 className="font-black uppercase italic text-sm text-white tracking-tight group-hover:text-blue-500 transition-colors">
                            {type === 'athletes' ? result.full_name : result.name}
                          </h4>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                            {type === 'athletes' ? `@${result.username || 'arena'}` : `Equipe / Academia`}
                          </p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                          <ChevronRight size={16} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchTerm.length < 2 && (
                  <div className="text-center py-12 space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-600">
                      <Trophy size={24} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 italic">Digite pelo menos 2 caracteres para pesquisar</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
