import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  User, Mail, Lock, Shield, Eye, Bell, 
  Moon, Sun, LogOut, Trash2, Check, AlertCircle
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { useTheme } from '../context/ThemeContext';

export const ArenaSettings: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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
        { label: 'Alterar E-mail', description: 'Atualize seu endereço de e-mail principal', action: () => alert('Funcionalidade em desenvolvimento') },
        { label: 'Alterar Senha', description: 'Mantenha sua conta segura com uma senha forte', action: () => alert('Funcionalidade em desenvolvimento') },
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
        { label: 'Perfil Público', description: 'Permitir que outros usuários vejam seu perfil', toggle: true, default: true },
        { label: 'Permitir Seguidores', description: 'Permitir que outros atletas sigam suas atividades', toggle: true, default: true },
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
          className={`p-4 rounded-2xl flex items-center space-x-3 ${
            message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
          }`}
        >
          {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span className="text-xs font-bold uppercase tracking-widest">{message.text}</span>
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
                    <div className="w-12 h-6 bg-[var(--bg)] border border-[var(--border-ui)] rounded-full relative cursor-pointer">
                      <div className="absolute top-1 left-1 w-4 h-4 bg-[var(--primary)] rounded-full" />
                    </div>
                  ) : (
                    <button 
                      onClick={item.action}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        item.danger 
                          ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white' 
                          : 'bg-[var(--bg)] text-[var(--text-main)] border border-[var(--border-ui)] hover:border-[var(--primary)]'
                      }`}
                    >
                      {item.danger ? 'Executar' : 'Configurar'}
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
    </div>
  );
};
