import React, { useState, useEffect } from 'react';
import { 
  Search, 
  FileText, 
  Trash2, 
  AlertTriangle, 
  Check, 
  X, 
  Eye, 
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Heart,
  User,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  History,
  Lock,
  Unlock,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';
import { supabase } from '../../services/supabase';
import { ArenaPost } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function AdminPosts() {
  const [posts, setPosts] = useState<ArenaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedPost, setSelectedPost] = useState<ArenaPost | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'approved' | 'pending' | 'blocked' | 'flagged' | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'queue'>('queue'); 
  const pageSize = 10;

  useEffect(() => {
    fetchPosts();
  }, [page, filterStatus, activeTab]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      if (activeTab === 'queue') {
        const response = await axios.get(`/api/admin/moderation-queue?status=pending,flagged,blocked`);
        setPosts(response.data.data || []);
        setTotalCount(response.data.data?.length || 0);
      } else {
        let query = supabase
          .from('posts')
          .select('*, profiles(full_name, username, avatar_url, profile_photo)', { count: 'exact' });

        if (search) {
          query = query.ilike('content', `%${search}%`);
        }

        if (filterStatus !== 'all') {
          query = query.eq('moderation_status', filterStatus);
        }

        const { data, count, error } = await query
          .order('created_at', { ascending: false })
          .range((page - 1) * pageSize, page * pageSize - 1);

        if (error) throw error;
        setPosts(data || []);
        setTotalCount(count || 0);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveTab('all'); // Search always goes to all
    fetchPosts();
  };

  const handleModerateAction = async (postId: string, action: 'approve' | 'block' | 'flag', reason?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const response = await axios.post('/api/admin/moderate-action', {
        post_id: postId,
        action,
        reason: reason || "Ação manual via painel admin",
        admin_id: user?.id
      });

      if (response.data.success) {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, moderation_status: response.data.data.moderation_status } : p));
        if (activeTab === 'queue' && action === 'approve') {
          setPosts(prev => prev.filter(p => p.id !== postId));
        }
        setIsPreviewOpen(false);
      }
    } catch (error) {
      console.error('Error moderating post:', error);
      alert('Erro ao moderar postagem.');
    }
  };

  const handleProfileAction = async (profileId: string, action: 'suspend' | 'block' | 'activate', reason?: string) => {
    if (!window.confirm(`Tem certeza que deseja ${action === 'activate' ? 'ativar' : 'bloquear/suspender'} este usuário?`)) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const response = await axios.post('/api/admin/profile-action', {
        profile_id: profileId,
        action,
        reason: reason || "Ação via moderação de postagem",
        admin_id: user?.id
      });

      if (response.data.success) {
        alert('Perfil atualizado com sucesso.');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Erro ao atualizar perfil.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <ShieldCheck className="text-emerald-500" size={14} />;
      case 'blocked': return <ShieldX className="text-rose-500" size={14} />;
      case 'flagged': return <ShieldAlert className="text-amber-500" size={14} />;
      default: return <Shield className="text-gray-500" size={14} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'blocked': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'flagged': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Moderation Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] p-8">
        <div>
          <h2 className="text-xl font-black uppercase tracking-[0.2em] text-white flex items-center gap-3">
            <ShieldAlert className="text-[var(--primary)]" size={24} />
            Moderação de Conteúdo
          </h2>
          <p className="text-gray-500 text-xs font-bold mt-2 uppercase tracking-widest">Proteção automatizada e manual ArenaComp</p>
        </div>
        
        <div className="flex items-center bg-white/5 p-1 rounded-2xl border border-white/10">
          <button 
            onClick={() => { setActiveTab('queue'); setPage(1); }}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'queue' ? 'bg-[var(--primary)] text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
          >
            Fila de Espera
          </button>
          <button 
            onClick={() => { setActiveTab('all'); setPage(1); }}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'all' ? 'bg-[var(--primary)] text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
          >
            Todas as Posts
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-[#0f0f0f] border border-white/10 rounded-3xl p-4">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Buscar no conteúdo das postagens..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm outline-none focus:border-blue-500 transition-all"
            />
          </form>
        </div>
        
        <div className="bg-[#0f0f0f] border border-white/10 rounded-3xl p-4">
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm outline-none appearance-none cursor-pointer"
          >
            <option value="all">Filtro: Todos Status</option>
            <option value="approved">Aprovados (Live)</option>
            <option value="pending">Pendentes AI</option>
            <option value="flagged">Sinalizados</option>
            <option value="blocked">Bloqueados</option>
          </select>
        </div>
      </div>

      {/* Posts Table */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Autor</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Conteúdo</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Mídia</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Data</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : posts.length > 0 ? (
                posts.map((post: any) => (
                  <tr key={post.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 overflow-hidden">
                          {(post.profiles?.profile_photo || post.profiles?.avatar_url) ? (
                            <img src={post.profiles.profile_photo || post.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold text-[10px]">
                              {post.profiles?.full_name?.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-tight truncate max-w-[120px]">
                            {post.profiles?.full_name}
                          </p>
                          <p className="text-[8px] font-bold text-gray-500 tracking-widest">@{post.profiles?.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border flex items-center gap-2 w-fit ${getStatusColor(post.moderation_status)}`}>
                        {getStatusIcon(post.moderation_status)}
                        {post.moderation_status || 'approved'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-gray-400 line-clamp-1 max-w-[200px]">
                        {post.content || 'Sem texto'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {post.media_url ? (
                        <div className="w-12 h-8 rounded bg-white/5 border border-white/10 overflow-hidden relative group/media">
                          <img src={post.media_url} alt="" className="w-full h-full object-cover" />
                          {post.type === 'video' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                              <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[6px] border-l-white border-b-[4px] border-b-transparent ml-1" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[8px] font-black uppercase tracking-widest text-gray-600 italic">Texto apenas</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      {format(new Date(post.created_at), 'dd MMM yy', { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4 text-right transition-all">
                      <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setSelectedPost(post);
                            setIsPreviewOpen(true);
                          }}
                          className="px-4 py-2 bg-white/5 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-[var(--primary)] hover:text-white transition-all"
                        >
                          Analisar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-gray-500 font-bold italic">Nenhuma postagem na fila</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination only if not in queue mode */}
        {activeTab === 'all' && (
          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Mostrando {Math.min(pageSize, posts.length)} de {totalCount} posts
            </p>
            <div className="flex items-center space-x-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 disabled:opacity-30 hover:text-white transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-xs font-black px-4">{page}</span>
              <button
                disabled={page * pageSize >= totalCount}
                onClick={() => setPage(page + 1)}
                className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 disabled:opacity-30 hover:text-white transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Preview Modal with AI Analysis */}
      <AnimatePresence>
        {isPreviewOpen && selectedPost && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPreviewOpen(false)}
              className="absolute inset-0 bg-black/95 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-[#0f0f0f] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Left Column: Media */}
              <div className="flex-1 bg-black p-4 flex items-center justify-center border-r border-white/10 overflow-hidden">
                {selectedPost.media_url ? (
                  <div className="w-full h-full relative flex items-center justify-center">
                    {selectedPost.type === 'video' ? (
                      <video src={selectedPost.media_url} controls className="max-w-full max-h-full object-contain rounded-2xl" />
                    ) : (
                      <img src={selectedPost.media_url} alt="" className="max-w-full max-h-full object-contain rounded-2xl" />
                    )}
                  </div>
                ) : (
                  <div className="text-center p-12">
                    <FileText size={64} className="text-gray-800 mx-auto mb-4" />
                    <p className="text-gray-600 font-bold uppercase tracking-widest text-[10px]">Postagem de Texto</p>
                  </div>
                )}
              </div>

              {/* Right Column: Moderation Details */}
              <div className="w-full md:w-[400px] flex flex-col bg-[var(--surface)]">
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                      {((selectedPost as any).profiles?.profile_photo || (selectedPost as any).profiles?.avatar_url) && (
                        <img src={(selectedPost as any).profiles.profile_photo || (selectedPost as any).profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-tight truncate max-w-[150px]">{(selectedPost as any).profiles?.full_name}</h3>
                      <p className="text-[10px] font-bold text-gray-500 tracking-widest">@{(selectedPost as any).profiles?.username}</p>
                    </div>
                  </div>
                  <button onClick={() => setIsPreviewOpen(false)} className="p-2 text-gray-500 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* AI Analysis Card */}
                  {selectedPost.moderation_info?.ai_analysis && (
                    <div className={`p-4 rounded-2xl border ${selectedPost.moderation_info.ai_analysis.safe ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className={selectedPost.moderation_info.ai_analysis.safe ? 'text-emerald-500' : 'text-rose-500'} size={14} />
                        <h4 className="text-[10px] font-black uppercase tracking-widest">Análise AI Gemini</h4>
                      </div>
                      <p className="text-xs font-bold text-gray-300 mb-2 italic">"{selectedPost.moderation_info.ai_analysis.reasoning}"</p>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">Risk Score</span>
                        <div className="w-32 h-2 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${selectedPost.moderation_info.ai_analysis.score > 0.7 ? 'bg-rose-500' : 'bg-[var(--primary)]'}`} 
                            style={{ width: `${selectedPost.moderation_info.ai_analysis.score * 100}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Conteúdo da Postagem</h4>
                    <p className="text-sm text-gray-300 leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/5">
                      {selectedPost.content}
                    </p>
                  </div>

                  {/* Quick User Context */}
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Ações de Usuário</h4>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleProfileAction(selectedPost.author_id, 'suspend', 'Violação de regras detectada via postagem')}
                        className="flex-1 py-2 bg-rose-500/10 text-rose-500 rounded-xl text-[8px] font-black uppercase tracking-widest border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all"
                      >
                        Suspender Usuário
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-white/10 bg-white/5 flex flex-col gap-3">
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleModerateAction(selectedPost.id, 'approve')}
                      className="flex-1 bg-emerald-500 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Check size={16} />
                      Aprovar Post
                    </button>
                    <button 
                      onClick={() => handleModerateAction(selectedPost.id, 'block', 'Conteúdo impróprio confirmado pelo admin')}
                      className="flex-1 bg-black border border-white/10 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-rose-500 hover:border-rose-500 transition-all flex items-center justify-center gap-2"
                    >
                      <Lock size={16} />
                      Bloquear
                    </button>
                  </div>
                  <button 
                    onClick={() => handleModerateAction(selectedPost.id, 'flag', 'Postagem enviada para revisão minuciosa')}
                    className="w-full bg-white/5 text-gray-400 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 hover:text-amber-500 hover:border-amber-500/50 transition-all flex items-center justify-center gap-2"
                  >
                    <ShieldAlert size={14} />
                    Sinalizar Revisão
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
