import { supabase } from './supabase';
import { ArenaChallenge, ChallengeStatus, ChallengeType, ChallengeResult } from '../types';
import { calculateAndUpdateStats } from './arenaService';

export const challengeService = {
  async createChallenge(
    challengerId: string, 
    challengedId: string, 
    eventId: string, 
    eventName: string,
    challengeType: ChallengeType = 'category'
  ) {
    console.log(`[SERVICE] Creating challenge: ${challengerId} -> ${challengedId}`);
    
    // BACKEND VALIDATION: Check mandatory fields
    if (!eventId || !eventName) {
      throw new Error('A seleção de um evento é obrigatória para criar um desafio.');
    }

    // BACKEND VALIDATION: Check both athletes in the profiles table
    const { data: profiles, error: checkError } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .in('id', [challengerId, challengedId]);

    if (checkError) {
      console.error('[SERVICE] Profile check failed:', checkError);
      throw new Error(`Erro ao verificar atletas: ${checkError.message}`);
    }

    const challengerProfile = profiles?.find(p => p.id === challengerId);
    const challengedProfile = profiles?.find(p => p.id === challengedId);

    if (!challengedProfile) {
      console.error(`[SERVICE] Challenged ID ${challengedId} not found in profiles.`);
      throw new Error(`O atleta selecionado não foi encontrado no sistema.`);
    }
    if (!challengerProfile) {
      console.error(`[SERVICE] Challenger ID ${challengerId} not found in profiles.`);
      throw new Error(`Seu perfil de atleta não foi encontrado ou está inacessível.`);
    }

    // SAFE EVENT ID: Only send event_id if it's explicitly from the 'eventos' table
    // We check if the ID exists in 'eventos' before inserting to avoid FK violation
    let safeEventId: string | null = null;
    if (eventId) {
      const { data: eventCheck } = await supabase
        .from('eventos')
        .select('id')
        .eq('id', eventId)
        .maybeSingle();
      
      if (eventCheck) {
        safeEventId = eventId;
      }
    }

    const { data, error } = await supabase
      .from('challenges')
      .insert({
        challenger_id: challengerId,
        challenged_id: challengedId,
        event_id: safeEventId,
        event_name: eventName,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('[SERVICE] Challenge insert failed:', error);
      // Detailed error for FK violations
      if (error.code === '23503') {
        throw new Error(`Erro de Integridade: O atleta selecionado não pôde ser vinculado ao desafio. Verifique se ambos os perfis estão completos.`);
      }
      throw error;
    }
    
    // Create detailed notification for challenged athlete
    await supabase.from('notifications').insert({
      user_id: challengedId,
      actor_id: challengerId,
      type: 'challenge', // Notification type requested
      title: 'Você foi desafiado!',
      description: `${challengerProfile.full_name} te desafiou para um confronto 1x1 em ${eventName}!`,
      content: `${challengerProfile.full_name} te desafiou para um confronto 1x1 em ${eventName}!`
    });

    // Create automatic post for engagement
    try {
      await this.createChallengeLaunchedPost(data as ArenaChallenge);
    } catch (postErr) {
      console.error('[SERVICE] Post generation failed after challenge creation:', postErr);
    }

    return data as ArenaChallenge;
  },

  async updateChallengeStatus(challengeId: string, status: ChallengeStatus) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Fetch challenge to check permissions
    const { data: challenge, error: fetchError } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (fetchError || !challenge) throw new Error('Desafio não encontrado');

    const isChallenger = user.id === challenge.challenger_id;
    const isChallenged = user.id === challenge.challenged_id;

    if (!isChallenger && !isChallenged) throw new Error('Não autorizado');

    // Rule: after accepted, cannot delete (handled in UI, but safe to keep in mind)
    // Rule: after finished, cannot edit or delete

    const updateData: any = { status, updated_at: new Date().toISOString() };
    if (status === 'accepted') {
      updateData.accepted_at = new Date().toISOString();
    } else if (status === 'finished' || status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('challenges')
      .update(updateData)
      .eq('id', challengeId)
      .select()
      .single();

    if (error) throw error;

    const updatedChallenge = data as ArenaChallenge;
    const notifiedUserId = isChallenger ? updatedChallenge.challenged_id : updatedChallenge.challenger_id;
    
    let title = 'Desafio Atualizado';
    let description = `O status do confronto foi alterado para: ${status}`;
    let notificationType = 'challenge_updated';

    if (status === 'accepted') {
      notificationType = 'challenge_accepted';
      title = 'Desafio Aceito!';
      description = 'Prepare os protetores! Seu desafio foi aceito e o confronto está confirmado.';
      await this.createChallengeAcceptedPost(updatedChallenge);
    } else if (status === 'declined') {
      notificationType = 'challenge_declined';
      title = 'Desafio Recusado';
      description = 'O oponente não aceitou o confronto desta vez.';
      await this.createChallengeDeclinedPost(updatedChallenge);
    } else if (status === 'cancelled') {
      title = 'Desafio Cancelado';
      description = 'Este desafio foi removido do sistema.';
    } else if (status === 'finished' || status === 'completed') {
      title = 'Confronto Finalizado';
      description = 'O resultado do desafio foi registrado na arena.';
    }

    await supabase.from('notifications').insert({
      user_id: notifiedUserId,
      actor_id: user.id,
      type: notificationType,
      title,
      description,
      content: description
    });

    return updatedChallenge;
  },

  async deleteChallenge(challengeId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: challenge, error: fetchError } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (fetchError || !challenge) throw new Error('Desafio não encontrado');

    if (user.id !== challenge.challenger_id) {
      throw new Error('Apenas o criador pode excluir o desafio.');
    }

    if (challenge.status === 'accepted') {
      throw new Error('Desafios aceitos não podem ser excluídos.');
    }

    if (challenge.status === 'finished') {
      throw new Error('Desafios finalizados não podem ser excluídos.');
    }

    const { error } = await supabase.from('challenges').delete().eq('id', challengeId);
    if (error) throw error;
  },

  async submitResult(challengeId: string, result: ChallengeResult) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: challenge, error: fetchError } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (fetchError || !challenge) throw new Error('Desafio não encontrado');

    const isChallenger = user.id === challenge.challenger_id;
    const isChallenged = user.id === challenge.challenged_id;

    if (!isChallenger && !isChallenged) throw new Error('Não autorizado');

    const resultField = isChallenger ? 'challenger_result' : 'challenged_result';

    const { data, error } = await supabase
      .from('challenges')
      .update({ 
        [resultField]: result,
        updated_at: new Date().toISOString()
      })
      .eq('id', challengeId)
      .select()
      .single();

    if (error) throw error;

    const updatedChallenge = data as ArenaChallenge;

    // Check if both have submitted
    if (updatedChallenge.challenger_result && updatedChallenge.challenged_result) {
      await this.finalizeChallenge(updatedChallenge);
    }

    return updatedChallenge;
  },

  calculatePoints(result: ChallengeResult): number {
    const pointsMap = { '1st': 100, '2nd': 50, '3rd': 25, 'none': 5 };
    let total = pointsMap[result.category];
    if (result.absolute) {
      total += pointsMap[result.absolute];
    }
    return total;
  },

  async finalizeChallenge(challenge: ArenaChallenge) {
    const challengerPoints = this.calculatePoints(challenge.challenger_result!);
    const challengedPoints = this.calculatePoints(challenge.challenged_result!);

    let winnerId = null;
    if (challengerPoints > challengedPoints) {
      winnerId = challenge.challenger_id;
    } else if (challengedPoints > challengerPoints) {
      winnerId = challenge.challenged_id;
    }

    const { data, error } = await supabase
      .from('challenges')
      .update({
        status: 'finished',
        challenger_points: challengerPoints,
        challenged_points: challengedPoints,
        winner_id: winnerId,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', challenge.id)
      .select()
      .single();

    if (error) throw error;

    const finalizedChallenge = data as ArenaChallenge;

    // Post automatic result
    await this.createChallengeResultPost(finalizedChallenge);

    // Update stats
    await this.updateAthleteStats(challenge.challenger_id);
    await this.updateAthleteStats(challenge.challenged_id);

    // Notify both
    const notifyBoth = [challenge.challenger_id, challenge.challenged_id];
    for (const uid of notifyBoth) {
      await supabase.from('notifications').insert({
        user_id: uid,
        type: 'challenge_finished',
        content: `O desafio no evento ${challenge.event_name} foi finalizado!`
      });
    }
  },

  async createChallengeLaunchedPost(challenge: ArenaChallenge) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username, profile_photo, avatar_url')
      .in('id', [challenge.challenger_id, challenge.challenged_id]);

    const challenger = profiles?.find(p => p.id === challenge.challenger_id);
    const challenged = profiles?.find(p => p.id === challenge.challenged_id);

    if (!challenger || !challenged) return;

    const content = `🔥 DESAFIO LANÇADO! @${challenger.username} vs @${challenged.username} no evento ${challenge.event_name}. A ArenaComp está fervendo! Que vença o melhor. 🥊👊`;

    const photos = [challenger.profile_photo || challenger.avatar_url, challenged.profile_photo || challenged.avatar_url].filter(Boolean);

    await supabase.from('posts').insert({
      author_id: challenge.challenger_id,
      type: 'image',
      content,
      media_url: photos.length > 1 ? JSON.stringify(photos) : (photos[0] || '')
    });
  },

  async createChallengeDeclinedPost(challenge: ArenaChallenge) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username, profile_photo, avatar_url')
      .in('id', [challenge.challenger_id, challenge.challenged_id]);

    const challenger = profiles?.find(p => p.id === challenge.challenger_id);
    const challenged = profiles?.find(p => p.id === challenge.challenged_id);

    if (!challenger || !challenged) return;

    const content = `❄️ DESAFIO RECUSADO: @${challenged.username} optou por não aceitar o desafio de @${challenger.username} no evento ${challenge.event_name} desta vez. A arena continua em busca de novos combates! #1v1 #ArenaComp`;

    await supabase.from('posts').insert({
      author_id: challenge.challenged_id,
      type: 'text',
      content,
      media_url: challenged.profile_photo || challenged.avatar_url || ''
    });
  },

  async createChallengeAcceptedPost(challenge: ArenaChallenge) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username, profile_photo, avatar_url')
      .in('id', [challenge.challenger_id, challenge.challenged_id]);

    const challenger = profiles?.find(p => p.id === challenge.challenger_id);
    const challenged = profiles?.find(p => p.id === challenge.challenged_id);

    if (!challenger || !challenged) return;

    const content = `🔥 DESAFIO ACEITO! @${challenger.username} vs @${challenged.username} no evento ${challenge.event_name}. Quem sairá vitorioso? 👊🏆 #1v1 #ArenaComp #MatchConfirmado`;

    const photos = [challenger.profile_photo || challenger.avatar_url, challenged.profile_photo || challenged.avatar_url].filter(Boolean);

    await supabase.from('posts').insert({
      author_id: challenge.challenger_id,
      type: 'image',
      content,
      media_url: photos.length > 1 ? JSON.stringify(photos) : (photos[0] || '')
    });
  },

  async createChallengeResultPost(challenge: ArenaChallenge) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username, profile_photo, avatar_url')
      .in('id', [challenge.challenger_id, challenge.challenged_id]);

    const challenger = profiles?.find(p => p.id === challenge.challenger_id);
    const challenged = profiles?.find(p => p.id === challenge.challenged_id);

    if (!challenger || !challenged) return;

    let titleText = '';
    if (challenge.winner_id === challenge.challenger_id) {
      titleText = `🏆 ${challenger.full_name} (@${challenger.username}) venceu ${challenged.full_name} (@${challenged.username}) no desafio!`;
    } else if (challenge.winner_id === challenge.challenged_id) {
      titleText = `🏆 ${challenged.full_name} (@${challenged.username}) venceu ${challenger.full_name} (@${challenger.username}) no desafio!`;
    } else {
      titleText = `🤝 O desafio entre @${challenger.username} e @${challenged.username} terminou em empate!`;
    }

    const content = `${titleText}\n\n📊 Resultados:\n- ${challenger.username}: ${challenge.challenger_points} pts\n- ${challenged.username}: ${challenge.challenged_points} pts\n\n#1v1 #ArenaComp #DesafioFinalizado`;

    const photos = [challenger.profile_photo || challenger.avatar_url, challenged.profile_photo || challenged.avatar_url].filter(Boolean);

    await supabase.from('posts').insert({
      author_id: challenge.winner_id || challenge.challenger_id,
      type: 'image',
      content,
      media_url: photos.length > 1 ? JSON.stringify(photos) : (photos[0] || '')
    });
  },

  async updateAthleteStats(athleteId: string) {
    try {
      await calculateAndUpdateStats(athleteId);
    } catch (err) {
      console.error(`Error updating stats for athlete ${athleteId}:`, err);
    }
  },

  async resolveChallenge(challengeId: string, outcome: 'challenger_win' | 'challenged_win' | 'draw', resolutionType: 'fight' | 'non_attendance' | 'manual') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const winnerId = outcome === 'challenger_win' ? 'challenger_id' : outcome === 'challenged_win' ? 'challenged_id' : null;

    const { data: challenge, error: fetchError } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (fetchError || !challenge) throw new Error('Desafio não encontrado');

    const updateData: any = {
      status: 'finished',
      winner_id: winnerId ? challenge[winnerId] : null,
      updated_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('challenges')
      .update(updateData)
      .eq('id', challengeId)
      .select()
      .single();

    if (error) throw error;
    
    const finalizedChallenge = data as ArenaChallenge;
    await this.updateAthleteStats(finalizedChallenge.challenger_id);
    await this.updateAthleteStats(finalizedChallenge.challenged_id);
    
    return finalizedChallenge;
  },

  async checkChallengesForNonAttendance(eventId: string, eventName: string) {
     // This would check if there are accepted challenges for this event 
     // and if one athlete registered but the other didn't (WO logic)
     // Implementation depends on timing, usually done after event date
     console.log(`[SERVICE] Checking challenges for event: ${eventName} (${eventId})`);
  }
};
