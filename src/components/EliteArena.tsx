import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, User } from 'lucide-react';
import { supabase } from '../services/supabase';
import { ArenaProfile } from '../types';

export const EliteArena: React.FC = () => {
  const [topAthletes, setTopAthletes] = useState<ArenaProfile[]>([]);
  const [loadingTopAthletes, setLoadingTopAthletes] = useState(true);

  useEffect(() => {
    fetchTopAthletes();
  }, []);

  const fetchTopAthletes = async () => {
    setLoadingTopAthletes(true);
    try {
      console.log('[EliteArena] Buscando Elite Arena via Supabase...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'admin')
        .eq('perfil_publico', true)
        .gt('arena_score', 0)
        .order('arena_score', { ascending: false, nullsFirst: false })
        .limit(5);
      
      if (error) {
        console.warn('[EliteArena] Erro no Supabase, tentando API:', error.message);
        throw error;
      }
      
      if (data && data.length > 0) {
        setTopAthletes(data);
      } else {
        const response = await fetch('/api/eliteArena');
        if (response.ok) {
          const apiData = await response.json();
          setTopAthletes(apiData || []);
        } else {
          setTopAthletes([]);
        }
      }
    } catch (error) {
      console.error('[EliteArena] Erro ao buscar atletas de elite:', error);
    } finally {
      setLoadingTopAthletes(false);
    }
  };

  return (
    <div className="flex-none bg-[var(--bg)] z-30 px-4 py-4 border-b border-[var(--border-ui)]">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-main)]">ELITE ARENA</h3>
          </div>
          <Link to="/rankings" className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--primary)] transition-all flex items-center space-x-1 group">
            <span>RANKING GLOBAL</span>
            <Plus size={10} className="group-hover:rotate-90 transition-transform" />
          </Link>
        </div>
        <div className="flex space-x-6 overflow-x-auto pb-2 hide-scrollbar snap-x">
          {loadingTopAthletes ? (
            [1, 2, 3, 4, 5].map((i) => (
              <div key={`skeleton-${i}`} className="flex-shrink-0 flex flex-col items-center space-y-2 snap-start animate-pulse">
                <div className="w-14 h-14 rounded-full bg-[var(--surface)] border border-[var(--border-ui)]" />
                <div className="w-10 h-2 bg-[var(--surface)] rounded" />
              </div>
            ))
          ) : topAthletes.length > 0 ? (
            topAthletes.map((athlete, i) => (
              <Link 
                key={athlete.id || `athlete-${i}`} 
                to={`/user/@${athlete.username}`}
                className="flex-shrink-0 flex flex-col items-center space-y-2 snap-start group cursor-pointer"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-tr from-[var(--primary)] to-cyan-400 rounded-full blur-md opacity-0 group-hover:opacity-50 transition-opacity duration-500" />
                  <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-[var(--border-ui)] to-[var(--primary)]/30 group-hover:from-[var(--primary)] group-hover:to-cyan-400 transition-all duration-500">
                    <div className="w-14 h-14 rounded-full bg-[var(--bg)] p-0.5">
                      <div className="w-full h-full rounded-full bg-[var(--surface)] overflow-hidden border border-[var(--border-ui)]">
                        {athlete.profile_photo || athlete.avatar_url ? (
                          <img 
                            src={athlete.profile_photo || athlete.avatar_url} 
                            alt="" 
                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-500"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[var(--surface)] text-[var(--text-muted)]">
                            <User size={20} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-white text-black text-[8px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-[var(--bg)] shadow-lg">
                    {i + 1}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black uppercase tracking-tighter text-[var(--text-main)] truncate w-16">
                    { athlete.full_name || athlete.username || 'Atleta' }
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <div className="flex items-center justify-center w-full py-4 bg-white/5 rounded-xl border border-white/10">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Nenhum atleta de elite encontrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
