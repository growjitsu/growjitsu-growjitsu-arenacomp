import React, { useState } from 'react';
import { Search as SearchIcon, User, Dumbbell, MapPin, ChevronRight } from 'lucide-react';
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
      // Search Athletes
      const { data: athletes } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%,modality.ilike.%${query}%`)
        .limit(10);

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
        <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar atletas, academias ou modalidades..."
          className="w-full bg-zinc-900 border border-white/10 rounded-full py-4 pl-16 pr-6 text-zinc-100 focus:border-emerald-500 outline-none transition-all shadow-2xl"
        />
      </form>

      {/* Results */}
      <div className="space-y-12">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
          </div>
        ) : (
          <>
            {/* Athletes */}
            {results.athletes.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 px-4">Atletas</h3>
                <div className="grid gap-4">
                  {results.athletes.map((athlete) => (
                    <div key={athlete.id} className="bg-zinc-900/30 border border-white/5 p-4 rounded-2xl flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer group">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden">
                          {athlete.avatar_url && <img src={athlete.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-zinc-100">{athlete.full_name}</h4>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{athlete.modality} • {athlete.city}, {athlete.state}</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-zinc-700 group-hover:text-emerald-500 transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gyms */}
            {results.gyms.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 px-4">Academias</h3>
                <div className="grid gap-4">
                  {results.gyms.map((gym) => (
                    <div key={gym.id} className="bg-zinc-900/30 border border-white/5 p-4 rounded-2xl flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer group">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-xl bg-zinc-800 overflow-hidden flex items-center justify-center">
                          {gym.logo_url ? <img src={gym.logo_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <Dumbbell size={24} className="text-zinc-600" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-zinc-100">{gym.name}</h4>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{gym.city}, {gym.state}</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-zinc-700 group-hover:text-emerald-500 transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {query && results.athletes.length === 0 && results.gyms.length === 0 && !loading && (
              <div className="text-center py-12 space-y-2">
                <p className="text-zinc-500 font-bold">Nenhum resultado encontrado para "{query}"</p>
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Tente buscar por nome, cidade ou modalidade</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
