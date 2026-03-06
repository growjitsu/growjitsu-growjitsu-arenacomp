import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Award, Target, TrendingUp, Grid, History, MapPin, Calendar, Settings } from 'lucide-react';
import { supabase } from '../services/supabase';
import { ArenaProfile, ArenaResult, ArenaPost } from '../types';

export const ArenaProfileView: React.FC<{ userId?: string }> = ({ userId }) => {
  const [profile, setProfile] = useState<ArenaProfile | null>(null);
  const [results, setResults] = useState<ArenaResult[]>([]);
  const [posts, setPosts] = useState<ArenaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'history'>('posts');

  useEffect(() => {
    fetchProfileData();
  }, [userId]);

  const fetchProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetId = userId || user?.id;
      if (!targetId) return;

      // Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetId)
        .single();
      
      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch Results
      const { data: resultsData } = await supabase
        .from('competition_results')
        .select(`
          *,
          competition:competitions(*)
        `)
        .eq('athlete_id', targetId)
        .order('created_at', { ascending: false });
      
      setResults(resultsData || []);

      // Fetch Posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', targetId)
        .order('created_at', { ascending: false });
      
      setPosts(postsData || []);

    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" /></div>;
  if (!profile) return <div className="text-center py-24 text-zinc-500">Perfil não encontrado</div>;

  const winRate = profile.wins + profile.losses > 0 
    ? Math.round((profile.wins / (profile.wins + profile.losses)) * 100) 
    : 0;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Profile Header */}
      <div className="relative">
        <div className="h-48 md:h-64 bg-zinc-900 rounded-3xl overflow-hidden border border-white/5">
          <img src="https://picsum.photos/seed/sport/1200/400" alt="" className="w-full h-full object-cover opacity-50 grayscale" referrerPolicy="no-referrer" />
        </div>
        
        <div className="absolute -bottom-12 left-8 flex items-end space-x-6">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-zinc-800 border-4 border-black overflow-hidden shadow-2xl">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600"><Settings size={48} /></div>
            )}
          </div>
          <div className="pb-4">
            <h1 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter italic">{profile.full_name}</h1>
            <p className="text-emerald-500 font-bold text-xs uppercase tracking-widest">@{profile.username} • {profile.modality}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12">
        {[
          { label: 'Arena Score', value: Math.round(profile.arena_score), icon: Award, color: 'text-emerald-500' },
          { label: 'Vitórias', value: profile.wins, icon: Target, color: 'text-blue-500' },
          { label: 'Taxa de Vitória', value: `${winRate}%`, icon: TrendingUp, color: 'text-purple-500' },
          { label: 'Competições', value: results.length, icon: History, color: 'text-amber-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <stat.icon size={16} className={stat.color} />
              <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{stat.label}</span>
            </div>
            <p className="text-2xl font-black text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Bio & Info */}
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-zinc-900/30 border border-white/5 p-6 rounded-2xl space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Sobre</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">{profile.bio || 'Nenhuma biografia disponível.'}</p>
            <div className="space-y-3 pt-4 border-t border-white/5">
              <div className="flex items-center space-x-3 text-zinc-500">
                <MapPin size={14} />
                <span className="text-xs font-bold">{profile.city}, {profile.state}</span>
              </div>
              <div className="flex items-center space-x-3 text-zinc-500">
                <Calendar size={14} />
                <span className="text-xs font-bold">Desde {new Date(profile.created_at).getFullYear()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="flex space-x-8 border-b border-white/5">
            <button
              onClick={() => setActiveTab('posts')}
              className={`pb-4 text-xs font-black uppercase tracking-widest transition-colors relative ${
                activeTab === 'posts' ? 'text-emerald-500' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Postagens
              {activeTab === 'posts' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-4 text-xs font-black uppercase tracking-widest transition-colors relative ${
                activeTab === 'history' ? 'text-emerald-500' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Histórico
              {activeTab === 'history' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
            </button>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === 'posts' ? (
              <div className="grid grid-cols-2 gap-4">
                {posts.map((post) => (
                  <div key={post.id} className="aspect-square bg-zinc-900 rounded-xl overflow-hidden border border-white/5 group relative cursor-pointer">
                    {post.media_url ? (
                      <img src={post.media_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full p-4 flex items-center justify-center text-center">
                        <p className="text-[10px] text-zinc-500 line-clamp-3">{post.content}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((result) => (
                  <div key={result.id} className="bg-zinc-900/30 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs ${
                        result.placement === 1 ? 'bg-yellow-500 text-black' :
                        result.placement === 2 ? 'bg-zinc-300 text-black' :
                        result.placement === 3 ? 'bg-amber-700 text-white' :
                        'bg-zinc-800 text-zinc-500'
                      }`}>
                        {result.placement === 0 ? 'P' : `${result.placement}º`}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-zinc-100">{result.competition?.name}</h4>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                          {new Date(result.competition?.date || '').toLocaleDateString()} • {result.competition?.level}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-500 font-black text-sm">+{Math.round(result.points_earned)}</p>
                      <p className="text-[10px] text-zinc-600 uppercase font-bold">Arena Score</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
