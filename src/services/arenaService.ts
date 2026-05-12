import { supabase } from './supabase';
import { ArenaFight, ArenaProfile, Team, ArenaAd } from '../types';
import { getApiUrl } from '../lib/api';
import { ARENA_BADGES } from '../utils/data';
import { isProfileComplete } from '../utils/profileValidation';

export const calculateAndUpdateStats = async (athleteId: string) => {
  // 1. Run all initial data fetches in parallel to minimize latency
  // We use .select('*') and then filter in JS to be resilient to missing columns (schema evolution)
  const [
    fightsRes,
    champRes,
    postsRes,
    platRes,
    challengeRes,
    adjRes
  ] = await Promise.all([
    (supabase.from('fights').select('*').eq('athlete_id', athleteId) as any as Promise<any>).catch(() => ({ data: [] })),
    (supabase.from('championship_results').select('*').eq('athlete_id', athleteId) as any as Promise<any>).catch(() => ({ data: [] })),
    (supabase.from('posts').select('*').eq('author_id', athleteId) as any as Promise<any>).catch(() => ({ data: [] })),
    (supabase.from('competition_results').select('*').eq('athlete_id', athleteId) as any as Promise<any>).catch(() => ({ data: [] })),
    (supabase.from('challenges').select('*')
      .in('status', ['finished', 'completed'])
      .or(`challenger_id.eq.${athleteId},challenged_id.eq.${athleteId}`) as any as Promise<any>)
      .catch(() => ({ data: [] })),
    (supabase.from('challenge_points_adjustments').select('adjustment_value').eq('athlete_id', athleteId) as any as Promise<any>).catch(() => ({ data: [] }))
  ]);

  const fights = fightsRes.data || [];
  const championships = champRes.data || [];
  const postsData = postsRes.data || [];
  const platformResults = platRes.data || [];
  const challenges = challengeRes.data || [];
  const adjustments = adjRes.data || [];

  // Filter posts (handle potential is_archived missing gracefully)
  const activePosts = postsData.filter(p => !p.is_archived);
  
  const postCount = activePosts.length;
  const imageCount = activePosts.filter(p => 
    p.type === 'image' || 
    (p.media_url && !p.media_url.toLowerCase().match(/\.(mp4|webm|ogg|mov)$/) && !p.media_url.includes('video'))
  ).length;
  const videoCount = activePosts.filter(p => 
    p.type === 'video' || 
    (p.media_url && (p.media_url.toLowerCase().match(/\.(mp4|webm|ogg|mov)$/) || p.media_url.includes('video')))
  ).length;

  const championshipCount = championships.length + platformResults.length;

  // 2. Process Challenges Points
  let challengeScore = 0;
  const pointsMap: Record<string, number> = { '1st': 100, '2nd': 50, '3rd': 25, 'none': 5 };

  challenges.forEach(c => {
    let points = (c.challenger_id === athleteId) 
      ? Number(c.challenger_points || 0)
      : Number(c.challenged_points || 0);
    
    if (points === 0) {
      const result = (c.challenger_id === athleteId) ? c.challenger_result : c.challenged_result;
      if (result && result.category) {
        points = pointsMap[result.category] || 0;
        if (result.absolute && pointsMap[result.absolute]) {
          points += pointsMap[result.absolute];
        }
      } else if (c.outcome) {
        if (c.challenger_id === athleteId) {
          points = (c.outcome === 'challenger_win') ? 100 : (c.outcome === 'draw' ? 25 : 5);
        } else {
          points = (c.outcome === 'challenged_win') ? 100 : (c.outcome === 'draw' ? 25 : 5);
        }
      }
    }
    challengeScore += points;
  });

  // Manual adjustments
  if (adjustments) {
    adjustments.forEach(adj => {
      challengeScore += Number(adj.adjustment_value || 0);
    });
  }

  // 3. Calculate Fight Stats and Arena Score
  const wins = fights.filter(f => f.resultado === 'win').length;
  const losses = fights.filter(f => f.resultado === 'loss').length;
  const draws = fights.filter(f => f.resultado === 'draw').length;
  
  const bonusPoints = fights.filter(f => 
    f.resultado === 'win' && (f.tipo_vitoria === 'finalização' || f.tipo_vitoria === 'nocaute')
  ).length * 5;

  let arenaScore = (wins * 15) - (losses * 5) + (draws * 2) + bonusPoints;

  championships.forEach(champ => {
    const res = champ.resultado;
    if (res === 'Campeão') arenaScore += 100;
    else if (res === 'Vice-campeão') arenaScore += 50;
    else if (res === 'Terceiro lugar') arenaScore += 25;
    else if (res === 'Participação') arenaScore += 5;
  });

  const totalFights = wins + losses + draws;
  const winRate = (wins + losses) > 0 ? (wins / (wins + losses)) * 100 : 0;

  // 4. Update profile in background (don't block the return if we just want stats)
  const statsToUpdate = {
    wins,
    losses,
    draws,
    total_fights: totalFights,
    win_rate: Math.round(winRate),
    arena_score: arenaScore,
    challenge_score: challengeScore,
    post_count: postCount,
    image_count: imageCount,
    video_count: videoCount,
    championship_count: championshipCount,
    updated_at: new Date().toISOString()
  };

  supabase.from('profiles').update(statsToUpdate).eq('id', athleteId).then(({ error }) => {
    if (error) console.error('Error updating profile stats:', error);
  });

  return statsToUpdate;
};

