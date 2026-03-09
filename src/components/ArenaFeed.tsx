import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Award, Plus, Image as ImageIcon, User, Video, X } from 'lucide-react';
import { supabase } from '../services/supabase';
import { ArenaPost, ArenaProfile, PostType } from '../types';
import { PostModal } from './PostModal';

export const ArenaFeed: React.FC<{ userProfile?: ArenaProfile | null }> = ({ userProfile }) => {
  const [posts, setPosts] = useState<ArenaPost[]>([]);
  const [topAthletes, setTopAthletes] = useState<ArenaProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedPost, setSelectedPost] = useState<ArenaPost | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [arenaStats, setArenaStats] = useState({
    totalPosts: 0,
    activeUsers: 0,
    totalInteractions: 0,
    growth: 0
  });
  const [trendingPosts, setTrendingPosts] = useState<ArenaPost[]>([]);

  useEffect(() => {
    fetchPosts();
    fetchTopAthletes();
    fetchArenaStats();
    fetchTrendingPosts();

    // Check for deep link
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('post');
    if (postId) {
      fetchSinglePost(postId);
    }

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
          .maybeSingle();
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
      console.log('ArenaFeed: Fetching posts...');
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles(*)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (postsError) {
        console.error('ArenaFeed: Error fetching posts:', postsError);
        throw postsError;
      }
      console.log(`ArenaFeed: Fetched ${postsData?.length || 0} posts`);

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

        // 6) Ranking do atleta
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

  const fetchTopAthletes = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('arena_score', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setTopAthletes(data || []);
    } catch (error) {
      console.error('Error fetching top athletes:', error);
    }
  };

  const fetchArenaStats = async () => {
    try {
      // Fetch total posts
      const { count: postsCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true });

      // Fetch active users (total profiles for now)
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch total likes for interactions
      const { count: likesCount } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true });

      // Fetch total comments for interactions
      const { count: commentsCount } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true });

      setArenaStats({
        totalPosts: postsCount || 0,
        activeUsers: usersCount || 0,
        totalInteractions: (likesCount || 0) + (commentsCount || 0),
        growth: 15.4 // Simulated growth for now or could be calculated
      });
    } catch (error) {
      console.error('Error fetching arena stats:', error);
    }
  };

  const fetchTrendingPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles(*)
        `)
        .order('likes_count', { ascending: false })
        .limit(3);
      
      if (error) throw error;
      setTrendingPosts(data || []);
    } catch (error) {
      console.error('Error fetching trending posts:', error);
    }
  };

  const fetchSinglePost = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles(*)
        `)
        .eq('id', postId)
        .single();
      
      if (error) throw error;
      if (data) {
        setSelectedPost(data);
        setIsPostModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching single post:', error);
    }
  };

  const handleShare = async (post: ArenaPost) => {
    const shareUrl = `${window.location.origin}/?post=${post.id}`;
    const shareData = {
      title: 'ArenaComp - Performance Esportiva',
      text: `Confira esta postagem de ${post.author?.full_name} na ArenaComp!`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert('Link copiado para a área de transferência!');
      }
      
      // Increment share count
      await supabase
        .from('posts')
        .update({ shares_count: (post.shares_count || 0) + 1 })
        .eq('id', post.id);
        
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, shares_count: (p.shares_count || 0) + 1 } : p));
    } catch (error) {
      console.error('Error sharing:', error);
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
        // Update posts table count using update instead of rpc for better compatibility
        await supabase.from('posts').update({ likes_count: Math.max(0, post.likes_count - 1) }).eq('id', postId);
      } else {
        await supabase.from('likes').insert({ post_id: postId, user_id: user.id });
        // Update posts table count using update instead of rpc for better compatibility
        await supabase.from('posts').update({ likes_count: post.likes_count + 1 }).eq('id', postId);
        
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
    <div className="max-w-7xl mx-auto py-4 md:py-8 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Feed Content */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Top Athletes Rail - Immersive Style */}
          <div className="bg-[var(--surface)]/40 backdrop-blur-2xl border border-[var(--border-ui)] rounded-[2.5rem] p-6 overflow-hidden shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between mb-6 px-2">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-main)]">ELITE ARENA</h3>
              </div>
              <Link to="/rankings" className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--primary)] transition-all flex items-center space-x-1 group">
                <span>RANKING GLOBAL</span>
                <Plus size={10} className="group-hover:rotate-90 transition-transform" />
              </Link>
            </div>
            <div className="flex space-x-8 overflow-x-auto pb-4 hide-scrollbar snap-x">
              {topAthletes.length > 0 ? (
                topAthletes.map((athlete, i) => (
                  <Link 
                    key={athlete.id} 
                    to={`/user/@${athlete.username}`}
                    className="flex-shrink-0 flex flex-col items-center space-y-3 snap-start group cursor-pointer"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-tr from-[var(--primary)] to-cyan-400 rounded-full blur-md opacity-0 group-hover:opacity-50 transition-opacity duration-500" />
                      <div className="relative p-1 rounded-full bg-gradient-to-tr from-[var(--border-ui)] to-[var(--primary)]/30 group-hover:from-[var(--primary)] group-hover:to-cyan-400 transition-all duration-500">
                        <div className="w-16 h-16 rounded-full bg-[var(--bg)] p-1">
                          <div className="w-full h-full rounded-full bg-[var(--surface)] overflow-hidden border border-[var(--border-ui)]">
                            {athlete.profile_photo || athlete.avatar_url ? (
                              <img 
                                src={athlete.profile_photo || athlete.avatar_url} 
                                alt="" 
                                className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-500"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-[var(--surface)] text-[var(--text-muted)]">
                                <User size={24} />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-white text-black text-[9px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-[var(--bg)] shadow-lg">
                        {i + 1}
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-tighter text-[var(--text-main)] truncate w-20">{athlete.full_name?.split(' ')[0]}</p>
                      <p className="text-[8px] font-bold text-[var(--primary)] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">{Math.round(athlete.arena_score || 0)} pts</p>
                    </div>
                  </Link>
                ))
              ) : (
                [1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex-shrink-0 flex flex-col items-center space-y-3 snap-start animate-pulse">
                    <div className="w-16 h-16 rounded-full bg-[var(--surface)] border border-[var(--border-ui)]" />
                    <div className="w-12 h-2 bg-[var(--surface)] rounded" />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Feed List - Immersive Cards */}
          <div className="space-y-12">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-6">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-[var(--primary)]/20 rounded-full" />
                  <div className="absolute top-0 left-0 w-16 h-16 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.4em] text-[var(--text-muted)] animate-pulse">Sincronizando Arena</span>
              </div>
            ) : posts.length > 0 ? (
              posts.map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  onClick={() => {
                    setSelectedPost(post);
                    setIsPostModalOpen(true);
                  }}
                  className="group bg-[var(--surface)]/40 backdrop-blur-xl border border-[var(--border-ui)] rounded-[3rem] overflow-hidden transition-all duration-700 hover:border-[var(--primary)]/40 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] cursor-pointer relative"
                >
                  {/* Post Header - Cinematic Style */}
                  <div className="p-8 flex items-center justify-between relative z-10">
                    <div className="flex items-center space-x-5">
                      <Link 
                        to={`/user/@${post.author?.username}`} 
                        className="relative group/avatar"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="absolute inset-0 bg-[var(--primary)] rounded-[1.5rem] blur-lg opacity-0 group-hover/avatar:opacity-30 transition-opacity" />
                        <div className="w-14 h-14 rounded-[1.5rem] bg-[var(--bg)] overflow-hidden relative z-10 border border-[var(--border-ui)] group-hover/avatar:border-[var(--primary)]/50 transition-all duration-500">
                          {(post.author?.profile_photo || post.author?.avatar_url) && (
                            <img src={post.author.profile_photo || post.author.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          )}
                        </div>
                      </Link>
                      <div>
                        <div className="flex items-center space-x-3">
                          <Link 
                            to={`/user/@${post.author?.username}`} 
                            className="font-black text-sm uppercase tracking-wider text-[var(--text-main)] hover:text-[var(--primary)] transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {post.author?.full_name || 'Atleta'}
                          </Link>
                          <div className="px-2 py-0.5 rounded-md bg-[var(--bg)] border border-[var(--border-ui)] text-[9px] font-mono font-bold text-[var(--primary)]">
                            LVL {Math.floor((post.author?.arena_score || 0) / 100) + 1}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 mt-1.5">
                          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tight">@{post.author?.username}</span>
                          <span className="w-1 h-1 rounded-full bg-[var(--primary)]/40" />
                          <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-[0.2em]">{post.author?.modality || 'Geral'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      <div className="text-[10px] font-mono font-bold text-[var(--text-muted)] bg-[var(--bg)]/50 px-3 py-1 rounded-full border border-[var(--border-ui)]">
                        {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {post.type === 'result' && (
                        <div className="bg-gradient-to-r from-amber-400 to-orange-600 text-white px-4 py-1.5 rounded-xl flex items-center space-x-2 shadow-2xl shadow-orange-500/30 border border-white/10">
                          <Award size={12} className="fill-current" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Pódio</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="px-8 pb-4">
                    <p className="text-[var(--text-main)]/90 text-base leading-relaxed font-medium mb-6 tracking-tight">{post.content}</p>
                    
                    {post.media_url && (
                      <div className="relative rounded-[2.5rem] overflow-hidden border border-[var(--border-ui)] bg-black group/media shadow-2xl">
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
                              <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar aspect-[4/5]">
                                {urls.map((url, i) => (
                                  <div key={i} className="flex-shrink-0 w-full snap-center relative">
                                    <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    <div className="absolute top-6 right-6 bg-black/60 backdrop-blur-xl text-white text-[10px] font-black px-3 py-1.5 rounded-xl border border-white/10 shadow-2xl">
                                      {i + 1} / {urls.length}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          }

                          return post.type === 'video' ? (
                            <div className="relative aspect-video flex items-center justify-center bg-black group/vid">
                              <video src={urls[0]} className="w-full h-full object-contain" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-0 group-hover/media:opacity-100 transition-all duration-500 pointer-events-none" />
                              <div className="absolute top-6 left-6 bg-[var(--primary)] text-white text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-[0.3em] shadow-2xl shadow-[var(--primary)]/40 border border-white/10">Replay</div>
                              <div className="absolute bottom-6 left-6 flex items-center space-x-3 opacity-0 group-hover/media:opacity-100 transition-all duration-500 delay-100">
                                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">4K Ultra HD</span>
                              </div>
                            </div>
                          ) : (
                            <div className="relative group/img overflow-hidden">
                              <img src={urls[0]} alt="" className="w-full h-auto max-h-[700px] object-cover group-hover/img:scale-105 transition-transform duration-1000" referrerPolicy="no-referrer" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Post Actions - High-End Interaction */}
                  <div className="px-10 py-8 flex items-center justify-between relative">
                    <div className="absolute top-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-[var(--border-ui)] to-transparent" />
                    <div className="flex items-center space-x-12">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLike(post.id, post.author_id);
                        }}
                        className={`flex items-center space-x-4 group/btn transition-all ${
                          post.is_liked ? 'text-rose-500' : 'text-[var(--text-muted)] hover:text-rose-500'
                        }`}
                      >
                        <div className={`p-3 rounded-2xl transition-all duration-500 ${post.is_liked ? 'bg-rose-500/10 shadow-[0_0_20px_rgba(244,63,94,0.2)]' : 'bg-[var(--bg)]/50 border border-[var(--border-ui)] group-hover/btn:bg-rose-500/10 group-hover/btn:border-rose-500/30'}`}>
                          <Heart size={22} className={post.is_liked ? 'fill-current scale-110' : 'group-hover/btn:scale-110 transition-transform'} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[12px] font-black tracking-tighter text-[var(--text-main)]">{post.likes_count}</span>
                          <span className="text-[8px] font-black uppercase tracking-widest opacity-50">Curtidas</span>
                        </div>
                      </button>

                      <button className="flex items-center space-x-4 group/btn text-[var(--text-muted)] hover:text-[var(--primary)] transition-all">
                        <div className="p-3 rounded-2xl bg-[var(--bg)]/50 border border-[var(--border-ui)] group-hover/btn:bg-[var(--primary)]/10 group-hover/btn:border-[var(--primary)]/30 transition-all duration-500">
                          <MessageCircle size={22} className="group-hover/btn:scale-110 transition-transform" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[12px] font-black tracking-tighter text-[var(--text-main)]">{post.comments_count}</span>
                          <span className="text-[8px] font-black uppercase tracking-widest opacity-50">Comentários</span>
                        </div>
                      </button>
                    </div>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare(post);
                      }}
                      className="p-4 rounded-2xl bg-[var(--bg)]/50 border border-[var(--border-ui)] text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 hover:border-[var(--primary)]/30 transition-all duration-500"
                    >
                      <Share2 size={22} />
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="bg-[var(--surface)]/20 border border-dashed border-[var(--border-ui)] rounded-[3rem] p-12 text-center">
                <p className="text-[var(--text-muted)] font-bold italic">A Arena está silenciosa... Seja o primeiro a publicar!</p>
              </div>
            )}
          </div>

          {/* Create Post - Command Center Style */}
          <div className="bg-[var(--surface)]/60 backdrop-blur-xl border border-[var(--border-ui)] rounded-[2.5rem] p-8 shadow-2xl shadow-black/40 relative overflow-hidden group/post">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/5 blur-[60px] rounded-full -mr-16 -mt-16 group-hover/post:bg-[var(--primary)]/10 transition-colors" />
            <div className="flex space-x-6">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--surface)] to-[var(--bg)] flex-shrink-0 overflow-hidden border border-[var(--border-ui)] shadow-2xl relative z-10">
                  {userProfile?.profile_photo || userProfile?.avatar_url ? (
                    <img src={userProfile.profile_photo || userProfile.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                      <User size={28} />
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-emerald-500 rounded-lg border-4 border-[var(--surface)] flex items-center justify-center z-20">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                </div>
              </div>
              <div className="flex-1 space-y-6">
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Relatório de performance..."
                  className="w-full bg-transparent border-none focus:ring-0 text-base text-[var(--text-main)] placeholder-[var(--text-muted)]/50 resize-none h-16 font-semibold tracking-tight"
                />
                
                {previewUrls.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    {previewUrls.map((url, index) => (
                      <motion.div 
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative rounded-3xl overflow-hidden border border-[var(--border-ui)] bg-black/40 aspect-[4/5] group/preview shadow-2xl"
                      >
                        {selectedFiles[index]?.type.startsWith('image/') ? (
                          <img src={url} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <video src={url} className="w-full h-full object-cover" />
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
                          className="absolute top-4 right-4 p-2.5 bg-black/80 text-white rounded-2xl hover:bg-rose-500 transition-all opacity-0 group-hover/preview:opacity-100 scale-90 group-hover/preview:scale-100 backdrop-blur-md"
                        >
                          <X size={18} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-6 border-t border-[var(--border-ui)]/20">
                  <div className="flex space-x-3">
                    <label className="p-3 rounded-2xl bg-[var(--bg)]/50 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-all cursor-pointer border border-[var(--border-ui)]">
                      <input type="file" className="hidden" accept="image/jpeg,image/png" multiple onChange={handleFileChange} />
                      <ImageIcon size={20} />
                    </label>
                    <label className="p-3 rounded-2xl bg-[var(--bg)]/50 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-all cursor-pointer border border-[var(--border-ui)]">
                      <input type="file" className="hidden" accept="video/mp4,video/quicktime" onChange={handleFileChange} />
                      <Video size={20} />
                    </label>
                  </div>
                  <button
                    onClick={handleCreatePost}
                    disabled={(!newPostContent.trim() && selectedFiles.length === 0) || uploading}
                    className="bg-[var(--primary)] text-white px-10 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] disabled:opacity-50 hover:bg-[var(--primary-highlight)] transition-all shadow-2xl shadow-[var(--primary)]/30 active:scale-95"
                  >
                    {uploading ? 'Processando...' : 'Publicar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Arena Intelligence - Premium Sidebar */}
        <div className="hidden lg:block lg:col-span-4 space-y-8">
          <div className="bg-[var(--surface)]/40 backdrop-blur-2xl border border-[var(--border-ui)] rounded-[3rem] p-8 sticky top-24 shadow-2xl shadow-black/40 overflow-hidden group/sidebar">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-50" />
            
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--text-muted)]">Arena Intelligence</h3>
              </div>
              <Award size={16} className="text-[var(--primary)] opacity-50" />
            </div>

            <div className="space-y-10">
              {/* Score Visualization */}
              <div className="relative p-6 rounded-[2rem] bg-gradient-to-br from-[var(--bg)] to-[var(--surface)] border border-[var(--border-ui)] shadow-inner group/score">
                <div className="absolute top-4 right-4 text-[8px] font-black text-[var(--primary)] uppercase tracking-widest">Global Rank</div>
                <div className="flex flex-col items-center justify-center space-y-2 py-4">
                  <span className="text-5xl font-black text-[var(--text-main)] tracking-tighter group-hover/score:scale-110 transition-transform duration-500">{Math.round(userProfile?.arena_score || 0)}</span>
                  <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-[0.3em]">Arena Points</span>
                </div>
                <div className="space-y-3 mt-4">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Atividade Total</span>
                    <span className="text-[9px] font-black text-emerald-500">+{arenaStats.growth}%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="p-3 rounded-2xl bg-[var(--bg)]/50 border border-[var(--border-ui)]">
                      <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Posts</p>
                      <p className="text-sm font-black text-[var(--text-main)]">{arenaStats.totalPosts}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-[var(--bg)]/50 border border-[var(--border-ui)]">
                      <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Atletas</p>
                      <p className="text-sm font-black text-[var(--text-main)]">{arenaStats.activeUsers}</p>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-[var(--surface)] rounded-full overflow-hidden p-0.5 border border-[var(--border-ui)] mt-4">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (arenaStats.totalInteractions / 1000) * 100)}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-[var(--primary)] via-cyan-400 to-[var(--primary)] rounded-full shadow-[0_0_15px_rgba(37,99,235,0.5)]" 
                    />
                  </div>
                </div>
              </div>

              {/* Trending Arena */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]">Trending Arena</h4>
                  <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Live Updates</span>
                </div>
                <div className="space-y-3">
                  {trendingPosts.length > 0 ? (
                    trendingPosts.map((post, idx) => (
                      <motion.div 
                        key={post.id}
                        whileHover={{ x: 5 }}
                        onClick={() => {
                          setSelectedPost(post);
                          setIsPostModalOpen(true);
                        }}
                        className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg)]/30 border border-[var(--border-ui)] hover:border-[var(--primary)]/30 hover:bg-[var(--bg)]/50 transition-all cursor-pointer group/item"
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${idx === 0 ? 'from-amber-400 to-orange-600' : idx === 1 ? 'from-slate-300 to-slate-500' : 'from-orange-700 to-orange-900'} flex items-center justify-center text-white text-[10px] font-black shadow-lg shadow-black/20`}>
                            #{idx + 1}
                          </div>
                          <div>
                            <p className="text-xs font-black text-[var(--text-main)] group-hover/item:text-[var(--primary)] transition-colors truncate w-32">
                              {post.author?.full_name || 'Atleta'}
                            </p>
                            <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">{post.likes_count} curtidas</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-emerald-500">POPULAR</p>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <p className="text-[10px] text-[var(--text-muted)] italic text-center py-4">Nenhuma tendência ainda...</p>
                  )}
                </div>
              </div>

              <button className="group relative w-full py-5 rounded-[2rem] bg-[var(--primary)] overflow-hidden shadow-2xl shadow-[var(--primary)]/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <span className="relative z-10 text-white text-[11px] font-black uppercase tracking-[0.4em]">Explorar Competições</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isPostModalOpen && selectedPost && (
          <PostModal 
            key={selectedPost.id}
            post={selectedPost} 
            onClose={() => {
              setIsPostModalOpen(false);
              setSelectedPost(null);
            }} 
            onLike={handleLike}
            onShare={handleShare}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
