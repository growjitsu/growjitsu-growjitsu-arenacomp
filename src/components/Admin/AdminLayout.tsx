import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Shield, 
  FileText, 
  Settings, 
  LogOut, 
  ChevronRight,
  Database,
  History,
  Download,
  Menu,
  X,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../services/supabase';
import logo from '../../assets/logo.png';

interface AdminLayoutProps {
  children: React.ReactNode;
  userProfile: any;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, userProfile }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
    { icon: Users, label: 'Atletas', path: '/admin/athletes' },
    { icon: Shield, label: 'Equipes', path: '/admin/teams' },
    { icon: FileText, label: 'Postagens', path: '/admin/posts' },
    { icon: Zap, label: 'Arena Ads', path: '/admin/ads' },
    { icon: History, label: 'Logs', path: '/admin/logs' },
    { icon: Download, label: 'Exportar', path: '/admin/export' },
  ];

  const activeItem = menuItems.find(item => 
    item.path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(item.path)
  ) || menuItems[0];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-white/10 bg-[#0f0f0f] sticky top-0 h-screen">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
              <img 
                src={logo} 
                alt="ArenaComp" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling;
                  if (fallback) (fallback as HTMLElement).style.display = 'block';
                }}
              />
              <div className="hidden w-8 h-8 bg-blue-600 rounded-lg items-center justify-center font-black italic text-white shadow-lg border border-white/10">
                <span>A</span>
              </div>
            </div>
            <span className="font-black uppercase tracking-widest text-sm italic">Arena Admin</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${
                activeItem.path === item.path 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <item.icon size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">{item.label}</span>
              </div>
              {activeItem.path === item.path && <ChevronRight size={14} />}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-white/5 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 overflow-hidden">
              {userProfile?.avatar_url || userProfile?.profile_photo ? (
                <img src={userProfile.avatar_url || userProfile.profile_photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-blue-500 font-bold">
                  {userProfile?.full_name?.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase truncate">{userProfile?.full_name}</p>
              <p className="text-[8px] font-bold text-blue-500 uppercase tracking-widest">Administrator</p>
            </div>
          </div>
          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              navigate('/login');
            }}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all"
          >
            <LogOut size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-[#0f0f0f] border-b border-white/10 sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
            <img 
              src={logo} 
              alt="ArenaComp" 
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling;
                if (fallback) (fallback as HTMLElement).style.display = 'block';
              }}
            />
            <div className="hidden w-8 h-8 bg-blue-600 rounded-lg items-center justify-center font-black italic text-white">
              <span>A</span>
            </div>
          </div>
          <span className="font-black uppercase tracking-widest text-sm italic">Arena Admin</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-400 hover:text-white"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="md:hidden fixed inset-0 z-40 bg-[#0a0a0a] pt-20"
          >
            <nav className="p-6 space-y-4">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-4 p-4 rounded-2xl ${
                    activeItem.path === item.path 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white/5 text-gray-400'
                  }`}
                >
                  <item.icon size={20} />
                  <span className="font-bold uppercase tracking-widest text-sm">{item.label}</span>
                </Link>
              ))}
              <button 
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate('/login');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center space-x-4 p-4 rounded-2xl bg-rose-500/10 text-rose-500"
              >
                <LogOut size={20} />
                <span className="font-bold uppercase tracking-widest text-sm">Logout</span>
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-x-hidden">
        <div className="max-w-6xl mx-auto">
          <header className="mb-10">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">Arena Admin Protocol</span>
            </div>
            <h1 className="text-3xl font-black uppercase italic tracking-tight">{activeItem.label}</h1>
          </header>
          
          {children}
        </div>
      </main>
    </div>
  );
};
