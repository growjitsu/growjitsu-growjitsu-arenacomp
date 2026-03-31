-- ARENA COMP - ONBOARDING MIGRATION
-- Adiciona a coluna 'tipo' na tabela 'profiles' para diferenciar atletas de não-atletas.
-- Execute este script no SQL Editor do seu projeto Supabase.

-- 1. Adicionar a coluna 'tipo' se ela não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'tipo') THEN
        ALTER TABLE profiles ADD COLUMN tipo TEXT CHECK (tipo IN ('atleta', 'nao_atleta'));
        COMMENT ON COLUMN profiles.tipo IS 'Diferencia se o usuário é um atleta ativo ou um apoiador/não-atleta.';
    END IF;
END $$;

-- 2. Atualizar usuários existentes (Opcional: definir um padrão se necessário)
-- Por padrão, deixamos NULL para que o onboarding seja disparado para todos os que ainda não escolheram.
-- Se quisermos assumir que todos os atuais são atletas:
-- UPDATE profiles SET tipo = 'atleta' WHERE tipo IS NULL;

-- 3. Garantir que as políticas de RLS permitam a atualização desta coluna
-- (As políticas existentes em arenacomp_schema.sql já permitem que o usuário atualize seu próprio perfil)
