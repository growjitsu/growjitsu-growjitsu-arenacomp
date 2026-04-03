import { supabase } from './supabase';
import { UserType } from '../types';

export interface SignUpData {
  email: string;
  password?: string;
  name: string;
  userType: UserType;
  // Athlete specific
  gender?: 'Masculino' | 'Feminino';
  birthDate?: string;
  belt?: string;
  weight?: number;
}

export const authService = {
  /**
   * Registers a new user in Supabase Auth and creates records in 'usuarios' and 'atletas' tables.
   */
  async signUp(data: SignUpData) {
    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          nome: data.name,
          tipo_usuario: data.userType,
        }
      }
    });

    if (authError) {
      console.error('Erro no Supabase Auth:', authError.message);
      throw authError;
    }
    
    if (!authData.user) {
      throw new Error('Falha ao criar usuário no Auth: Usuário não retornado.');
    }

    const userId = authData.user.id;

    try {
      // 2. Insert into 'usuarios' table (Profiles)
      const { error: profileError } = await supabase
        .from('usuarios')
        .upsert({
          id: userId,
          nome: data.name,
          email: data.email,
          tipo_usuario: data.userType,
          perfil_ativo: data.userType,
        }, { onConflict: 'id' });

      if (profileError) {
        console.error('Erro ao salvar perfil (usuarios):', profileError.message, profileError.details);
        throw new Error(`Erro no banco de dados (perfil): ${profileError.message}`);
      }

      // 2.1 Insert into 'profiles' table for ArenaComp features
      const { error: arenaProfileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          username: data.name.toLowerCase().replace(/\s+/g, '_') + '_' + Math.random().toString(36).substring(2, 7),
          full_name: data.name.toUpperCase(),
          email: data.email.toLowerCase(),
          role: data.userType === 'atleta' ? 'athlete' : 'coach',
          perfil_publico: true,
          permitir_seguidores: true
        }, { onConflict: 'id' });

      if (arenaProfileError) {
        console.warn('Erro ao salvar perfil Arena (profiles):', arenaProfileError.message);
        // Don't throw here as the main profile was saved
      }

      // 3. If user is an athlete, insert into 'atletas' table
      if (data.userType === 'atleta') {
        const { error: athleteError } = await supabase
          .from('atletas')
          .upsert({
            usuario_id: userId,
            genero: data.gender || 'Masculino',
            data_nascimento: data.birthDate || new Date().toISOString().split('T')[0],
            graduacao: data.belt || 'FAIXA BRANCA',
            peso_kg: data.weight || 0,
          }, { onConflict: 'usuario_id' });

        if (athleteError) {
          console.error('Erro ao salvar dados de atleta:', athleteError.message, athleteError.details);
          throw new Error(`Erro no banco de dados (atleta): ${athleteError.message}`);
        }
      }
    } catch (dbErr: any) {
      // Se falhar a inserção no banco, o usuário já foi criado no Auth.
      // Em produção, você poderia tentar deletar o usuário do Auth aqui se necessário.
      console.error('Falha crítica na persistência de dados:', dbErr);
      throw dbErr;
    }

    return authData;
  },

  /**
   * Signs in a user and fetches their profile to determine redirect.
   */
  async signIn(email: string, password?: string) {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: password || '',
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Usuário não encontrado');

    // Fetch profile to confirm user type
    const { data: profile, error: profileError } = await supabase
      .from('usuarios')
      .select('tipo_usuario, perfil_ativo')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.warn('Perfil não encontrado, usando meta-dados do Auth:', profileError);
      return {
        user: authData.user,
        userType: authData.user.user_metadata?.tipo_usuario as UserType || 'atleta',
        activeProfile: authData.user.user_metadata?.tipo_usuario as UserType || 'atleta'
      };
    }

    return {
      user: authData.user,
      userType: profile.tipo_usuario as UserType,
      activeProfile: profile.perfil_ativo as UserType
    };
  },

  /**
   * Switches the active profile for coordinators.
   */
  async switchProfile(userId: string, newProfile: UserType) {
    const { error } = await supabase
      .from('usuarios')
      .update({ perfil_ativo: newProfile })
      .eq('id', userId);

    if (error) throw error;
    return true;
  },

  /**
   * Signs out the current user.
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Gets the current session and user profile.
   */
  async getCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: profile } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', session.user.id)
      .single();

    return {
      session,
      user: session.user,
      profile
    };
  }
};
