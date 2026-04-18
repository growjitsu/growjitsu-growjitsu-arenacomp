import { supabase } from './supabase';
import { ArenaChallenge, ChallengeStatus, ChallengeOutcome, ChallengeResolution } from '../types';
import { calculateAndUpdateStats } from './arenaService';

export const challengeService = {
  async createChallenge(challengerId: string, challengedId: string, eventId?: string, eventName?: string) {
    // BACKEND VALIDATION: Ensure the challenged athlete exists in profiles
    const { data: profileCheck, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', challengedId)
      .single();

    if (checkError || !profileCheck) {
      throw new Error(`Atleta desafiado (ID: ${challengedId}) não encontrado no sistema.`);
    }

    const { data, error } = await supabase
      .from('challenges')
      .insert({
        challenger_id: challengerId,
        challenged_id: challengedId,
        event_id: eventId,
        event_name: eventName,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    
    // Create notification for challenged athlete
    await supabase.from('notifications').insert({
      user_id: challengedId,
      actor_id: challengerId,
      type: 'challenge_received',
      content: 'Você recebeu um novo desafio 1x1!'
    });

    return data as ArenaChallenge;
  },

  async updateChallengeStatus(challengeId: string, status: ChallengeStatus) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const updateData: any = { status, updated_at: new Date().toISOString() };
    if (status === 'accepted') {
      updateData.accepted_at = new Date().toISOString();
    } else if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('challenges')
      .update(updateData)
      .eq('id', challengeId)
      .select()
      .single();

    if (error) throw error;

    // Notify the other party
    const challenge = data as ArenaChallenge;
    const notifiedUserId = user.id === challenge.challenger_id ? challenge.challenged_id : challenge.challenger_id;
    
    let notificationType = 'challenge_updated';
    let content = `Status do desafio atualizado para: ${status}`;

    if (status === 'accepted') {
      notificationType = 'challenge_accepted';
      content = 'Seu desafio foi aceito! Prepare-se para a arena.';
      
      // CREATE "Challenge Accepted" POST
      await this.createChallengeAcceptedPost(challenge);
    } else if (status === 'declined') {
      content = 'Seu desafio foi recusado.';
    }

    await supabase.from('notifications').insert({
      user_id: notifiedUserId,
      actor_id: user.id,
      type: notificationType,
      content
    });

    return challenge;
  },

  async createChallengeAcceptedPost(challenge: ArenaChallenge) {
    // Fetch profile names
    const { data: challenger } = await supabase.from('profiles').select('full_name, username').eq('id', challenge.challenger_id).single();
    const { data: challenged } = await supabase.from('profiles').select('full_name, username').eq('id', challenge.challenged_id).single();

    if (!challenger || !challenged) return;

    const content = `🔥 DESAFIO ACEITO! @${challenger.username} vs @${challenged.username}${challenge.event_name ? ` no evento ${challenge.event_name}` : ''}. Quem sairá vitorioso? 👊🏆`;

    await supabase.from('posts').insert({
      author_id: challenge.challenger_id,
      type: 'image', // Or a new type if preferred
      content,
      // media_url: ... potential challenge card?
    });
  },

  async resolveChallenge(challengeId: string, outcome: ChallengeOutcome, resolutionType: ChallengeResolution) {
    const { data, error } = await supabase
      .from('challenges')
      .update({
        status: 'completed',
        outcome,
        resolution_type: resolutionType,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', challengeId)
      .select()
      .single();

    if (error) throw error;

    const challenge = data as ArenaChallenge;

    // Create a result post
    await this.createChallengeResultPost(challenge);

    // Update athlete stats (wins/losses/arena_score)
    // We'll need a way to incorporate this into arenaService.calculateAndUpdateStats or similar
    // For now, let's just trigger stats update for both
    await this.updateAthleteStats(challenge.challenger_id);
    await this.updateAthleteStats(challenge.challenged_id);

    return challenge;
  },

  async createChallengeResultPost(challenge: ArenaChallenge) {
    const { data: challenger } = await supabase.from('profiles').select('full_name, username').eq('id', challenge.challenger_id).single();
    const { data: challenged } = await supabase.from('profiles').select('full_name, username').eq('id', challenge.challenged_id).single();

    if (!challenger || !challenged) return;

    let resultText = '';
    if (challenge.outcome === 'challenger_win') {
      resultText = `🏆 @${challenger.username} venceu o desafio contra @${challenged.username}!`;
    } else if (challenge.outcome === 'challenged_win') {
      resultText = `🏆 @${challenged.username} venceu o desafio contra @${challenger.username}!`;
    } else {
      resultText = `🤝 O desafio entre @${challenger.username} e @${challenged.username} terminou em empate!`;
    }

    if (challenge.resolution_type === 'non_attendance') {
      resultText += ' (Vitória por W.O. - Não comparecimento)';
    }

    await supabase.from('posts').insert({
      author_id: challenge.outcome === 'challenger_win' ? challenge.challenger_id : (challenge.outcome === 'challenged_win' ? challenge.challenged_id : challenge.challenger_id),
      type: 'image',
      content: resultText + ` #1v1 #ArenaComp #DesafioResolvido`
    });
  },

  async updateAthleteStats(athleteId: string) {
    try {
      await calculateAndUpdateStats(athleteId);
    } catch (err) {
      console.error(`Error updating stats for athlete ${athleteId}:`, err);
    }
  },

  async checkChallengesForNonAttendance(eventId: string, eventName: string) {
    // 1. Get all accepted challenges for this event
    const { data: challenges, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('status', 'accepted')
      .or(`event_id.eq.${eventId},event_name.ilike.%${eventName}%`);

    if (error || !challenges) return;

    for (const challenge of challenges) {
      // 2. Check registration/results for both athletes
      const { data: challengerResult } = await supabase
        .from('championship_results')
        .select('id')
        .eq('athlete_id', challenge.challenger_id)
        .eq('campeonato_nome', eventName)
        .maybeSingle();

      const { data: challengedResult } = await supabase
        .from('championship_results')
        .select('id')
        .eq('athlete_id', challenge.challenged_id)
        .eq('campeonato_nome', eventName)
        .maybeSingle();

      // 3. Logic for W.O.
      if (challengerResult && !challengedResult) {
        // Challenger attended, Challenged did not
        await this.resolveChallenge(challenge.id, 'challenger_win', 'non_attendance');
      } else if (!challengerResult && challengedResult) {
        // Challenged attended, Challenger did not
        await this.resolveChallenge(challenge.id, 'challenged_win', 'non_attendance');
      } else if (!challengerResult && !challengedResult) {
        // Both did not attend
        await this.resolveChallenge(challenge.id, 'draw', 'non_attendance');
      }
    }
  }
};
