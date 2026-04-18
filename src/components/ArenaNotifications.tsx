import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Bell, User, Heart, MessageCircle, PlusCircle, ChevronRight, Target } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Link } from 'react-router-dom';

interface Notification {
  id: string;
  type: 'follow' | 'like' | 'comment' | 'post' | 'challenge_received' | 'challenge_accepted' | 'challenge_declined' | 'challenge_updated' | 'challenge';
  read: boolean;
  title?: string;
  description?: string;
  created_at: string;
  actor: {
    // ... same as before but I'll use simpler structure for the edit
    id: string;
    full_name: string;
    username: string;
    profile_photo: string;
    avatar_url: string;
  };
  post_id?: string;
}

export const ArenaNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    markAsRead();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          actor:profiles!notifications_actor_id_fkey(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const getNotificationContent = (notification: Notification) => {
    switch (notification.type) {
      case 'follow':
        return 'começou a seguir você';
      case 'like':
        return 'curtiu sua publicação';
      case 'comment':
        return 'comentou na sua publicação';
      case 'post':
        return 'fez uma nova publicação';
      case 'challenge_received':
        return 'lançou um DESAFIO 1x1 para você!';
      case 'challenge_accepted':
        return 'ACEITOU seu desafio! Prepare-se para a luta.';
      case 'challenge_declined':
        return 'recusou seu desafio 1x1.';
      case 'challenge_updated':
        return 'atualizou o status de um desafio.';
      default:
        return 'interagiu com você';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return <User size={14} className="text-blue-500" />;
      case 'like':
        return <Heart size={14} className="text-rose-500" />;
      case 'comment':
        return <MessageCircle size={14} className="text-emerald-500" />;
      case 'post':
        return <PlusCircle size={14} className="text-[var(--primary)]" />;
      case 'challenge_received':
      case 'challenge_accepted':
      case 'challenge_declined':
      case 'challenge_updated':
      case 'challenge':
        return <Target size={14} className="text-[var(--primary)]" />;
      default:
        return <Bell size={14} />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black uppercase tracking-tighter italic text-[var(--text-main)]">Notificações</h2>
        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{notifications.length} Total</span>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" />
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`bg-[var(--surface)] border border-[var(--border-ui)] p-4 rounded-2xl flex items-center justify-between group hover:border-[var(--primary)]/30 transition-all ${!notification.read ? 'border-l-4 border-l-[var(--primary)]' : ''}`}
            >
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-[var(--bg)] overflow-hidden border border-[var(--border-ui)]">
                    {notification.actor?.profile_photo || notification.actor?.avatar_url ? (
                      <img src={notification.actor.profile_photo || notification.actor.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                        <User size={20} />
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[var(--surface)] border border-[var(--border-ui)] rounded-full flex items-center justify-center shadow-sm">
                    {getNotificationIcon(notification.type)}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-main)]">
                    {notification.title ? (
                      <span className="font-black text-[var(--primary)] uppercase tracking-tight">{notification.title}</span>
                    ) : (
                      <Link to={`/profile/${notification.actor?.id}`} className="font-black hover:text-[var(--primary)] transition-colors">
                        {notification.actor?.full_name}
                      </Link>
                    )}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {notification.description || getNotificationContent(notification)}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-widest mt-1.5">
                    {new Date(notification.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-all" />
            </motion.div>
          ))
        ) : (
          <div className="text-center py-24 space-y-4">
            <div className="w-16 h-16 bg-[var(--surface)] border border-[var(--border-ui)] rounded-full flex items-center justify-center mx-auto text-[var(--text-muted)]">
              <Bell size={32} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-[var(--text-main)] uppercase tracking-widest">Tudo limpo por aqui</p>
              <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-widest">Você não tem novas notificações</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
