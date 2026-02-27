export type UserType = 'organizer' | 'athlete';

export interface UserProfile {
  id: string;
  nome: string;
  email: string;
  tipo_usuario: UserType;
  perfil_ativo: UserType;
  criado_em: string;
}

export interface AthleteProfile {
  id: string;
  user_id: string;
  gender: Gender;
  birth_date: string;
  belt: Belt;
  weight: number;
  age_category: string;
  weight_category: string;
}

export interface Championship {
  id: string;
  name: string;
  date: string;
  location: string;
  created_by: string;
  status: 'open' | 'closed' | 'finished';
}

export interface Registration {
  id: string;
  athlete_id: string;
  championship_id: string;
  final_category: string;
  status: 'pending' | 'confirmed' | 'disqualified';
}
