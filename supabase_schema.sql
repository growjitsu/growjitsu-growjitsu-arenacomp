-- ARENA COMP - SUPABASE DATABASE SCHEMA
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Tabela de Usuários (Perfis)
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  tipo_usuario TEXT CHECK (tipo_usuario IN ('atleta', 'coordenador')) NOT NULL,
  perfil_ativo TEXT CHECK (perfil_ativo IN ('atleta', 'coordenador')) NOT NULL,
  foto_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT usuarios_atleta_profile_check CHECK (tipo_usuario <> 'atleta' OR perfil_ativo = 'atleta')
);

-- 2. Tabela de Atletas
CREATE TABLE IF NOT EXISTS atletas (
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE PRIMARY KEY,
  genero TEXT CHECK (genero IN ('Masculino', 'Feminino')) NOT NULL,
  data_nascimento DATE NOT NULL,
  faixa TEXT NOT NULL,
  peso DECIMAL(5,2) NOT NULL,
  categoria_idade TEXT,
  categoria_peso TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE atletas ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para 'usuarios'
CREATE POLICY "Perfis são visíveis por todos" ON usuarios
  FOR SELECT USING (true);

CREATE POLICY "Usuários podem criar seu próprio perfil" ON usuarios
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON usuarios
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND 
    (
      (tipo_usuario = 'atleta' AND perfil_ativo = 'atleta') OR
      (tipo_usuario = 'coordenador')
    )
  );

-- 5. Políticas para 'atletas'
CREATE POLICY "Atletas são visíveis por todos" ON atletas
  FOR SELECT USING (true);

CREATE POLICY "Usuários podem criar seu próprio registro de atleta" ON atletas
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem atualizar seu próprio registro de atleta" ON atletas
  FOR UPDATE USING (auth.uid() = usuario_id);

-- 6. Tabela de Anúncios (Arena Ads)
CREATE TABLE IF NOT EXISTS arena_ads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  link_url TEXT,
  placement TEXT NOT NULL DEFAULT 'feed_between',
  active BOOLEAN DEFAULT true,
  "order" INTEGER DEFAULT 0,
  total_impressions INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  country_id TEXT,
  state_id TEXT,
  city_id TEXT,
  country TEXT,
  state TEXT,
  city TEXT,
  media_url_feed_top TEXT,
  media_url_feed_between TEXT,
  media_url_sidebar TEXT,
  media_url_profile TEXT,
  display_time INTEGER DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabela de Eventos de Anúncios (Analytics)
CREATE TABLE IF NOT EXISTS arena_ad_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id UUID REFERENCES arena_ads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'impression' or 'click'
  user_agent TEXT,
  ip_address TEXT,
  device_type TEXT,
  os_family TEXT,
  browser_family TEXT,
  country_code TEXT,
  region TEXT,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Habilitar RLS para Anúncios
ALTER TABLE arena_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_ad_events ENABLE ROW LEVEL SECURITY;

-- 9. Políticas para 'arena_ads'
CREATE POLICY "Anúncios ativos são visíveis por todos" ON arena_ads
  FOR SELECT USING (active = true);

CREATE POLICY "Admins têm acesso total aos anúncios" ON arena_ads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 10. Políticas para 'arena_ad_events'
CREATE POLICY "Qualquer um pode registrar eventos de anúncios" ON arena_ad_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins podem visualizar eventos de anúncios" ON arena_ad_events
  FOR SELECT TO authenticated USING (true);

-- 11. Índices para Performance
CREATE INDEX IF NOT EXISTS arena_ads_order_idx ON arena_ads ("order");
CREATE INDEX IF NOT EXISTS arena_ad_events_ad_id_idx ON arena_ad_events (ad_id);
CREATE INDEX IF NOT EXISTS arena_ad_events_created_at_idx ON arena_ad_events (created_at);

-- 12. Automação: Removida para controle manual via frontend (authService.ts)
-- O cadastro manual permite maior controle sobre os tipos de usuário e perfis ativos.

-- 13. Funções RPC para métricas de anúncios
CREATE OR REPLACE FUNCTION increment_ad_impressions(ad_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE arena_ads
  SET total_impressions = total_impressions + 1
  WHERE id = ad_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_ad_clicks(ad_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE arena_ads
  SET total_clicks = total_clicks + 1
  WHERE id = ad_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Tabela de Desafios (Challenges)
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenger_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  challenged_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.arena_ads(id) ON DELETE SET NULL,
  event_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
  outcome TEXT CHECK (outcome IN ('challenger_win', 'challenged_win', 'draw', 'none')),
  resolution_type TEXT CHECK (resolution_type IN ('manual', 'non_attendance')),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Enable RLS para Desafios
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Políticas para 'challenges'
DROP POLICY IF EXISTS "Desafios são visíveis por todos" ON public.challenges;
DROP POLICY IF EXISTS "Usuários podem criar seus próprios desafios" ON public.challenges;
DROP POLICY IF EXISTS "Participantes podem atualizar seus próprios desafios" ON public.challenges;

CREATE POLICY "Desafios são visíveis por todos" ON public.challenges
  FOR SELECT USING (true);

CREATE POLICY "Usuários podem criar seus próprios desafios" ON public.challenges
  FOR INSERT WITH CHECK (auth.uid() = challenger_id);

CREATE POLICY "Participantes podem atualizar seus próprios desafios" ON public.challenges
  FOR UPDATE USING (auth.uid() = challenger_id OR auth.uid() = challenged_id);

-- Índices para Desafios
CREATE INDEX IF NOT EXISTS challenges_challenger_id_idx ON public.challenges(challenger_id);
CREATE INDEX IF NOT EXISTS challenges_challenged_id_idx ON public.challenges(challenged_id);
CREATE INDEX IF NOT EXISTS challenges_status_idx ON public.challenges(status);
