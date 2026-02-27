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
    console.log('Iniciando processo de cadastro para:', data.email, 'Tipo:', data.userType);
    
    // 1. Criar usuário no Supabase Auth
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

    if (authError) {
      console.error('Erro no Supabase Auth:', authError);
      throw authError;
    }
    
    if (!authData.user) throw new Error('Usuário criado no Auth mas sem dados de retorno.');

    const userId = authData.user.id;
    console.log('Usuário Auth criado com ID:', userId);

    // 2. Inserir ou Atualizar (Upsert) na tabela usuarios
    // Usamos upsert para garantir que, se um trigger já criou o registro, 
    // nós o sobrescrevemos com os dados CORRETOS escolhidos pelo usuário.
    const { error: profileError } = await supabase
      .from('usuarios')
      .upsert({
        id: userId,
        nome: data.name,
        email: data.email,
        tipo_usuario: data.userType,
        perfil_ativo: data.userType,
      });

    if (profileError) {
      console.error('ERRO NO BANCO (usuarios):', profileError);
      throw new Error(`Erro ao salvar perfil: ${profileError.message}`);
    }

    // 3. Registro na tabela atletas se necessário
    if (data.userType === 'athlete') {
      const { error: athleteError } = await supabase.from('atletas').insert({
        usuario_id: userId,
        genero: data.gender || 'Masculino',
        faixa: data.belt || 'Branca',
        peso: data.weight || 0,
      });
      if (athleteError) console.error('Aviso: Erro ao criar registro complementar de atleta:', athleteError);
    }

    return authData;
  },

  async switchProfile(newProfile: UserType) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Não autenticado');

    // Update perfil_ativo no banco
    const { error } = await supabase
      .from('usuarios')
      .update({ perfil_ativo: newProfile })
      .eq('id', session.user.id);

    if (error) {
      console.error('Erro no Supabase Update:', error);
      throw error;
    }
    
    return true;
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
