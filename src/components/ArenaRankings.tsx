import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Medal, Target, Filter, ChevronDown } from 'lucide-react';
import { supabase } from '../services/supabase';
import { ArenaProfile } from '../types';

export const ArenaRankings: React.FC = () => {
  const [rankings, setRankings] = useState<ArenaProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    scope: 'nacional',
    modality: 'Todas',
    state: 'Todos'
  });

  useEffect(() => {
    fetchRankings();
  }, [filter]);

  const fetchRankings = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('arena_score', { ascending: false })
        .limit(50);

      if (filter.modality !== 'Todas') {
        query = query.eq('modality', filter.modality);
      }
      if (filter.state !== 'Todos') {
        query = query.eq('state', filter.state);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRankings(data || []);
    } catch (error) {
      console.error('Error fetching rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white italic">
          Arena <span className="text-emerald-500">Rankings</span>
        </h1>
        <p className="text-zinc-500 text-xs uppercase tracking-[0.3em] font-bold">O topo do esporte nacional</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 justify-center">
        <div className="relative group">
          <select 
            value={filter.modality}
            onChange={(e) => setFilter({...filter, modality: e.target.value})}
            className="appearance-none bg-zinc-900 border border-white/10 rounded-full px-6 py-2 text-xs font-bold uppercase tracking-widest text-zinc-300 focus:border-emerald-500 outline-none cursor-pointer pr-10"
          >
            <option>Todas</option>
            <option>Jiu-Jitsu</option>
            <option>Muay Thai</option>
            <option>Boxe</option>
            <option>MMA</option>
            <option>Crossfit</option>
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
        </div>

        <div className="relative group">
          <select 
            value={filter.state}
            onChange={(e) => setFilter({...filter, state: e.target.value})}
            className="appearance-none bg-zinc-900 border border-white/10 rounded-full px-6 py-2 text-xs font-bold uppercase tracking-widest text-zinc-300 focus:border-emerald-500 outline-none cursor-pointer pr-10"
          >
            <option>Todos</option>
            <option>SP</option>
            <option>RJ</option>
            <option>MG</option>
            <option>PR</option>
            <option>SC</option>
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
        </div>
      </div>

      {/* Ranking Table */}
      <div className="bg-zinc-900/30 border border-white/5 rounded-3xl overflow-hidden">
        <div className="grid grid-cols-12 p-4 border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-500">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-6 md:col-span-7">Atleta</div>
          <div className="col-span-3 md:col-span-2 text-center">Arena Score</div>
          <div className="col-span-2 text-center hidden md:block">Vitórias</div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {rankings.map((athlete, index) => (
              <motion.div
                key={athlete.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="grid grid-cols-12 p-4 items-center hover:bg-white/5 transition-colors cursor-pointer"
              >
                <div className="col-span-1 text-center">
                  {index < 3 ? (
                    <div className={`w-6 h-6 rounded-full mx-auto flex items-center justify-center text-[10px] font-black ${
                      index === 0 ? 'bg-yellow-500 text-black' :
                      index === 1 ? 'bg-zinc-300 text-black' :
                      'bg-amber-700 text-white'
                    }`}>
                      {index + 1}
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-zinc-500">{index + 1}</span>
                  )}
                </div>
                <div className="col-span-6 md:col-span-7 flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0">
                    {athlete.avatar_url && (
                      <img src={athlete.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-zinc-100">{athlete.full_name}</h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{athlete.modality} • {athlete.state}</p>
                  </div>
                </div>
                <div className="col-span-3 md:col-span-2 text-center">
                  <span className="text-emerald-500 font-black text-sm">{Math.round(athlete.arena_score)}</span>
                </div>
                <div className="col-span-2 text-center hidden md:block">
                  <span className="text-zinc-400 font-bold text-sm">{athlete.wins}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
