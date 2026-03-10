import { supabase } from './supabase';
import { ArenaFight, ArenaProfile } from '../types';

export const calculateAndUpdateStats = async (athleteId: string) => {
  // Fetch all fights for the athlete
  const { data: fights, error: fightsError } = await supabase
    .from('fights')
    .select('*')
    .eq('athlete_id', athleteId);

  if (fightsError) throw fightsError;

  const totalFights = fights.length;
  const wins = fights.filter(f => f.resultado === 'win').length;
  const losses = fights.filter(f => f.resultado === 'loss').length;
  const winRate = totalFights > 0 ? (wins / totalFights) * 100 : 0;

  // Arena Score = (wins * 10) - (losses * 3) + (submissions/knockouts * 5)
  // submissions/knockouts are 'finalização' and 'nocaute'
  const bonusPoints = fights.filter(f => 
    f.resultado === 'win' && (f.tipo_vitoria === 'finalização' || f.tipo_vitoria === 'nocaute')
  ).length * 5;

  const arenaScore = (wins * 10) - (losses * 3) + bonusPoints;

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
