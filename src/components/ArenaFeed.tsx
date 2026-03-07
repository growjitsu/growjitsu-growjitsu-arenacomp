import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Award, Plus, Image as ImageIcon, User, Video, X } from 'lucide-react';
import { supabase } from '../services/supabase';
import { ArenaPost, ArenaProfile, PostType } from '../types';

export const ArenaFeed: React.FC<{ userProfile?: ArenaProfile | null }> = ({ userProfile }) => {
  const [posts, setPosts] = useState<ArenaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Initial fetch
    fetchPosts();

    // Real-time subscription
    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Falha na compressão da imagem'));
              }
            },
            'image/jpeg',
            0.8
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Cleanup previous preview
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }

    // Image limit: 1MB (before compression check for initial warning, but we compress anyway)
    if (file.type.startsWith('image/')) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit for raw upload before compression
        alert('Arquivo original muito grande. Tente uma imagem menor que 5MB.');
        e.target.value = '';
        return;
      }
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setSelectedFile(file);
    }

    // Video limit: 3 minutes
    if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        if (video.duration > 180) {
          alert('Vídeo muito longo: Máximo de 3 minutos permitido.');
          setSelectedFile(null);
          setPreviewUrl(null);
          e.target.value = '';
        } else {
          const url = URL.createObjectURL(file);
          setPreviewUrl(url);
          setSelectedFile(file);
        }
        window.URL.revokeObjectURL(video.src);
      };
      video.onerror = () => {
        alert('Erro ao carregar vídeo. Formato não suportado.');
        e.target.value = '';
      };
      video.src = URL.createObjectURL(file);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim() && !selectedFile) return;
    
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Você precisa estar logado para postar');
        return;
      }

      let mediaUrl = null;
      let mediaType: PostType = 'text';

      if (selectedFile) {
        let fileToUpload: File | Blob = selectedFile;
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        // Compress image if it's an image
        if (selectedFile.type.startsWith('image/')) {
          try {
            fileToUpload = await compressImage(selectedFile);
          } catch (compressErr) {
            console.error('Compression error:', compressErr);
            // Fallback to original if compression fails
          }
        }

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(filePath, fileToUpload, {
            cacheControl: '3600',
            upsert: false,
            contentType: selectedFile.type
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          if (uploadError.message.includes('Bucket not found')) {
            throw new Error('Erro crítico: O sistema de armazenamento (bucket "posts") não foi encontrado. Por favor, crie o bucket no painel do Supabase.');
          }
          if (uploadError.message.includes('row-level security policy')) {
            throw new Error('Erro de permissão: As políticas de segurança (RLS) do Storage não permitem o upload. Por favor, execute o script SQL de permissões no painel do Supabase.');
          }
          throw new Error('Erro ao enviar arquivo: ' + uploadError.message);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(filePath);
        
        mediaUrl = publicUrl;
        mediaType = selectedFile.type.startsWith('image/') ? 'image' : 'video';
      }

      const { data: post, error } = await supabase
        .from('posts')
        .insert({
          author_id: user.id,
          content: newPostContent,
          type: mediaType,
          media_url: mediaUrl
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw new Error('Erro ao salvar postagem no banco de dados: ' + error.message);
      }

      // Notify followers
      try {
        const { data: followers } = await supabase
          .from('followers')
          .select('follower_id')
          .eq('following_id', user.id);
        
        if (followers && followers.length > 0) {
          const notifications = followers.map(f => ({
            user_id: f.follower_id,
            actor_id: user.id,
            type: 'post',
            post_id: post.id
          }));
          await supabase.from('notifications').insert(notifications);
        }
      } catch (notifyError) {
        console.error('Error sending notifications:', notifyError);
      }

      setNewPostContent('');
      setSelectedFile(null);
      setPreviewUrl(null);
      fetchPosts();
    } catch (error: any) {
      console.error('Error creating post:', error);
      alert(error.message || 'Erro desconhecido ao criar postagem. Verifique sua conexão.');
    } finally {
      setUploading(false);
    }
  };

  const handleLike = async (postId: string, authorId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existingLike } = await supabase
        .from('likes')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingLike) {
        await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id);
      } else {
        await supabase.from('likes').insert({ post_id: postId, user_id: user.id });
        
        if (user.id !== authorId) {
          await supabase.from('notifications').insert({
            user_id: authorId,
            actor_id: user.id,
            type: 'like',
            post_id: postId
          });
        }
      }
      fetchPosts();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
      {/* Create Post */}
      <div className="bg-[var(--surface)] border border-[var(--border-ui)] rounded-2xl p-4 space-y-4 transition-colors duration-300">
        <div className="flex space-x-4">
          <div className="w-10 h-10 rounded-full bg-[var(--bg)] flex-shrink-0 overflow-hidden border border-[var(--border-ui)]">
            {userProfile?.profile_photo || userProfile?.avatar_url ? (
              <img src={userProfile.profile_photo || userProfile.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                <User size={20} />
              </div>
            )}
          </div>
          <textarea
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="O que está treinando hoje?"
            className="w-full bg-transparent border-none focus:ring-0 text-[var(--text-main)] placeholder-[var(--text-muted)] resize-none h-20"
          />
        </div>

        {/* Preview Section */}
        {previewUrl && selectedFile && (
          <div className="relative rounded-xl overflow-hidden border border-[var(--border-ui)] bg-black/5 max-h-[300px] flex items-center justify-center">
            {selectedFile.type.startsWith('image/') ? (
              <img src={previewUrl} alt="Preview" className="max-h-[300px] w-auto object-contain" />
            ) : (
              <video src={previewUrl} controls className="max-h-[300px] w-full" />
            )}
            <button 
              onClick={() => {
                setSelectedFile(null);
                setPreviewUrl(null);
              }}
              className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-rose-500 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex flex-col space-y-4 pt-2 border-t border-[var(--border-ui)]">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center space-x-2 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors cursor-pointer group">
              <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              <div className="p-2 rounded-lg bg-[var(--bg)] group-hover:bg-[var(--primary)]/10">
                <ImageIcon size={20} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Galeria</span>
            </label>
            <label className="flex items-center space-x-2 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors cursor-pointer group">
              <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
              <div className="p-2 rounded-lg bg-[var(--bg)] group-hover:bg-[var(--primary)]/10">
                <Plus size={20} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Câmera</span>
            </label>
            <label className="flex items-center space-x-2 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors cursor-pointer group">
              <input type="file" className="hidden" accept="video/*" capture="environment" onChange={handleFileChange} />
              <div className="p-2 rounded-lg bg-[var(--bg)] group-hover:bg-[var(--primary)]/10">
                <Video size={20} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Vídeo</span>
            </label>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              {selectedFile && (
                <div className="flex items-center space-x-2 bg-[var(--bg)] px-3 py-1 rounded-full border border-[var(--border-ui)]">
                  <span className="text-[10px] font-bold truncate max-w-[100px]">{selectedFile.name}</span>
                  <button onClick={() => setSelectedFile(null)} className="text-rose-500">
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleCreatePost}
              disabled={(!newPostContent.trim() && !selectedFile) || uploading}
              className="bg-[var(--primary)] text-white px-8 py-2 rounded-full font-black text-xs uppercase tracking-widest disabled:opacity-50 hover:bg-[var(--primary-highlight)] transition-all shadow-lg shadow-[var(--primary)]/20"
            >
              {uploading ? 'Enviando...' : 'Postar'}
            </button>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" />
          </div>
        ) : (
          posts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[var(--surface)] border border-[var(--border-ui)] rounded-2xl overflow-hidden transition-colors duration-300"
            >
              {/* Post Header */}
              <div className="p-4 flex items-center justify-between">
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
                {post.type === 'result' && (
                  <div className="bg-[var(--primary)]/10 text-[var(--primary)] px-3 py-1 rounded-full flex items-center space-x-1">
                    <Award size={12} />
                    <span className="text-[10px] font-black uppercase">Resultado</span>
                  </div>
                )}
              </div>

              {/* Post Content */}
              <div className="px-4 pb-4">
                <p className="text-[var(--text-main)]/90 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
                {post.media_url && (
                  <div className="mt-4 rounded-xl overflow-hidden border border-[var(--border-ui)] bg-black">
                    {post.type === 'video' ? (
                      <video src={post.media_url} controls className="w-full h-auto max-h-[500px]" />
                    ) : (
                      <img src={post.media_url} alt="" className="w-full h-auto" referrerPolicy="no-referrer" />
                    )}
                  </div>
                )}
              </div>

              {/* Post Actions */}
              <div className="px-4 py-3 border-t border-[var(--border-ui)] flex items-center space-x-6">
                <button 
                  onClick={() => handleLike(post.id, post.author_id)}
                  className="flex items-center space-x-2 text-[var(--text-muted)] hover:text-rose-500 transition-colors"
                >
                  <Heart size={18} />
                  <span className="text-xs font-bold">{post.likes_count}</span>
                </button>
                <button className="flex items-center space-x-2 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors">
                  <MessageCircle size={18} />
                  <span className="text-xs font-bold">{post.comments_count}</span>
                </button>
                <button className="flex items-center space-x-2 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors ml-auto">
                  <Share2 size={18} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
