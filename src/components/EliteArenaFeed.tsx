import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, User, Trophy } from 'lucide-react';
import { supabase } from '../services/supabase';
import { ArenaProfile } from '../types';
import { motion } from 'motion/react';

export const EliteArenaFeed: React.FC = () => {
  const [topAthletes, setTopAthletes] = useState<ArenaProfile[]>([]);
  const [loadingTopAthletes, setLoadingTopAthletes] = useState(true);

  useEffect(() => {
    fetchTopAthletes();
  }, []);

  const fetchTopAthletes = async () => {
    setLoadingTopAthletes(true);
    try {
      console.log('[EliteArenaFeed] Buscando Elite Arena via Supabase...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'admin')
        .eq('perfil_publico', true)
        .gt('arena_score', 0)
        .order('arena_score', { ascending: false, nullsFirst: false })
        .limit(10);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setTopAthletes(data);
      }
    } catch (error) {
      console.error('[EliteArenaFeed] Erro ao buscar atletas de elite:', error);
    } finally {
      setLoadingTopAthletes(false);
    }
  };

  if (!loadingTopAthletes && topAthletes.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--surface)]/20 border border-[var(--border-ui)] rounded-[2.5rem] p-8 mb-8"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shadow-lg shadow-blue-500/20">
            <Trophy size={16} />
          </div>
          <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-main)] italic">Elite Arena Protocol</h3>
        </div>
        <Link to="/rankings" className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--primary)] transition-all flex items-center space-x-2 group">
          <span>Ranking Global</span>
          <Plus size={10} className="group-hover:rotate-90 transition-transform" />
        </Link>
      </div>

      <div className="flex space-x-4 md:space-x-8 overflow-x-auto pb-4 hide-scrollbar snap-x">
        {loadingTopAthletes ? (
          [1, 2, 3, 4, 5].map((i) => (
            <div key={`skeleton-${i}`} className="flex-shrink-0 flex flex-col items-center space-y-3 snap-start animate-pulse">
              <div className="w-16 h-16 rounded-[1.5rem] bg-[var(--surface)] border border-[var(--border-ui)]" />
              <div className="w-12 h-2 bg-[var(--surface)] rounded-full" />
            </div>
          ))
        ) : (
          topAthletes.map((athlete, i) => (
            <Link 
              key={athlete.id} 
              to={`/user/@${athlete.username}`}
              className="flex-shrink-0 flex flex-col items-center space-y-3 snap-start group cursor-pointer"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-[1.5rem] blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-500" />
                <div className="relative p-0.5 rounded-[1.5rem] bg-gradient-to-tr from-[var(--border-ui)] to-[var(--primary)]/30 group-hover:from-blue-500 group-hover:to-cyan-400 transition-all duration-500 shadow-xl">
                  <div className="w-16 h-16 rounded-[1.4rem] bg-[var(--bg)] p-0.5">
                    <div className="w-full h-full rounded-[1.2rem] bg-[var(--surface)] overflow-hidden border border-[var(--border-ui)]/50 relative">
                      {athlete.profile_photo || athlete.avatar_url ? (
                        <img 
                          src={athlete.profile_photo || athlete.avatar_url} 
                          alt="" 
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[var(--surface)] text-[var(--text-muted)]">
                          <User size={24} />
                        </div>
                      )}
                      
                      {/* Rank Badge */}
                      <div className="absolute top-0 right-0 p-1">
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[8px] font-black border border-white/10 shadow-lg ${
                          i === 0 ? 'bg-amber-500 text-white' : 
                          i === 1 ? 'bg-slate-400 text-white' :
                          i === 2 ? 'bg-amber-700 text-white' :
                          'bg-black text-blue-500'
                        }`}>
                          {i + 1}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-tight text-[var(--text-main)] truncate w-20 group-hover:text-blue-500 transition-colors">
                  { athlete.full_name?.split(' ')[0] || athlete.username || 'Atleta' }
                </p>
                <div className="flex items-center justify-center space-x-1 mt-0.5">
                  <div className="w-1 h-1 rounded-full bg-blue-500" />
                  <span className="text-[8px] font-black text-blue-500/60 uppercase tracking-widest">{Math.floor(athlete.arena_score || 0)}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </motion.div>
  );
};
