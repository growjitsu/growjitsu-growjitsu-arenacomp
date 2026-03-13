import React, { useState } from 'react';
import { Search as SearchIcon, User, Dumbbell, MapPin, ChevronRight, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { ArenaProfile, ArenaGym } from '../types';

export const ArenaSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ athletes: ArenaProfile[], gyms: ArenaGym[] }>({ athletes: [], gyms: [] });
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const cleanQuery = query.startsWith('@') ? query.slice(1) : query;
      
      // Search Athletes
      const { data: athletes } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'admin')
        .or(`username.ilike.%${cleanQuery}%,full_name.ilike.%${cleanQuery}%,modality.ilike.%${cleanQuery}%`)
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
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative">
        <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar atletas, academias ou modalidades..."
          className="w-full bg-[var(--surface)] border border-[var(--border-ui)] rounded-full py-4 pl-16 pr-6 text-[var(--text-main)] focus:border-[var(--primary)] outline-none transition-all shadow-2xl transition-colors duration-300"
        />
      </form>

      {/* Results */}
      <div className="space-y-12">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" />
          </div>
        ) : (
          <>
            {/* Athletes */}
            {results.athletes.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] px-4">Atletas</h3>
                <div className="grid gap-4">
                  {results.athletes.map((athlete) => (
                    <div key={athlete.id} className="bg-[var(--surface)] border border-[var(--border-ui)] p-4 rounded-2xl flex items-center justify-between hover:bg-[var(--primary)]/5 transition-all group transition-colors duration-300">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 rounded-2xl bg-[var(--bg)] overflow-hidden border border-[var(--border-ui)]">
                          {(athlete.profile_photo || athlete.avatar_url) ? (
                            <img src={athlete.profile_photo || athlete.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                              <User size={24} />
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-black text-base text-[var(--text-main)] uppercase tracking-tighter italic">{athlete.full_name}</h4>
                          <p className="text-[var(--primary)] font-bold text-xs">@{athlete.username}</p>
                          <div className="flex items-center space-x-3 mt-1">
                            <span className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest">{athlete.modality}</span>
                            {athlete.country && (
                              <div className="flex items-center space-x-1 text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest">
                                <Globe size={10} />
                                <span>{athlete.country}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <Link 
                        to={`/user/@${athlete.username}`}
                        className="px-4 py-2 bg-[var(--bg)] border border-[var(--border-ui)] rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--text-main)] hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] transition-all"
                      >
                        Ver Perfil
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gyms */}
            {results.gyms.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] px-4">Academias</h3>
                <div className="grid gap-4">
                  {results.gyms.map((gym) => (
                    <div key={gym.id} className="bg-[var(--surface)] border border-[var(--border-ui)] p-4 rounded-2xl flex items-center justify-between hover:bg-[var(--primary)]/5 transition-colors cursor-pointer group transition-colors duration-300">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-xl bg-[var(--bg)] overflow-hidden flex items-center justify-center">
                          {gym.logo_url ? <img src={gym.logo_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <Dumbbell size={24} className="text-[var(--text-muted)]" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[var(--text-main)]">{gym.name}</h4>
                          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">{gym.city}, {gym.state}</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {query && results.athletes.length === 0 && results.gyms.length === 0 && !loading && (
              <div className="text-center py-12 space-y-2">
                <p className="text-[var(--text-muted)] font-bold">Nenhum resultado encontrado para "{query}"</p>
                <p className="text-[10px] text-[var(--text-muted)]/60 uppercase tracking-widest">Tente buscar por nome, cidade ou modalidade</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
