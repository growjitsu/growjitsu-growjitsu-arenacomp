import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, isSupabaseConfigured } from './services/supabase';
import { ArenaNavbar } from './components/ArenaNavbar';
import { ArenaFeed } from './components/ArenaFeed';
import { ArenaClips } from './components/ArenaClips';
import { ArenaRankings } from './components/ArenaRankings';
import { ArenaSearch } from './components/ArenaSearch';
import { ArenaProfileView } from './components/ArenaProfile';
import { ArenaSettings } from './components/ArenaSettings';
import { ArenaAuth } from './components/ArenaAuth';
import { ArenaNotifications } from './components/ArenaNotifications';
import { SharePage } from './pages/SharePage';
import { CreatePostModal } from './components/CreatePostModal';
import { AdminLayout } from './components/Admin/AdminLayout';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { AdminAthletes } from './components/Admin/AdminAthletes';
import { AdminTeams } from './components/Admin/AdminTeams';
import { AdminPosts } from './components/Admin/AdminPosts';
import { AdminLogs } from './components/Admin/AdminLogs';
import { AdminExport } from './components/Admin/AdminExport';
import { AdminAds } from './components/Admin/AdminAds';
import { LandingPage } from './pages/LandingPage';
import { ArenaProfile } from './types';
import { Bell, Plus, Shield, Lock, ArrowLeft, Search, Sun, Moon, Trophy } from 'lucide-react';
import { useTheme } from './context/ThemeContext';

import { Toaster } from 'sonner';

