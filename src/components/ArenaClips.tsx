import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, MessageCircle, Share2, User, Award, Volume2, VolumeX, Play, Pause } from 'lucide-react';
import { supabase } from '../services/supabase';
import { ArenaPost, ArenaProfile } from '../types';
import { Link } from 'react-router-dom';

const ClipItem: React.FC<{ post: ArenaPost; isActive: boolean }> = ({ post, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(post.is_liked || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    checkFollowStatus();
  }, [post.author_id]);

  const checkFollowStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id === post.author_id) return;

      const { data, error } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', user.id)
        .eq('following_id', post.author_id)
        .single();

      if (data) setIsFollowing(true);
    } catch (err) {
      // Silent error
    }
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setFollowLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', post.author_id);
        setIsFollowing(false);
      } else {
        await supabase.from('follows').insert({ follower_id: user.id, following_id: post.author_id });
        setIsFollowing(true);
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(err => console.log('Autoplay blocked:', err));
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isActive]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newIsLiked = !isLiked;
      setIsLiked(newIsLiked);
      setLikesCount(prev => newIsLiked ? prev + 1 : Math.max(0, prev - 1));

      if (newIsLiked) {
        await supabase.from('likes').insert({ post_id: post.id, user_id: user.id });
        await supabase.from('posts').update({ likes_count: likesCount + 1 }).eq('id', post.id);
      } else {
        await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id);
        await supabase.from('posts').update({ likes_count: Math.max(0, likesCount - 1) }).eq('id', post.id);
      }
    } catch (err) {
      console.error('Error liking clip:', err);
    }
  };

  return (
    <div className="relative h-full w-full snap-start bg-black flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        src={post.media_url}
        className="h-full w-full object-cover"
        loop
        muted={isMuted}
        playsInline
        onClick={togglePlay}
      />

      {/* Overlay Controls */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />

      {/* Side Actions */}
      <div className="absolute right-4 bottom-24 flex flex-col items-center space-y-6 z-10">
        <button onClick={handleLike} className="flex flex-col items-center group">
          <div className={`p-3 rounded-full backdrop-blur-md transition-all ${isLiked ? 'bg-rose-500 text-white' : 'bg-white/10 text-white group-hover:bg-white/20'}`}>
            <Heart size={28} className={isLiked ? 'fill-current' : ''} />
          </div>
          <span className="text-white text-xs font-black mt-2 shadow-sm">{likesCount}</span>
        </button>

        <button className="flex flex-col items-center group">
          <div className="p-3 rounded-full bg-white/10 backdrop-blur-md text-white group-hover:bg-white/20 transition-all">
            <MessageCircle size={28} />
          </div>
          <span className="text-white text-xs font-black mt-2 shadow-sm">{post.comments_count}</span>
        </button>

        <button className="flex flex-col items-center group">
          <div className="p-3 rounded-full bg-white/10 backdrop-blur-md text-white group-hover:bg-white/20 transition-all">
            <Share2 size={28} />
          </div>
          <span className="text-white text-xs font-black mt-2 shadow-sm">{post.shares_count || 0}</span>
        </button>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
        <div className="flex items-center space-x-3 mb-4">
          <Link to={`/user/@${post.author?.username}`} className="w-12 h-12 rounded-2xl border-2 border-white overflow-hidden shadow-2xl">
            {post.author?.profile_photo || post.author?.avatar_url ? (
              <img src={post.author.profile_photo || post.author.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[var(--primary)] text-white">
                <User size={24} />
              </div>
            )}
          </Link>
          <div>
            <Link to={`/user/@${post.author?.username}`} className="text-white font-black text-sm uppercase tracking-wider drop-shadow-lg">
              {post.author?.full_name}
            </Link>
            <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest drop-shadow-lg">@{post.author?.username}</p>
          </div>
          <button 
            onClick={handleFollow}
            disabled={followLoading}
            className={`ml-4 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              isFollowing 
                ? 'bg-white/20 text-white border border-white/20' 
                : 'bg-white text-black hover:bg-white/90'
            }`}
          >
            {isFollowing ? '✔ Seguindo' : 'Seguir'}
          </button>
        </div>
        <p className="text-white text-sm font-medium line-clamp-2 drop-shadow-lg max-w-[80%]">
          {post.content}
        </p>
      </div>

      {/* Mute Toggle */}
      <button 
        onClick={() => setIsMuted(!isMuted)}
        className="absolute top-6 right-6 p-3 bg-black/40 backdrop-blur-md text-white rounded-2xl z-20"
      >
        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>

      {/* Play/Pause Indicator */}
      <AnimatePresence>
        {!isPlaying && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="p-8 bg-black/40 backdrop-blur-md rounded-full text-white">
              <Play size={48} fill="currentColor" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ArenaClips: React.FC = () => {
  const [clips, setClips] = useState<ArenaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchClips();
  }, []);

  const fetchClips = async () => {
    setLoading(true);
    try {
      const { data: postsData, error } = await supabase
        .from('posts')
        .select('*')
        .eq('type', 'video')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const authorIds = Array.from(new Set((postsData || []).map(p => p.author_id)));
      const { data: authorsData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', authorIds)
        .neq('role', 'admin');
      
      const authorsMap = new Map((authorsData || []).map(a => [a.id, a]));
      
      const { data: { user } } = await supabase.auth.getUser();
      let userLikes: Set<string> = new Set();
      if (user) {
        const { data: likesData } = await supabase.from('likes').select('post_id').eq('user_id', user.id);
        if (likesData) userLikes = new Set(likesData.map(l => l.post_id));
      }

      const clipsWithAuthors = (postsData || [])
        .map(p => ({
          ...p,
          author: authorsMap.get(p.author_id),
          is_liked: userLikes.has(p.id)
        }))
        .filter(p => p.author); // Only keep clips where author is not an admin (since we filtered authorsData)

      setClips(clipsWithAuthors);
    } catch (err) {
      console.error('Error fetching clips:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = () => {
    if (containerRef.current) {
      const index = Math.round(containerRef.current.scrollTop / containerRef.current.clientHeight);
      setActiveIndex(index);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-black flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        <span className="text-white text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Arena Clips</span>
      </div>
    );
  }

  if (clips.length === 0) {
    return (
      <div className="h-screen w-full bg-black flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center text-white">
          <Play size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-white text-xl font-black uppercase italic">Nenhum Clip encontrado</h2>
          <p className="text-white/60 text-sm max-w-xs">Seja o primeiro a publicar um vídeo vertical na Arena!</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className="h-[calc(100vh-4rem-5rem)] md:h-[calc(100vh-5rem)] w-full bg-black overflow-y-scroll snap-y snap-mandatory hide-scrollbar"
    >
      {clips.map((clip, index) => (
        <ClipItem 
          key={clip.id} 
          post={clip} 
          isActive={index === activeIndex} 
        />
      ))}
    </div>
  );
};
