// ArenaComp Types
export type UserRole = 'athlete' | 'coach' | 'gym' | 'admin';
export type EventLevel = 'local' | 'state' | 'national' | 'international';
export type PostType = 'text' | 'image' | 'video' | 'result';

export interface ArenaProfile {
  id: string;
  username: string;
  full_name: string;
  nickname?: string;
  role: UserRole;
  modality?: string;
  category?: string;
  weight?: number;
  height?: number;
  graduation?: string;
  gym_id?: string;
  gym_name?: string;
  professor?: string;
  city?: string;
  state?: string;
  country?: string;
  avatar_url?: string;
  profile_photo?: string;
  team?: string;
  team_id?: string;
  team_leader?: boolean;
  bio?: string;
  instagram_url?: string;
  youtube_url?: string;
  tiktok_url?: string;
  titles?: string;
  medals?: number;
  arena_score: number;
  wallet_address?: string;
  perfil_publico: boolean;
  permitir_seguidores: boolean;
  wins: number;
  losses: number;
  draws: number;
  total_fights: number;
  win_rate: number;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  professor?: string;
  city?: string;
  state?: string;
  country?: string;
  logo_url?: string;
  created_at: string;
}

export interface ArenaFight {
  id: string;
  athlete_id: string;
  opponent_name: string;
  modalidade: string;
  resultado: 'win' | 'loss';
  tipo_vitoria: 'pontos' | 'finalização' | 'nocaute' | 'decisão' | 'outro';
  evento: string;
  cidade: string;
  pais: string;
  data_luta: string;
  created_at: string;
}

export type ChampionshipPlacement = 'Campeão' | 'Vice-campeão' | 'Terceiro lugar' | 'Participação';

export interface ArenaChampionshipResult {
  id: string;
  athlete_id: string;
  championship_name: string;
  modalidade: string;
  categoria_idade: string;
  faixa?: string;
  peso?: string;
  cidade: string;
  pais: string;
  data_evento: string;
  resultado: ChampionshipPlacement;
  foto_podio_url?: string;
  created_at: string;
}

export interface ArenaAd {
  id: string;
  title: string;
  content: string;
  media_url?: string;
  link_url?: string;
  placement: 'feed_top' | 'feed_between' | 'sidebar' | 'profile';
  active: boolean;
  created_at: string;
}

export interface ArenaPost {
  id: string;
  author_id: string;
  type: PostType;
  content?: string;
  media_url?: string;
  media_urls?: string[];
  likes_count: number;
  comments_count: number;
  shares_count?: number;
  is_archived?: boolean;
  hashtags?: string;
  created_at: string;
  author?: ArenaProfile;
  is_liked?: boolean;
  comments?: ArenaComment[];
}

export interface ArenaComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: ArenaProfile;
}

export interface ArenaGym {
  id: string;
  name: string;
  owner_id?: string;
  city?: string;
  state?: string;
  address?: string;
  logo_url?: string;
  bio?: string;
  verified: boolean;
  created_at: string;
}

export interface ArenaCompetition {
  id: string;
  name: string;
  date: string;
  level: EventLevel;
  modality: string;
  city?: string;
  state?: string;
}

export interface ArenaResult {
  id: string;
  competition_id: string;
  athlete_id: string;
  placement: number;
  points_earned: number;
  created_at: string;
  competition?: ArenaCompetition;
}

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
  coordenador_id: string;
  nome: string;
  edicao: number;
  data: string;
  horario_inicio: string;
  modalidade: string;
  tipo_peso: 'com_kimono' | 'sem_kimono';
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  ponto_referencia?: string;
  google_maps_url?: string;
  razao_social: string;
  email_contato: string;
  website?: string;
  facebook_url?: string;
  hashtag?: string;
  aceita_cartao: boolean;
  cancelamento_automatico_dias: number;
  abertura_checagem_geral?: string;
  regra_abertura_checagem?: string;
  status: 'rascunho' | 'aberto' | 'fechado' | 'em_andamento' | 'finalizado';
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface EventLote {
  id: string;
  evento_id: string;
  nome: string;
  data_limite: string;
  valor_peso: number;
  valor_peso_absoluto: number;
  ativo: boolean;
}

export interface EventConfigAbsoluto {
  id: string;
  evento_id: string;
  ativo_masculino: boolean;
  ativo_feminino: boolean;
  premiacao_texto?: string;
  min_atletas_50_porcento: number;
  min_atletas_100_porcento: number;
  regra_agrupamento?: string;
}

export interface EventRegrasEspeciais {
  id: string;
  evento_id: string;
  master_no_adulto_absoluto: boolean;
  luta_casada_menores: boolean;
  luta_casada_maiores: boolean;
  venda_camiseta: boolean;
  brinde_camiseta: boolean;
  pontuacao_equipe: boolean;
  ranking_individual: boolean;
  exibir_edital: boolean;
  edital_url?: string;
}

export interface EventDocumento {
  id: string;
  evento_id: string;
  fuso_horario: string;
  horario_abertura?: string;
  regras_entrada?: string;
  regras_vestimenta?: string;
  regras_pesagem?: string;
  regras_reembolso?: string;
  divulgacao_fotos: boolean;
  sms_ativado: boolean;
  min_atletas?: number;
  max_atletas?: number;
  expectativa_publico?: number;
  conteudo_completo?: string;
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
  tempo_luta_minutos?: number;
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
