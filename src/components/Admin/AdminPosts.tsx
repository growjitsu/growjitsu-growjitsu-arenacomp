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
  User
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { ArenaPost } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const AdminPosts: React.FC = () => {
  const [posts, setPosts] = useState<ArenaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedPost, setSelectedPost] = useState<ArenaPost | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const pageSize = 10;

  useEffect(() => {
    fetchPosts();
  }, [page]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('posts')
        .select('*, profiles(full_name, username, avatar_url)', { count: 'exact' });

      if (search) {
        query = query.ilike('content', `%${search}%`);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;
      setPosts(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPosts();
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta postagem?')) return;
    
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
      setPosts(prev => prev.filter(p => p.id !== postId));
      alert('Postagem excluída com sucesso.');
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Erro ao excluir postagem.');
    }
  };

  const handleModeratePost = async (postId: string, action: 'approve' | 'flag') => {
    // Simulate moderation logic
    alert(`Postagem ${action === 'approve' ? 'aprovada' : 'marcada para revisão'} (Simulado)`);
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-3xl p-6">
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

      {/* Posts Table */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Autor</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Conteúdo</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Mídia</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Engajamento</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Data</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : posts.length > 0 ? (
                posts.map((post: any) => (
                  <tr key={post.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 overflow-hidden">
                          {post.profiles?.avatar_url ? (
                            <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
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
                      <p className="text-xs text-gray-400 line-clamp-1 max-w-[200px]">
                        {post.content || 'Sem texto'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {post.media_url ? (
                        <div className="w-12 h-8 rounded bg-white/5 border border-white/10 overflow-hidden relative group/media">
                          <img src={post.media_url} alt="" className="w-full h-full object-cover" />
                          {post.media_type === 'video' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                              <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[6px] border-l-white border-b-[4px] border-b-transparent ml-1" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[8px] font-black uppercase tracking-widest text-gray-600 italic">Texto apenas</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3 text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Heart size={10} />
                          <span className="text-[10px] font-bold">{post.likes_count || 0}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageSquare size={10} />
                          <span className="text-[10px] font-bold">{post.comments_count || 0}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      {format(new Date(post.created_at), 'dd MMM yy', { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setSelectedPost(post);
                            setIsPreviewOpen(true);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => handleModeratePost(post.id, 'flag')}
                          className="p-2 text-gray-400 hover:text-amber-500 transition-colors"
                        >
                          <AlertTriangle size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeletePost(post.id)}
                          className="p-2 text-gray-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-gray-500 font-bold italic">Nenhuma postagem encontrada</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {isPreviewOpen && selectedPost && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPreviewOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                    {(selectedPost as any).profiles?.avatar_url && (
                      <img src={(selectedPost as any).profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-tight">{(selectedPost as any).profiles?.full_name}</h3>
                    <p className="text-[10px] font-bold text-gray-500 tracking-widest">@{(selectedPost as any).profiles?.username}</p>
                  </div>
                </div>
                <button onClick={() => setIsPreviewOpen(false)} className="p-2 text-gray-400 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {selectedPost.media_url && (
                  <div className="aspect-square rounded-2xl overflow-hidden bg-black border border-white/5">
                    {selectedPost.media_type === 'video' ? (
                      <video src={selectedPost.media_url} controls className="w-full h-full object-contain" />
                    ) : (
                      <img src={selectedPost.media_url} alt="" className="w-full h-full object-contain" />
                    )}
                  </div>
                )}
                <p className="text-sm text-gray-300 leading-relaxed">
                  {selectedPost.content}
                </p>
                <div className="pt-4 border-t border-white/5 flex items-center justify-between text-gray-500">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Heart size={14} />
                      <span className="text-xs font-bold">{selectedPost.likes_count || 0}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageSquare size={14} />
                      <span className="text-xs font-bold">{selectedPost.comments_count || 0}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {format(new Date(selectedPost.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </div>
              </div>

              <div className="p-6 bg-white/5 border-t border-white/10 flex items-center justify-center space-x-4">
                <button 
                  onClick={() => { handleModeratePost(selectedPost.id, 'approve'); setIsPreviewOpen(false); }}
                  className="flex-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center space-x-2"
                >
                  <Check size={14} />
                  <span>Aprovar</span>
                </button>
                <button 
                  onClick={() => { handleDeletePost(selectedPost.id); setIsPreviewOpen(false); }}
                  className="flex-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center space-x-2"
                >
                  <Trash2 size={14} />
                  <span>Excluir</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
