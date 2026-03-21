import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, Target, TrendingUp, Grid, History, MapPin, Calendar, 
  Settings, Edit2, Save, X, Instagram, Youtube, Music, 
  User, Dumbbell, Ruler, Scale, GraduationCap, Trophy,
  Database, Plus, Trash2, MoreVertical, Archive, RotateCcw, Heart, MessageCircle, Share2,
  Brain, Zap, Cpu, BarChart3, Shield, Info, Wallet, FileText, Eye
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { ArenaProfile, ArenaResult, ArenaPost, ArenaChampionshipResult, ArenaFight, Team, ArenaCertificate } from '../types';
import { countries, modalities } from '../utils/data';
import { PostModal } from './PostModal';
import { RegisterFightModal } from './RegisterFightModal';
import { RegisterChampionshipModal } from './RegisterChampionshipModal';
import { getAthleteRankings, searchTeams, getTeams } from '../services/arenaService';
import { AchievementCard } from './AchievementCard';
import { ShareModal } from './ShareModal';

export const ArenaProfileView: React.FC<{ userId?: string; username?: string; forceEdit?: boolean }> = ({ userId, username, forceEdit }) => {
  const [profile, setProfile] = useState<ArenaProfile | null>(null);
  const [results, setResults] = useState<ArenaResult[]>([]);
  const [championships, setChampionships] = useState<ArenaChampionshipResult[]>([]);
  const [fights, setFights] = useState<ArenaFight[]>([]);
  const [posts, setPosts] = useState<ArenaPost[]>([]);
  const [archivedPosts, setArchivedPosts] = useState<ArenaPost[]>([]);
  const [certificates, setCertificates] = useState<ArenaCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'certificates' | 'championships' | 'fights' | 'archive' | 'intelligence'>('posts');
  const [isEditing, setIsEditing] = useState(forceEdit || false);
  const [editData, setEditData] = useState<Partial<ArenaProfile>>({});
  const [saving, setSaving] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isTeamRepresentative, setIsTeamRepresentative] = useState(false);
  const [teamData, setTeamData] = useState<Team | null>(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [teamEditData, setTeamEditData] = useState<Partial<Team>>({});
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
  
  const [isAchievementCardOpen, setIsAchievementCardOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareModalData, setShareModalData] = useState<{
    title: string;
    subtitle: string;
    shareUrl: string;
    onGenerate: () => void;
  } | null>(null);
  const [achievementData, setAchievementData] = useState({
    title: '',
    athleteName: '',
    achievement: '',
    modality: '',
    profileUrl: ''
  });

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeMenuId]);
  
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [dbCountries, setDbCountries] = useState<any[]>([]);
  const [dbStates, setDbStates] = useState<any[]>([]);
  const [dbCities, setDbCities] = useState<any[]>([]);

  const [error, setError] = useState<string | null>(null);

  const fetchCountries = async () => {
    const { data } = await supabase.from('countries').select('*').order('name');
    if (data) setDbCountries(data);
  };

  const fetchStates = async (countryId: string) => {
    const { data } = await supabase.from('states').select('*').eq('country_id', countryId).order('name');
    if (data) setDbStates(data);
    setDbCities([]);
  };

  const fetchCities = async (stateId: string) => {
    const { data } = await supabase.from('cities').select('*').eq('state_id', stateId).order('name');
    if (data) setDbCities(data);
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  useEffect(() => {
    if (isEditing && editData.country && dbCountries.length > 0) {
      const country = dbCountries.find(c => c.name.toUpperCase() === editData.country?.toUpperCase());
      if (country) {
        fetchStates(country.id);
      }
    }
  }, [isEditing, dbCountries]);

  useEffect(() => {
    if (isEditing && editData.state && dbStates.length > 0) {
      const state = dbStates.find(s => s.name.toUpperCase() === editData.state?.toUpperCase());
      if (state) {
        fetchCities(state.id);
      }
    }
  }, [isEditing, dbStates]);

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

      // Check if user is team representative
      if (profileData?.team_id && user) {
        const { data: repData } = await supabase
          .from('team_members')
          .select('role')
          .eq('team_id', profileData.team_id)
          .eq('user_id', user.id)
          .eq('role', 'representative')
          .maybeSingle();
        
        setIsTeamRepresentative(!!repData);

        // Fetch full team data
        const { data: tData } = await supabase
          .from('teams')
          .select('*, countries(name), states(name), cities(name)')
          .eq('id', profileData.team_id)
          .single();
        
        if (tData) {
          setTeamData(tData);
          setTeamEditData(tData);
        }
      }

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

      // Fetch Certificates
      const { data: certData } = await supabase
        .from('certificates')
        .select('*')
        .eq('athlete_id', targetId)
        .order('created_at', { ascending: false });
      
      setCertificates(certData || []);

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
  }, [userId, username, forceEdit]);

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
        city: editData.city?.toUpperCase(),
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
        country_id: editData.country_id,
        state_id: editData.state_id,
        city_id: editData.city_id,
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

  const handleCertificateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('O arquivo deve ter no máximo 5MB');
      return;
    }

    setUploading(true);
    try {
      // 1. Validar autenticação antes de qualquer ação
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Sessão inválida. Por favor, faça login novamente.');
      }

      // 2. Validar se o usuário é o dono do perfil (Prevenção de UI)
      if (user.id !== profile.id) {
        throw new Error('Permissão negada: Você só pode adicionar certificados ao seu próprio perfil.');
      }

      const fileExt = file.name.split('.').pop();
      // O caminho DEVE começar com certificates/ seguido do ID do usuário para bater com a Policy
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `certificates/${user.id}/${fileName}`;

      // 3. Upload para o Storage
      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Erro no Storage:', uploadError);
        throw new Error(`Falha no upload do arquivo: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath);

      const mediaType = file.type.includes('pdf') ? 'pdf' : 'image';

      // 4. Inserção no Banco de Dados
      // O Trigger no banco garantirá que o athlete_id seja o correto, 
      // mas enviamos aqui para manter a consistência do código.
      const { error: dbError } = await supabase
        .from('certificates')
        .insert([{
          athlete_id: user.id,
          name: file.name.split('.')[0].toUpperCase(),
          media_url: publicUrl,
          media_type: mediaType
        }]);

      if (dbError) {
        console.error('Erro de RLS/Banco:', dbError);
        // Se o erro persistir aqui, o log mostrará exatamente o que o banco rejeitou
        throw new Error(`Erro ao registrar certificado: ${dbError.message}`);
      }

      // Refresh certificates
      const { data: certData } = await supabase
        .from('certificates')
        .select('*')
        .eq('athlete_id', profile.id)
        .order('created_at', { ascending: false });
      
      setCertificates(certData || []);

      // Trigger achievement card for new certificate
      setAchievementData({
        title: '🏆 NOVO CERTIFICADO',
        athleteName: profile.full_name,
        achievement: `Recebeu o certificado: ${file.name.split('.')[0].toUpperCase()}`,
        modality: profile.modality || 'ATLETA ARENACOMP',
        profileUrl: `${window.location.origin}/profile/@${profile.username}`
      });
      setIsAchievementCardOpen(true);

    } catch (err: any) {
      console.error('Error uploading certificate:', err);
      alert('Erro ao enviar certificado: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteCertificate = async (id: string, url: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este certificado?')) return;

    try {
      // Delete from DB
      const { error: dbError } = await supabase
        .from('certificates')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      // Delete from Storage
      // Extract path from URL
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const userId = urlParts[urlParts.length - 2];
      
      await supabase.storage.from('posts').remove([`certificates/${userId}/${fileName}`]);

      setCertificates(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      console.error('Error deleting certificate:', err);
      alert('Erro ao excluir certificado: ' + err.message);
    }
  };

  const handleSaveTeam = async () => {
    if (!teamData) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('teams')
        .update({
          name: teamEditData.name?.toUpperCase(),
          description: teamEditData.description,
          professor: teamEditData.professor?.toUpperCase(),
          country_id: teamEditData.country_id,
          state_id: teamEditData.state_id,
          city_id: teamEditData.city_id,
          logo_url: teamEditData.logo_url
        })
        .eq('id', teamData.id);

      if (error) throw error;
      
      // Refresh data
      const { data: updatedTeam } = await supabase
        .from('teams')
        .select('*, countries(name), states(name), cities(name)')
        .eq('id', teamData.id)
        .single();
      
      if (updatedTeam) {
        setTeamData(updatedTeam);
        setTeamEditData(updatedTeam);
      }
      
      setIsTeamModalOpen(false);
      alert('Equipe atualizada com sucesso!');
    } catch (err: any) {
      console.error('Error saving team:', err);
      alert('Erro ao salvar equipe: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTeamLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Tipo de arquivo inválido. Use JPG, PNG ou WEBP.');
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Arquivo muito grande. Máximo 2MB.');
      return;
    }

    // Preview and fallback
    const reader = new FileReader();
    reader.onloadend = () => {
      // We can use this as a fallback if upload fails
    };
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('team-logos')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        // Fallback to base64 if storage fails (e.g. bucket not found)
        setTeamEditData(prev => ({ ...prev, logo_url: reader.result as string }));
        alert('Erro ao fazer upload para o servidor. Usando versão local temporária. Por favor, salve as alterações.');
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('team-logos')
          .getPublicUrl(filePath);

        setTeamEditData(prev => ({ ...prev, logo_url: publicUrl }));
      }
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      // Final fallback
      setTeamEditData(prev => ({ ...prev, logo_url: reader.result as string }));
      alert('Erro ao processar upload. Usando versão local temporária.');
    } finally {
      setUploading(false);
    }
  };

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
    <div className="w-full max-w-4xl mx-auto py-4 md:py-8 px-4 space-y-12 md:space-y-16 overflow-x-hidden">
      {/* Profile Header */}
      <div className="relative">
        <div className="h-40 md:h-64 bg-[var(--surface)] rounded-3xl overflow-hidden border border-[var(--border-ui)] transition-colors duration-300 relative">
          <div className="w-full h-full flex items-center justify-center bg-[var(--bg)] overflow-hidden">
            {/* Clean background */}
          </div>
          
          {isOwnProfile && !isEditing && (
            <div className="absolute top-4 right-4 flex space-x-2 z-20">
              <button 
                onClick={() => {
                  setShareModalData({
                    title: profile.full_name,
                    subtitle: 'Confira meu perfil na ArenaComp!',
                    shareUrl: `${window.location.origin}/profile/@${profile.username}`,
                    onGenerate: () => {
                      setAchievementData({
                        title: 'PERFIL ARENA',
                        athleteName: profile.full_name,
                        achievement: 'Confira meu perfil na ArenaComp!',
                        modality: profile.modality || 'ATLETA ARENACOMP',
                        profileUrl: `${window.location.origin}/profile/@${profile.username}`
                      });
                      setIsAchievementCardOpen(true);
                    }
                  });
                  setIsShareModalOpen(true);
                }}
                className="bg-black/50 backdrop-blur-md border border-white/10 p-2 rounded-xl text-white hover:bg-[var(--primary)] transition-all"
                title="Compartilhar Perfil"
              >
                <Share2 size={18} />
              </button>
              <button 
                onClick={() => setIsEditing(true)}
                className="bg-black/50 backdrop-blur-md border border-white/10 p-2 rounded-xl text-white hover:bg-[var(--primary)] transition-all"
                title="Editar Perfil"
              >
                <Edit2 size={18} />
              </button>
            </div>
          )}
        </div>
        
        <div className="relative -mt-16 md:-mt-20 px-4 md:px-8 flex flex-col md:flex-row items-center md:items-end space-y-4 md:space-y-0 md:space-x-6 z-10">
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
          <div className="pb-2 text-center md:text-left flex-1 w-full min-w-0">
            {isEditing ? (
              <div className="space-y-2 w-full max-w-xs mx-auto md:mx-0">
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
              <div className="space-y-1 w-full min-w-0">
                <h1 className="text-2xl md:text-4xl font-black text-[var(--text-main)] uppercase tracking-tighter italic whitespace-nowrap leading-tight overflow-hidden text-ellipsis">
                  {profile.full_name} {profile.nickname && <span className="text-[var(--text-muted)] text-lg block md:inline">(@{profile.nickname.replace(/^@/, '')})</span>}
                </h1>
                <div className="flex flex-col md:flex-row items-center md:space-x-4 space-y-2 md:space-y-0">
                  <p className="text-[var(--primary)] font-bold text-[10px] md:text-xs uppercase tracking-widest whitespace-nowrap truncate max-w-full">
                    {profile.modality}
                  </p>
                  {profile.wallet_address && (
                    <div className="flex items-center space-x-1 bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                      <Wallet size={10} />
                      <span className="text-[8px] font-black uppercase tracking-widest">Web3 Verified</span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-[var(--text-muted)] text-[9px] md:text-[10px] font-black uppercase tracking-widest">
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
            <div className="pb-4 flex items-center space-x-2">
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
              <button
                onClick={() => {
                  setShareModalData({
                    title: profile.full_name,
                    subtitle: 'Confira este perfil na ArenaComp!',
                    shareUrl: `${window.location.origin}/profile/@${profile.username}`,
                    onGenerate: () => {
                      setAchievementData({
                        title: 'PERFIL ARENA',
                        athleteName: profile.full_name,
                        achievement: 'Confira este perfil na ArenaComp!',
                        modality: profile.modality || 'ATLETA ARENACOMP',
                        profileUrl: `${window.location.origin}/profile/@${profile.username}`
                      });
                      setIsAchievementCardOpen(true);
                    }
                  });
                  setIsShareModalOpen(true);
                }}
                className="p-2 bg-[var(--surface)] border border-[var(--border-ui)] text-[var(--text-main)] rounded-xl hover:bg-[var(--primary)]/10 transition-all flex items-center justify-center"
                title="Compartilhar Perfil"
              >
                <Share2 size={18} />
              </button>
            </div>
          )}

          {isOwnProfile && !isEditing && (
            <div className="pb-4 flex flex-wrap gap-2">
              {isTeamRepresentative && (
                <button
                  onClick={() => setIsTeamModalOpen(true)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center space-x-2"
                >
                  <Shield size={14} />
                  <span>Gerenciar Equipe</span>
                </button>
              )}
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
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
        {[
          { label: 'Arena Score', value: Math.round(profile.arena_score), icon: Award, color: 'text-[var(--primary)]' },
          { label: 'Vitórias', value: profile.wins, icon: Target, color: 'text-blue-500' },
          { label: 'Derrotas', value: profile.losses, icon: X, color: 'text-rose-500' },
          { label: 'Lutas Totais', value: totalFights, icon: History, color: 'text-zinc-500' },
          { label: 'Taxa de Vitória', value: `${winRate}%`, icon: TrendingUp, color: 'text-purple-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-[var(--surface)] border border-[var(--border-ui)] p-3 md:p-4 rounded-2xl space-y-2 shadow-sm" style={{ transform: 'translateZ(0)' }}>
            <div className="flex items-center justify-between gap-2">
              <stat.icon size={14} className={`${stat.color} shrink-0`} />
              <span className="text-[8px] md:text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest truncate">{stat.label}</span>
            </div>
            <p className="text-xl md:text-2xl font-extrabold text-[var(--text-main)] truncate">{stat.value}</p>
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">País</label>
                    <select 
                      value={editData.country || ''} 
                      onChange={e => {
                        const countryName = e.target.value;
                        const country = dbCountries.find(c => c.name === countryName);
                        setEditData({
                          ...editData, 
                          country: countryName, 
                          country_id: country?.id,
                          state: '', 
                          state_id: undefined,
                          city: '',
                          city_id: undefined
                        });
                        if (country) fetchStates(country.id);
                      }}
                      className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                    >
                      <option value="">Selecionar País</option>
                      {dbCountries.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Estado</label>
                    <select 
                      value={editData.state || ''} 
                      onChange={e => {
                        const stateName = e.target.value;
                        const state = dbStates.find(s => s.name === stateName);
                        setEditData({
                          ...editData, 
                          state: stateName, 
                          state_id: state?.id,
                          city: '',
                          city_id: undefined
                        });
                        if (state) fetchCities(state.id);
                      }}
                      disabled={!editData.country}
                      className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary)] disabled:opacity-50"
                    >
                      <option value="">Selecionar Estado</option>
                      {dbStates.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Cidade</label>
                    <select 
                      value={editData.city || ''} 
                      onChange={e => {
                        const cityName = e.target.value;
                        const city = dbCities.find(c => c.name === cityName);
                        setEditData({
                          ...editData, 
                          city: cityName,
                          city_id: city?.id
                        });
                      }}
                      disabled={!editData.state}
                      className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary)] disabled:opacity-50"
                    >
                      <option value="">Selecionar Cidade</option>
                      {dbCities.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
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
                    <span className="text-xs font-bold break-words">{profile.city ? `${profile.city} • ` : ''}{profile.state ? `${profile.state}` : ''}{profile.country ? ` • ${profile.country}` : ''}</span>
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
              onClick={() => setActiveTab('certificates')}
              className={`pb-4 text-xs font-black uppercase tracking-widest transition-colors relative whitespace-nowrap ${
                activeTab === 'certificates' ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Certificados
              {activeTab === 'certificates' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]" />}
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
            ) : activeTab === 'certificates' ? (
              <div className="space-y-6">
                {isOwnProfile && (
                  <div className="flex justify-end">
                    <label className="cursor-pointer bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center space-x-2 transition-all shadow-lg shadow-[var(--primary)]/20 active:scale-95">
                      <Plus size={16} />
                      <span>Adicionar Certificado</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={handleCertificateUpload}
                        disabled={uploading}
                      />
                    </label>
                  </div>
                )}

                {certificates.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {certificates.map((cert) => (
                      <div key={cert.id} className="group relative bg-[var(--surface)] border border-[var(--border-ui)] rounded-2xl aspect-[4/3] flex flex-col">
                        <div className="flex-1 relative bg-[var(--bg)] flex items-center justify-center rounded-t-2xl overflow-hidden">
                          {cert.media_type === 'image' ? (
                            <img 
                              src={cert.media_url} 
                              alt={cert.name} 
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="flex flex-col items-center space-y-2 text-[var(--text-muted)]">
                              <FileText size={48} />
                              <span className="text-[10px] font-bold uppercase tracking-widest">PDF</span>
                            </div>
                          )}
                          
                          {/* Overlay on hover (removed old buttons) */}
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        </div>

                        {/* Menu Button - Moved outside overflow-hidden container */}
                        <div className="absolute top-2 right-2 z-20">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === cert.id ? null : cert.id);
                            }}
                            className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-all md:opacity-0 md:group-hover:opacity-100"
                          >
                            <MoreVertical size={16} />
                          </button>
                          
                          {activeMenuId === cert.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden py-1 z-30">
                              <button 
                                onClick={() => {
                                  window.open(cert.media_url, '_blank');
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-xs font-bold uppercase tracking-widest text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
                              >
                                <Eye size={14} />
                                Visualizar
                              </button>
                              <button 
                                onClick={() => {
                                  setShareModalData({
                                    title: '🏆 CERTIFICADO',
                                    subtitle: cert.name,
                                    shareUrl: `${window.location.origin}/profile/@${profile.username}`,
                                    onGenerate: () => {
                                      setAchievementData({
                                        title: '🏆 CERTIFICADO',
                                        athleteName: profile.full_name,
                                        achievement: `Certificado: ${cert.name}`,
                                        modality: profile.modality || 'ATLETA ARENACOMP',
                                        profileUrl: `${window.location.origin}/profile/@${profile.username}`
                                      });
                                      setIsAchievementCardOpen(true);
                                    }
                                  });
                                  setIsShareModalOpen(true);
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-xs font-bold uppercase tracking-widest text-amber-500 hover:bg-zinc-800 flex items-center gap-2"
                              >
                                <Share2 size={14} />
                                Compartilhar
                              </button>
                              {isOwnProfile && (
                                <button 
                                  onClick={() => {
                                    handleDeleteCertificate(cert.id, cert.media_url);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-xs font-bold uppercase tracking-widest text-rose-500 hover:bg-zinc-800 flex items-center gap-2 border-t border-zinc-800"
                                >
                                  <Trash2 size={14} />
                                  Excluir
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="p-4 bg-[var(--surface)] border-t border-[var(--border-ui)] rounded-b-2xl">
                          <h4 className="text-xs font-black text-[var(--text-main)] uppercase tracking-tight truncate">{cert.name}</h4>
                          <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1">
                            {new Date(cert.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-24 text-center space-y-4 bg-[var(--surface)] border border-[var(--border-ui)] rounded-[2.5rem]">
                    <div className="w-16 h-16 bg-[var(--bg)] rounded-2xl flex items-center justify-center mx-auto text-[var(--text-muted)]">
                      <Award size={32} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-black text-[var(--text-main)] uppercase tracking-widest">Nenhum certificado</p>
                      <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
                        {isOwnProfile ? 'Adicione seus certificados profissionais para destacar seu perfil.' : 'Este atleta ainda não adicionou certificados.'}
                      </p>
                    </div>
                  </div>
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
                        <button
                          onClick={() => {
                            setShareModalData({
                              title: fight.resultado === 'win' ? '🏆 VITÓRIA' : '🥊 LUTA',
                              subtitle: `${fight.opponent_name} no ${fight.evento}`,
                              shareUrl: `${window.location.origin}/profile/@${profile.username}`,
                              onGenerate: () => {
                                setAchievementData({
                                  title: fight.resultado === 'win' ? '🏆 VITÓRIA' : '🥊 LUTA',
                                  athleteName: profile.full_name,
                                  achievement: `${fight.resultado === 'win' ? 'Venceu' : 'Lutou com'} ${fight.opponent_name} no ${fight.evento}`,
                                  modality: fight.modalidade,
                                  profileUrl: `${window.location.origin}/profile/@${profile.username}`
                                });
                                setIsAchievementCardOpen(true);
                              }
                            });
                            setIsShareModalOpen(true);
                          }}
                          className="p-2 text-[var(--text-muted)] hover:text-amber-500 transition-colors"
                          title="Compartilhar"
                        >
                          <Share2 size={14} />
                        </button>
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
                        <div className="w-full md:w-48 h-48 md:h-auto overflow-hidden flex-shrink-0 bg-black/10 flex items-center justify-center">
                          <img src={champ.foto_podio_url} alt="Pódio" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
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
                          <button
                            onClick={() => {
                              setShareModalData({
                                title: '🏆 CAMPEONATO',
                                subtitle: champ.championship_name,
                                shareUrl: `${window.location.origin}/profile/@${profile.username}`,
                                onGenerate: () => {
                                  setAchievementData({
                                    title: '🏆 CAMPEONATO',
                                    athleteName: profile.full_name,
                                    achievement: `${champ.resultado} no ${champ.championship_name}`,
                                    modality: champ.modalidade,
                                    profileUrl: `${window.location.origin}/profile/@${profile.username}`
                                  });
                                  setIsAchievementCardOpen(true);
                                }
                              });
                              setIsShareModalOpen(true);
                            }}
                            className="p-2 text-[var(--text-muted)] hover:text-amber-500 transition-colors"
                            title="Compartilhar"
                          >
                            <Share2 size={14} />
                          </button>
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

      {/* Team Management Modal */}
      <AnimatePresence>
        {isTeamModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTeamModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-xl font-black uppercase italic tracking-tight">
                  Gerenciar Equipe
                </h3>
                <button onClick={() => setIsTeamModalOpen(false)} className="p-2 text-gray-400 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Nome da Equipe</label>
                  <input
                    type="text"
                    value={teamEditData.name || ''}
                    onChange={(e) => setTeamEditData({ ...teamEditData, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-blue-500"
                    placeholder="Ex: Alliance Jiu-Jitsu"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Professor Responsável</label>
                  <input
                    type="text"
                    value={teamEditData.professor || ''}
                    onChange={(e) => setTeamEditData({ ...teamEditData, professor: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-blue-500"
                    placeholder="Ex: Mestre Hélio Gracie"
                  />
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Descrição da Equipe</label>
                    <textarea
                      value={teamEditData.description || ''}
                      onChange={(e) => setTeamEditData({ ...teamEditData, description: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-blue-500 min-h-[100px] resize-none"
                      placeholder="Descreva a história ou foco da equipe..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">País</label>
                    <select
                      value={teamEditData.country_id || ''}
                      onChange={(e) => {
                        const countryId = e.target.value;
                        setTeamEditData({ ...teamEditData, country_id: countryId, state_id: '', city_id: '' });
                        setDbStates([]);
                        setDbCities([]);
                        if (countryId) fetchStates(countryId);
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="">Selecionar País</option>
                      {dbCountries.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Estado</label>
                      <select
                        value={teamEditData.state_id || ''}
                        disabled={!teamEditData.country_id}
                        onChange={(e) => {
                          const stateId = e.target.value;
                          setTeamEditData({ ...teamEditData, state_id: stateId, city_id: '' });
                          setDbCities([]);
                          if (stateId) fetchCities(stateId);
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-blue-500 disabled:opacity-50"
                      >
                        <option value="">{teamEditData.country_id ? (dbStates.length === 0 ? 'Carregando estados...' : 'Selecionar Estado') : 'Selecione um País'}</option>
                        {dbStates.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Cidade</label>
                      <select
                        value={teamEditData.city_id || ''}
                        disabled={!teamEditData.state_id}
                        onChange={(e) => setTeamEditData({ ...teamEditData, city_id: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-blue-500 disabled:opacity-50"
                      >
                        <option value="">{teamEditData.state_id ? (dbCities.length === 0 ? 'Nenhuma cidade encontrada' : 'Selecionar Cidade') : 'Selecione um Estado'}</option>
                        {dbCities.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Logo da Equipe</label>
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                      {teamEditData.logo_url ? (
                        <img src={teamEditData.logo_url} alt="Preview" className="w-full h-full object-contain" />
                      ) : (
                        <Shield className="w-8 h-8 text-gray-700" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={handleTeamLogoUpload}
                        className="hidden"
                        id="team-logo-upload"
                      />
                      <label
                        htmlFor="team-logo-upload"
                        className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-white/10 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        <Plus size={14} />
                        <span>{uploading ? 'Enviando...' : 'Fazer Upload'}</span>
                      </label>
                      <p className="text-[8px] text-gray-500 mt-2 uppercase font-bold tracking-widest">PNG, JPG ou WEBP. Máx 2MB.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-white/10 bg-white/5 flex items-center justify-end space-x-4">
                <button
                  onClick={() => setIsTeamModalOpen(false)}
                  className="px-6 py-3 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveTeam}
                  disabled={saving}
                  className="bg-blue-600 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      <AchievementCard 
        isOpen={isAchievementCardOpen}
        onClose={() => setIsAchievementCardOpen(false)}
        data={achievementData}
      />

      {profile && shareModalData && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          shareUrl={shareModalData.shareUrl}
          title={shareModalData.title}
          subtitle={shareModalData.subtitle}
          followerCount={followerCount}
          onGenerateCard={shareModalData.onGenerate}
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
