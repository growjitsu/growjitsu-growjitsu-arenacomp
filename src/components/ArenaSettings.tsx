import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Mail, Lock, Shield, Eye, Bell, 
  Moon, Sun, LogOut, Trash2, Check, AlertCircle, X, ExternalLink
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { useTheme } from '../context/ThemeContext';
import { ArenaProfile } from '../types';

export const ArenaSettings: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ArenaProfile | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // ... existing state ...
  
  // Modals state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  // Form state
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    setProfile(data);
  };

  const handleUpdatePrivacy = async (field: 'perfil_publico' | 'permitir_seguidores', value: boolean) => {
    if (!profile) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('id', profile.id);
      
      if (error) throw error;
      setProfile({ ...profile, [field]: value });
      setMessage({ type: 'success', text: 'Configuração atualizada.' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao atualizar configuração.' });
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      setMessage({ type: 'success', text: 'E-mail de confirmação enviado para o novo endereço.' });
      setShowEmailModal(false);
      setNewEmail('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem.' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Senha atualizada com sucesso.' });
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOutAll = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Todas as sessões foram encerradas.' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao encerrar sessões.' });
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    {
      title: 'Configurações de Conta',
      icon: User,
      items: [
        { label: 'Alterar E-mail', description: 'Atualize seu endereço de e-mail principal', action: () => setShowEmailModal(true) },
        { label: 'Alterar Senha', description: 'Mantenha sua conta segura com uma senha forte', action: () => setShowPasswordModal(true) },
      ]
    },
    {
      title: 'Interface & Aparência',
      icon: Eye,
      items: [
        { 
          label: 'Modo Escuro', 
          description: 'Alterne entre os temas claro e escuro', 
          component: (
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-[var(--bg)] border border-[var(--border-ui)] text-[var(--text-main)] hover:border-[var(--primary)] transition-all"
            >
              {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          )
        },
      ]
    },
    {
      title: 'Privacidade',
      icon: Shield,
      items: [
        { 
          label: 'Perfil Público', 
          description: 'Permitir que outros usuários vejam seu perfil', 
          toggle: true, 
          active: profile?.perfil_publico,
          onToggle: () => handleUpdatePrivacy('perfil_publico', !profile?.perfil_publico)
        },
        { 
          label: 'Permitir Seguidores', 
          description: 'Permitir que outros atletas sigam suas atividades', 
          toggle: true, 
          active: profile?.permitir_seguidores,
          onToggle: () => handleUpdatePrivacy('permitir_seguidores', !profile?.permitir_seguidores)
        },
      ]
    },
    {
      title: 'Segurança',
      icon: Lock,
      items: [
        { 
          label: 'Encerrar Sessões Ativas', 
          description: 'Desconectar de todos os outros dispositivos', 
          action: handleSignOutAll,
          danger: true
        },
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-12">
      <div className="space-y-2">
        <h1 className="text-4xl font-black text-[var(--text-main)] uppercase tracking-tighter italic">Configurações</h1>
        <p className="text-[var(--text-muted)] text-sm font-bold uppercase tracking-widest">Gerencie sua conta e preferências da plataforma</p>
      </div>

      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl flex items-center justify-between space-x-3 ${
            message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
          }`}
        >
          <div className="flex items-center space-x-3">
            {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-widest">{message.text}</span>
              {message.type === 'error' && window.self !== window.top && (
                <button 
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="text-[10px] font-black uppercase tracking-widest text-rose-500 underline mt-1 flex items-center space-x-1"
                >
                  <ExternalLink size={10} />
                  <span>Abrir em Nova Aba</span>
                </button>
              )}
            </div>
          </div>
          <button onClick={() => setMessage(null)}><X size={14} /></button>
        </motion.div>
      )}

      <div className="grid gap-8">
        {sections.map((section, i) => (
          <div key={i} className="space-y-4">
            <div className="flex items-center space-x-3 text-[var(--text-muted)]">
              <section.icon size={18} />
              <h2 className="text-xs font-black uppercase tracking-widest">{section.title}</h2>
            </div>
            
            <div className="bg-[var(--surface)] border border-[var(--border-ui)] rounded-3xl overflow-hidden divide-y divide-[var(--border-ui)] transition-colors duration-300">
              {section.items.map((item, j) => (
                <div key={j} className="p-6 flex items-center justify-between hover:bg-[var(--primary)]/5 transition-colors">
                  <div className="space-y-1">
                    <p className={`text-sm font-bold ${item.danger ? 'text-rose-500' : 'text-[var(--text-main)]'}`}>{item.label}</p>
                    <p className="text-xs text-[var(--text-muted)]">{item.description}</p>
                  </div>
                  
                  {item.component ? (
                    item.component
                  ) : item.toggle ? (
                    <button 
                      onClick={item.onToggle}
                      className={`w-12 h-6 rounded-full relative transition-colors ${item.active ? 'bg-[var(--primary)]' : 'bg-[var(--bg)] border border-[var(--border-ui)]'}`}
                    >
                      <motion.div 
                        animate={{ x: item.active ? 24 : 4 }}
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" 
                      />
                    </button>
                  ) : (
                    <button 
                      onClick={item.action}
                      disabled={item.loading}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${
                        item.danger 
                          ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white' 
                          : 'bg-[var(--bg)] text-[var(--text-main)] border border-[var(--border-ui)] hover:border-[var(--primary)]'
                      }`}
                    >
                      {item.loading ? (
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : null}
                      <span>
                        {item.danger ? 'Executar' : 'Configurar'}
                      </span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-12 border-t border-[var(--border-ui)]">
        <button 
          onClick={() => supabase.auth.signOut()}
          className="w-full p-6 bg-rose-500/10 text-rose-500 rounded-3xl border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center space-x-3 group"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-black uppercase tracking-widest">Sair da Conta</span>
        </button>
      </div>

      {/* Email Modal */}
      <AnimatePresence>
        {showEmailModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--surface)] border border-[var(--border-ui)] rounded-3xl p-8 w-full max-w-md space-y-6 shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black uppercase italic text-[var(--text-main)]">Alterar E-mail</h2>
                <button onClick={() => setShowEmailModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><X size={20} /></button>
              </div>
              <form onSubmit={handleUpdateEmail} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Novo E-mail</label>
                  <input 
                    type="email"
                    required
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                    placeholder="seu@novoemail.com"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[var(--primary)] text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-[var(--primary-highlight)] transition-all disabled:opacity-50"
                >
                  {loading ? 'Processando...' : 'Confirmar Alteração'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--surface)] border border-[var(--border-ui)] rounded-3xl p-8 w-full max-w-md space-y-6 shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black uppercase italic text-[var(--text-main)]">Alterar Senha</h2>
                <button onClick={() => setShowPasswordModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><X size={20} /></button>
              </div>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Nova Senha</label>
                  <input 
                    type="password"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Confirmar Nova Senha</label>
                  <input 
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                    placeholder="••••••••"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[var(--primary)] text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-[var(--primary-highlight)] transition-all disabled:opacity-50"
                >
                  {loading ? 'Processando...' : 'Confirmar Alteração'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
