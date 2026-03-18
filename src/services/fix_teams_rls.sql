-- ARENACOMP: SUPER FIX TEAMS & LOCATIONS
-- Este script resolve o erro de tabelas inexistentes e configura as permissões (RLS)

-- 1. Criar tabelas de localização se não existirem
CREATE TABLE IF NOT EXISTS countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code CHAR(2) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id UUID REFERENCES countries(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code CHAR(2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(country_id, code)
);

CREATE TABLE IF NOT EXISTS cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id UUID REFERENCES states(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(state_id, name)
);

-- 2. Garantir que a tabela de equipes existe e tem as colunas de ID
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    professor TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE teams ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES countries(id);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS state_id UUID REFERENCES states(id);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES cities(id);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. Inserir dados básicos (Brasil) para evitar erros de busca
DO $$
DECLARE
    v_country_id UUID;
    v_state_sp_id UUID;
BEGIN
    -- País
    INSERT INTO countries (name, code) VALUES ('Brasil', 'BR')
    ON CONFLICT (name) DO UPDATE SET code = EXCLUDED.code
    RETURNING id INTO v_country_id;

    -- Estado (Exemplo: SP)
    INSERT INTO states (country_id, name, code) VALUES (v_country_id, 'São Paulo', 'SP')
    ON CONFLICT (country_id, code) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_state_sp_id;

    -- Cidade (Exemplo: São Paulo)
    INSERT INTO cities (state_id, name) VALUES (v_state_sp_id, 'São Paulo') ON CONFLICT DO NOTHING;
END $$;

-- 4. Configurar RLS (Segurança) para todas as tabelas
-- Isso permite que o app leia os dados sem erro de permissão

ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read countries" ON countries;
CREATE POLICY "Allow read countries" ON countries FOR SELECT USING (true);

ALTER TABLE states ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read states" ON states;
CREATE POLICY "Allow read states" ON states FOR SELECT USING (true);

ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read cities" ON cities;
CREATE POLICY "Allow read cities" ON cities FOR SELECT USING (true);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read teams" ON teams;
CREATE POLICY "Allow read teams" ON teams FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert teams" ON teams;
CREATE POLICY "Allow insert teams" ON teams FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update teams" ON teams;
CREATE POLICY "Allow update teams" ON teams FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete teams" ON teams;
CREATE POLICY "Allow delete teams" ON teams FOR DELETE USING (true);

-- 5. Configurar RLS para team_members (necessário para salvar representantes)
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read team_members" ON team_members;
CREATE POLICY "Allow read team_members" ON team_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert team_members" ON team_members;
CREATE POLICY "Allow insert team_members" ON team_members FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update team_members" ON team_members;
CREATE POLICY "Allow update team_members" ON team_members FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete team_members" ON team_members;
CREATE POLICY "Allow delete team_members" ON team_members FOR DELETE USING (true);

-- 6. Configurar RLS para profiles (necessário para busca de usuários)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read profiles" ON profiles;
CREATE POLICY "Allow read profiles" ON profiles FOR SELECT USING (true);

-- 7. Verificar status
SELECT 'Sucesso! Tabelas e permissões configuradas.' as status;
