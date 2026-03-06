import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, isSupabaseConfigured } from './services/supabase';
import { ArenaNavbar } from './components/ArenaNavbar';
import { ArenaFeed } from './components/ArenaFeed';
import { ArenaRankings } from './components/ArenaRankings';
import { ArenaSearch } from './components/ArenaSearch';
import { ArenaProfileView } from './components/ArenaProfile';
import { ArenaAuth } from './components/ArenaAuth';
import { ArenaProfile } from './types';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('feed');
  const [profile, setProfile] = useState<ArenaProfile | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsInitializing(false);
      return;
    }

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsLoggedIn(true);
        fetchProfile(session.user.id);
      }
      setIsInitializing(false);
    }).catch(err => {
      console.error('Supabase session error:', err);
      setIsInitializing(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsLoggedIn(true);
        fetchProfile(session.user.id);
      } else {
        setIsLoggedIn(false);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
    }
  };

  if (isInitializing) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <ArenaAuth />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'feed': return <ArenaFeed />;
      case 'rankings': return <ArenaRankings />;
      case 'search': return <ArenaSearch />;
      case 'profile': return <ArenaProfileView />;
      case 'gyms': return <div className="flex items-center justify-center h-screen text-zinc-500 uppercase font-black tracking-widest">Módulo de Academias em Breve</div>;
      default: return <ArenaFeed />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20 md:pb-0 md:pl-20">
      <ArenaNavbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Header (Desktop Only) */}
      <header className="hidden md:flex fixed top-0 right-0 left-20 h-16 bg-black/50 backdrop-blur-xl border-b border-white/5 items-center justify-between px-8 z-40">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Arena</span>
          <span className="text-xs font-black uppercase tracking-widest text-emerald-500">{activeTab}</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-xs font-bold text-white">{profile?.full_name}</p>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Score: {Math.round(profile?.arena_score || 0)}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 overflow-hidden">
            {profile?.avatar_url && <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
          </div>
        </div>
      </header>
    </div>
  );
}
