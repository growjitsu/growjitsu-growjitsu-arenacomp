-- ARENA ADS EVOLUTION - SCHEMA UPDATE
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Adicionar campos de data e segmentação à tabela arena_ads
ALTER TABLE arena_ads 
ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS country_id TEXT,
ADD COLUMN IF NOT EXISTS state_id TEXT,
ADD COLUMN IF NOT EXISTS city_id TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS city TEXT;

-- 2. Adicionar campos de mídia específicos por posicionamento
ALTER TABLE arena_ads
ADD COLUMN IF NOT EXISTS media_url_feed_top TEXT,
ADD COLUMN IF NOT EXISTS media_url_feed_between TEXT,
ADD COLUMN IF NOT EXISTS media_url_sidebar TEXT,
ADD COLUMN IF NOT EXISTS media_url_profile TEXT;

-- 3. Atualizar índices para performance nas novas consultas
CREATE INDEX IF NOT EXISTS arena_ads_dates_idx ON arena_ads (start_date, end_date);
CREATE INDEX IF NOT EXISTS arena_ads_geo_idx ON arena_ads (country_id, state_id, city_id);

-- 4. Garantir que a política de RLS permita a visualização dos novos campos
-- (A política existente "Anúncios ativos são visíveis por todos" já cobre isso pois usa SELECT *)
