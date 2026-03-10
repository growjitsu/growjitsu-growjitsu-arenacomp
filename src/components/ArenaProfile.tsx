import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, Target, TrendingUp, Grid, History, MapPin, Calendar, 
  Settings, Edit2, Save, X, Instagram, Youtube, Music, 
  User, Dumbbell, Ruler, Scale, GraduationCap, Trophy,
  Database, Plus
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { ArenaProfile, ArenaResult, ArenaPost } from '../types';
import { countries, modalities } from '../utils/data';
import { PostModal } from './PostModal';
import { RegisterFightModal } from './RegisterFightModal';
import { getAthleteRankings } from '../services/arenaService';

export const ArenaProfileView: React.FC<{ userId?: string; username?: string; forceEdit?: boolean }> = ({ userId, username, forceEdit }) => {
  const [profile, setProfile] = useState<ArenaProfile | null>(null);
  const [results, setResults] = useState<ArenaResult[]>([]);
  const [posts, setPosts] = useState<ArenaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'history'>('posts');
  const [isEditing, setIsEditing] = useState(forceEdit || false);
  const [editData, setEditData] = useState<Partial<ArenaProfile>>({});
  const [saving, setSaving] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ArenaPost | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isRegisterFightModalOpen, setIsRegisterFightModalOpen] = useState(false);
  const [rankings, setRankings] = useState({ world: 0, national: 0, city: 0 });

  const [error, setError] = useState<string | null>(null);

  async function fetchFollowerCount(targetId: string) {
    try {
      const { count, error } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', targetId);
      
      if (error) throw error;
      setFollowerCount(count || 0);
    } catch (err) {
      console.error('Error fetching follower count:', err);
    }
  }

  async function checkIfFollowing(followerId: string, followingId: string) {
    try {
      const { data, error } = await supabase
        .from('followers')
        .select('*')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .maybeSingle();
      
      if (error) throw error;
      setIsFollowing(!!data);
    } catch (err) {
      console.error('Error checking follow status:', err);
    }
  }

  const fetchProfileData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      let targetId = userId;
      let profileData = null;

      if (username) {
        // Handle @username
        const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
        const { data: byUsername, error: usernameError } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', cleanUsername)
          .maybeSingle();
        
        if (usernameError) throw usernameError;
        if (!byUsername) {
          setError('Perfil não encontrado');
          setLoading(false);
          return;
        }
        profileData = byUsername;
        targetId = byUsername.id;
      } else if (!targetId && user) {
        targetId = user.id;
      }

      if (!targetId) {
        setLoading(false);
        return;
      }

      setIsOwnProfile(user?.id === targetId);

      if (user && user.id !== targetId) {
        checkIfFollowing(user.id, targetId);
      }
      fetchFollowerCount(targetId);

      // If we don't have profileData yet, fetch it
      if (!profileData) {
        let { data, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', targetId)
          .single();
        
        // Auto-create profile if it doesn't exist and it's the own profile
        if (profileError && profileError.code === 'PGRST116' && user?.id === targetId) {
          console.log('Profile not found, creating one for user:', targetId);
          const baseUsername = user.email?.split('@')[0] || `user_${targetId.slice(0, 5)}`;
          const newProfile = {
            id: targetId,
            username: `${baseUsername}_${Math.floor(Math.random() * 1000)}`,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Novo Atleta',
            avatar_url: user.user_metadata?.avatar_url || null,
            arena_score: 0,
            wins: 0,
            losses: 0,
            perfil_publico: true,
            permitir_seguidores: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { data: createdProfile, error: createError } = await supabase
            .from('profiles')
            .insert([newProfile])
            .select()
            .single();

          if (createError) throw createError;
          profileData = createdProfile;
        } else if (profileError) {
          throw profileError;
        } else {
          profileData = data;
        }
      }

      setProfile(profileData);
      setEditData(profileData || {});

      // Fetch Rankings
      if (profileData) {
        const rankData = await getAthleteRankings(profileData);
        setRankings(rankData);
      }

      // Fetch Results
      const { data: resultsData } = await supabase
        .from('competition_results')
        .select(`
          *,
          competition:competitions(*)
        `)
        .eq('athlete_id', targetId)
        .order('created_at', { ascending: false });
      
      setResults(resultsData || []);

      // Fetch Posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', targetId)
        .order('created_at', { ascending: false });
      
      // Fetch user's likes to mark posts as liked
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

      const postsWithLikes = (postsData || []).map(post => ({
        ...post,
        is_liked: userLikes.has(post.id)
      }));
      
      setPosts(postsWithLikes);

    } catch (error: any) {
      console.error('Error fetching profile data:', error);
      if (error.message?.includes("Could not find the table 'public.profiles'")) {
        setError('DATABASE_MISSING');
      } else {
        setError(`Erro ao buscar perfil: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsEditing(forceEdit || false);
    fetchProfileData();
  }, [userId, forceEdit]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      // Create a clean object with only the fields we want to update
      // This prevents errors if editData contains extra fields or missing columns
      const updatePayload: any = {
        full_name: editData.full_name,
        nickname: editData.nickname,
        bio: editData.bio,
        state: editData.state,
        country: editData.country,
        modality: editData.modality,
        category: editData.category,
        weight: editData.weight ? parseFloat(String(editData.weight)) : null,
        height: editData.height ? parseFloat(String(editData.height)) : null,
        graduation: editData.graduation,
        gym_name: editData.gym_name,
        professor: editData.professor,
        instagram_url: editData.instagram_url,
        youtube_url: editData.youtube_url,
        tiktok_url: editData.tiktok_url,
        titles: editData.titles,
        team: editData.team,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', profile.id);

      if (error) throw error;
      setProfile({ ...profile, ...editData });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Erro ao atualizar perfil. Verifique se as colunas "profile_photo" e "team" foram adicionadas à tabela "profiles" no seu banco de dados Supabase.');
    } finally {
      setSaving(false);
    }
  };

  const handleLike = async (postId: string, authorId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const post = posts.find(p => p.id === postId) || (selectedPost?.id === postId ? selectedPost : null);
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
      fetchProfileData(); // Revert on error
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Apenas JPG, PNG e WEBP são permitidos.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('O tamanho máximo é 5MB.');
      return;
    }

    setUploading(true);
    try {
      const compressProfileImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = 1080;
              canvas.height = 1080;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                const imgRatio = img.width / img.height;
                let drawWidth = 1080;
                let drawHeight = 1080;
                let offsetX = 0;
                let offsetY = 0;

                if (imgRatio > 1) {
                  drawWidth = 1080 * imgRatio;
                  offsetX = (1080 - drawWidth) / 2;
                } else {
                  drawHeight = 1080 / imgRatio;
                  offsetY = (1080 - drawHeight) / 2;
                }
                ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
              }
              resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.onerror = reject;
          };
          reader.onerror = reject;
        });
      };

      const compressedBase64 = await compressProfileImage(file);
      
      const { error } = await supabase
        .from('profiles')
        .update({ profile_photo: compressedBase64 })
        .eq('id', profile?.id);

      if (error) throw error;
      
      if (profile) {
        setProfile({ ...profile, profile_photo: compressedBase64 });
        setEditData({ ...editData, profile_photo: compressedBase64 });
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Erro ao fazer upload da foto.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]" /></div>;
  
  if (!profile) {
    if (error === 'DATABASE_MISSING') {
      return (
        <div className="max-w-2xl mx-auto py-12 px-4 space-y-8">
          <div className="bg-rose-500/10 border border-rose-500/20 p-8 rounded-3xl text-center space-y-6">
            <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center text-rose-500 mx-auto">
              <Database size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase italic text-rose-500">Configuração Necessária</h2>
              <p className="text-[var(--text-muted)] text-sm">
                A tabela <code className="bg-black/20 px-2 py-1 rounded text-rose-400">profiles</code> não foi encontrada no seu banco de dados Supabase.
              </p>
            </div>
            
            <div className="bg-black/40 p-6 rounded-2xl text-left space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Como resolver:</p>
              <ol className="text-sm text-[var(--text-main)] space-y-3 list-decimal list-inside">
                <li>Acesse o <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] underline">Dashboard do Supabase</a></li>
                <li>Vá em <span className="font-bold">SQL Editor</span></li>
                <li>Clique em <span className="font-bold">+ New Query</span></li>
                <li>Copie e cole o conteúdo do script SQL abaixo</li>
                <li>Clique em <span className="font-bold">Run</span></li>
              </ol>

              <details className="mt-4">
                <summary className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)] cursor-pointer hover:opacity-80">Ver Script SQL de Inicialização</summary>
                <div className="mt-2 p-4 bg-black/60 rounded-xl overflow-x-auto">
                  <pre className="text-[10px] text-[var(--text-muted)] font-mono leading-relaxed">
{`-- ArenaComp: National Social Network for Athletes
-- Database Schema (PostgreSQL / Supabase)

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('athlete', 'coach', 'gym', 'admin');
    CREATE TYPE event_level AS ENUM ('local', 'state', 'national', 'international');
    CREATE TYPE post_type AS ENUM ('text', 'image', 'video', 'result');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Tables
CREATE TABLE IF NOT EXISTS gyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID,
    city TEXT,
    state CHAR(2),
    address TEXT,
    logo_url TEXT,
    bio TEXT,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    nickname TEXT,
    role user_role DEFAULT 'athlete',
    modality TEXT,
    category TEXT,
    weight DECIMAL(5,2),
    height DECIMAL(5,2),
    graduation TEXT,
    gym_id UUID REFERENCES gyms(id) ON DELETE SET NULL,
    gym_name TEXT,
    professor TEXT,
    city TEXT,
    state CHAR(2),
    country TEXT,
    avatar_url TEXT,
    profile_photo TEXT,
    team TEXT,
    bio TEXT,
    instagram_url TEXT,
    youtube_url TEXT,
    tiktok_url TEXT,
    titles TEXT,
    medals INTEGER DEFAULT 0,
    perfil_publico BOOLEAN DEFAULT TRUE,
    permitir_seguidores BOOLEAN DEFAULT TRUE,
    arena_score DECIMAL(12,2) DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS follows (
    follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type post_type DEFAULT 'text',
    content TEXT,
    media_url TEXT,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS likes (
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS competition_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID,
    athlete_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    placement INTEGER,
    points_earned DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Posts are viewable by everyone" ON posts FOR SELECT USING (true);
CREATE POLICY "Users can create posts" ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update/delete their own posts" ON posts FOR ALL USING (auth.uid() = author_id);`}
                  </pre>
                </div>
              </details>
            </div>

            <button 
              onClick={() => fetchProfileData()}
              className="px-8 py-4 bg-[var(--primary)] text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[var(--primary-highlight)] transition-all shadow-lg shadow-[var(--primary)]/20"
            >
              Já executei o SQL, tentar novamente
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="text-center py-24 space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-[var(--primary)]/10 rounded-full flex items-center justify-center text-[var(--primary)]">
            <User size={40} />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black uppercase italic text-[var(--text-main)]">Perfil não encontrado</h2>
          <p className="text-[var(--text-muted)] text-sm max-w-xs mx-auto">
            {error || 'Não conseguimos localizar os dados do seu perfil de atleta.'}
          </p>
        </div>
        <div className="flex flex-col items-center space-y-4">
          <button 
            onClick={() => fetchProfileData()}
            className="px-8 py-3 bg-[var(--primary)] text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-[var(--primary-highlight)] transition-all"
          >
            Tentar Novamente
          </button>
          {isOwnProfile && (
            <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold">
              Verifique se sua conta foi criada corretamente.
            </p>
          )}
        </div>
      </div>
    );
  }

  const handleFollow = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !profile) return;

      if (isFollowing) {
        const { error } = await supabase
          .from('followers')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profile.id);
        
        if (error) throw error;
        setIsFollowing(false);
        setFollowerCount(prev => prev - 1);
      } else {
        const { error } = await supabase
          .from('followers')
          .insert({
            follower_id: user.id,
            following_id: profile.id
          });
        
        if (error) throw error;
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);

        // Create notification
        await supabase.from('notifications').insert({
          user_id: profile.id,
          actor_id: user.id,
          type: 'follow'
        });
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
    }
  };

  const winRate = (profile && (profile.wins + profile.losses > 0))
    ? Math.round((profile.wins / (profile.wins + profile.losses)) * 100) 
    : 0;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Profile Header */}
      <div className="relative">
        <div className="h-48 md:h-64 bg-[var(--surface)] rounded-3xl overflow-hidden border border-[var(--border-ui)] transition-colors duration-300 relative">
          <div className="w-full h-full flex items-center justify-center bg-[var(--bg)] overflow-hidden">
            {/* Clean background */}
          </div>
          
          {isOwnProfile && !isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="absolute top-4 right-4 bg-black/50 backdrop-blur-md border border-white/10 p-2 rounded-xl text-white hover:bg-[var(--primary)] transition-all z-10"
            >
              <Edit2 size={18} />
            </button>
          )}
        </div>
        
        <div className="absolute -bottom-12 left-0 right-0 px-4 md:px-0 md:left-8 flex flex-col md:flex-row items-center md:items-end space-y-4 md:space-y-0 md:space-x-6">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-[var(--surface)] border-4 border-[var(--bg)] overflow-hidden shadow-2xl transition-colors duration-300 relative group shrink-0">
            {profile.profile_photo || profile.avatar_url ? (
              <img src={profile.profile_photo || profile.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] bg-[var(--primary)]/10">
                <User size={48} />
              </div>
            )}
            {isEditing && (
              <label className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} disabled={uploading} />
                <p className="text-[10px] font-black uppercase text-white">{uploading ? 'Enviando...' : 'Alterar Foto'}</p>
              </label>
            )}
          </div>
          <div className="pb-4 text-center md:text-left flex-1 w-full">
            {isEditing ? (
              <div className="space-y-2 max-w-xs mx-auto md:mx-0">
                <input 
                  value={editData.full_name} 
                  onChange={e => setEditData({...editData, full_name: e.target.value})}
                  className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-lg px-3 py-1 text-xl font-black text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                  placeholder="Nome Completo"
                />
                <input 
                  value={editData.nickname} 
                  onChange={e => setEditData({...editData, nickname: e.target.value})}
                  className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-lg px-3 py-1 text-xs font-bold text-[var(--primary)] outline-none focus:border-[var(--primary)] block"
                  placeholder="Apelido"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <h1 className="text-2xl md:text-4xl font-black text-[var(--text-main)] uppercase tracking-tighter italic break-words">
                  {profile.full_name} {profile.nickname && <span className="text-[var(--text-muted)] text-lg">({profile.nickname})</span>}
                </h1>
                <div className="flex flex-col md:flex-row items-center md:space-x-4 space-y-1 md:space-y-0">
                  <p className="text-[var(--primary)] font-bold text-xs uppercase tracking-widest">@{profile.username} • {profile.modality}</p>
                  <div className="flex items-center space-x-2 text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">
                    <span>{followerCount} Seguidores</span>
                    {profile.team && (
                      <>
                        <span>•</span>
                        <span className="text-[var(--primary)]">{profile.team}</span>
                      </>
                    )}
                  </div>
                </div>
                {(profile.city || profile.state || profile.country) && (
                  <div className="flex items-center justify-center md:justify-start space-x-2 text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest mt-1">
                    <MapPin size={10} />
                    <span>
                      {[profile.city, profile.state, profile.country].filter(Boolean).join(' • ')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {!isOwnProfile && !isEditing && (
            <div className="pb-4">
              <button
                onClick={handleFollow}
                className={`px-8 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  isFollowing 
                    ? 'bg-[var(--surface)] border border-[var(--border-ui)] text-[var(--text-main)] hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/20' 
                    : 'bg-[var(--primary)] text-white hover:bg-[var(--primary-highlight)] shadow-lg shadow-[var(--primary)]/20'
                }`}
              >
                {isFollowing ? 'Seguindo' : 'Seguir'}
              </button>
            </div>
          )}

          {isOwnProfile && !isEditing && (
            <div className="pb-4">
              <button
                onClick={() => setIsRegisterFightModalOpen(true)}
                className="px-6 py-2 bg-[var(--primary)] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[var(--primary-highlight)] transition-all shadow-lg shadow-[var(--primary)]/20 flex items-center space-x-2"
              >
                <Plus size={14} />
                <span>Registrar Luta</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Actions */}
      <AnimatePresence>
        {isEditing && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex justify-end space-x-4 pt-8"
          >
            <button 
              onClick={() => setIsEditing(false)}
              className="px-6 py-2 rounded-xl border border-[var(--border-ui)] text-xs font-black uppercase tracking-widest hover:bg-rose-500/10 hover:text-rose-500 transition-all flex items-center space-x-2"
            >
              <X size={14} />
              <span>Cancelar</span>
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-black uppercase tracking-widest hover:bg-[var(--primary-highlight)] transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={14} />}
              <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-12">
        {[
          { label: 'Arena Score', value: Math.round(profile.arena_score), icon: Award, color: 'text-[var(--primary)]' },
          { label: 'Vitórias', value: profile.wins, icon: Target, color: 'text-blue-500' },
          { label: 'Derrotas', value: profile.losses, icon: X, color: 'text-rose-500' },
          { label: 'Lutas Totais', value: profile.wins + profile.losses, icon: History, color: 'text-zinc-500' },
          { label: 'Taxa de Vitória', value: `${winRate}%`, icon: TrendingUp, color: 'text-purple-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-[var(--surface)] border border-[var(--border-ui)] p-4 rounded-2xl space-y-2 transition-colors duration-300">
            <div className="flex items-center justify-between">
              <stat.icon size={16} className={stat.color} />
              <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">{stat.label}</span>
            </div>
            <p className="text-2xl font-black text-[var(--text-main)]">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Rankings Section */}
      <div className="bg-gradient-to-r from-[var(--primary)]/10 to-transparent border border-[var(--primary)]/20 p-6 rounded-[2rem] space-y-4">
        <div className="flex items-center space-x-3">
          <Trophy size={20} className="text-[var(--primary)]" />
          <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-main)] italic">Rankings Oficiais</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Mundial</p>
            <p className="text-2xl font-black text-[var(--text-main)]">#{rankings.world}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Nacional ({profile.country || 'N/A'})</p>
            <p className="text-2xl font-black text-[var(--text-main)]">#{rankings.national}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Cidade ({profile.city || 'N/A'})</p>
            <p className="text-2xl font-black text-[var(--text-main)]">#{rankings.city}</p>
          </div>
        </div>
      </div>

      {/* Bio & Info */}
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          {/* Basic Info */}
          <div className="bg-[var(--surface)] border border-[var(--border-ui)] p-6 rounded-2xl space-y-4 transition-colors duration-300">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Informações</h3>
            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Bio</label>
                  <textarea 
                    value={editData.bio} 
                    onChange={e => setEditData({...editData, bio: e.target.value})}
                    className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary)] min-h-[100px]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">País</label>
                    <select 
                      value={editData.country || ''} 
                      onChange={e => setEditData({...editData, country: e.target.value, state: ''})}
                      className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                    >
                      <option value="">Selecionar País</option>
                      {countries.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Estado</label>
                    <select 
                      value={editData.state || ''} 
                      onChange={e => setEditData({...editData, state: e.target.value})}
                      disabled={!editData.country}
                      className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary)] disabled:opacity-50"
                    >
                      <option value="">Selecionar Estado</option>
                      {countries.find(c => c.name === editData.country)?.states.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{profile.bio || 'Nenhuma biografia disponível.'}</p>
                <div className="space-y-3 pt-4 border-t border-[var(--border-ui)]">
                  <div className="flex items-center space-x-3 text-[var(--text-muted)]">
                    <MapPin size={14} />
                    <span className="text-xs font-bold">{profile.state ? `${profile.state}` : ''}{profile.country ? ` • ${profile.country}` : ''}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-[var(--text-muted)]">
                    <Calendar size={14} />
                    <span className="text-xs font-bold">Desde {new Date(profile.created_at).getFullYear()}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Social Media */}
          <div className="bg-[var(--surface)] border border-[var(--border-ui)] p-6 rounded-2xl space-y-4 transition-colors duration-300">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Redes Sociais</h3>
            {isEditing ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Instagram size={16} className="text-pink-500" />
                  <input 
                    value={editData.instagram_url} 
                    onChange={e => setEditData({...editData, instagram_url: e.target.value})}
                    placeholder="Instagram URL"
                    className="flex-1 bg-[var(--bg)] border border-[var(--border-ui)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Youtube size={16} className="text-red-500" />
                  <input 
                    value={editData.youtube_url} 
                    onChange={e => setEditData({...editData, youtube_url: e.target.value})}
                    placeholder="YouTube URL"
                    className="flex-1 bg-[var(--bg)] border border-[var(--border-ui)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Music size={16} className="text-zinc-400" />
                  <input 
                    value={editData.tiktok_url} 
                    onChange={e => setEditData({...editData, tiktok_url: e.target.value})}
                    placeholder="TikTok URL"
                    className="flex-1 bg-[var(--bg)] border border-[var(--border-ui)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                  />
                </div>
              </div>
            ) : (
              <div className="flex space-x-4">
                {profile.instagram_url && (
                  <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-pink-500/10 text-pink-500 rounded-xl hover:bg-pink-500 hover:text-white transition-all">
                    <Instagram size={20} />
                  </a>
                )}
                {profile.youtube_url && (
                  <a href={profile.youtube_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                    <Youtube size={20} />
                  </a>
                )}
                {profile.tiktok_url && (
                  <a href={profile.tiktok_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-zinc-500/10 text-[var(--text-main)] rounded-xl hover:bg-zinc-500 hover:text-white transition-all">
                    <Music size={20} />
                  </a>
                )}
                {!profile.instagram_url && !profile.youtube_url && !profile.tiktok_url && (
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Nenhuma rede vinculada</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          {/* Sports Info Section */}
          <div className="bg-[var(--surface)] border border-[var(--border-ui)] p-6 rounded-2xl space-y-6 transition-colors duration-300">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Informações Esportivas</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-[var(--text-muted)]">
                  <Trophy size={12} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Modalidade</span>
                </div>
                {isEditing ? (
                  <div className="space-y-2">
                    <select 
                      value={modalities.includes(editData.modality || '') ? editData.modality : 'Outros'} 
                      onChange={e => {
                        const val = e.target.value;
                        if (val === 'Outros') {
                          setEditData({...editData, modality: ''});
                        } else {
                          setEditData({...editData, modality: val});
                        }
                      }}
                      className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-lg px-2 py-1 text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                    >
                      {modalities.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    {(!modalities.includes(editData.modality || '') || editData.modality === 'Outros') && (
                      <input 
                        value={editData.modality === 'Outros' ? '' : editData.modality} 
                        onChange={e => setEditData({...editData, modality: e.target.value})}
                        placeholder="Digite sua modalidade"
                        className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-lg px-2 py-1 text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                      />
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-bold text-[var(--text-main)]">{profile.modality || '-'}</p>
                )}
              </div>

              {[
                { label: 'Equipe / Team', value: profile.team, icon: Award, key: 'team' },
                { label: 'Categoria', value: profile.category, icon: Target, key: 'category' },
                { label: 'Peso', value: profile.weight ? `${profile.weight}kg` : '-', icon: Scale, key: 'weight' },
                { label: 'Altura', value: profile.height ? `${profile.height}m` : '-', icon: Ruler, key: 'height' },
                { label: 'Graduação', value: profile.graduation, icon: GraduationCap, key: 'graduation' },
                { label: 'Professor', value: profile.professor, icon: User, key: 'professor' },
                { label: 'Academia', value: profile.gym_name, icon: Dumbbell, key: 'gym_name' },
              ].map((info, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center space-x-2 text-[var(--text-muted)]">
                    <info.icon size={12} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{info.label}</span>
                  </div>
                  {isEditing ? (
                    <input 
                      value={(editData[info.key as keyof ArenaProfile] as string) || ''} 
                      onChange={e => setEditData({...editData, [info.key]: e.target.value})}
                      className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-lg px-2 py-1 text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                    />
                  ) : (
                    <p className="text-sm font-bold text-[var(--text-main)]">{(info.value as string) || '-'}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[var(--border-ui)] space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Títulos & Conquistas</h4>
              {isEditing ? (
                <textarea 
                  value={editData.titles} 
                  onChange={e => setEditData({...editData, titles: e.target.value})}
                  className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary)] min-h-[80px]"
                  placeholder="Liste seus principais títulos..."
                />
              ) : (
                <p className="text-sm text-[var(--text-muted)]">{profile.titles || 'Nenhum título registrado.'}</p>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-8 border-b border-[var(--border-ui)] transition-colors duration-300">
            <button
              onClick={() => setActiveTab('posts')}
              className={`pb-4 text-xs font-black uppercase tracking-widest transition-colors relative ${
                activeTab === 'posts' ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Postagens
              {activeTab === 'posts' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]" />}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-4 text-xs font-black uppercase tracking-widest transition-colors relative ${
                activeTab === 'history' ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Histórico
              {activeTab === 'history' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]" />}
            </button>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === 'posts' ? (
              <div className="grid grid-cols-2 gap-4">
                {posts.length > 0 ? posts.map((post) => (
                  <div 
                    key={post.id} 
                    onClick={() => {
                      setSelectedPost({ ...post, author: profile || undefined });
                      setIsPostModalOpen(true);
                    }}
                    className="aspect-square bg-[var(--surface)] rounded-xl overflow-hidden border border-[var(--border-ui)] group relative cursor-pointer transition-colors duration-300"
                  >
                    {post.media_url ? (
                      <img src={post.media_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full p-4 flex items-center justify-center text-center">
                        <p className="text-[10px] text-[var(--text-muted)] line-clamp-3">{post.content}</p>
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="col-span-2 py-12 text-center text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">Nenhuma postagem ainda</div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {results.length > 0 ? results.map((result) => (
                  <div key={result.id} className="bg-[var(--surface)] border border-[var(--border-ui)] p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors duration-300">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs ${
                        result.placement === 1 ? 'bg-yellow-500 text-black' :
                        result.placement === 2 ? 'bg-zinc-300 text-black' :
                        result.placement === 3 ? 'bg-amber-700 text-white' :
                        'bg-[var(--bg)] text-[var(--text-muted)]'
                      }`}>
                        {result.placement === 0 ? 'P' : `${result.placement}º`}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[var(--text-main)]">{result.competition?.name}</h4>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">
                          {new Date(result.competition?.date || '').toLocaleDateString()} • {result.competition?.level}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[var(--primary)] font-black text-sm">+{Math.round(result.points_earned)}</p>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Arena Score</p>
                    </div>
                  </div>
                )) : (
                  <div className="py-12 text-center text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">Nenhum resultado registrado</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {isPostModalOpen && selectedPost && (
        <PostModal 
          post={selectedPost} 
          onClose={() => setIsPostModalOpen(false)} 
          onLike={handleLike}
        />
      )}

      {isRegisterFightModalOpen && profile && (
        <RegisterFightModal
          isOpen={isRegisterFightModalOpen}
          onClose={() => setIsRegisterFightModalOpen(false)}
          athleteId={profile.id}
          onFightRegistered={fetchProfileData}
        />
      )}
    </div>
  );
};
