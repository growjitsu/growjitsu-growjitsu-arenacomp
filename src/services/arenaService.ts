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
        arenaScore += 60;
        break;
      case 'Terceiro lugar':
        arenaScore += 40;
        break;
      case 'Participação':
        arenaScore += 10;
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

export const generateCard = async (data: any) => {
  const response = await fetch('/api/cards/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to generate card');
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};
