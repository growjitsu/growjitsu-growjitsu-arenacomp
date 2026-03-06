import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, Target, TrendingUp, Grid, History, MapPin, Calendar, 
  Settings, Edit2, Save, X, Instagram, Youtube, Music, 
  User, Dumbbell, Ruler, Scale, GraduationCap, Trophy
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { ArenaProfile, ArenaResult, ArenaPost } from '../types';

export const ArenaProfileView: React.FC<{ userId?: string; forceEdit?: boolean }> = ({ userId, forceEdit }) => {
  const [profile, setProfile] = useState<ArenaProfile | null>(null);
  const [results, setResults] = useState<ArenaResult[]>([]);
  const [posts, setPosts] = useState<ArenaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'history'>('posts');
  const [isEditing, setIsEditing] = useState(forceEdit || false);
  const [editData, setEditData] = useState<Partial<ArenaProfile>>({});
  const [saving, setSaving] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    setIsEditing(forceEdit || false);
    fetchProfileData();
  }, [userId, forceEdit]);

  const fetchProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetId = userId || user?.id;
      if (!targetId) return;

      setIsOwnProfile(user?.id === targetId);

      // Fetch Profile
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetId)
        .single();
      
      // Auto-create profile if it doesn't exist and it's the own profile
      if (profileError && profileError.code === 'PGRST116' && user?.id === targetId) {
        const newProfile = {
          id: targetId,
          username: user.email?.split('@')[0] || `user_${targetId.slice(0, 5)}`,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Novo Atleta',
          avatar_url: user.user_metadata?.avatar_url || null,
          arena_score: 0,
          wins: 0,
          losses: 0,
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
      }

      setProfile(profileData);
      setEditData(profileData || {});

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
      
      setPosts(postsData || []);

    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editData.full_name,
          nickname: editData.nickname,
          bio: editData.bio,
          city: editData.city,
          state: editData.state,
          country: editData.country,
          modality: editData.modality,
          category: editData.category,
          weight: editData.weight,
          height: editData.height,
          graduation: editData.graduation,
          gym_name: editData.gym_name,
          professor: editData.professor,
          instagram_url: editData.instagram_url,
          youtube_url: editData.youtube_url,
          tiktok_url: editData.tiktok_url,
          titles: editData.titles,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) throw error;
      setProfile({ ...profile, ...editData });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Erro ao atualizar perfil. Verifique se todas as colunas existem no banco de dados.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]" /></div>;
  if (!profile) return <div className="text-center py-24 text-[var(--text-muted)]">Perfil não encontrado</div>;

  const winRate = profile.wins + profile.losses > 0 
    ? Math.round((profile.wins / (profile.wins + profile.losses)) * 100) 
    : 0;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Profile Header */}
      <div className="relative">
        <div className="h-48 md:h-64 bg-[var(--surface)] rounded-3xl overflow-hidden border border-[var(--border-ui)] transition-colors duration-300">
          <img src="https://picsum.photos/seed/sport/1200/400" alt="" className="w-full h-full object-cover opacity-50 grayscale" referrerPolicy="no-referrer" />
          {isOwnProfile && !isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="absolute top-4 right-4 bg-black/50 backdrop-blur-md border border-white/10 p-2 rounded-xl text-white hover:bg-[var(--primary)] transition-all z-10"
            >
              <Edit2 size={18} />
            </button>
          )}
        </div>
        
        <div className="absolute -bottom-12 left-8 flex items-end space-x-6">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-[var(--surface)] border-4 border-[var(--bg)] overflow-hidden shadow-2xl transition-colors duration-300 relative group">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] bg-[var(--primary)]/10">
                <User size={48} />
              </div>
            )}
            {isEditing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[10px] font-black uppercase text-white">Alterar Foto</p>
              </div>
            )}
          </div>
          <div className="pb-4">
            {isEditing ? (
              <div className="space-y-2">
                <input 
                  value={editData.full_name} 
                  onChange={e => setEditData({...editData, full_name: e.target.value})}
                  className="bg-[var(--bg)] border border-[var(--border-ui)] rounded-lg px-3 py-1 text-xl font-black text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                  placeholder="Nome Completo"
                />
                <input 
                  value={editData.nickname} 
                  onChange={e => setEditData({...editData, nickname: e.target.value})}
                  className="bg-[var(--bg)] border border-[var(--border-ui)] rounded-lg px-3 py-1 text-xs font-bold text-[var(--primary)] outline-none focus:border-[var(--primary)] block"
                  placeholder="Apelido"
                />
              </div>
            ) : (
              <>
                <h1 className="text-2xl md:text-4xl font-black text-[var(--text-main)] uppercase tracking-tighter italic">
                  {profile.full_name} {profile.nickname && <span className="text-[var(--text-muted)] text-lg">({profile.nickname})</span>}
                </h1>
                <p className="text-[var(--primary)] font-bold text-xs uppercase tracking-widest">@{profile.username} • {profile.modality}</p>
              </>
            )}
          </div>
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
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Cidade</label>
                    <input 
                      value={editData.city} 
                      onChange={e => setEditData({...editData, city: e.target.value})}
                      className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">País</label>
                    <input 
                      value={editData.country} 
                      onChange={e => setEditData({...editData, country: e.target.value})}
                      className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{profile.bio || 'Nenhuma biografia disponível.'}</p>
                <div className="space-y-3 pt-4 border-t border-[var(--border-ui)]">
                  <div className="flex items-center space-x-3 text-[var(--text-muted)]">
                    <MapPin size={14} />
                    <span className="text-xs font-bold">{profile.city}{profile.state ? `, ${profile.state}` : ''}{profile.country ? ` • ${profile.country}` : ''}</span>
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
              {[
                { label: 'Modalidade', value: profile.modality, icon: Trophy, key: 'modality' },
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
                      value={editData[info.key as keyof ArenaProfile] || ''} 
                      onChange={e => setEditData({...editData, [info.key]: e.target.value})}
                      className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-lg px-2 py-1 text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                    />
                  ) : (
                    <p className="text-sm font-bold text-[var(--text-main)]">{info.value || '-'}</p>
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
                  <div key={post.id} className="aspect-square bg-[var(--surface)] rounded-xl overflow-hidden border border-[var(--border-ui)] group relative cursor-pointer transition-colors duration-300">
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
                  <div key={result.id} className="bg-[var(--surface)] border border-[var(--border-ui)] p-4 rounded-2xl flex items-center justify-between transition-colors duration-300">
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
    </div>
  );
};