export const processEngagementEvolution = async (athleteId: string) => {
  // 1. Get fresh profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', athleteId)
    .single();

  if (profileError || !profile) return null;

  // 2. Update Stats (Post counts, etc.)
  const stats = await calculateAndUpdateStats(athleteId);

  // 3. Update Streak
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const lastActivityStr = profile.last_activity_date;
  
  let newStreak = profile.streak_count || 0;
  let updated = false;

  if (!lastActivityStr) {
    newStreak = 1;
    updated = true;
  } else if (lastActivityStr !== todayStr) {
    const lastActivityDate = new Date(lastActivityStr);
    const diffTime = now.getTime() - lastActivityDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      newStreak += 1;
    } else if (diffDays > 1) {
      newStreak = 1;
    }
    updated = true;
  }

  // 4. Evaluate Badges
  const currentBadges = profile.badges || [];
  const newBadges = [...currentBadges];
  let badgesUpdated = false;

  // Badge: First Post
  if (profile.post_count > 0 && !newBadges.some(b => b.id === 'first_post')) {
    const badge = ARENA_BADGES.find(b => b.id === 'first_post');
    if (badge) {
      newBadges.push(badge);
      badgesUpdated = true;
    }
  }

  // Badge: Streak 3 days
  if (newStreak >= 3 && !newBadges.some(b => b.id === 'active_athlete')) {
    const badge = ARENA_BADGES.find(b => b.id === 'active_athlete');
    if (badge) {
      newBadges.push(badge);
      badgesUpdated = true;
    }
  }

  // Badge: Streak 7 days
  if (newStreak >= 7 && !newBadges.some(b => b.id === 'marathoner')) {
    const badge = ARENA_BADGES.find(b => b.id === 'marathoner');
    if (badge) {
      newBadges.push(badge);
      badgesUpdated = true;
    }
  }

  // Badge: Complete Profile
  if (isProfileComplete(profile) && !newBadges.some(b => b.id === 'complete_profile')) {
    const badge = ARENA_BADGES.find(b => b.id === 'complete_profile');
    if (badge) {
      newBadges.push(badge);
      badgesUpdated = true;
    }
  }

  // Badge: Frequent Competitor
  if (profile.championship_count >= 5 && !newBadges.some(b => b.id === 'frequent_competitor')) {
    const badge = ARENA_BADGES.find(b => b.id === 'frequent_competitor');
    if (badge) {
      newBadges.push(badge);
      badgesUpdated = true;
    }
  }

  // Badge: Content Creator
  if ((profile.image_count + profile.video_count) >= 10 && !newBadges.some(b => b.id === 'content_creator')) {
    const badge = ARENA_BADGES.find(b => b.id === 'content_creator');
    if (badge) {
      newBadges.push(badge);
      badgesUpdated = true;
    }
  }

  // 5. Save changes
  if (updated || badgesUpdated) {
    const updateData: any = {};
    if (updated) {
      updateData.streak_count = newStreak;
      updateData.last_activity_date = todayStr;
    }
    if (badgesUpdated) {
      updateData.badges = newBadges;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', athleteId);

    if (updateError) console.error('Error updating engagement stats:', updateError);
  }

  return { streak: newStreak, badges: newBadges, stats };
};

export const recalculateAllRankings = async () => {
  // Fetch all athlete profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id')
    .neq('role', 'admin');

  if (profilesError) throw profilesError;

  const results = [];
  for (const profile of profiles) {
    try {
      const stats = await calculateAndUpdateStats(profile.id);
      results.push({ id: profile.id, success: true, stats });
    } catch (err) {
      console.error(`Error recalculating stats for athlete ${profile.id}:`, err);
      results.push({ id: profile.id, success: false, error: err });
    }
  }

  return results;
};

