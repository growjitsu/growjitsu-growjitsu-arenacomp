export type UserType = 'coordinator' | 'athlete';

export type Belt = 'Branca' | 'Cinza' | 'Amarela' | 'Laranja' | 'Verde' | 'Azul' | 'Roxa' | 'Marrom' | 'Preta';

export type Gender = 'Masculino' | 'Feminino';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  user_type: UserType;
  photo_url?: string;
  created_at: string;
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
