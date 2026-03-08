import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Award, Plus, Image as ImageIcon, User, Video, X } from 'lucide-react';
import { supabase } from '../services/supabase';
import { ArenaPost, ArenaProfile, PostType } from '../types';
import { PostModal } from './PostModal';

export const ArenaFeed: React.FC<{ userProfile?: ArenaProfile | null }> = ({ userProfile }) => {
  const [posts, setPosts] = useState<ArenaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedPost, setSelectedPost] = useState<ArenaPost | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  useEffect(() => {
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
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 1. Fetch current user's profile and following for the algorithm
      let currentUserProfile: ArenaProfile | null = null;
      let followingSet: Set<string> = new Set();
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        currentUserProfile = profile;

        const { data: follows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);
        
        if (follows) {
          followingSet = new Set(follows.map(f => f.following_id));
          setFollowingIds(followingSet);
        }
      }

      // 2. Fetch all posts with author info
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles(*)
        `)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // 3. Fetch user's likes to mark posts as liked
      let userLikes: Set<string> = new Set();
      if (user) {
        const { data: likesData } = await supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', user.id);
        
        if (likesData) {
          userLikes = new Set(likesData.map(l => l.post_id));
        }
      }

      // 4. Calculate scores for the "Instagram-inspired" algorithm
      // Factors: Following (+50), Modality (+40), Engagement (L*2, C*4, S*6), 
      // Recency (<1h +30, <6h +20, <24h +10), Geography (City+30, State+20, Country+10),
      // Ranking (Top+50, +30, +20), Content (Video+15, Image+10, Text+5)
      const now = new Date();
      const scoredPosts = (postsData || []).map(post => {
        let score = 0;
        const postDate = new Date(post.created_at);
        const diffHours = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60);

        // 1) Seguindo
        if (followingSet.has(post.author_id)) score += 50;

        // 2) Modalidade
        if (currentUserProfile && post.author?.modality === currentUserProfile.modality) score += 40;

        // 3) Engajamento
        score += (post.likes_count || 0) * 2;
        score += (post.comments_count || 0) * 4;
        score += (post.shares_count || 0) * 6;

        // 4) Tempo da postagem
        if (diffHours <= 1) score += 30;
        else if (diffHours <= 6) score += 20;
        else if (diffHours <= 24) score += 10;

        // 5) Proximidade geográfica
        if (currentUserProfile && post.author) {
          if (post.author.city === currentUserProfile.city) score += 30;
          else if (post.author.state === currentUserProfile.state) score += 20;
          else if (post.author.country === currentUserProfile.country) score += 10;
        }

        // 6) Ranking do atleta (Simplified based on arena_score)
        const authorScore = post.author?.arena_score || 0;
        if (authorScore > 1000) score += 50;
        else if (authorScore > 500) score += 30;
        else if (authorScore > 100) score += 20;

        // 7) Tipo de conteúdo
        if (post.type === 'video') score += 15;
        else if (post.type === 'image') score += 10;
        else if (post.type === 'text') score += 5;

        return {
          ...post,
          is_liked: userLikes.has(post.id),
          feed_score: score
        };
      });

      // 5. Final Sorting
      // Requirement: "garantindo que o último post publicado sempre apareça primeiro"
      // We sort primarily by created_at DESC. Tie-breaker is the calculated feed_score.
      const sortedPosts = scoredPosts.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return (b.feed_score || 0) - (a.feed_score || 0);
      });

      setPosts(sortedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const compressImage = (file: File, targetRatio: '4:5' | '1:1' | '1.91:1' | 'original' = 'original'): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Standardize resolutions based on ratio
          if (targetRatio === '4:5') {
            width = 1080;
            height = 1350;
          } else if (targetRatio === '1:1') {
            width = 1080;
            height = 1080;
          } else if (targetRatio === '1.91:1') {
            width = 1080;
            height = 566;
          } else if (width > 1080) {
            height *= 1080 / width;
            width = 1080;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            if (targetRatio !== 'original') {
              // Center crop/fit logic
              const imgRatio = img.width / img.height;
              const targetRatioNum = width / height;
              let drawWidth = width;
              let drawHeight = height;
              let offsetX = 0;
              let offsetY = 0;

              if (imgRatio > targetRatioNum) {
                drawWidth = height * imgRatio;
                offsetX = (width - drawWidth) / 2;
              } else {
                drawHeight = width / imgRatio;
                offsetY = (height - drawHeight) / 2;
              }
              ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
            } else {
              ctx.drawImage(img, 0, 0, width, height);
            }
          }

          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Falha na compressão'));
            },
            'image/jpeg',
            0.85
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    // Cleanup previous previews
    previewUrls.forEach(url => window.URL.revokeObjectURL(url));

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    files.forEach((file: File) => {
      const isImage = file.type.startsWith('image/') && ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type);
      const isVideo = file.type.startsWith('video/') && ['video/mp4', 'video/quicktime'].includes(file.type);

      if (!isImage && !isVideo) {
        alert(`Formato não suportado: ${file.name}. Use JPG, PNG, MP4 ou MOV.`);
        return;
      }

      if (isVideo && file.size > 4 * 1024 * 1024 * 1024) {
        alert(`Vídeo muito grande: ${file.name}. Máximo 4GB.`);
        return;
      }

      if (isVideo) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          if (video.duration > 180) {
            alert(`Vídeo muito longo: ${file.name}. Máximo 3 minutos.`);
          } else {
            validFiles.push(file);
            newPreviews.push(URL.createObjectURL(file));
            setSelectedFiles(prev => [...prev, file]);
            setPreviewUrls(prev => [...prev, URL.createObjectURL(file)]);
          }
          window.URL.revokeObjectURL(video.src);
        };
        video.src = URL.createObjectURL(file);
      } else {
        validFiles.push(file);
        const url = URL.createObjectURL(file);
        newPreviews.push(url);
        setSelectedFiles(prev => [...prev, file]);
        setPreviewUrls(prev => [...prev, url]);
      }
    });
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim() && selectedFiles.length === 0) return;
    
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Você precisa estar logado para postar');
        return;
      }

      const mediaUrls: string[] = [];
      let mediaType: PostType = 'text';

      for (const file of selectedFiles) {
        let fileToUpload: File | Blob = file;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        if (file.type.startsWith('image/')) {
          try {
            // Default to 4:5 for feed optimization as requested
            fileToUpload = await compressImage(file, '4:5');
          } catch (err) {
            console.error('Compression error:', err);
          }
        }

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(filePath, fileToUpload, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(filePath);
        
        mediaUrls.push(publicUrl);
        if (mediaType === 'text') {
          mediaType = file.type.startsWith('image/') ? 'image' : 'video';
        }
      }

      const { data: post, error } = await supabase
        .from('posts')
        .insert({
          author_id: user.id,
          content: newPostContent,
          type: mediaType,
          media_url: mediaUrls.length > 1 ? JSON.stringify(mediaUrls) : (mediaUrls[0] || null)
        })
        .select()
        .single();

      if (error) throw error;

      setNewPostContent('');
      setSelectedFiles([]);
      setPreviewUrls([]);
      fetchPosts();
    } catch (error: any) {
      console.error('Error creating post:', error);
      alert(error.message || 'Erro ao criar postagem');
    } finally {
      setUploading(false);
    }
  };

  const handleLike = async (postId: string, authorId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const post = posts.find(p => p.id === postId);
      if (!post) return;

      const isLiked = post.is_liked;

      // Optimistic update for posts list
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            is_liked: !isLiked,
            likes_count: isLiked ? p.likes_count - 1 : p.likes_count + 1
          };
        }
        return p;
      }));

      // Optimistic update for selected post (modal)
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost(prev => prev ? {
          ...prev,
          is_liked: !isLiked,
          likes_count: isLiked ? prev.likes_count - 1 : prev.likes_count + 1
        } : null);
      }

      if (isLiked) {
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
    } catch (error) {
      console.error('Error toggling like:', error);
      fetchPosts(); // Revert on error
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
        {previewUrls.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {previewUrls.map((url, index) => (
              <div key={index} className="relative rounded-xl overflow-hidden border border-[var(--border-ui)] bg-black/5 aspect-[4/5] flex items-center justify-center">
                {selectedFiles[index]?.type.startsWith('image/') ? (
                  <img src={url} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="relative w-full h-full">
                    <video src={url} className="w-full h-full object-cover" />
                    {/* Safe Zone Hint for 9:16 videos */}
                    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 opacity-50">
                      <div className="h-20 border-t border-dashed border-white/30" />
                      <div className="flex-1 flex items-center justify-center">
                        <span className="text-[8px] text-white/50 uppercase font-black">Zona Segura Central</span>
                      </div>
                      <div className="h-20 border-b border-dashed border-white/30" />
                    </div>
                  </div>
                )}
                <button 
                  onClick={() => {
                    const newFiles = [...selectedFiles];
                    const newUrls = [...previewUrls];
                    newFiles.splice(index, 1);
                    newUrls.splice(index, 1);
                    setSelectedFiles(newFiles);
                    setPreviewUrls(newUrls);
                    window.URL.revokeObjectURL(url);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-rose-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col space-y-4 pt-2 border-t border-[var(--border-ui)]">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center space-x-2 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors cursor-pointer group">
              <input type="file" className="hidden" accept="image/jpeg,image/png" multiple onChange={handleFileChange} />
              <div className="p-2 rounded-lg bg-[var(--bg)] group-hover:bg-[var(--primary)]/10">
                <ImageIcon size={20} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Galeria</span>
            </label>
            <label className="flex items-center space-x-2 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors cursor-pointer group">
              <input type="file" className="hidden" accept="image/jpeg,image/png" capture="environment" onChange={handleFileChange} />
              <div className="p-2 rounded-lg bg-[var(--bg)] group-hover:bg-[var(--primary)]/10">
                <Plus size={20} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Câmera</span>
            </label>
            <label className="flex items-center space-x-2 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors cursor-pointer group">
              <input type="file" className="hidden" accept="video/mp4,video/quicktime" capture="environment" onChange={handleFileChange} />
              <div className="p-2 rounded-lg bg-[var(--bg)] group-hover:bg-[var(--primary)]/10">
                <Video size={20} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Vídeo</span>
            </label>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              {selectedFiles.length > 0 && (
                <div className="flex items-center space-x-2 bg-[var(--bg)] px-3 py-1 rounded-full border border-[var(--border-ui)]">
                  <span className="text-[10px] font-bold">{selectedFiles.length} arquivos selecionados</span>
                </div>
              )}
            </div>
            <button
              onClick={handleCreatePost}
              disabled={(!newPostContent.trim() && selectedFiles.length === 0) || uploading}
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
              onClick={() => {
                setSelectedPost(post);
                setIsPostModalOpen(true);
              }}
              className="bg-[var(--surface)] border border-[var(--border-ui)] rounded-2xl overflow-hidden transition-colors duration-300 cursor-pointer"
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
                    {(() => {
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
                          <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar">
                            {urls.map((url, i) => (
                              <div key={i} className="flex-shrink-0 w-full snap-center aspect-[4/5]">
                                <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                            ))}
                          </div>
                        );
                      }

                      return post.type === 'video' ? (
                        <video src={urls[0]} controls className="w-full h-auto max-h-[500px]" />
                      ) : (
                        <img src={urls[0]} alt="" className="w-full h-auto" referrerPolicy="no-referrer" />
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Post Actions */}
              <div className="px-4 py-3 border-t border-[var(--border-ui)] flex items-center space-x-6">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLike(post.id, post.author_id);
                  }}
                  className={`flex items-center space-x-2 transition-colors ${
                    post.is_liked ? 'text-rose-500' : 'text-[var(--text-muted)] hover:text-rose-500'
                  }`}
                >
                  <Heart size={18} className={post.is_liked ? 'fill-current' : ''} />
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

      <PostModal 
        post={selectedPost} 
        onClose={() => setIsPostModalOpen(false)} 
        onLike={handleLike}
      />
    </div>
  );
};
