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
          name: data.name,
          user_type: data.userType,
        }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Falha ao criar usuário');

    const userId = authData.user.id;

    // 2. Insert into 'usuarios' table (Profiles)
    const { error: profileError } = await supabase
      .from('usuarios')
      .insert({
        id: userId,
        nome: data.name,
        email: data.email,
        tipo_usuario: data.userType,
      });

    if (profileError) {
      console.error('Erro ao criar perfil:', profileError);
      // Note: In a production app, you might want to delete the auth user if profile fails
      // or handle it with a database trigger (recommended).
      throw profileError;
    }

    // 3. If user is an athlete, insert into 'atletas' table
    if (data.userType === 'athlete') {
      const { error: athleteError } = await supabase
        .from('atletas')
        .insert({
          usuario_id: userId,
          genero: data.gender || 'Masculino',
          data_nascimento: data.birthDate || new Date().toISOString().split('T')[0],
          faixa: data.belt || 'Branca',
          peso: data.weight || 0,
        });

      if (athleteError) {
        console.error('Erro ao criar registro de atleta:', athleteError);
        throw athleteError;
      }
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
      .select('tipo_usuario')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.warn('Perfil não encontrado, usando meta-dados do Auth:', profileError);
      return {
        user: authData.user,
        userType: authData.user.user_metadata?.user_type as UserType || 'athlete'
      };
    }

    return {
      user: authData.user,
      userType: profile.tipo_usuario as UserType
    };
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