const ProfileWrapper = ({ forceEdit }: { forceEdit?: boolean }) => {
  const { userId, username, id } = useParams();
  const location = useLocation();
  const contentType = location.pathname.split('/')[1];
  
  return <ArenaProfileView 
    key={`${userId}-${username}-${id}-${location.pathname}`} 
    userId={userId} 
    username={username} 
    contentId={id}
    contentType={contentType}
    forceEdit={forceEdit} 
  />;
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('feed');
  const [profile, setProfile] = useState<ArenaProfile | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    // Close profile menu on navigation
    setShowProfileMenu(false);
    
    // Update active tab based on pathname
    const pathParts = location.pathname.split('/').filter(Boolean);
    const path = pathParts[0] || 'feed';
    const subPath = pathParts[1];
    
    if (path === 'feed') setActiveTab('feed');
    else if (path === 'clips') setActiveTab('clips');
    else if (path === 'profile' && subPath === 'edit') setActiveTab('profile/edit');
    else if (['rankings', 'search', 'profile', 'settings', 'gyms', 'notifications'].includes(path)) setActiveTab(path);
  }, [location.pathname]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsInitializing(false);
      return;
    }

    const initAuth = async () => {
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setIsLoggedIn(true);
          // Fetch profile but don't strictly block initialization if it's slow
          // We'll wait a bit, but if it takes too long, we'll proceed
          const profilePromise = fetchProfile(session.user.id);
          
          // Wait up to 2 seconds for profile, then proceed anyway
          await Promise.race([
            profilePromise,
            new Promise(resolve => setTimeout(resolve, 2000))
          ]);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setIsInitializing(false);
      }
    };

    initAuth();

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
      fetchUnreadNotifications(userId);
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
    }
  };

  const fetchUnreadNotifications = async (userId: string) => {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);
      
      if (error) throw error;
      setUnreadNotifications(count || 0);
    } catch (err) {
      console.error('Erro ao buscar notificações:', err);
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
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text-main)] pb-20 md:pb-0 md:pl-24 transition-all duration-500">
        <ArenaNavbar 
          activeTab={tabId} 
          setActiveTab={(tab) => navigate(`/${tab === 'feed' ? '' : tab}`)} 
          userProfile={profile}
          unreadNotifications={unreadNotifications}
          onCreatePost={() => setIsCreatePostModalOpen(true)}
          onToggleMenu={() => setShowProfileMenu(!showProfileMenu)}
        />
        
        {/* Mobile Header */}
        <header className={`md:hidden fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-6 z-40 transition-all duration-500 ${tabId === 'rankings' ? 'bg-[var(--bg)] border-b border-[var(--border-ui)]' : 'bg-transparent'}`}>
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 bg-gradient-to-br from-[var(--primary)] to-blue-700 rounded-xl flex items-center justify-center font-black text-white italic overflow-hidden shadow-lg shadow-blue-500/20 border border-white/10">
              <Trophy size={20} className="text-white" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.2em] italic text-[var(--text-main)]">ArenaComp</span>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/search')}
              className="p-2.5 text-[var(--text-muted)] bg-[var(--surface)]/50 rounded-xl border border-[var(--border-ui)]"
            >
              <Search size={20} />
            </button>
            <button 
              onClick={() => navigate('/notifications')}
              className="relative p-2.5 text-[var(--text-muted)] bg-[var(--surface)]/50 rounded-xl border border-[var(--border-ui)]"
            >
              <Bell size={20} />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-[var(--bg)] shadow-lg">
                  {unreadNotifications}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Profile Menu Overlay */}
        <AnimatePresence>
          {showProfileMenu && (
            <React.Fragment key="profile-menu-container">
              <motion.div
                key="profile-menu-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowProfileMenu(false)}
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              />
              <motion.div
                key="profile-menu-content"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="fixed bottom-24 right-6 md:bottom-10 md:left-28 md:right-auto w-56 bg-[var(--surface)] border border-[var(--border-ui)] rounded-3xl shadow-2xl overflow-hidden z-50 py-3"
              >
                <div className="px-4 py-3 border-b border-[var(--border-ui)]/50 mb-2">
                  <p className="text-[11px] font-black text-[var(--text-main)] uppercase tracking-tight">{profile?.full_name}</p>
                  <p className="text-[9px] font-black text-[var(--primary)] uppercase tracking-[0.2em]">Level {Math.floor((profile?.arena_score || 0) / 100) + 1}</p>
                </div>
                <button 
                  onClick={() => { navigate('/profile'); setShowProfileMenu(false); }}
                  className="w-full px-4 py-3 text-left text-xs font-bold hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition-colors flex items-center space-x-2"
                >
                  <span>Meu Perfil</span>
                </button>
                {profile?.role === 'admin' && (
                  <button 
                    onClick={() => { navigate('/admin'); setShowProfileMenu(false); }}
                    className="w-full px-4 py-3 text-left text-xs font-bold text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors flex items-center space-x-2"
                  >
                    <span>Painel Admin</span>
                  </button>
                )}
                <button 
                  onClick={() => { navigate('/profile/edit'); setShowProfileMenu(false); }}
                  className="w-full px-4 py-3 text-left text-xs font-bold hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition-colors flex items-center space-x-2"
                >
                  <span>Editar Perfil</span>
                </button>
                <button 
                  onClick={() => { navigate('/settings'); setShowProfileMenu(false); }}
                  className="w-full px-4 py-3 text-left text-xs font-bold hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition-colors flex items-center space-x-2"
                >
                  <span>Configurações</span>
                </button>
                <button 
                  onClick={() => { toggleTheme(); setShowProfileMenu(false); }}
                  className="w-full px-4 py-3 text-left text-xs font-bold hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition-colors flex items-center justify-between"
                >
                  <span>Modo {theme === 'light' ? 'Escuro' : 'Claro'}</span>
                  {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
                </button>
                <div className="h-px bg-[var(--border-ui)] my-2" />
                <button 
                  onClick={() => { supabase.auth.signOut(); navigate('/login'); }}
                  className="w-full px-4 py-3 text-left text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center space-x-2"
                >
                  <span>Logout</span>
                </button>
              </motion.div>
            </React.Fragment>
          )}
        </AnimatePresence>

        <main className={`${(tabId === 'clips' || tabId === 'feed') ? 'max-w-none pt-16 pb-20 md:pb-0 md:pt-20 h-screen overflow-hidden' : 'max-w-7xl pt-16 md:pt-20'} mx-auto`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={tabId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={(tabId === 'clips' || tabId === 'feed') ? 'h-full' : ''}
            >
              {content}
            </motion.div>
          </AnimatePresence>
        </main>

        <CreatePostModal 
          isOpen={isCreatePostModalOpen}
          onClose={() => setIsCreatePostModalOpen(false)}
          userProfile={profile}
          onPostCreated={() => {
            // Refresh feed if active
            if (activeTab === 'feed') window.location.reload();
          }}
        />

        {/* Header (Desktop Only) */}
        <header className="hidden md:flex fixed top-0 right-0 left-24 h-20 bg-[var(--bg)]/40 backdrop-blur-2xl border-b border-[var(--border-ui)] items-center justify-between px-12 z-40 transition-all duration-500">
          <div className="flex items-center space-x-4">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--text-muted)]">Arena Protocol</span>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--primary)]">/ {tabId}</span>
          </div>
          
          <div className="flex items-center space-x-6 relative">
            <button 
              onClick={() => navigate('/search')}
              className="p-3 text-[var(--text-muted)] hover:text-[var(--primary)] bg-[var(--surface)]/50 rounded-2xl border border-[var(--border-ui)] transition-all hover:scale-105 active:scale-95"
            >
              <Search size={20} />
            </button>
            
            <button 
              onClick={() => navigate('/notifications')}
              className="relative p-3 text-[var(--text-muted)] hover:text-[var(--primary)] bg-[var(--surface)]/50 rounded-2xl border border-[var(--border-ui)] transition-all hover:scale-105 active:scale-95"
            >
              <Bell size={20} />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-[var(--bg)] shadow-lg">
                  {unreadNotifications}
                </span>
              )}
            </button>
          </div>
        </header>
      </div>
    );
  };

  return (
    <>
      <Toaster position="top-center" theme="dark" />
      <Routes>
      <Route path="/login" element={isLoggedIn ? <Navigate to="/" replace /> : <ArenaAuth />} />
      <Route path="/" element={isLoggedIn ? renderLayout(<ArenaFeed userProfile={profile} />, 'feed') : <LandingPage />} />
      <Route path="/home-public" element={<LandingPage />} />
      <Route path="/clips" element={renderLayout(<ArenaClips />, 'clips')} />
      <Route path="/rankings" element={renderLayout(<ArenaRankings />, 'rankings')} />
      <Route path="/search" element={renderLayout(<ArenaSearch />, 'search')} />
      <Route path="/profile" element={renderLayout(<ProfileWrapper />, 'profile')} />
      <Route path="/profile/edit" element={renderLayout(<ProfileWrapper forceEdit />, 'profile/edit')} />
      <Route path="/profile/:userId" element={renderLayout(<ProfileWrapper />, 'profile')} />
      <Route path="/user/:username" element={renderLayout(<ProfileWrapper />, 'profile')} />
      <Route path="/notifications" element={renderLayout(<ArenaNotifications />, 'notifications')} />
      <Route path="/settings" element={renderLayout(<ArenaSettings />, 'settings')} />
      <Route path="/gyms" element={renderLayout(<div className="flex items-center justify-center h-screen text-[var(--text-muted)] uppercase font-black tracking-widest">Módulo de Academias em Breve</div>, 'gyms')} />
      
      {/* Redirection Routes */}
      <Route path="/feed/post/:id" element={renderLayout(<ArenaFeed userProfile={profile} />, 'feed')} />
      <Route path="/clips/:id" element={renderLayout(<ArenaClips />, 'clips')} />
      <Route path="/certificates/:id" element={renderLayout(<ProfileWrapper />, 'profile')} />
      <Route path="/fights/:id" element={renderLayout(<ProfileWrapper />, 'profile')} />
      <Route path="/championships/:id" element={renderLayout(<ProfileWrapper />, 'profile')} />
      
      <Route path="/post/:id" element={<Navigate to="/" replace />} />
      <Route path="/clip/:id" element={<Navigate to="/clips" replace />} />
      <Route path="/certificate/:id" element={<Navigate to="/profile" replace />} />
      <Route path="/share/:type/:id" element={<SharePage />} />
      <Route path="/share/:id" element={<SharePage />} />

      {/* Admin Routes */}
      <Route 
        path="/admin/*" 
        element={
          !isLoggedIn ? (
            <ArenaAuth isAdminLogin={true} />
          ) : profile?.role === 'admin' ? (
            <AdminLayout userProfile={profile}>
              <Routes>
                <Route path="/" element={<AdminDashboard />} />
                <Route path="/athletes" element={<AdminAthletes />} />
                <Route path="/teams" element={<AdminTeams />} />
                <Route path="/posts" element={<AdminPosts />} />
                <Route path="/ads" element={<AdminAds />} />
                <Route path="/logs" element={<AdminLogs />} />
                <Route path="/export" element={<AdminExport />} />
              </Routes>
            </AdminLayout>
          ) : (
            <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-24 h-24 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-center justify-center text-rose-500 mb-8"
              >
                <Shield size={48} />
              </motion.div>
              <h1 className="text-4xl font-black uppercase italic tracking-tighter mb-4">Acesso Restrito</h1>
              <p className="text-gray-400 max-w-md mb-10 text-sm leading-relaxed font-medium">
                Olá <span className="text-white font-bold">{profile?.full_name}</span>, você está autenticado mas não possui as credenciais de administrador necessárias para acessar este protocolo.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => navigate('/')}
                  className="px-10 py-4 bg-white/5 border border-white/10 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all flex items-center justify-center space-x-2"
                >
                  <ArrowLeft size={16} />
                  <span>Voltar ao App</span>
                </button>
                <button 
                  onClick={() => supabase.auth.signOut()}
                  className="px-10 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all flex items-center justify-center space-x-2"
                >
                  <Lock size={16} />
                  <span>Trocar de Conta</span>
                </button>
              </div>
            </div>
          )
        } 
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
