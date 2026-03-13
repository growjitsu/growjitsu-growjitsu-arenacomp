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
import { CreatePostModal } from './components/CreatePostModal';
import { AdminLayout } from './components/Admin/AdminLayout';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { AdminAthletes } from './components/Admin/AdminAthletes';
import { AdminTeams } from './components/Admin/AdminTeams';
import { AdminPosts } from './components/Admin/AdminPosts';
import { AdminLogs } from './components/Admin/AdminLogs';
import { AdminExport } from './components/Admin/AdminExport';
import { ArenaProfile } from './types';
import { Bell, Plus, Shield, Lock, ArrowLeft } from 'lucide-react';

const ProfileWrapper = ({ forceEdit }: { forceEdit?: boolean }) => {
  const { userId, username } = useParams();
  return <ArenaProfileView userId={userId} username={username} forceEdit={forceEdit} />;
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
        />
        
        {/* Mobile Header */}
        <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[var(--bg)]/60 backdrop-blur-2xl border-b border-[var(--border-ui)] flex items-center justify-between px-6 z-40 transition-all duration-500">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[var(--primary)] to-blue-700 rounded-xl flex items-center justify-center font-black text-white italic overflow-hidden shadow-lg shadow-blue-500/20 border border-white/10">
              {profile?.profile_photo || profile?.avatar_url ? (
                <img src={profile.profile_photo || profile.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                'A'
              )}
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.2em] italic text-[var(--text-main)]">ArenaComp</span>
          </div>
          <div className="flex items-center space-x-4">
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
            <div className="relative">
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-10 h-10 rounded-xl bg-[var(--surface)] border border-[var(--border-ui)] overflow-hidden shadow-lg"
              >
                {profile?.profile_photo || profile?.avatar_url ? (
                  <img src={profile.profile_photo || profile.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[var(--primary)]/10 text-[var(--primary)]">
                    <span className="text-[10px] font-bold">{profile?.full_name?.charAt(0)}</span>
                  </div>
                )}
              </button>

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
                    <div className="h-px bg-[var(--border-ui)] my-1" />
                    <button 
                      onClick={() => { supabase.auth.signOut(); navigate('/login'); }}
                      className="w-full px-4 py-3 text-left text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center space-x-2"
                    >
                      <span>Logout</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className={`${tabId === 'clips' ? 'max-w-none pt-16 pb-0 md:pt-20 h-screen overflow-hidden' : 'max-w-7xl pt-16 md:pt-20'} mx-auto`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={tabId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {content}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile Floating Create Button */}
        <button
          onClick={() => setIsCreatePostModalOpen(true)}
          className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-[var(--primary)] text-white rounded-full shadow-2xl shadow-[var(--primary)]/40 flex items-center justify-center z-40 active:scale-90 transition-transform"
        >
          <Plus size={28} />
        </button>

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
          
          <div className="flex items-center space-x-8 relative">
            <div className="flex items-center space-x-4 bg-[var(--surface)]/50 px-6 py-2.5 rounded-2xl border border-[var(--border-ui)] shadow-inner">
              <div className="text-right">
                <p className="text-[11px] font-black text-[var(--text-main)] uppercase tracking-tight">{profile?.full_name}</p>
                <p className="text-[9px] font-black text-[var(--primary)] uppercase tracking-[0.2em]">Level {Math.floor((profile?.arena_score || 0) / 100) + 1}</p>
              </div>
              <div className="w-px h-6 bg-[var(--border-ui)]" />
              <div className="flex flex-col items-center">
                <span className="text-[12px] font-black text-[var(--text-main)]">{Math.round(profile?.arena_score || 0)}</span>
                <span className="text-[7px] font-black text-[var(--text-muted)] uppercase tracking-widest">Points</span>
              </div>
            </div>

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

            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-12 h-12 rounded-2xl bg-[var(--surface)] border border-[var(--border-ui)] overflow-hidden hover:border-[var(--primary)] transition-all shadow-xl hover:shadow-[var(--primary)]/20 group"
            >
              {profile?.profile_photo || profile?.avatar_url ? (
                <img src={profile.profile_photo || profile.avatar_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[var(--primary)]/10 text-[var(--primary)]">
                  <span className="text-sm font-bold">{profile?.full_name?.charAt(0)}</span>
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
                  {profile?.role === 'admin' && (
                    <button 
                      onClick={() => { navigate('/admin'); setShowProfileMenu(false); }}
                      className="w-full px-4 py-2 text-left text-xs font-bold text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors flex items-center space-x-2"
                    >
                      <span>Painel Admin</span>
                    </button>
                  )}
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
      <Route path="/" element={renderLayout(<ArenaFeed userProfile={profile} />, 'feed')} />
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
  );
}
