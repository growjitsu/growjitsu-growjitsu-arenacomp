import { supabase } from './supabase';
import { ArenaFight, ArenaProfile, Team, ArenaAd } from '../types';
import { getApiUrl } from '../lib/api';

export const calculateAndUpdateStats = async (athleteId: string) => {
  // Fetch all fights for the athlete
  const { data: fights, error: fightsError } = await supabase
    .from('fights')
    .select('*')
    .eq('athlete_id', athleteId);

  if (fightsError) throw fightsError;

  // Fetch all championship results for the athlete
  const { data: championships, error: champError } = await supabase
    .from('championship_results')
    .select('*')
    .eq('athlete_id', athleteId);

  if (champError) throw champError;

  // Fetch all completed challenges for the athlete
  const { data: challenges, error: challengeError } = await supabase
    .from('challenges')
      .select('*')
      .eq('status', 'completed')
      .or(`challenger_id.eq.${athleteId},challenged_id.eq.${athleteId}`);

  if (challengeError) throw challengeError;

  // Calculate Fight Stats
  let wins = fights.filter(f => f.resultado === 'win').length;
  let losses = fights.filter(f => f.resultado === 'loss').length;
  let draws = 0;

  // Add Challenge Stats
  challenges?.forEach(c => {
    if (c.challenger_id === athleteId) {
      if (c.outcome === 'challenger_win') wins++;
      else if (c.outcome === 'challenged_win') losses++;
      else if (c.outcome === 'draw') draws++;
    } else {
      if (c.outcome === 'challenged_win') wins++;
      else if (c.outcome === 'challenger_win') losses++;
      else if (c.outcome === 'draw') draws++;
    }
  });
  
  // Arena Score from Fights/Challenges = (wins * 15) - (losses * 5) + (draws * 2) + (submissions/knockouts * 5)
  // Scoring update: increased fight weight to distinguish from championships
  const bonusPoints = fights.filter(f => 
    f.resultado === 'win' && (f.tipo_vitoria === 'finalização' || f.tipo_vitoria === 'nocaute')
  ).length * 5;

  let arenaScore = (wins * 15) - (losses * 5) + (draws * 2) + bonusPoints;

  // Add Championship Stats
  championships?.forEach(champ => {
    switch (champ.resultado) {
      case 'Campeão':
        arenaScore += 100;
        break;
      case 'Vice-campeão':
        arenaScore += 50;
        break;
      case 'Terceiro lugar':
        arenaScore += 25;
        break;
      case 'Participação':
        arenaScore += 5;
        break;
    }
  });

  const totalFights = wins + losses;
  const winRate = totalFights > 0 ? (wins / totalFights) * 100 : 0;

  // Update profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      wins,
      losses,
      draws,
      total_fights: totalFights,
      win_rate: winRate,
      arena_score: arenaScore,
      updated_at: new Date().toISOString()
    })
    .eq('id', athleteId);

  if (updateError) throw updateError;

  return { wins, losses, totalFights, winRate, arenaScore };
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

  // World Ranking
  const { count: worldHigher } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .neq('role', 'admin')
    .neq('role', 'developer')
    .eq('perfil_publico', true)
    .gt('arena_score', 0)
    .gt('arena_score', athlete.arena_score);

  // National Ranking
  let nationalHigher = 0;
  if (athlete.country_id || athlete.country) {
    const nationalQuery = supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .neq('role', 'admin')
      .neq('role', 'developer')
      .eq('perfil_publico', true)
      .gt('arena_score', 0)
      .gt('arena_score', athlete.arena_score);

    if (athlete.country_id) {
      nationalQuery.eq('country_id', athlete.country_id);
    } else {
      nationalQuery.eq('country', athlete.country);
    }

    const { count } = await nationalQuery;
    nationalHigher = count || 0;
  }

  // City Ranking
  let cityHigher = 0;
  if (athlete.city_id || athlete.city) {
    const cityQuery = supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .neq('role', 'admin')
      .neq('role', 'developer')
      .eq('perfil_publico', true)
      .gt('arena_score', 0)
      .gt('arena_score', athlete.arena_score);

    if (athlete.city_id) {
      cityQuery.eq('city_id', athlete.city_id);
    } else {
      cityQuery.eq('city', athlete.city);
    }

    const { count } = await cityQuery;
    cityHigher = count || 0;
  }

  const isVisible = athlete.perfil_publico && athlete.arena_score > 0;

  return {
    world: isVisible ? (worldHigher || 0) + 1 : 0,
    national: (isVisible && athlete.country) ? nationalHigher + 1 : 0,
    city: (isVisible && athlete.city) ? cityHigher + 1 : 0
  };
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
  type?: 'post' | 'certificate' | 'clip' | 'profile' | 'ranking' | 'fight' | 'championship';
  realId?: string;
}

export const generateShareLink = ({ type, id }: { type: string; id: string }) => {
  if (!type || !id) {
    throw new Error('Dados inválidos para gerar link');
  }
  return `${window.location.origin}/share/${type}/${id}`;
};

export const generateCard = async (data: CardData) => {
  console.log('🚀 Gerando URL de compartilhamento para o card:', data);
  
  if (!data || !data.athleteName) {
    console.error('❌ DADOS INVÁLIDOS PARA O CARD:', data);
    throw new Error('Dados inválidos para geração do card');
  }

  // Se tivermos o realId e o type, usamos o novo formato curto para evitar URI_TOO_LONG
  if (data.type && data.realId) {
    const shareUrl = generateShareLink({ type: data.type, id: data.realId });
    console.log('[arenaService] URL direta gerada:', shareUrl);
    return shareUrl;
  }

  // --- ARQUITETURA DE TOKEN CURTO (Short Link) ---
  try {
    const response = await fetch(getApiUrl('/api/share/create'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: data.title || data.athleteName || 'ArenaComp',
        description: data.description || data.achievement || 'Confira este conteúdo na ArenaComp!',
        image: data.image || data.mainImageUrl,
        type: data.type || 'post'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.shareUrl) {
        const fullUrl = `${window.location.origin}${result.shareUrl}`;
        console.log('[arenaService] Link curto (Token) gerado via API:', fullUrl);
        return fullUrl;
      }
    }
  } catch (err) {
    console.warn('[arenaService] Erro ao criar link curto, usando fallback Base64:', err);
  }

  // --- FALLBACK: Base64 Decoding (Retro-compatibilidade) ---
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
