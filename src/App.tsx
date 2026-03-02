import { LayoutDashboard, Trophy, BookOpen, Users, Settings, LogOut, Menu, X, CreditCard, Sun, Moon, ShieldCheck, User as UserIcon, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Scoreboard from './components/Scoreboard';
import ChampionshipModule from './components/Championships';
import TechniqueLibrary from './components/Techniques';
import AthleteDashboard from './components/AthleteDashboard';
import CoordinatorDashboard from './components/CoordinatorDashboard';
import MyEvents from './components/MyEvents';
import LandingPage from './components/LandingPage';
import AthleteProfileForm from './components/AthleteProfileForm';
import { UserType, UserProfile, AthleteProfile } from './types';
import { supabase, isSupabaseConfigured } from './services/supabase';
import { authService } from './services/authService';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [athleteProfile, setAthleteProfile] = useState<AthleteProfile | null>(null);
  const [headerSignedUrl, setHeaderSignedUrl] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [checkingAthlete, setCheckingAthlete] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const fetchAthleteProfile = async (userId: string) => {
    try {
      setCheckingAthlete(true);
      const { data, error } = await supabase
        .from('atletas')
        .select('*')
        .eq('usuario_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      setAthleteProfile(data);

      // Generate Signed URL for Header if photo exists
      if (data?.foto_url) {
        const { data: signedData } = await supabase.storage
          .from('atletas-perfil')
          .createSignedUrl(data.foto_url, 3600);
        
        if (signedData) {
          // Add timestamp to bypass browser cache
          setHeaderSignedUrl(`${signedData.signedUrl}&t=${Date.now()}`);
        }
      } else {
        setHeaderSignedUrl(null);
      }
    } catch (err) {
      console.error('Erro ao buscar perfil do atleta:', err);
    } finally {
      setCheckingAthlete(false);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      setProfile(data);
      
      if (data.perfil_ativo === 'atleta') {
        await fetchAthleteProfile(userId);
      }
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
    }
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

  const handleLogout = async () => {
    await authService.signOut();
    setIsLoggedIn(false);
    setProfile(null);
  };

  const handleSwitchProfile = async (newProfile: UserType) => {
    if (!profile || profile.tipo_usuario !== 'coordenador' || isSwitching) return;
    
    setIsSwitching(true);
    try {
      await authService.switchProfile(profile.id, newProfile);
      await fetchProfile(profile.id);
    } catch (err) {
      console.error('Erro ao alternar perfil:', err);
    } finally {
      setIsSwitching(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-950">
        <div className="w-12 h-12 border-4 border-bjj-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn || !profile) {
    return <LandingPage onLogin={() => {
      // Profile will be fetched by the onAuthStateChange listener
    }} />;
  }

  const userType = profile.perfil_ativo;
  const isAthleteProfileIncomplete = userType === 'atleta' && (!athleteProfile || !athleteProfile.perfil_completo);

  const menuItems = userType === 'atleta' ? [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'techniques', label: 'Técnicas', icon: BookOpen },
    { id: 'championships', label: 'Campeonatos', icon: Trophy },
    { id: 'scoreboard', label: 'Placar', icon: CreditCard },
  ] : [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'my-events', label: 'Meus Eventos', icon: Trophy },
    { id: 'techniques', label: 'Técnicas', icon: BookOpen },
    { id: 'scoreboard', label: 'Placar', icon: CreditCard },
  ];

  if (isAthleteProfileIncomplete) {
    return (
      <div className={`flex h-screen overflow-hidden ${isDarkMode ? 'dark' : ''}`}>
        <main className="flex-1 flex flex-col overflow-hidden relative bg-[var(--bg-app)]">
          <header className="h-20 border-b border-[var(--border-ui)] flex items-center justify-between px-8 bg-[var(--bg-app)]/50 backdrop-blur-sm z-40">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-bjj-blue rounded-lg flex items-center justify-center">
                <Trophy className="text-white" size={18} />
              </div>
              <h1 className="text-xl font-black font-display tracking-tighter text-[var(--text-main)]">ARENA<span className="text-bjj-blue">COMP</span></h1>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors font-bold text-sm"
            >
              <LogOut size={18} /> Sair
            </button>
          </header>
          <div className="flex-1 overflow-y-auto p-8">
            <AthleteProfileForm 
              userId={profile.id} 
              onComplete={() => fetchAthleteProfile(profile.id)} 
            />
          </div>
        </main>
      </div>
    );
  }

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

              {/* Profile Switcher - Only for Coordinators */}
              {profile.tipo_usuario === 'coordenador' && (
                <div className="mb-8 p-1 bg-[var(--border-ui)] rounded-xl flex relative">
                  {isSwitching && (
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] rounded-xl flex items-center justify-center z-10">
                      <RefreshCw size={16} className="animate-spin text-bjj-blue" />
                    </div>
                  )}
                  <button 
                    onClick={() => handleSwitchProfile('atleta')}
                    disabled={isSwitching}
                    className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all flex items-center justify-center gap-2 ${userType === 'atleta' ? 'bg-[var(--bg-card)] text-bjj-blue shadow-sm' : 'text-[var(--text-muted)]'}`}
                  >
                    <UserIcon size={14} /> Atleta
                  </button>
                  <button 
                    onClick={() => handleSwitchProfile('coordenador')}
                    disabled={isSwitching}
                    className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all flex items-center justify-center gap-2 ${userType === 'coordenador' ? 'bg-[var(--bg-card)] text-bjj-purple shadow-sm' : 'text-[var(--text-muted)]'}`}
                  >
                    <ShieldCheck size={14} /> Coordenador
                  </button>
                </div>
              )}

              <nav className="space-y-2">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      activeTab === item.id 
                        ? (userType === 'atleta' ? 'bg-bjj-blue' : 'bg-bjj-purple') + ' text-white shadow-lg' 
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
              <div className={`glass-panel p-4 border-2 ${userType === 'atleta' ? 'bg-bjj-blue/5 border-bjj-blue/20' : 'bg-bjj-purple/5 border-bjj-purple/20'}`}>
                <p className={`text-xs font-bold uppercase mb-1 ${userType === 'atleta' ? 'text-bjj-blue' : 'text-bjj-purple'}`}>
                  {userType === 'atleta' ? 'Perfil Atleta' : 'Perfil Coordenador'}
                </p>
                <p className="text-xs text-[var(--text-muted)]">Acesso real ao banco de dados.</p>
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
                {profile.nome}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {userType === 'atleta' ? 'Atleta Competidor' : 'Coordenador Oficial'}
              </p>
            </div>
            <div className={`w-10 h-10 rounded-full bg-[var(--border-ui)] border-2 p-0.5 ${userType === 'atleta' ? 'border-bjj-blue' : 'border-bjj-purple'}`}>
              <img 
                src={headerSignedUrl || profile.foto_url || `https://picsum.photos/seed/${profile.id}/100/100`} 
                className="w-full h-full rounded-full object-cover"
                referrerPolicy="no-referrer"
                key={headerSignedUrl || 'default'}
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
                userType === 'atleta' ? (
                  <AthleteDashboard onPhotoUpdate={() => fetchAthleteProfile(profile.id)} />
                ) : (
                  <CoordinatorDashboard onEventClick={(id) => {
                    setSelectedEventId(id);
                    setActiveTab('my-events');
                  }} />
                )
              )}
              {activeTab === 'my-events' && (
                <MyEvents 
                  initialEventId={selectedEventId} 
                  onClearSelection={() => setSelectedEventId(null)} 
                />
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