export const getAthleteRankings = async (athlete: ArenaProfile) => {
  if (!athlete) return { world: 0, national: 0, city: 0 };

  const getRank = async (filterFn: (q: any) => any) => {
    // 1. Count athletes with strictly higher arena_score
    const higherScoreQuery = supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .neq('role', 'admin')
      .eq('perfil_publico', true)
      .gt('arena_score', athlete.arena_score);
    
    // 2. Count athletes with equal arena_score but older profile (created_at)
    // Using created_at as tie-breaker to match ArenaRankings.tsx
    const tieQuery = supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .neq('role', 'admin')
      .eq('perfil_publico', true)
      .eq('arena_score', athlete.arena_score)
      .lt('created_at', athlete.created_at);

    filterFn(higherScoreQuery);
    filterFn(tieQuery);

    const [{ count: higherCount }, { count: tieCount }] = await Promise.all([
      higherScoreQuery,
      tieQuery
    ]);

    return (higherCount || 0) + (tieCount || 0) + 1;
  };

  const isVisible = athlete.perfil_publico && athlete.arena_score > 0;
  if (!isVisible) return { world: 0, national: 0, city: 0 };

  const [world, national, city] = await Promise.all([
    getRank(q => q), // World: no extra filters
    (athlete.country_id || athlete.country) 
      ? getRank(q => {
          if (athlete.country_id) return q.eq('country_id', athlete.country_id);
          return q.ilike('country', athlete.country!);
        })
      : Promise.resolve(0),
    (athlete.city_id || athlete.city)
      ? getRank(q => {
          if (athlete.city_id) return q.eq('city_id', athlete.city_id);
          return q.ilike('city', athlete.city!);
        })
      : Promise.resolve(0)
  ]);

  return { world, national, city };
};

export const searchTeams = async (query: string) => {
  if (!query || query.length < 2) return [];
  
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .ilike('name', `%${query}%`)
    .limit(10);
    
  if (error) throw error;
  return data as Team[];
};

export const getTeams = async () => {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('name', { ascending: true });
    
  if (error) throw error;
  return data as Team[];
};

export const searchAthletes = async (query: string) => {
  try {
    let baseQuery = supabase
      .from('profiles')
      .select('*')
      .eq('perfil_publico', true)
      .neq('id', (await supabase.auth.getUser()).data.user?.id) // Prevent self-search
      .neq('role', 'admin');

    // Filter by name, username or team if query provided
    if (query && query.trim().length > 0) {
      baseQuery = baseQuery.or(`full_name.ilike.%${query}%,nickname.ilike.%${query}%,team.ilike.%${query}%,username.ilike.%${query}%`);
    }

    const { data, error } = await baseQuery
      .order('arena_score', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('[ARENACORE] Error in searchAthletes:', error);
      throw error;
    }
    
    return (data || []) as ArenaProfile[];
  } catch (err) {
    console.error('[ARENACORE] Search failed:', err);
    return [];
  }
};

export const getActivePromotions = async () => {
  const { data, error } = await supabase
    .from('arena_ads')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data as ArenaAd[];
};

export interface CardData {
  title?: string;
  description?: string;
  image?: string;
  athleteName: string;
  achievement: string;
  modality: string;
  date?: string;
  profileUrl?: string;
  mainImageUrl?: string;
  type?: 'post' | 'certificate' | 'clip' | 'profile' | 'ranking' | 'fight' | 'championship' | 'ad';
  realId?: string;
}

export const generateShareLink = ({ type, id }: { type: string; id: string }) => {
  if (!type || !id) {
    throw new Error('Dados inválidos para gerar link');
  }
  
  // Requisito Absoluto: Todo compartilhamento DEVE usar /share/:type/:id
  return `${window.location.origin}/share/${type}/${id}`;
};

