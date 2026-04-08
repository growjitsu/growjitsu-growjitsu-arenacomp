import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useParams } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Award, Plus, Image as ImageIcon, User, Video, X, MoreVertical, Trash2, Edit2, Archive, RotateCcw, ChevronRight, ExternalLink } from 'lucide-react';
import { supabase } from '../services/supabase';
import { ArenaPost, ArenaProfile, PostType, ArenaAd } from '../types';
import { PostModal } from './PostModal';
import { ShareModal } from './ShareModal';
import { AchievementCard } from './AchievementCard';
import { generateCard, CardData } from '../services/arenaService';
import { trackAdEvent } from '../services/adService';

import { SidebarAds } from './SidebarAds';

export const ArenaFeed: React.FC<{ userProfile?: ArenaProfile | null }> = ({ userProfile }) => {
  console.log('[ArenaFeed] Componente montado');
  const [posts, setPosts] = useState<ArenaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const POSTS_PER_PAGE = 10;
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedPost, setSelectedPost] = useState<ArenaPost | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAchievementCardOpen, setIsAchievementCardOpen] = useState(false);
  const [achievementData, setAchievementData] = useState<CardData>({
    title: '',
    athleteName: '',
    achievement: '',
    modality: '',
    date: '',
    profileUrl: ''
  });
  const [shareModalData, setShareModalData] = useState<{
    title: string;
    subtitle?: string;
    url: string;
    imageUrl?: string;
    onGenerate?: () => void;
  }>({ title: '', url: '' });
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isEditingPost, setIsEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editHashtags, setEditHashtags] = useState('');
  const [arenaStats, setArenaStats] = useState({
    totalPosts: 0,
    activeUsers: 0,
    totalInteractions: 0,
    growth: 0
  });
  const [trendingPosts, setTrendingPosts] = useState<ArenaPost[]>([]);
  const [ads, setAds] = useState<ArenaAd[]>([]);
  const [currentInFeedAdIndex, setCurrentInFeedAdIndex] = useState(0);
  const [currentTopAdIndex, setCurrentTopAdIndex] = useState(0);

  // Rotation for In-Feed Ads
  useEffect(() => {
    const inFeedAds = ads.filter(ad => (ad.placement || '').toLowerCase().includes('feed_between'));
    if (inFeedAds.length === 0) return;

    const currentAd = inFeedAds[currentInFeedAdIndex % inFeedAds.length];
    
    // Track impression
    if (currentAd?.id) {
      trackAdEvent(currentAd.id, 'impression', userProfile?.id);
    }

    if (inFeedAds.length <= 1) return;

    const timer = setTimeout(() => {
      setCurrentInFeedAdIndex(prev => (prev + 1) % inFeedAds.length);
    }, (currentAd?.display_time || 15) * 1000);

    return () => clearTimeout(timer);
  }, [ads.length, currentInFeedAdIndex, userProfile?.id]);

  // Rotation for Top-of-Feed Ads
  useEffect(() => {
    const topAds = ads.filter(ad => (ad.placement || '').toLowerCase().includes('feed_top'));
    if (topAds.length === 0) return;

    const currentAd = topAds[currentTopAdIndex % topAds.length];

    // Track impression
    if (currentAd?.id) {
      trackAdEvent(currentAd.id, 'impression', userProfile?.id);
    }

    if (topAds.length <= 1) return;

    const timer = setTimeout(() => {
      setCurrentTopAdIndex(prev => (prev + 1) % topAds.length);
    }, (currentAd?.display_time || 12) * 1000);

    return () => clearTimeout(timer);
  }, [ads.length, currentTopAdIndex, userProfile?.id]);
  const [promotedProfiles, setPromotedProfiles] = useState<ArenaProfile[]>([]);
  const [loadingPromoted, setLoadingPromoted] = useState(false);
  const [trackedAds, setTrackedAds] = useState<Set<string>>(new Set());
  const { id: urlPostId } = useParams<{ id?: string }>();

  useEffect(() => {
    fetchPosts(0, true);
    fetchArenaStats();
    fetchTrendingPosts();
    fetchAds();
    fetchPromotedProfiles();

    // Check for single post in URL (query param or route param)
    const params = new URLSearchParams(window.location.search);
    const queryPostId = params.get('post');
    const postId = urlPostId || queryPostId;
    
    if (postId) {
      fetchSinglePost(postId);
    }
  }, [urlPostId, userProfile?.id]);

  const handleArchivePost = async (postId: string, archive: boolean = true) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ is_archived: archive })
        .eq('id', postId);
      
      if (error) throw error;
      setPosts(prev => prev.filter(p => p.id !== postId));
      setTrendingPosts(prev => prev.filter(p => p.id !== postId));
      setActiveMenuId(null);
    } catch (error) {
      console.error('Error archiving post:', error);
      alert('Erro ao arquivar postagem.');
    }
  };

  const handleDeletePost = async (postId: string, mediaUrls?: string[]) => {
    if (!window.confirm('Tem certeza que deseja excluir este post? Essa ação não poderá ser desfeita.')) return;

    try {
      // 1. Delete media from storage if exists
      if (mediaUrls && mediaUrls.length > 0) {
        for (const url of mediaUrls) {
          const path = url.split('/').pop();
          if (path) {
            await supabase.storage.from('posts').remove([path]);
          }
        }
      }

      // 2. Delete post from database
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);
      
      if (error) throw error;
      setPosts(prev => prev.filter(p => p.id !== postId));
      setTrendingPosts(prev => prev.filter(p => p.id !== postId));
      setActiveMenuId(null);
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Erro ao excluir postagem.');
    }
  };

  const handleUpdatePost = async (postId: string, content: string, hashtags: string) => {
    try {
      const upperContent = content.toUpperCase();
      const upperHashtags = hashtags.toUpperCase();
      const { error } = await supabase
        .from('posts')
        .update({ 
          content: upperContent,
          hashtags: upperHashtags
        })
        .eq('id', postId);
      
      if (error) throw error;
      
      const updateFn = (p: ArenaPost) => p.id === postId ? { ...p, content: upperContent, hashtags: upperHashtags } : p;
      setPosts(prev => prev.map(updateFn));
      setTrendingPosts(prev => prev.map(updateFn));
      setIsEditingPost(null);
    } catch (error) {
      console.error('Error updating post:', error);
      alert('Erro ao atualizar postagem.');
    }
  };

  const fetchPosts = async (pageToFetch: number = 0, isInitial: boolean = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
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

      // 2. Fetch posts with pagination
      const from = pageToFetch * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;
      
      console.log(`ArenaFeed: Fetching posts from ${from} to ${to}...`);
      
      let query = supabase
        .from('posts')
        .select('*')
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .range(from, to);

      let { data: postsData, error: postsError } = await query;

      // Fallback for missing column
      if (postsError && (postsError.message?.includes('column') || postsError.code === '42703')) {
        const { data: retryData, error: retryError } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, to);
        
        if (retryError) throw retryError;
        postsData = retryData;
        postsError = null;
      } else if (postsError) {
        throw postsError;
      }

      if (!postsData || postsData.length === 0) {
        setHasMore(false);
        if (isInitial) setPosts([]);
        return;
      }

      if (postsData.length < POSTS_PER_PAGE) {
        setHasMore(false);
      }
      
      // 3. Fetch authors
      const authorIds = Array.from(new Set(postsData.map(p => p.author_id)));
      let authorsMap = new Map();
      if (authorIds.length > 0) {
        const { data: authorsData } = await supabase
          .from('profiles')
          .select('*')
          .neq('role', 'admin')
          .in('id', authorIds);
        
        if (authorsData) {
          authorsMap = new Map(authorsData.map(a => [a.id, a]));
        }
      }
      
      const postsWithAuthors = postsData.map(p => ({
        ...p,
        author: authorsMap.get(p.author_id)
      }))
      .filter(p => p.is_archived !== true && p.author);

      // 4. Fetch user's likes
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

      // 5. Calculate scores
      const now = new Date();
      const scoredPosts = postsWithAuthors.map(post => {
        let score = 0;
        const postDate = new Date(post.created_at);
        const diffHours = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60);

        if (followingSet.has(post.author_id)) score += 50;
        const normalizeModality = (m?: string) => m?.toLowerCase().replace(/[-\s]/g, '') || '';
        if (currentUserProfile && normalizeModality(post.author?.modality) === normalizeModality(currentUserProfile.modality)) score += 40;
        score += (post.likes_count || 0) * 2;
        score += (post.comments_count || 0) * 4;
        score += (post.shares_count || 0) * 6;
        if (diffHours <= 1) score += 30;
        else if (diffHours <= 6) score += 20;
        else if (diffHours <= 24) score += 10;
        if (currentUserProfile && post.author) {
          if (post.author.city === currentUserProfile.city) score += 30;
          else if (post.author.state === currentUserProfile.state) score += 20;
          else if (post.author.country === currentUserProfile.country) score += 10;
        }
        const authorScore = post.author?.arena_score || 0;
        if (authorScore > 1000) score += 50;
        else if (authorScore > 500) score += 30;
        else if (authorScore > 100) score += 20;
        if (post.type === 'video') score += 15;
        else if (post.type === 'image') score += 10;
        else if (post.type === 'text') score += 5;

        return {
          ...post,
          is_liked: userLikes.has(post.id),
          feed_score: score
        };
      });

      // 6. Final Sorting (only sort the new batch or re-sort all if needed)
      // For infinite scroll, we usually append. Sorting might mess up the order if we append.
      // But since we order by created_at in SQL, we just need to maintain that.
      const sortedNewPosts = scoredPosts.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return (b.feed_score || 0) - (a.feed_score || 0);
      });

      if (isInitial) {
        setPosts(sortedNewPosts);
      } else {
        setPosts(prev => [...prev, ...sortedNewPosts]);
      }
      setPage(pageToFetch);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchArenaStats = async () => {
    try {
      // Fetch total posts
      const { count: postsCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true });

      // Fetch active users (total profiles for now) - Exclude admins
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .neq('role', 'admin');

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
      console.log('[ArenaFeed] Buscando posts em alta via API...');
      const response = await fetch('/api/getTrendingPosts');
      
      if (response.ok) {
        const data = await response.json();
        setTrendingPosts(data || []);
        console.log('[ArenaFeed] Posts em alta carregados via API:', data?.length);
      } else {
        console.error('[ArenaFeed] Falha na API de posts em alta:', response.status);
      }
    } catch (error) {
      console.error('[ArenaFeed] Erro ao buscar posts em alta:', error);
    }
  };

  const fetchAds = async (retryWithDebug = false) => {
    try {
      console.log(`[ArenaFeed] Buscando anúncios via API... (Debug: ${retryWithDebug}, User: ${userProfile?.id || 'Anônimo'})`);
      
      // Add geographic parameters if userProfile is available
      let locationParams = '';
      if (userProfile) {
        const params = new URLSearchParams();
        if (userProfile.country_id) params.append('country_id', userProfile.country_id);
        if (userProfile.state_id) params.append('state_id', userProfile.state_id);
        if (userProfile.city_id) params.append('city_id', userProfile.city_id);
        if (userProfile.country) params.append('country', userProfile.country);
        if (userProfile.state) params.append('state', userProfile.state);
        if (userProfile.city) params.append('city', userProfile.city);
        
        const queryString = params.toString();
        if (queryString) locationParams = `&${queryString}`;
      }

      // Use explicit placements
      const response = await fetch(`/api/getPromotions?placement=feed_top,feed_between,sidebar,profile${locationParams}${retryWithDebug ? '&debug=true' : ''}`);
      
      if (response.ok) {
        const data = await response.json();
        setAds(data || []);
        console.log(`[ArenaFeed] Anúncios carregados: ${data?.length || 0}`, data);
        
        if (data && data.length > 0) {
          const feedTop = data.filter((ad: any) => (ad.placement || '').toLowerCase().includes('feed_top'));
          const feedBetween = data.filter((ad: any) => (ad.placement || '').toLowerCase().includes('feed_between'));
          const sidebar = data.filter((ad: any) => (ad.placement || '').toLowerCase().includes('sidebar'));
          console.log(`[ArenaFeed] Distribuição: Top=${feedTop.length}, Between=${feedBetween.length}, Sidebar=${sidebar.length}`);
        }
        
        // If no ads found and we haven't retried with debug yet, try once more with debug
        if ((!data || data.length === 0) && !retryWithDebug) {
          console.log('[ArenaFeed] Nenhum anúncio encontrado, tentando com debug=true...');
          fetchAds(true);
        } else if ((!data || data.length === 0) && retryWithDebug && locationParams) {
          console.log('[ArenaFeed] Ainda nenhum anúncio, tentando sem parâmetros de localização...');
          // Final attempt: No location, no debug (or with debug)
          const finalResponse = await fetch(`/api/getPromotions?placement=feed_top,feed_between,sidebar,profile&debug=true`);
          if (finalResponse.ok) {
            const finalData = await finalResponse.json();
            setAds(finalData || []);
          }
        }
      } else {
        console.error('[ArenaFeed] Falha na API de anúncios:', response.status);
      }
    } catch (error) {
      console.error('[ArenaFeed] Erro ao buscar anúncios:', error);
    }
  };

  const fetchPromotedProfiles = async () => {
    setLoadingPromoted(true);
    try {
      console.log('[ArenaFeed] Buscando perfis em destaque via API...');
      const response = await fetch('/api/getPerfisDestaque');
      
      if (response.ok) {
        const data = await response.json();
        setPromotedProfiles(data || []);
        console.log('[ArenaFeed] Perfis em destaque carregados via API:', data?.length);
      } else {
        console.error('[ArenaFeed] Falha na API de perfis em destaque:', response.status);
        setPromotedProfiles([]);
      }
    } catch (error) {
      console.error('[ArenaFeed] Erro ao buscar perfis em destaque:', error);
      setPromotedProfiles([]);
    } finally {
      setLoadingPromoted(false);
    }
  };

  const fetchSinglePost = async (postId: string) => {
    try {
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();
      
      if (postError) throw postError;
      if (postData) {
        const { data: authorData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', postData.author_id)
          .single();
        
        const postWithAuthor = {
          ...postData,
          author: authorData
        };
        setSelectedPost(postWithAuthor);
        setIsPostModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching single post:', error);
    }
  };

  const handleShare = async (post: ArenaPost) => {
    console.log('🔗 SHARE DATA:', {
      type: 'post',
      id: post.id,
      fullData: post
    });
    const shareUrl = `${window.location.origin}/share/post/${post.id}`;
    
    let firstImageUrl = post.media_url;
    try {
      if (post.media_url?.startsWith('[')) {
        const urls = JSON.parse(post.media_url);
        firstImageUrl = urls[0];
      }
    } catch (e) {}

    setShareModalData({
      title: 'Compartilhar Postagem',
      subtitle: post.content || 'Confira esta postagem na ArenaComp!',
      url: shareUrl,
      imageUrl: firstImageUrl,
      onGenerate: () => {
        setAchievementData({
          title: 'Nova Postagem',
          athleteName: post.author?.full_name || 'Atleta Arena',
          achievement: post.content || 'Compartilhou um post',
          modality: 'Feed',
          date: new Date(post.created_at).toLocaleDateString(),
          profileUrl: `https://arenacomp.com/${post.author?.username || 'atleta'}`,
          type: 'post',
          realId: post.id,
          mainImageUrl: post.media_url || (post.media_urls && post.media_urls[0])
        });
        setIsAchievementCardOpen(true);
      }
    });
    setIsShareModalOpen(true);
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
          content: newPostContent.toUpperCase(),
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
    <div className="h-full flex flex-col overflow-hidden">
      {/* Scrollable Feed Area */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column - Feed Content */}
            <div className="lg:col-span-8 space-y-8 max-w-4xl mx-auto w-full">
              {/* Feed List - Immersive Cards */}
              <div>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-6">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-[var(--primary)]/20 rounded-full" />
                  <div className="absolute top-0 left-0 w-16 h-16 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.4em] text-[var(--text-muted)] animate-pulse">Sincronizando Arena</span>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Top Ad Rotation */}
                {(() => {
                  const topAds = ads.filter(ad => (ad.placement || '').toLowerCase().includes('feed_top'));
                  if (topAds.length === 0) return null;
                  
                  const ad = topAds[currentTopAdIndex % topAds.length];
                  const adMediaUrl = ad.media_url_feed_top || ad.media_url;
                  const isVideo = adMediaUrl?.match(/\.(mp4|webm|ogg|mov)$/i) || adMediaUrl?.includes('video');

                  return (
                    <AnimatePresence mode="wait">
                      <motion.div 
                        key={ad.id}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        onViewportEnter={() => trackAdEvent(ad.id, 'impression', userProfile?.id)}
                        className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-[2rem] p-6 flex flex-col md:flex-row items-center gap-6 group/promo overflow-hidden shadow-2xl"
                      >
                        {adMediaUrl && (
                          <div className="w-full md:w-64 aspect-[4/1] md:aspect-[12/3] rounded-xl overflow-hidden flex-shrink-0 bg-black border border-white/5">
                            {isVideo ? (
                              <video src={adMediaUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                            ) : (
                              <img src={adMediaUrl} alt="" className="w-full h-full object-cover group-hover/promo:scale-105 transition-transform duration-1000" referrerPolicy="no-referrer" />
                            )}
                          </div>
                        )}
                        <div className="flex-1 text-center md:text-left">
                          <div className="flex items-center justify-center md:justify-start space-x-2 mb-2">
                            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-blue-400">PATROCINADO</span>
                            <div className="w-1 h-1 rounded-full bg-blue-500/40" />
                            <span className="text-[8px] font-mono text-blue-400/60 uppercase">{ad.title}</span>
                          </div>
                          <h4 className="text-lg font-black uppercase tracking-tight text-white mb-2 italic leading-tight">{ad.title}</h4>
                          <p className="text-xs text-gray-400 mb-4 line-clamp-2 leading-relaxed">{ad.content}</p>
                          <div className="flex items-center justify-center md:justify-start space-x-4">
                            <a 
                              href={ad.link_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              onClick={() => trackAdEvent(ad.id, 'click', userProfile?.id)}
                              className="inline-flex items-center space-x-3 px-8 py-2.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
                            >
                              <span>Saiba Mais</span>
                              <ChevronRight size={14} />
                            </a>
                            {topAds.length > 1 && (
                              <div className="flex space-x-1">
                                {topAds.map((_, i) => (
                                  <div 
                                    key={i} 
                                    className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${i === currentTopAdIndex ? 'bg-blue-500 w-4' : 'bg-blue-500/20'}`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  );
                })()}

                {/* Promoted Profiles Section */}
                {promotedProfiles.length > 0 && (
                  <div className="bg-[var(--surface)]/20 border border-[var(--border-ui)] rounded-[2.5rem] p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-main)]">ATLETAS EM DESTAQUE</h3>
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    </div>
                    <div className="flex space-x-6 overflow-x-auto pb-4 hide-scrollbar">
                      {loadingPromoted ? (
                        [1, 2, 3].map((i) => (
                          <div key={`promoted-skeleton-${i}`} className="flex items-center space-x-4 p-3 rounded-xl bg-[var(--surface)] animate-pulse">
                            <div className="w-12 h-12 rounded-full bg-[var(--border-ui)]" />
                            <div className="flex-1 space-y-2">
                              <div className="w-24 h-3 bg-[var(--border-ui)] rounded" />
                              <div className="w-16 h-2 bg-[var(--border-ui)] rounded" />
                            </div>
                          </div>
                        ))
                      ) : promotedProfiles.map(profile => (
                        <Link key={profile.id} to={`/user/@${profile.username}`} className="flex-shrink-0 group text-center space-y-3">
                          <div className="relative">
                            <div className="absolute inset-0 bg-amber-500/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-20 h-20 rounded-2xl bg-[var(--bg)] border-2 border-amber-500/30 group-hover:border-amber-500 overflow-hidden transition-all">
                              {profile.profile_photo || profile.avatar_url ? (
                                <img src={profile.profile_photo || profile.avatar_url} alt="" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                                  <User size={24} />
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-[9px] font-black uppercase tracking-tight text-[var(--text-main)] truncate w-20">{profile.full_name?.split(' ')[0]}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Posts List with Interstitial Ads */}
                {posts.length > 0 ? (
                  <>
                    {posts.map((post, index) => {
                      const inFeedAds = ads.filter(ad => (ad.placement || '').toLowerCase().includes('feed_between'));
                      const currentAd = inFeedAds[currentInFeedAdIndex % inFeedAds.length];
                      
                      // Show ad every 5 posts, or at the end if there are at least 2 posts and total < 5
                      const showInFeedAd = (index + 1) % 5 === 0 || (index === posts.length - 1 && posts.length >= 2 && posts.length < 5);

                      return (
                        <React.Fragment key={post.id}>
                          <motion.div
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
                          <div className="p-4 md:p-8 flex items-center justify-between relative z-10">
                            <div className="flex items-center space-x-3 md:space-x-5">
                              <Link 
                                to={`/user/@${post.author?.username}`} 
                                className="relative group/avatar"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="absolute inset-0 bg-[var(--primary)] rounded-[1.5rem] blur-lg opacity-0 group-hover/avatar:opacity-30 transition-opacity" />
                                <div className="w-14 h-14 rounded-[1.5rem] bg-[var(--bg)] overflow-hidden relative z-10 border border-[var(--border-ui)] group-hover/avatar:border-[var(--primary)]/50 transition-all duration-500">
                                  {(post.author?.profile_photo || post.author?.avatar_url) && (
                                    <img src={post.author.profile_photo || post.author.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
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
                                    {post.author?.nickname && (
                                      <span className="ml-1 text-[10px] text-[var(--text-muted)] lowercase font-normal">
                                        (@{post.author.nickname.replace(/^@/, '')})
                                      </span>
                                    )}
                                  </Link>
                                  <div className="px-2 py-0.5 rounded-md bg-[var(--bg)] border border-[var(--border-ui)] text-[9px] font-mono font-bold text-[var(--primary)]">
                                    LVL {Math.floor((post.author?.arena_score || 0) / 100) + 1}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-3 mt-1.5">
                                  {post.author?.nickname ? (
                                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tight">@{post.author.nickname.replace(/^@/, '')}</span>
                                  ) : null}
                                  <span className="w-1 h-1 rounded-full bg-[var(--primary)]/40" />
                                  <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-[0.2em]">{post.author?.modality || 'Geral'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-4">
                              {userProfile?.id === post.author_id && (
                                <div className="relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuId(activeMenuId === post.id ? null : post.id);
                                    }}
                                    className="p-1.5 rounded-full hover:bg-[var(--bg)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)]"
                                  >
                                    <MoreVertical size={16} />
                                  </button>
                                  
                                  <AnimatePresence>
                                    {activeMenuId === post.id && (
                                      <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                        className="absolute right-0 mt-2 w-48 bg-[var(--surface)] border border-[var(--border-ui)] rounded-2xl shadow-2xl z-50 overflow-hidden"
                                      >
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setIsEditingPost(post.id);
                                            setEditContent(post.content || '');
                                            setEditHashtags(post.hashtags || '');
                                            setActiveMenuId(null);
                                          }}
                                          className="w-full flex items-center space-x-3 px-4 py-3 text-xs font-bold text-[var(--text-main)] hover:bg-[var(--primary)]/10 transition-colors border-b border-[var(--border-ui)]"
                                        >
                                          <Edit2 size={14} className="text-[var(--primary)]" />
                                          <span>Editar Postagem</span>
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleArchivePost(post.id);
                                          }}
                                          className="w-full flex items-center space-x-3 px-4 py-3 text-xs font-bold text-[var(--text-main)] hover:bg-[var(--primary)]/10 transition-colors border-b border-[var(--border-ui)]"
                                        >
                                          <Archive size={14} className="text-amber-500" />
                                          <span>Arquivar Postagem</span>
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            let urls: string[] = [];
                                            try {
                                              if (post.media_url?.startsWith('[')) urls = JSON.parse(post.media_url);
                                              else if (post.media_url) urls = [post.media_url];
                                            } catch (e) {}
                                            handleDeletePost(post.id, urls);
                                          }}
                                          className="w-full flex items-center space-x-3 px-4 py-3 text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors"
                                        >
                                          <Trash2 size={14} />
                                          <span>Excluir Permanentemente</span>
                                        </button>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              )}
                              {post.type === 'result' && (
                                <div className="bg-gradient-to-r from-amber-400 to-orange-600 text-white px-4 py-1.5 rounded-xl flex items-center space-x-2 shadow-2xl shadow-orange-500/30 border border-white/10">
                                  <Award size={12} className="fill-current" />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Pódio</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Post Content */}
                          <div className="px-4 md:px-8 pb-4">
                            {isEditingPost === post.id ? (
                              <div className="space-y-4 mb-6" onClick={(e) => e.stopPropagation()}>
                                <textarea
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-2xl p-4 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)] min-h-[100px]"
                                  placeholder="O que está acontecendo na Arena?"
                                />
                                <input
                                  type="text"
                                  value={editHashtags}
                                  onChange={(e) => setEditHashtags(e.target.value)}
                                  className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-xl p-3 text-xs text-[var(--primary)] outline-none focus:border-[var(--primary)]"
                                  placeholder="#jiujitsu #mma #ranking"
                                />
                                <div className="flex items-center justify-end space-x-3">
                                  <button
                                    onClick={() => setIsEditingPost(null)}
                                    className="px-4 py-2 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] uppercase tracking-widest"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={() => handleUpdatePost(post.id, editContent, editHashtags)}
                                    className="px-6 py-2 bg-[var(--primary)] text-white text-xs font-black rounded-xl uppercase tracking-widest hover:bg-[var(--primary-highlight)] transition-all"
                                  >
                                    Salvar Alterações
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-[var(--text-main)]/90 text-base leading-relaxed font-medium mb-2 tracking-tight">{post.content}</p>
                                {post.hashtags && (
                                  <p className="text-xs font-bold text-[var(--primary)] mb-6 tracking-widest uppercase">{post.hashtags}</p>
                                )}
                              </>
                            )}
                            
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
                                      <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar w-full">
                                        {urls.map((url, i) => (
                                          <div key={i} className="flex-shrink-0 w-full snap-center relative flex items-center justify-center bg-black/20">
                                            <img 
                                              src={url} 
                                              alt="" 
                                              className="w-full h-auto block max-h-[70vh] object-contain" 
                                              referrerPolicy="no-referrer"
                                              loading="lazy"
                                            />
                                            <div className="absolute bottom-6 right-6 px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-black text-white">
                                              {i + 1} / {urls.length}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  }

                                  const url = urls[0];
                                  const isVideo = url.match(/\.(mp4|webm|ogg|mov)$/i) || url.includes('video');
                                  
                                  if (isVideo) {
                                    return (
                                      <video 
                                        src={url} 
                                        className="w-full h-auto block max-h-[70vh] object-contain" 
                                        controls 
                                        playsInline
                                        preload="metadata"
                                      />
                                    );
                                  }

                                  return (
                                    <img 
                                      src={url} 
                                      alt="" 
                                      className="w-full h-auto block max-h-[70vh] object-contain" 
                                      referrerPolicy="no-referrer"
                                      loading="lazy"
                                    />
                                  );
                                })()}
                              </div>
                            )}
                          </div>

                          {/* Post Actions */}
                          <div className="p-4 md:p-8 pt-4 flex items-center justify-between border-t border-[var(--border-ui)]/50 bg-[var(--surface)]/20">
                            <div className="flex items-center space-x-4 md:space-x-8">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLike(post.id, post.author_id);
                                }}
                                className={`flex items-center space-x-2 md:space-x-4 group/btn transition-all ${
                                  post.is_liked ? 'text-rose-500' : 'text-[var(--text-muted)] hover:text-rose-500'
                                }`}
                              >
                                <div className={`p-2 md:p-3 rounded-2xl transition-all duration-500 ${post.is_liked ? 'bg-rose-500/10 shadow-[0_0_20px_rgba(244,63,94,0.2)]' : 'bg-[var(--bg)]/50 border border-[var(--border-ui)] group-hover/btn:bg-rose-500/10 group-hover/btn:border-rose-500/30'}`}>
                                  <Heart size={18} className={post.is_liked ? 'fill-current scale-110' : 'group-hover/btn:scale-110 transition-transform'} />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] md:text-[12px] font-black tracking-tighter text-[var(--text-main)]">{post.likes_count}</span>
                                  <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest opacity-50">Curtidas</span>
                                </div>
                              </button>

                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPost(post);
                                  setIsPostModalOpen(true);
                                }}
                                className="flex items-center space-x-2 md:space-x-4 group/btn text-[var(--text-muted)] hover:text-[var(--primary)] transition-all"
                              >
                                <div className="p-2 md:p-3 rounded-2xl bg-[var(--bg)]/50 border border-[var(--border-ui)] group-hover/btn:bg-[var(--primary)]/10 group-hover/btn:border-[var(--primary)]/30 transition-all duration-500">
                                  <MessageCircle size={18} className="group-hover/btn:scale-110 transition-transform" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] md:text-[12px] font-black tracking-tighter text-[var(--text-main)]">{post.comments_count}</span>
                                  <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest opacity-50">Comentários</span>
                                </div>
                              </button>
                            </div>

                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShare(post);
                              }}
                              className="p-3 md:p-4 rounded-2xl bg-[var(--bg)]/50 border border-[var(--border-ui)] text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 hover:border-[var(--primary)]/30 transition-all duration-500"
                            >
                              <Share2 size={18} />
                            </button>
                          </div>
                        </motion.div>

                        {/* In-Feed Ad (Mobile focus, but visible on all) */}
                        {showInFeedAd && currentAd && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            onViewportEnter={() => trackAdEvent(currentAd.id, 'impression', userProfile?.id)}
                            className="bg-[var(--surface)]/40 backdrop-blur-xl border border-blue-500/30 rounded-[3rem] overflow-hidden p-6 md:p-8 space-y-6 relative group/promo shadow-2xl"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Patrocinado</span>
                                <div className="w-1 h-1 rounded-full bg-blue-500/40" />
                                <span className="text-[9px] font-mono text-blue-400/40 uppercase">{currentAd.title}</span>
                              </div>
                              <ExternalLink size={14} className="text-[var(--text-muted)] group-hover/promo:text-blue-400 transition-colors" />
                            </div>
                            
                            <div className="flex flex-col md:flex-row gap-8 items-center">
                              { (currentAd.media_url_feed_between || currentAd.media_url) && (
                                <div className="w-full md:w-72 aspect-[1200/630] rounded-2xl overflow-hidden bg-black flex-shrink-0 border border-white/5 shadow-lg">
                                  { (currentAd.media_url_feed_between || currentAd.media_url)?.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                                    <video src={currentAd.media_url_feed_between || currentAd.media_url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                                  ) : (
                                    <img src={currentAd.media_url_feed_between || currentAd.media_url} alt="" className="w-full h-full object-cover group-hover/promo:scale-110 transition-transform duration-1000" referrerPolicy="no-referrer" />
                                  )}
                                </div>
                              )}
                              <div className="flex-1 text-center md:text-left space-y-4">
                                <h4 className="text-2xl font-black uppercase tracking-tight text-[var(--text-main)] italic leading-tight group-hover/promo:text-blue-400 transition-colors">
                                  {currentAd.title}
                                </h4>
                                <p className="text-sm text-[var(--text-muted)] line-clamp-3 leading-relaxed">
                                  {currentAd.content}
                                </p>
                                <div className="flex items-center justify-center md:justify-start space-x-6">
                                  <a 
                                    href={currentAd.link_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    onClick={() => trackAdEvent(currentAd.id, 'click', userProfile?.id)}
                                    className="inline-flex items-center space-x-3 px-10 py-3.5 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
                                  >
                                    <span>Saiba Mais</span>
                                    <ChevronRight size={16} />
                                  </a>
                                  
                                  {/* Rotation Indicator for In-Feed */}
                                  {inFeedAds.length > 1 && (
                                    <div className="hidden md:flex items-center space-x-1.5">
                                      {inFeedAds.map((_, i) => (
                                        <div 
                                          key={i} 
                                          className={`h-1 rounded-full transition-all duration-500 ${i === currentInFeedAdIndex ? 'bg-blue-500 w-6' : 'bg-blue-500/20 w-2'}`}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </React.Fragment>
                    );
                  })}

                    {/* Infinite Scroll Trigger */}
                    {hasMore && (
                      <div 
                        className="flex justify-center py-12"
                        ref={(el) => {
                          if (el) {
                            const observer = new IntersectionObserver((entries) => {
                              if (entries[0].isIntersecting && !loadingMore && !loading) {
                                fetchPosts(page + 1);
                              }
                            }, { threshold: 0.1 });
                            observer.observe(el);
                          }
                        }}
                      >
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-[var(--surface)]/20 border border-dashed border-[var(--border-ui)] rounded-[3rem] p-12 text-center">
                    <p className="text-[var(--text-muted)] font-bold italic">A Arena está silenciosa... Seja o primeiro a publicar!</p>
                  </div>
                )}
              </div>
            )}
            </div>
            </div>

            {/* Right Column - Sidebar Ads (Desktop Only) */}
            <div className="hidden lg:block lg:col-span-4">
              <SidebarAds ads={ads} userProfile={userProfile} />
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
            onArchive={handleArchivePost}
            onDelete={handleDeletePost}
            onUpdate={handleUpdatePost}
          />
        )}
      </AnimatePresence>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={shareModalData.title}
        subtitle={shareModalData.subtitle}
        url={shareModalData.url}
        imageUrl={shareModalData.imageUrl}
        onGenerate={shareModalData.onGenerate || (() => {})}
        followerCount={0}
      />

      {isAchievementCardOpen && (
        <AchievementCard
          isOpen={isAchievementCardOpen}
          onClose={() => setIsAchievementCardOpen(false)}
          data={achievementData}
        />
      )}
    </div>
  );
};
