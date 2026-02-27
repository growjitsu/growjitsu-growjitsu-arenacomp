import { LayoutDashboard, Trophy, BookOpen, Users, Settings, LogOut, Menu, X, CreditCard, Sun, Moon, ShieldCheck, User as UserIcon, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Scoreboard from './components/Scoreboard';
import ChampionshipModule from './components/Championships';
import TechniqueLibrary from './components/Techniques';
import AthleteDashboard from './components/AthleteDashboard';
import CoordinatorDashboard from './components/CoordinatorDashboard';
import LandingPage from './components/LandingPage';
import { UserType, UserProfile } from './types';
import { supabase, isSupabaseConfigured } from './services/supabase';
import { authService } from './services/authService';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return;
    }
    setUserProfile(data);
  };

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setIsLoggedIn(true);
        fetchProfile(session.user.id);
      } else {
        setIsLoggedIn(false);
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await authService.signOut();
  };

  const handleSwitchProfile = async () => {
    if (!userProfile || userProfile.tipo_usuario !== 'organizer') return;
    
    const newProfile = userProfile.perfil_ativo === 'organizer' ? 'athlete' : 'organizer';
    try {
      await authService.switchProfile(newProfile);
      setUserProfile({ ...userProfile, perfil_ativo: newProfile });
    } catch (err) {
      console.error('Erro ao alternar perfil:', err);
    }
  };

  if (isInitializing) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-950">
        <div className="w-12 h-12 border-4 border-bjj-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn || !userProfile) {
    return <LandingPage onLogin={() => {
      setIsLoggedIn(true);
    }} />;
  }

  const userType = userProfile.perfil_ativo;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'techniques', label: 'Técnicas', icon: BookOpen },
    { id: 'championships', label: 'Campeonatos', icon: Trophy },
    { id: 'scoreboard', label: 'Placar', icon: CreditCard },
  ];

  return (
    <div className={`flex h-screen overflow-hidden ${isDarkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="w-72 bg-[var(--bg-card)] border-r border-[var(--border-ui)] flex flex-col z-50"
          >
            <div className="p-8">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 bg-bjj-blue rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Trophy className="text-white" size={24} />
                </div>
                <h1 className="text-2xl font-black font-display tracking-tighter text-[var(--text-main)]">ARENA<span className="text-bjj-blue">COMP</span></h1>
              </div>

              <div className="mb-8 p-1 bg-[var(--border-ui)] rounded-xl flex">
                <div className="flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all flex items-center justify-center gap-2 bg-[var(--bg-card)] text-bjj-blue shadow-sm">
                  {userType === 'athlete' ? <><UserIcon size={14} /> Atleta</> : <><ShieldCheck size={14} /> Organizador</>}
                </div>
              </div>

              {userProfile.tipo_usuario === 'organizer' && (
                <button 
                  onClick={handleSwitchProfile}
                  className="w-full mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-bjj-gold/10 text-bjj-gold hover:bg-bjj-gold/20 transition-all border border-bjj-gold/20"
                >
                  <RefreshCw size={20} />
                  <span className="font-bold">Alternar Perfil</span>
                </button>
              )}

              <nav className="space-y-2">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      activeTab === item.id 
                        ? (userType === 'athlete' ? 'bg-bjj-blue' : 'bg-bjj-purple') + ' text-white shadow-lg' 
                        : 'text-[var(--text-muted)] hover:bg-[var(--border-ui)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <item.icon size={20} />
                    <span className="font-semibold">{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="mt-auto p-8 space-y-4">
              <div className={`glass-panel p-4 border-2 ${userType === 'athlete' ? 'bg-bjj-blue/5 border-bjj-blue/20' : 'bg-bjj-purple/5 border-bjj-purple/20'}`}>
                <p className={`text-xs font-bold uppercase mb-1 ${userType === 'athlete' ? 'text-bjj-blue' : 'text-bjj-purple'}`}>
                  {userType === 'athlete' ? 'Perfil Atleta' : 'Perfil Organizador'}
                </p>
                <p className="text-xs text-[var(--text-muted)]">Acesso total liberado.</p>
              </div>
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="w-full flex items-center gap-3 px-4 py-3 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
              >
                <Settings size={20} />
                <span className="font-semibold">{isDarkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
              </button>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:text-red-400 transition-colors"
              >
                <LogOut size={20} />
                <span className="font-semibold">Sair</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-[var(--bg-app)]">
        {/* Top Header */}
        <header className="h-20 border-b border-[var(--border-ui)] flex items-center justify-between px-8 bg-[var(--bg-app)]/50 backdrop-blur-sm z-40">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-[var(--border-ui)] rounded-lg transition-colors text-[var(--text-main)]"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 hover:bg-[var(--border-ui)] rounded-xl transition-all text-[var(--text-main)] flex items-center gap-2 border border-[var(--border-ui)]"
              title={isDarkMode ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}
            >
              {isDarkMode ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} className="text-bjj-blue" />}
              <span className="text-xs font-bold uppercase hidden sm:block">
                {isDarkMode ? 'Claro' : 'Escuro'}
              </span>
            </button>

            <div className="h-8 w-[1px] bg-[var(--border-ui)] mx-2 hidden sm:block" />

            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-[var(--text-main)]">
                {userProfile.nome}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {userType === 'athlete' ? 'Atleta Ativo' : 'Organizador Master'}
              </p>
            </div>
            <div className={`w-10 h-10 rounded-full bg-[var(--border-ui)] border-2 p-0.5 ${userType === 'athlete' ? 'border-bjj-blue' : 'border-bjj-purple'}`}>
              <img 
                src={`https://picsum.photos/seed/${userType}/100/100`} 
                className="w-full h-full rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTab}-${userType}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === 'dashboard' && (
                userType === 'athlete' ? <AthleteDashboard /> : <CoordinatorDashboard />
              )}
              {activeTab === 'techniques' && <TechniqueLibrary />}
              {activeTab === 'championships' && <ChampionshipModule />}
              {activeTab === 'scoreboard' && <Scoreboard />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  return (
    <div className="card-surface p-6 hover:border-bjj-blue/50 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl bg-[var(--border-ui)] ${color}`}>
          <Icon size={24} />
        </div>
      </div>
      <p className="text-[var(--text-muted)] text-sm font-medium">{label}</p>
      <h3 className="text-3xl font-black mt-1 text-[var(--text-main)]">{value}</h3>
      <p className="text-xs text-emerald-500 mt-2">{sub}</p>
    </div>
  );
}

function MatchRow({ a1, a2, cat, time, status }: any) {
  return (
    <tr className="hover:bg-[var(--border-ui)]/50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[var(--text-main)]">{a1}</span>
          <span className="text-[var(--text-muted)] text-xs">vs</span>
          <span className="font-bold text-[var(--text-main)]">{a2}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-[var(--text-muted)]">{cat}</td>
      <td className="px-6 py-4 text-sm font-mono text-[var(--text-main)]">{time}</td>
      <td className="px-6 py-4">
        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
          status === 'A seguir' ? 'bg-bjj-blue/20 text-bjj-blue' : 'bg-[var(--border-ui)] text-[var(--text-muted)]'
        }`}>
          {status}
        </span>
      </td>
    </tr>
  );
}
