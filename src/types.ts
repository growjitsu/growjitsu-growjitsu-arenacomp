export type UserType = 'atleta' | 'coordenador' | 'responsavel';

export type Belt = 'Branca' | 'Cinza' | 'Amarela' | 'Laranja' | 'Verde' | 'Azul' | 'Roxa' | 'Marrom' | 'Preta';

export type Gender = 'Masculino' | 'Feminino';

export interface UserProfile {
  id: string;
  nome: string;
  email: string;
  tipo_usuario: UserType;
  perfil_ativo: UserType;
  foto_url?: string;
  created_at: string;
}

export interface AthleteProfile {
  usuario_id: string;
  nome_completo: string;
  genero: Gender;
  graduacao: string;
  data_nascimento: string;
  peso_kg: number;
  equipe: string;
  equipe_id?: string;
  perfil_completo: boolean;
  foto_url?: string;
  atualizado_em: string;
}

export interface Equipe {
  id: string;
  nome: string;
  responsavel_id: string;
  filiacao?: string;
  created_at: string;
}

export interface Evento {
  id: string;
  nome: string;
  data: string;
  horario_inicio: string;
  local: string;
  logo_url?: string;
  status: 'rascunho' | 'aberto' | 'fechado' | 'em_andamento' | 'finalizado';
  coordenador_id: string;
}

export interface CategoriaEvento {
  id: string;
  evento_id: string;
  nome: string;
  peso_min?: number;
  peso_max?: number;
  faixa?: string;
  idade_min?: number;
  idade_max?: number;
  sexo: 'M' | 'F' | 'Unissex';
  status_chave: 'pendente' | 'gerada' | 'finalizada';
}

export interface Inscricao {
  id: string;
  evento_id: string;
  atleta_id: string;
  categoria_id: string;
  nome_atleta: string;
  equipe: string;
  faixa: string;
  peso_atual: number;
  status_pagamento: string;
  status_operacional: 'inscrito' | 'peso_ok' | 'aquecimento' | 'pronto' | 'lutando' | 'finalizado';
}

export interface Luta {
  id: string;
  evento_id: string;
  categoria_id: string;
  atleta_a_id?: string;
  atleta_b_id?: string;
  vencedor_id?: string;
  rodada: number;
  posicao_chave: number;
  status: 'agendada' | 'em_andamento' | 'finalizada' | 'bye';
  luta_anterior_a_id?: string;
  luta_anterior_b_id?: string;
  atleta_a?: { nome: string, equipe: string };
  atleta_b?: { nome: string, equipe: string };
}
