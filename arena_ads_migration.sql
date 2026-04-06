-- ==============================================================================
-- SCRIPT DE MIGRAÇÃO - ARENA ADS (DISPLAY TIME)
-- ==============================================================================
-- INSTRUÇÕES:
-- 1. Copie TODO este código.
-- 2. Vá para o seu painel Supabase -> SQL Editor.
-- 3. Cole o código e clique em "Run".
-- 4. Isso resolverá o erro "Could not find column in schema cache".
-- ==============================================================================

DO $$ 
BEGIN 
    -- Adicionar coluna display_time se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='arena_ads' AND column_name='display_time') THEN
        ALTER TABLE arena_ads ADD COLUMN display_time INTEGER DEFAULT 15;
    END IF;

    -- Adicionar colunas de mídia por posicionamento se não existirem
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='arena_ads' AND column_name='media_url_feed_top') THEN
        ALTER TABLE arena_ads ADD COLUMN media_url_feed_top TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='arena_ads' AND column_name='media_url_feed_between') THEN
        ALTER TABLE arena_ads ADD COLUMN media_url_feed_between TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='arena_ads' AND column_name='media_url_sidebar') THEN
        ALTER TABLE arena_ads ADD COLUMN media_url_sidebar TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='arena_ads' AND column_name='media_url_profile') THEN
        ALTER TABLE arena_ads ADD COLUMN media_url_profile TEXT;
    END IF;

END $$;

-- FORÇAR RECARREGAMENTO DO SCHEMA CACHE (IMPORTANTE!)
NOTIFY pgrst, 'reload schema';
