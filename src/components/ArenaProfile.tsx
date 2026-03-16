import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, Target, TrendingUp, Grid, History, MapPin, Calendar, 
  Settings, Edit2, Save, X, Instagram, Youtube, Music, 
  User, Dumbbell, Ruler, Scale, GraduationCap, Trophy,
  Database, Plus, Trash2, MoreVertical, Archive, RotateCcw, Heart, MessageCircle, Share2,
  Brain, Zap, Cpu, BarChart3, Shield, Info, Wallet
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { ArenaProfile, ArenaResult, ArenaPost, ArenaChampionshipResult, ArenaFight, Team } from '../types';
import { countries, modalities } from '../utils/data';
import { PostModal } from './PostModal';
import { RegisterFightModal } from './RegisterFightModal';
import { RegisterChampionshipModal } from './RegisterChampionshipModal';
import { getAthleteRankings, searchTeams, getTeams } from '../services/arenaService';

export const ArenaProfileView: React.FC<{ userId?: string; username?: string; forceEdit?: boolean }> = ({ userId, username, forceEdit }) => {
  const [profile, setProfile] = useState<ArenaProfile | null>(null);
  const [results, setResults] = useState<ArenaResult[]>([]);
  const [championships, setChampionships] = useState<ArenaChampionshipResult[]>([]);
  const [fights, setFights] = useState<ArenaFight[]>([]);
  const [posts, setPosts] = useState<ArenaPost[]>([]);
  const [archivedPosts, setArchivedPosts] = useState<ArenaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'history' | 'championships' | 'fights' | 'archive' | 'intelligence'>('posts');
  const [isEditing, setIsEditing] = useState(forceEdit || false);
  const [editData, setEditData] = useState<Partial<ArenaProfile>>({});
  const [saving, setSaving] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ArenaPost | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [modalInitialEditMode, setModalInitialEditMode] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isEditingPost, setIsEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editHashtags, setEditHashtags] = useState('');
  const [isRegisterFightModalOpen, setIsRegisterFightModalOpen] = useState(false);
  const [isRegisterChampionshipModalOpen, setIsRegisterChampionshipModalOpen] = useState(false);
  const [editingChampionship, setEditingChampionship] = useState<ArenaChampionshipResult | null>(null);
  const [editingFight, setEditingFight] = useState<ArenaFight | null>(null);
  const [rankings, setRankings] = useState({ world: 0, national: 0, city: 0 });
  
  const [allTeams, setAllTeams] = useState<Team[]>([]);

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

      // Fetch Championship Results
      const { data: champData } = await supabase
        .from('championship_results')
        .select('*')
        .eq('athlete_id', targetId)
        .order('data_evento', { ascending: false });
      
      setChampionships(champData || []);

      // Fetch Fights
      const { data: fightsData } = await supabase
        .from('fights')
        .select('*')
        .eq('athlete_id', targetId)
        .order('data_luta', { ascending: false });
      
      setFights(fightsData || []);

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
      
      setPosts(postsWithLikes.filter(p => !p.is_archived));
      setArchivedPosts(postsWithLikes.filter(p => p.is_archived));

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
    const fetchAllTeams = async () => {
      try {
        const data = await getTeams();
        setAllTeams(data);
      } catch (err) {
        console.error('Error fetching teams:', err);
      }
    };
    fetchAllTeams();
  }, [userId, forceEdit]);

  const handleArchive = async (postId: string, archive: boolean = true) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ is_archived: archive })
        .eq('id', postId);
      
      if (error) throw error;
      
      if (archive) {
        const postToArchive = posts.find(p => p.id === postId);
        if (postToArchive) {
          setPosts(prev => prev.filter(p => p.id !== postId));
          setArchivedPosts(prev => [{ ...postToArchive, is_archived: true }, ...prev]);
        }
      } else {
        const postToRestore = archivedPosts.find(p => p.id === postId);
        if (postToRestore) {
          setArchivedPosts(prev => prev.filter(p => p.id !== postId));
          setPosts(prev => [{ ...postToRestore, is_archived: false }, ...prev]);
        }
      }
      setActiveMenuId(null);
    } catch (error) {
      console.error('Error archiving post:', error);
      alert('Erro ao arquivar postagem.');
    }
  };

  const handleDeletePost = async (postId: string, mediaUrls?: string[]) => {
    if (!window.confirm('Tem certeza que deseja excluir este post? Essa ação não poderá ser desfeita.')) return;

    try {
      if (mediaUrls && mediaUrls.length > 0) {
        for (const url of mediaUrls) {
          const path = url.split('/').pop();
          if (path) {
            await supabase.storage.from('posts').remove([path]);
          }
        }
      }

      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);
      
      if (error) throw error;
      setPosts(prev => prev.filter(p => p.id !== postId));
      setArchivedPosts(prev => prev.filter(p => p.id !== postId));
      setActiveMenuId(null);
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Erro ao excluir postagem.');
    }
  };

  const handleUpdatePost = async (postId: string, content: string, hashtags: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ 
          content: content,
          hashtags: hashtags
        })
        .eq('id', postId);
      
      if (error) throw error;
      
      const updateFn = (p: ArenaPost) => p.id === postId ? { ...p, content: content, hashtags: hashtags } : p;
      setPosts(prev => prev.map(updateFn));
      setArchivedPosts(prev => prev.map(updateFn));
      setIsEditingPost(null);
    } catch (error) {
      console.error('Error updating post:', error);
      alert('Erro ao atualizar postagem.');
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      // Create a clean object with only the fields we want to update
      // Standardize text to uppercase
      const updatePayload: any = {
        full_name: editData.full_name?.toUpperCase(),
        nickname: editData.nickname?.toUpperCase(),
        bio: editData.bio?.toUpperCase(),
        state: editData.state?.toUpperCase(),
        country: editData.country?.toUpperCase(),
        modality: editData.modality?.toUpperCase(),
        category: editData.category?.toUpperCase(),
        weight: editData.weight ? parseFloat(String(editData.weight).replace(',', '.')) : null,
        height: editData.height ? parseFloat(String(editData.height).replace(',', '.')) : null,
        graduation: editData.graduation?.toUpperCase(),
        gym_name: editData.gym_name?.toUpperCase(),
        professor: editData.professor?.toUpperCase(),
        instagram_url: editData.instagram_url,
        youtube_url: editData.youtube_url,
        tiktok_url: editData.tiktok_url,
        titles: editData.titles?.toUpperCase(),
        team: editData.team?.toUpperCase(),
        team_id: editData.team_id,
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
    total_fights INTEGER DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    opponent_name TEXT NOT NULL,
    modalidade TEXT NOT NULL,
    resultado TEXT CHECK (resultado IN ('win', 'loss')),
    tipo_vitoria TEXT CHECK (tipo_vitoria IN ('pontos', 'finalização', 'nocaute', 'decisão', 'outro')),
    evento TEXT NOT NULL,
    cidade TEXT NOT NULL,
    pais TEXT NOT NULL,
    data_luta DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
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

CREATE TABLE IF NOT EXISTS championship_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    championship_name TEXT NOT NULL,
    modalidade TEXT NOT NULL,
    categoria_idade TEXT NOT NULL,
    faixa TEXT,
    peso TEXT,
    cidade TEXT NOT NULL,
    pais TEXT NOT NULL,
    data_evento DATE NOT NULL,
    resultado TEXT CHECK (resultado IN ('Campeão', 'Vice-campeão', 'Terceiro lugar', 'Participação')),
    foto_podio_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE fights ENABLE ROW LEVEL SECURITY;
ALTER TABLE championship_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Posts are viewable by everyone" ON posts FOR SELECT USING (true);
CREATE POLICY "Users can create posts" ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update/delete their own posts" ON posts FOR ALL USING (auth.uid() = author_id);

CREATE POLICY "Fights are viewable by everyone" ON fights FOR SELECT USING (true);
CREATE POLICY "Users can insert their own fights" ON fights FOR INSERT WITH CHECK (auth.uid() = athlete_id);
CREATE POLICY "Users can update/delete their own fights" ON fights FOR ALL USING (auth.uid() = athlete_id);

CREATE POLICY "Championship results are viewable by everyone" ON championship_results FOR SELECT USING (true);
CREATE POLICY "Users can insert their own championship results" ON championship_results FOR INSERT WITH CHECK (auth.uid() = athlete_id);
CREATE POLICY "Users can update/delete their own championship results" ON championship_results FOR ALL USING (auth.uid() = athlete_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_arena_score ON profiles(arena_score DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(city);
CREATE INDEX IF NOT EXISTS idx_profiles_country ON profiles(country);
CREATE INDEX IF NOT EXISTS idx_championship_results_athlete_id ON championship_results(athlete_id);`}
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

  const totalFights = profile ? (profile.total_fights || (profile.wins + profile.losses)) : 0;
  const winRate = profile ? (profile.win_rate !== undefined ? Math.round(profile.win_rate) : (totalFights > 0 ? Math.round((profile.wins / totalFights) * 100) : 0)) : 0;

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
                  {profile.wallet_address && (
                    <div className="flex items-center space-x-1 bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <Wallet size={10} />
                      <span className="text-[8px] font-black uppercase tracking-widest">Web3 Verified</span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">
                    <span>{followerCount} Seguidores</span>
                    {profile.team && (
                      <>
                        <span className="hidden md:inline">•</span>
                        <span className="text-[var(--primary)] font-bold">Equipe: {profile.team}</span>
                      </>
                    )}
                  </div>
                </div>
                {(profile.city || profile.state || profile.country) && (
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest mt-1">
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
            <div className="pb-4 flex flex-wrap gap-2">
              <button
                onClick={() => setIsRegisterFightModalOpen(true)}
                className="px-6 py-2 bg-[var(--surface)] border border-[var(--border-ui)] text-[var(--text-main)] rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[var(--primary)]/10 transition-all flex items-center space-x-2"
              >
                <Plus size={14} />
                <span>Registrar Luta</span>
              </button>
              <button
                onClick={() => setIsRegisterChampionshipModalOpen(true)}
                className="px-6 py-2 bg-[var(--primary)] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[var(--primary-highlight)] transition-all shadow-lg shadow-[var(--primary)]/20 flex items-center space-x-2"
              >
                <Trophy size={14} />
                <span>Registrar Campeonato</span>
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
            className="flex flex-col sm:flex-row justify-end gap-4 pt-8"
          >
            <button 
              onClick={() => setIsEditing(false)}
              className="w-full sm:w-auto px-6 py-2 rounded-xl border border-[var(--border-ui)] text-xs font-black uppercase tracking-widest hover:bg-rose-500/10 hover:text-rose-500 transition-all flex items-center justify-center space-x-2"
            >
              <X size={14} />
              <span>Cancelar</span>
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto px-6 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-black uppercase tracking-widest hover:bg-[var(--primary-highlight)] transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={14} />}
              <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 pt-12">
        {[
          { label: 'Arena Score', value: Math.round(profile.arena_score), icon: Award, color: 'text-[var(--primary)]' },
          { label: 'Vitórias', value: profile.wins, icon: Target, color: 'text-blue-500' },
          { label: 'Derrotas', value: profile.losses, icon: X, color: 'text-rose-500' },
          { label: 'Lutas Totais', value: totalFights, icon: History, color: 'text-zinc-500' },
          { label: 'Taxa de Vitória', value: `${winRate}%`, icon: TrendingUp, color: 'text-purple-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-[var(--surface)] border border-[var(--border-ui)] p-4 rounded-2xl space-y-2 transition-colors duration-300">
            <div className="flex items-center justify-between">
              <stat.icon size={16} className={stat.color} />
              <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">{stat.label}</span>
            </div>
            <p className="text-2xl font-extrabold text-[var(--text-main)]">{stat.value}</p>
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
            <p className="text-2xl font-extrabold text-[var(--text-main)]">#{rankings.world}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Nacional ({profile.country || 'N/A'})</p>
            <p className="text-2xl font-extrabold text-[var(--text-main)]">#{rankings.national}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Cidade ({profile.city || 'N/A'})</p>
            <p className="text-2xl font-extrabold text-[var(--text-main)]">#{rankings.city}</p>
          </div>
        </div>
      </div>

      {/* Bio & Info */}
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          {/* Basic Info */}
          <div className="bg-[var(--surface)] border border-[var(--border-ui)] p-6 rounded-2xl space-y-4 transition-colors duration-300 overflow-hidden">
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
                <p className="text-sm text-[var(--text-muted)] leading-relaxed break-words">{profile.bio || 'Nenhuma biografia disponível.'}</p>
                <div className="space-y-3 pt-4 border-t border-[var(--border-ui)]">
                  <div className="flex items-center space-x-3 text-[var(--text-muted)]">
                    <MapPin size={14} />
                    <span className="text-xs font-bold break-words">{profile.state ? `${profile.state}` : ''}{profile.country ? ` • ${profile.country}` : ''}</span>
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
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
                { label: 'Peso', value: profile.weight ? `${String(profile.weight).replace('.', ',')}kg` : '-', icon: Scale, key: 'weight' },
                { label: 'Altura', value: profile.height ? `${String(profile.height).replace('.', ',')}m` : '-', icon: Ruler, key: 'height' },
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
                    info.key === 'team' ? (
                      <>
                        <select 
                          value={editData.team_id || ''}
                          onChange={(e) => {
                            if (e.target.value === 'other') {
                              setEditData({
                                ...editData,
                                team: '',
                                team_id: 'other'
                              });
                              return;
                            }
                            const selectedTeam = allTeams.find(t => t.id === e.target.value);
                            if (selectedTeam) {
                              setEditData({
                                ...editData,
                                team: selectedTeam.name,
                                team_id: selectedTeam.id
                              });
                            } else {
                              setEditData({
                                ...editData,
                                team: '',
                                team_id: undefined
                              });
                            }
                          }}
                          className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-lg px-2 py-1 text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                        >
                          <option value="">Selecionar Equipe</option>
                          {allTeams.map(team => (
                            <option key={team.id} value={team.id}>
                              {team.name} ({team.city})
                            </option>
                          ))}
                          <option value="other">Outra Equipe (Não listada)</option>
                        </select>
                        {editData.team_id === 'other' && (
                          <input 
                            placeholder="Digite o nome da sua equipe"
                            value={editData.team || ''}
                            onChange={e => setEditData({...editData, team: e.target.value})}
                            className="mt-2 w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-lg px-2 py-1 text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                          />
                        )}
                      </>
                    ) : (
                      <input 
                        value={(editData[info.key as keyof ArenaProfile] as string) || ''} 
                        onChange={e => setEditData({...editData, [info.key]: e.target.value})}
                        className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-lg px-2 py-1 text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                      />
                    )
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
          <div className="flex flex-wrap gap-x-8 gap-y-4 border-b border-[var(--border-ui)] transition-colors duration-300">
            <button
              onClick={() => setActiveTab('posts')}
              className={`pb-4 text-xs font-black uppercase tracking-widest transition-colors relative whitespace-nowrap ${
                activeTab === 'posts' ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Postagens
              {activeTab === 'posts' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]" />}
            </button>
            <button
              onClick={() => setActiveTab('intelligence')}
              className={`pb-4 text-xs font-black uppercase tracking-widest transition-colors relative whitespace-nowrap flex items-center space-x-2 ${
                activeTab === 'intelligence' ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <Brain size={14} />
              <span>Arena Intelligence</span>
              {activeTab === 'intelligence' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]" />}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-4 text-xs font-black uppercase tracking-widest transition-colors relative whitespace-nowrap ${
                activeTab === 'history' ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Histórico
              {activeTab === 'history' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]" />}
            </button>
            <button
              onClick={() => setActiveTab('championships')}
              className={`pb-4 text-xs font-black uppercase tracking-widest transition-colors relative whitespace-nowrap ${
                activeTab === 'championships' ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Campeonatos
              {activeTab === 'championships' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]" />}
            </button>
            <button
              onClick={() => setActiveTab('fights')}
              className={`pb-4 text-xs font-black uppercase tracking-widest transition-colors relative whitespace-nowrap ${
                activeTab === 'fights' ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Lutas
              {activeTab === 'fights' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]" />}
            </button>
            {isOwnProfile && (
              <button
                onClick={() => setActiveTab('archive')}
                className={`pb-4 text-xs font-black uppercase tracking-widest transition-colors relative whitespace-nowrap ${
                  activeTab === 'archive' ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Arquivo
                {activeTab === 'archive' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]" />}
              </button>
            )}
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === 'intelligence' ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* AI Analysis Header */}
                <div className="bg-gradient-to-br from-[var(--primary)] to-indigo-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-[var(--primary)]/20">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/20 rounded-full blur-2xl -ml-24 -mb-24" />
                  
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
                          <Brain size={24} className="text-white" />
                        </div>
                        <h2 className="text-xl font-black uppercase tracking-tighter italic">Arena Intelligence Analysis</h2>
                      </div>
                      <p className="text-white/80 text-sm max-w-xl font-medium leading-relaxed">
                        Nossa inteligência artificial analisa cada movimento, vitória e derrota para fornecer insights estratégicos sobre sua evolução na Arena.
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-center px-6 py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Confiança IA</p>
                        <p className="text-2xl font-black">94%</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-[var(--surface)] border border-[var(--border-ui)] p-6 rounded-3xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="p-2 bg-emerald-500/10 rounded-xl">
                        <TrendingUp size={18} className="text-emerald-500" />
                      </div>
                      <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Evolução Mensal</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-3xl font-black text-[var(--text-main)]">+{Math.round(profile.arena_score * 0.15)}</p>
                      <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center space-x-1">
                        <span>Crescimento de 15.4%</span>
                      </p>
                    </div>
                  </div>

                  <div className="bg-[var(--surface)] border border-[var(--border-ui)] p-6 rounded-3xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="p-2 bg-blue-500/10 rounded-xl">
                        <Target size={18} className="text-blue-500" />
                      </div>
                      <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Precisão Técnica</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-3xl font-black text-[var(--text-main)]">82%</p>
                      <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Baseado em finalizações</p>
                    </div>
                  </div>

                  <div className="bg-[var(--surface)] border border-[var(--border-ui)] p-6 rounded-3xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="p-2 bg-purple-500/10 rounded-xl">
                        <Zap size={18} className="text-purple-500" />
                      </div>
                      <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Potencial Arena</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-3xl font-black text-[var(--text-main)]">Elite</p>
                      <p className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">Top 5% da categoria</p>
                    </div>
                  </div>
                </div>

                {/* Detailed Insights */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-[var(--surface)] border border-[var(--border-ui)] p-8 rounded-[2.5rem] space-y-6">
                    <div className="flex items-center space-x-3">
                      <BarChart3 size={20} className="text-[var(--primary)]" />
                      <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-main)]">Pontos Fortes</h3>
                    </div>
                    <div className="space-y-4">
                      {[
                        { label: 'Volume de Luta', value: 92, color: 'bg-emerald-500' },
                        { label: 'Resistência Física', value: 85, color: 'bg-blue-500' },
                        { label: 'Técnica de Solo', value: 78, color: 'bg-[var(--primary)]' },
                      ].map((skill, i) => (
                        <div key={i} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{skill.label}</span>
                            <span className="text-[10px] font-black text-[var(--text-main)]">{skill.value}%</span>
                          </div>
                          <div className="h-1.5 bg-[var(--bg)] rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${skill.value}%` }}
                              transition={{ duration: 1, delay: i * 0.2 }}
                              className={`h-full ${skill.color}`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[var(--surface)] border border-[var(--border-ui)] p-8 rounded-[2.5rem] space-y-6">
                    <div className="flex items-center space-x-3">
                      <Shield size={20} className="text-amber-500" />
                      <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-main)]">Recomendações IA</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="p-4 bg-[var(--bg)] rounded-2xl border border-[var(--border-ui)] flex items-start space-x-4">
                        <div className="p-2 bg-amber-500/10 rounded-lg shrink-0">
                          <Info size={14} className="text-amber-500" />
                        </div>
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                          <span className="font-black text-[var(--text-main)] uppercase block mb-1">Ajuste de Estratégia</span>
                          Seu volume de vitórias por pontos é alto, mas aumentar a taxa de finalizações pode acelerar seu ganho de Arena Score em até 25%.
                        </p>
                      </div>
                      <div className="p-4 bg-[var(--bg)] rounded-2xl border border-[var(--border-ui)] flex items-start space-x-4">
                        <div className="p-2 bg-blue-500/10 rounded-lg shrink-0">
                          <Trophy size={14} className="text-blue-500" />
                        </div>
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                          <span className="font-black text-[var(--text-main)] uppercase block mb-1">Próximo Nível</span>
                          Você está a apenas 150 pontos de subir para o próximo escalão do ranking nacional. Focar em campeonatos de nível 'A' é o caminho mais rápido.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'posts' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {posts.length > 0 ? posts.map((post) => (
                    <div 
                      key={post.id} 
                      onClick={() => {
                        setSelectedPost({ ...post, author: profile || undefined });
                        setModalInitialEditMode(false);
                        setIsPostModalOpen(true);
                      }}
                      className="aspect-[9/16] bg-[var(--surface)] rounded-xl overflow-hidden border border-[var(--border-ui)] group relative cursor-pointer transition-colors duration-300"
                    >
                      {isOwnProfile && (
                        <div className="absolute top-2 right-2 z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === post.id ? null : post.id);
                            }}
                            className="p-1.5 bg-black/40 backdrop-blur-md rounded-lg text-white hover:bg-black/60 transition-colors"
                          >
                            <MoreVertical size={14} />
                          </button>
                          
                          <AnimatePresence>
                            {activeMenuId === post.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className="absolute right-0 mt-1 w-40 bg-[var(--surface)] border border-[var(--border-ui)] rounded-xl shadow-2xl overflow-hidden z-50"
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPost({ ...post, author: profile || undefined });
                                    setModalInitialEditMode(true);
                                    setIsPostModalOpen(true);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full flex items-center space-x-2 px-3 py-2 text-[10px] font-bold text-[var(--text-main)] hover:bg-[var(--primary)]/10 transition-colors border-b border-[var(--border-ui)]"
                                >
                                  <Edit2 size={12} className="text-[var(--primary)]" />
                                  <span>Editar</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleArchive(post.id);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full flex items-center space-x-2 px-3 py-2 text-[10px] font-bold text-[var(--text-main)] hover:bg-[var(--primary)]/10 transition-colors border-b border-[var(--border-ui)]"
                                >
                                  <Archive size={12} className="text-amber-500" />
                                  <span>Arquivar</span>
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
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full flex items-center space-x-2 px-3 py-2 text-[10px] font-bold text-rose-500 hover:bg-rose-500/10 transition-colors"
                                >
                                  <Trash2 size={12} />
                                  <span>Excluir</span>
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                      {post.media_url ? (
                        (() => {
                          let url = '';
                          try {
                            if (post.media_url.startsWith('[')) url = JSON.parse(post.media_url)[0];
                            else url = post.media_url;
                          } catch (e) { url = post.media_url; }
                          
                          return post.type === 'video' ? (
                            <div className="w-full h-full relative">
                              <video src={url} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                            </div>
                          ) : (
                            <img src={url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                          );
                        })()
                      ) : (
                        <div className="w-full h-full p-4 flex items-center justify-center text-center">
                          <p className="text-[10px] text-[var(--text-muted)] line-clamp-6">{post.content}</p>
                        </div>
                      )}
                    </div>
                )) : (
                  <div className="col-span-2 py-12 text-center text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">Nenhuma postagem ainda</div>
                )}
              </div>
            ) : activeTab === 'history' ? (
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
            ) : activeTab === 'fights' ? (
              <div className="space-y-4">
                {fights.length > 0 ? fights.map((fight) => (
                  <div key={fight.id} className="bg-[var(--surface)] border border-[var(--border-ui)] p-6 rounded-[2rem] transition-colors duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          fight.resultado === 'win' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                        }`}>
                          {fight.resultado === 'win' ? <Trophy size={16} /> : <Target size={16} />}
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Oponente</p>
                          <h4 className="font-bold text-sm text-[var(--text-main)]">{fight.opponent_name}</h4>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          fight.resultado === 'win' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                        }`}>
                          {fight.resultado === 'win' ? 'Vitória' : 'Derrota'}
                        </div>
                        {isOwnProfile && (
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => {
                                setEditingFight(fight);
                                setIsRegisterFightModalOpen(true);
                              }}
                              className="p-2 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setEditingFight(fight);
                                setIsRegisterFightModalOpen(true);
                                // The modal will handle the delete confirmation
                              }}
                              className="p-2 text-[var(--text-muted)] hover:text-rose-500 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-[var(--border-ui)]">
                      <div className="space-y-1">
                        <p className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-widest">Modalidade</p>
                        <p className="text-xs font-bold text-[var(--text-main)]">{fight.modalidade}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-widest">Tipo</p>
                        <p className="text-xs font-bold text-[var(--text-main)] capitalize">{fight.tipo_vitoria}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-widest">Evento</p>
                        <p className="text-xs font-bold text-[var(--text-main)] truncate">{fight.evento || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-widest">Data</p>
                        <p className="text-xs font-bold text-[var(--text-main)]">{new Date(fight.data_luta).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="py-12 text-center text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">Nenhuma luta registrada</div>
                )}
              </div>
            ) : activeTab === 'archive' && isOwnProfile ? (
              <div className="grid grid-cols-2 gap-4">
                {archivedPosts.length > 0 ? archivedPosts.map((post) => (
                  <div 
                    key={post.id} 
                    onClick={() => {
                      setSelectedPost(post);
                      setIsPostModalOpen(true);
                    }}
                    className="aspect-[9/16] rounded-[2rem] overflow-hidden bg-black relative group cursor-pointer border border-[var(--border-ui)]"
                  >
                    {post.media_url ? (
                      (() => {
                        let url = '';
                        try {
                          if (post.media_url.startsWith('[')) url = JSON.parse(post.media_url)[0];
                          else url = post.media_url;
                        } catch (e) { url = post.media_url; }
                        
                        return post.type === 'video' ? (
                          <video src={url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                        ) : (
                          <img src={url} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                        );
                      })()
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-4 bg-[var(--surface)]">
                        <p className="text-[10px] font-bold text-[var(--text-main)] text-center line-clamp-3">{post.content}</p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-4">
                      <div className="flex items-center space-x-1 text-white">
                        <Heart size={16} className="fill-current" />
                        <span className="text-xs font-black">{post.likes_count}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-white">
                        <MessageCircle size={16} className="fill-current" />
                        <span className="text-xs font-black">{post.comments_count}</span>
                      </div>
                    </div>
                    <div className="absolute top-4 right-4 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === post.id ? null : post.id);
                        }}
                        className="p-1.5 bg-amber-500 text-white rounded-lg shadow-lg hover:bg-amber-600 transition-colors"
                      >
                        {activeMenuId === post.id ? <X size={12} /> : <Archive size={12} />}
                      </button>
                      
                      <AnimatePresence>
                        {activeMenuId === post.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="absolute right-0 mt-1 w-40 bg-[var(--surface)] border border-[var(--border-ui)] rounded-xl shadow-2xl overflow-hidden z-50"
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchive(post.id, false);
                                setActiveMenuId(null);
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-2 text-[10px] font-bold text-[var(--text-main)] hover:bg-[var(--primary)]/10 transition-colors border-b border-[var(--border-ui)]"
                            >
                              <RotateCcw size={12} className="text-[var(--primary)]" />
                              <span>Restaurar</span>
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
                                setActiveMenuId(null);
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-2 text-[10px] font-bold text-rose-500 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 size={12} />
                              <span>Excluir</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-2 py-12 text-center text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">Nenhuma postagem arquivada</div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {championships.length > 0 ? championships.map((champ) => (
                  <div key={champ.id} className="bg-[var(--surface)] border border-[var(--border-ui)] rounded-[2rem] overflow-hidden transition-colors duration-300">
                    <div className="flex flex-col md:flex-row">
                      {champ.foto_podio_url && (
                        <div className="w-full md:w-48 h-48 md:h-auto overflow-hidden flex-shrink-0">
                          <img src={champ.foto_podio_url} alt="Pódio" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      )}
                      <div className="p-6 flex-1 space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="space-y-1">
                            <h4 className="text-lg font-black text-[var(--text-main)] uppercase italic tracking-tighter">{champ.championship_name}</h4>
                            <div className="flex items-center space-x-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                              <Calendar size={12} />
                              <span>{new Date(champ.data_evento).toLocaleDateString()}</span>
                              <span>•</span>
                              <MapPin size={12} />
                              <span>{champ.cidade}, {champ.pais}</span>
                            </div>
                          </div>
                          <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            champ.resultado === 'Campeão' ? 'bg-yellow-500 text-black' :
                            champ.resultado === 'Vice-campeão' ? 'bg-zinc-300 text-black' :
                            champ.resultado === 'Terceiro lugar' ? 'bg-amber-700 text-white' :
                            'bg-[var(--bg)] text-[var(--text-muted)]'
                          }`}>
                            {champ.resultado}
                          </div>
                          {isOwnProfile && (
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => {
                                  setEditingChampionship(champ);
                                  setIsRegisterChampionshipModalOpen(true);
                                }}
                                className="p-2 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                                title="Editar"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingChampionship(champ);
                                  setIsRegisterChampionshipModalOpen(true);
                                  // The modal will handle the delete confirmation
                                }}
                                className="p-2 text-[var(--text-muted)] hover:text-rose-500 transition-colors"
                                title="Excluir"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <p className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-widest">Modalidade</p>
                            <p className="text-xs font-bold text-[var(--text-main)]">{champ.modalidade}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-widest">Categoria</p>
                            <p className="text-xs font-bold text-[var(--text-main)]">{champ.categoria_idade}</p>
                          </div>
                          {champ.faixa && (
                            <div className="space-y-1">
                              <p className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-widest">Faixa</p>
                              <p className="text-xs font-bold text-[var(--text-main)]">{champ.faixa}</p>
                            </div>
                          )}
                          <div className="space-y-1">
                            <p className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-widest">Peso</p>
                            <p className="text-xs font-bold text-[var(--text-main)]">{champ.peso}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="py-12 text-center text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">Nenhum campeonato registrado</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {isPostModalOpen && selectedPost && (
        <PostModal 
          post={selectedPost} 
          onClose={() => {
            setIsPostModalOpen(false);
            setSelectedPost(null);
            setModalInitialEditMode(false);
          }} 
          onLike={handleLike}
          onArchive={handleArchive}
          onDelete={handleDeletePost}
          onUpdate={handleUpdatePost}
          initialEditMode={modalInitialEditMode}
        />
      )}

      {isRegisterFightModalOpen && profile && (
        <RegisterFightModal
          isOpen={isRegisterFightModalOpen}
          onClose={() => {
            setIsRegisterFightModalOpen(false);
            setEditingFight(null);
          }}
          athleteId={profile.id}
          onFightRegistered={fetchProfileData}
          initialData={editingFight}
        />
      )}

      {isRegisterChampionshipModalOpen && profile && (
        <RegisterChampionshipModal
          isOpen={isRegisterChampionshipModalOpen}
          onClose={() => {
            setIsRegisterChampionshipModalOpen(false);
            setEditingChampionship(null);
          }}
          athleteId={profile.id}
          onChampionshipRegistered={fetchProfileData}
          initialData={editingChampionship}
        />
      )}
    </div>
  );
};
