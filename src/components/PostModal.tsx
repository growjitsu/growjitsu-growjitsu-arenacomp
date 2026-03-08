import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, MessageCircle, Share2, User, Award, Calendar, Send } from 'lucide-react';
import { ArenaPost, ArenaComment } from '../types';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';

interface PostModalProps {
  post: ArenaPost | null;
  onClose: () => void;
  onLike?: (postId: string, authorId: string) => void;
  onShare?: (post: ArenaPost) => void;
}

export const PostModal: React.FC<PostModalProps> = ({ post, onClose, onLike, onShare }) => {
  const [comments, setComments] = useState<ArenaComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);

  useEffect(() => {
    const getAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        setCurrentUserProfile(profile);
      }
    };
    getAuth();

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (post) {
      fetchComments();
    }
  }, [post]);

  const fetchComments = async () => {
    if (!post) return;
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          user:profiles(*)
        `)
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleShareOption = async (type: 'copy' | 'whatsapp') => {
    if (!post) return;
    const shareUrl = `${window.location.origin}/?post=${post.id}`;
    
    if (type === 'copy') {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('Link copiado para a área de transferência!');
      } catch (err) {
        console.error('Failed to copy: ', err);
      }
    } else if (type === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent('Confira esta postagem na ArenaComp: ' + shareUrl)}`, '_blank');
    }
    
    setShowShareOptions(false);
    onShare?.(post);
  };

  const handleAddComment = async () => {
    if (!post || !newComment.trim() || !currentUser) return;
    setSubmittingComment(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: post.id,
          user_id: currentUser.id,
          content: newComment.trim()
        })
        .select(`
          *,
          user:profiles(*)
        `)
        .single();

      if (error) throw error;
      
      setComments(prev => [...prev, data]);
      setNewComment('');
      
      // Update comment count in posts table
      const { data: postData } = await supabase
        .from('posts')
        .select('comments_count')
        .eq('id', post.id)
        .single();
      
      if (postData) {
        await supabase
          .from('posts')
          .update({ comments_count: (postData.comments_count || 0) + 1 })
          .eq('id', post.id);
      }
      
      // Create notification for post author
      if (currentUser.id !== post.author_id) {
        await supabase.from('notifications').insert({
          user_id: post.author_id,
          actor_id: currentUser.id,
          type: 'comment',
          post_id: post.id
        });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  if (!post) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[var(--surface)] w-full max-w-5xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl border border-[var(--border-ui)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Media Section */}
          <div className="flex-1 bg-black flex items-center justify-center relative min-h-[300px] md:min-h-0">
            {post.media_url ? (
              (() => {
                let urls: string[] = [];
                try {
                  if (post.media_url.startsWith('[')) {
                    urls = JSON.parse(post.media_url);
                  } else {
                    urls = [post.media_url];
                  }
                } catch (e) {
                  urls = [post.media_url];
                }

                if (urls.length > 1) {
                  return (
                    <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar w-full h-full">
                      {urls.map((url, i) => (
                        <div key={i} className="flex-shrink-0 w-full h-full snap-center flex items-center justify-center">
                          <img src={url} alt="" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                        </div>
                      ))}
                    </div>
                  );
                }

                return post.type === 'video' ? (
                  <video src={urls[0]} controls className="max-h-full max-w-full" autoPlay />
                ) : (
                  <img src={urls[0]} alt="" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                );
              })()
            ) : (
              <div className="p-12 text-center">
                <p className="text-[var(--text-main)] text-xl leading-relaxed italic">{post.content}</p>
              </div>
            )}
            
            <button 
              onClick={onClose}
              className="absolute top-4 left-4 p-2 bg-black/50 text-white rounded-full hover:bg-rose-500 transition-all md:hidden z-20"
            >
              <X size={20} />
            </button>
          </div>

          {/* Info Section */}
          <div className="w-full md:w-[400px] flex flex-col bg-[var(--surface)] border-l border-[var(--border-ui)]">
            {/* Header */}
            <div className="p-4 border-b border-[var(--border-ui)] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Link to={`/user/@${post.author?.username}`} className="w-10 h-10 rounded-full bg-[var(--bg)] overflow-hidden block">
                  {(post.author?.profile_photo || post.author?.avatar_url) && (
                    <img src={post.author.profile_photo || post.author.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  )}
                </Link>
                <div>
                  <Link to={`/user/@${post.author?.username}`} className="font-bold text-sm text-[var(--text-main)] hover:text-[var(--primary)] transition-colors block">
                    {post.author?.full_name || 'Atleta'}
                  </Link>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">@{post.author?.username || 'user'}</p>
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }} 
                className="p-2 text-[var(--text-muted)] hover:text-rose-500 transition-colors hidden md:block"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content & Comments */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div className="space-y-4">
                <p className="text-[var(--text-main)] text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
                <div className="flex items-center space-x-2 text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest">
                  <Calendar size={12} />
                  <span>{new Date(post.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                </div>
              </div>

              {/* Stats & Actions */}
              <div className="pt-6 border-t border-[var(--border-ui)] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <button 
                      onClick={() => onLike?.(post.id, post.author_id)}
                      className={`flex items-center space-x-2 transition-colors ${
                        post.is_liked ? 'text-rose-500' : 'text-[var(--text-muted)] hover:text-rose-500'
                      }`}
                    >
                      <Heart size={20} className={post.is_liked ? 'fill-current' : ''} />
                      <span className="text-sm font-bold">{post.likes_count}</span>
                    </button>
                    <div className="flex items-center space-x-2 text-[var(--text-muted)]">
                      <MessageCircle size={20} />
                      <span className="text-sm font-bold">{post.comments_count}</span>
                    </div>
                  </div>
                  <div className="relative">
                    <button 
                      onClick={() => setShowShareOptions(!showShareOptions)}
                      className="text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                    >
                      <Share2 size={20} />
                    </button>

                    <AnimatePresence>
                      {showShareOptions && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-full right-0 mb-2 w-48 bg-[var(--surface)] border border-[var(--border-ui)] rounded-2xl shadow-2xl overflow-hidden z-50 py-2"
                        >
                          <button 
                            onClick={() => handleShareOption('copy')}
                            className="w-full px-4 py-3 text-left text-xs font-bold hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition-colors flex items-center space-x-2"
                          >
                            <span>Copiar Link</span>
                          </button>
                          <button 
                            onClick={() => handleShareOption('whatsapp')}
                            className="w-full px-4 py-3 text-left text-xs font-bold hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition-colors flex items-center space-x-2"
                          >
                            <span>WhatsApp</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Comments */}
              <div className="space-y-4 pt-6 border-t border-[var(--border-ui)]">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Comentários</h4>
                
                {loadingComments ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--primary)]" />
                  </div>
                ) : comments.length > 0 ? (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex space-x-3">
                        <Link to={`/user/@${comment.user?.username}`} className="w-8 h-8 rounded-full bg-[var(--bg)] overflow-hidden flex-shrink-0">
                          {(comment.user?.profile_photo || comment.user?.avatar_url) && (
                            <img src={comment.user.profile_photo || comment.user.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          )}
                        </Link>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <Link to={`/user/@${comment.user?.username}`} className="text-xs font-bold text-[var(--text-main)] hover:text-[var(--primary)]">
                              {comment.user?.full_name || 'Atleta'}
                            </Link>
                            <span className="text-[8px] text-[var(--text-muted)] uppercase font-bold">
                              {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--text-main)]/80 leading-relaxed">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-xs text-[var(--text-muted)] font-bold italic">Nenhum comentário ainda. Seja o primeiro!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer / Add Comment */}
            <div className="p-4 border-t border-[var(--border-ui)] bg-[var(--surface)]">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-[var(--bg)] flex-shrink-0 overflow-hidden border border-[var(--border-ui)] shadow-inner">
                  {currentUserProfile?.profile_photo || currentUserProfile?.avatar_url ? (
                    <img src={currentUserProfile.profile_photo || currentUserProfile.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[var(--primary)]/10 text-[var(--primary)]">
                      <User size={20} />
                    </div>
                  )}
                </div>
                <input 
                  type="text" 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                  placeholder="Adicione um comentário..." 
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)]"
                />
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddComment();
                  }}
                  disabled={!newComment.trim() || submittingComment}
                  className="text-[var(--primary)] font-black text-[11px] uppercase tracking-[0.2em] disabled:opacity-30 hover:text-[var(--primary-highlight)] transition-all px-2 py-1"
                >
                  {submittingComment ? '...' : 'Publicar'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
