import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, isSupabaseConfigured } from './services/supabase';
import { ArenaNavbar } from './components/ArenaNavbar';
import { ArenaFeed } from './components/ArenaFeed';
import { ArenaRankings } from './components/ArenaRankings';
import { ArenaSearch } from './components/ArenaSearch';
import { ArenaProfileView } from './components/ArenaProfile';
import { ArenaSettings } from './components/ArenaSettings';
import { ArenaAuth } from './components/ArenaAuth';
import { ArenaProfile } from './types';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('feed');
  const [profile, setProfile] = useState<ArenaProfile | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Close profile menu on navigation
    setShowProfileMenu(false);
    
    // Update active tab based on pathname
    const path = location.pathname.split('/')[1];
    if (path === '') setActiveTab('feed');
    else if (['rankings', 'search', 'profile', 'settings', 'gyms'].includes(path)) setActiveTab(path);
  }, [location.pathname]);

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
      <div className="h-screen w-full flex items-center justify-center bg-[var(--bg)]">
        <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const renderLayout = (content: React.ReactNode, tabId: string) => {
    if (!isLoggedIn) return <Navigate to="/login" replace />;
    
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text-main)] pb-20 md:pb-0 md:pl-20 transition-colors duration-300">
        <ArenaNavbar activeTab={tabId} setActiveTab={(tab) => navigate(`/${tab === 'feed' ? '' : tab}`)} />
        
        <main className="max-w-7xl mx-auto md:pt-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={tabId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {content}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Header (Desktop Only) */}
        <header className="hidden md:flex fixed top-0 right-0 left-20 h-16 bg-[var(--bg)]/50 backdrop-blur-xl border-b border-[var(--border-ui)] items-center justify-between px-8 z-40 transition-colors duration-300">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Arena</span>
            <span className="text-xs font-black uppercase tracking-widest text-[var(--primary)]">{tabId}</span>
          </div>
          
          <div className="flex items-center space-x-4 relative">
            <div className="text-right">
              <p className="text-xs font-bold text-[var(--text-main)]">{profile?.full_name}</p>
              <p className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest">Score: {Math.round(profile?.arena_score || 0)}</p>
            </div>
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--border-ui)] overflow-hidden hover:border-[var(--primary)] transition-all"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[var(--primary)]/10 text-[var(--primary)]">
                  <span className="text-xs font-bold">{profile?.full_name?.charAt(0)}</span>
                </div>
              )}
            </button>

            {/* Profile Dropdown */}
            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full right-0 mt-2 w-48 bg-[var(--surface)] border border-[var(--border-ui)] rounded-2xl shadow-2xl overflow-hidden z-50 py-2"
                >
                  <button 
                    onClick={() => { navigate('/profile'); setShowProfileMenu(false); }}
                    className="w-full px-4 py-2 text-left text-xs font-bold hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition-colors flex items-center space-x-2"
                  >
                    <span>Meu Perfil</span>
                  </button>
                  <button 
                    onClick={() => { navigate('/profile/edit'); setShowProfileMenu(false); }}
                    className="w-full px-4 py-2 text-left text-xs font-bold hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition-colors flex items-center space-x-2"
                  >
                    <span>Editar Perfil</span>
                  </button>
                  <button 
                    onClick={() => { navigate('/settings'); setShowProfileMenu(false); }}
                    className="w-full px-4 py-2 text-left text-xs font-bold hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition-colors flex items-center space-x-2"
                  >
                    <span>Configurações</span>
                  </button>
                  <div className="h-px bg-[var(--border-ui)] my-1" />
                  <button 
                    onClick={() => { supabase.auth.signOut(); navigate('/login'); }}
                    className="w-full px-4 py-2 text-left text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center space-x-2"
                  >
                    <span>Logout</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>
      </div>
    );
  };

  return (
    <Routes>
      <Route path="/login" element={isLoggedIn ? <Navigate to="/" replace /> : <ArenaAuth />} />
      <Route path="/" element={renderLayout(<ArenaFeed />, 'feed')} />
      <Route path="/rankings" element={renderLayout(<ArenaRankings />, 'rankings')} />
      <Route path="/search" element={renderLayout(<ArenaSearch />, 'search')} />
      <Route path="/profile" element={renderLayout(<ArenaProfileView />, 'profile')} />
      <Route path="/profile/edit" element={renderLayout(<ArenaProfileView forceEdit />, 'profile')} />
      <Route path="/profile/:userId" element={renderLayout(<ArenaProfileView />, 'profile')} />
      <Route path="/settings" element={renderLayout(<ArenaSettings />, 'settings')} />
      <Route path="/gyms" element={renderLayout(<div className="flex items-center justify-center h-screen text-[var(--text-muted)] uppercase font-black tracking-widest">Módulo de Academias em Breve</div>, 'gyms')} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
