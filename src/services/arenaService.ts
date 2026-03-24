import { supabase } from './supabase';
import { ArenaFight, ArenaProfile, Team } from '../types';

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

  // Calculate Fight Stats
  let wins = fights.filter(f => f.resultado === 'win').length;
  let losses = fights.filter(f => f.resultado === 'loss').length;
  
  // Arena Score from Fights = (wins * 10) - (losses * 3) + (submissions/knockouts * 5)
  const bonusPoints = fights.filter(f => 
    f.resultado === 'win' && (f.tipo_vitoria === 'finalização' || f.tipo_vitoria === 'nocaute')
  ).length * 5;

  let arenaScore = (wins * 10) - (losses * 3) + bonusPoints;

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
    .gt('arena_score', athlete.arena_score);

  // National Ranking
  let nationalHigher = 0;
  if (athlete.country) {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('country', athlete.country)
      .gt('arena_score', athlete.arena_score);
    nationalHigher = count || 0;
  }

  // City Ranking
  let cityHigher = 0;
  if (athlete.city) {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('city', athlete.city)
      .gt('arena_score', athlete.arena_score);
    cityHigher = count || 0;
  }

  return {
    world: (worldHigher || 0) + 1,
    national: athlete.country ? nationalHigher + 1 : 0,
    city: athlete.city ? cityHigher + 1 : 0
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

export interface CardData {
  title?: string;
  athleteName: string;
  achievement: string;
  modality: string;
  date?: string;
  profileUrl: string;
  mainImageUrl?: string;
  type?: 'post' | 'certificate' | 'clip' | 'profile';
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
    console.log('[arenaService] URL curta gerada:', shareUrl);
    return shareUrl;
  }

  try {
    // Encode data to Base64 to create a shareable ID (Fallback para compatibilidade)
    const jsonString = JSON.stringify(data);
    const base64Data = btoa(jsonString);
    
    // Use the new format /share/${type}/${id}
    const type = data.type || 'post';
    const shareUrl = `${window.location.origin}/share/${type}/${base64Data}`;
    console.log('[arenaService] URL de compartilhamento gerada (Base64):', shareUrl);
    
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