export const generateCard = async (data: CardData) => {
  console.log('🚀 Gerando URL de compartilhamento para o card:', data);
  
  if (!data || !data.athleteName) {
    console.error('❌ DADOS INVÁLIDOS PARA O CARD:', data);
    throw new Error('Dados inválidos para geração do card');
  }

  // --- ARQUITETURA DE TOKEN CURTO (Short Link) - PREFERENCIAL ---
  try {
    const response = await fetch(getApiUrl('/api/share/create'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: data.title || data.athleteName || 'ArenaComp',
        description: data.description || data.achievement || 'Confira este conteúdo na ArenaComp!',
        image: data.image || data.mainImageUrl,
        type: data.type || 'post',
        realId: data.realId
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.shareUrl) {
        const fullUrl = `${window.location.origin}${result.shareUrl}`;
        console.log('[SHORT TOKEN]', result.token);
        console.log('[SHARE IMAGE]', data.image || data.mainImageUrl);
        console.log('[arenaService] Link curto gerado via API:', fullUrl);
        return fullUrl;
      }
    }
  } catch (err) {
    console.warn('[arenaService] Erro ao criar link curto, tentando fallback:', err);
  }

  // Se o token falhar e tivermos realId, usamos o formato direto como segundo fallback
  if (data.type && data.realId) {
    const shareUrl = generateShareLink({ type: data.type, id: data.realId });
    console.log('[arenaService] URL direta gerada como fallback:', shareUrl);
    return shareUrl;
  }

  // --- FALLBACK FINAL: Base64 ---
  try {
    // Standardize the payload to { title, description, image, type }
    const standardizedPayload = {
      title: data.title || data.athleteName || 'ArenaComp',
      description: data.description || data.achievement || 'Confira este conteúdo na ArenaComp!',
      image: data.image || data.mainImageUrl,
      type: data.type || 'post',
      athleteName: data.athleteName,
      achievement: data.achievement,
      modality: data.modality,
      realId: data.realId
    };

    const jsonString = JSON.stringify(standardizedPayload);
    // Usamos encodeURIComponent + unescape para garantir suporte a caracteres UTF-8 (acentos, etc)
    const base64Data = btoa(unescape(encodeURIComponent(jsonString)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    // Use the new format /share/${type}/${id}
    const type = data.type || 'post';
    const shareUrl = `${window.location.origin}/share/${type}/${base64Data}`;
    console.log('[arenaService] URL de compartilhamento padronizada (Base64 URL-Safe):', shareUrl);
    
    return shareUrl;
  } catch (error: any) {
    console.error('[arenaService] Erro ao gerar link de compartilhamento:', error);
    throw new Error('Falha ao gerar o link de compartilhamento.');
  }
};

export const shareCard = async (url: string, title: string = 'Minha conquista no ArenaComp') => {
  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text: 'Veja minha conquista na ArenaComp 🔥',
        url: url
      });
      return true;
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      // Fallback para abrir em nova aba se falhar
      window.open(url, '_blank');
      return false;
    }
  } else {
    window.open(url, '_blank');
    return true;
  }
};

export const shareWhatsApp = (url: string, text: string = 'Veja minha conquista na ArenaComp 🔥') => {
  const message = encodeURIComponent(`${text} ${url}`);
  window.open(`https://wa.me/?text=${message}`, '_blank');
};

export const shareToArenaComp = async (data: CardData, shareUrl: string, customImageUrl?: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  // Formatar conteúdo do post
  const content = `COMPARTILHOU UMA CONQUISTA: ${data.title || data.achievement}`.toUpperCase();
  
  // Criar postagem no feed
  const { error } = await supabase
    .from('posts')
    .insert({
      author_id: user.id,
      content: content,
      type: 'image',
      media_url: customImageUrl || data.mainImageUrl || null,
      hashtags: '#ARENACOMP #CONQUISTA #JIUJITSU'
    });

  if (error) throw error;
  return true;
};

export const shareToSocial = async (imageUrl: string, text: string, url?: string) => {
  try {
    console.log('[shareToSocial] Iniciando compartilhamento social:', { imageUrl: imageUrl.substring(0, 50) + '...', text, url });
    
    // Solução 2: Corrigir Fetch com CORS e cache: no-cache
    const response = await fetch(imageUrl, {
      mode: 'cors',
      cache: 'no-cache'
    });

    if (!response.ok) {
      console.error('[shareToSocial] Erro ao baixar imagem:', response.status, response.statusText);
      throw new Error(`Erro ao baixar imagem: ${response.status}`);
    }

    const blob = await response.blob();

    if (!blob || blob.size === 0) {
      console.error('[shareToSocial] Blob inválido ou vazio');
      throw new Error('Blob inválido ou vazio');
    }

    const file = new File([blob], "arenacomp.png", {
      type: blob.type || 'image/png',
    });

    const shareText = url ? `${text}\n\nConfira na ArenaComp: ${url}` : text;

    // Solução 3: Fallback Robusto
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      console.log('[shareToSocial] Usando Web Share API nativa');
      await navigator.share({
        files: [file],
        title: 'ArenaComp',
        text: shareText,
      });
      return { success: true, method: 'native' };
    } else {
      console.log('[shareToSocial] Web Share API não suportada para arquivos, usando fallback de download');
      // fallback: download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'arenacomp.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Pequeno delay para garantir o download antes de revogar
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      return { success: true, method: 'download' };
    }
  } catch (error: any) {
    console.error('[shareToSocial] Erro crítico no compartilhamento:', error);
    
    // Fallback final: abrir a imagem em nova aba se possível
    if (imageUrl && !imageUrl.startsWith('data:')) {
      console.log('[shareToSocial] Fallback final: abrindo URL em nova aba');
      window.open(imageUrl, '_blank');
    }
    
    throw error;
  }
};
