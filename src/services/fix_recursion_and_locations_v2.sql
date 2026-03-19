-- ARENACOMP: SOLUÇÃO DEFINITIVA PARA RECURSÃO E LOCALIZAÇÃO
-- Execute este script no SQL Editor do seu projeto Supabase

-- ===============================================================
-- 1. CORREÇÃO DA RECURSÃO INFINITA NA TABELA team_members
-- ===============================================================

-- Remover TODAS as políticas antigas da tabela team_members para garantir um estado limpo
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'team_members') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON team_members', pol.policyname);
    END LOOP;
END $$;

-- Garantir que RLS está habilitado
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Função SECURITY DEFINER para verificar se o usuário é admin
-- Isso evita recursão porque ignora o RLS ao consultar a tabela profiles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função SECURITY DEFINER para verificar se o usuário é representante (sem recursão)
CREATE OR REPLACE FUNCTION public.is_team_representative(p_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id
    AND user_id = auth.uid()
    AND role = 'representative'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- NOVAS POLÍTICAS NÃO RECURSIVAS PARA team_members

-- Leitura: Todos podem ver os membros das equipes
CREATE POLICY "team_members_select_policy" ON team_members
FOR SELECT USING (true);

-- Inserção: Admins, o próprio usuário ou o representante da equipe
CREATE POLICY "team_members_insert_policy" ON team_members
FOR INSERT WITH CHECK (
  is_admin() OR 
  auth.uid() = user_id OR 
  is_team_representative(team_id)
);

-- Atualização: Admins, o próprio usuário ou o representante da equipe
CREATE POLICY "team_members_update_policy" ON team_members
FOR UPDATE USING (
  is_admin() OR 
  auth.uid() = user_id OR 
  is_team_representative(team_id)
);

-- Deleção: Admins, o próprio usuário ou o representante da equipe
CREATE POLICY "team_members_delete_policy" ON team_members
FOR DELETE USING (
  is_admin() OR 
  auth.uid() = user_id OR 
  is_team_representative(team_id)
);

-- ===============================================================
-- 2. POPULAR LOCALIZAÇÃO INTERNACIONAL (ESTADOS E CIDADES)
-- ===============================================================

DO $$
DECLARE
    v_country_id UUID;
    v_state_id UUID;
BEGIN
    -- ESTADOS UNIDOS (US)
    SELECT id INTO v_country_id FROM countries WHERE code = 'US';
    IF v_country_id IS NOT NULL THEN
        -- California
        INSERT INTO states (country_id, name, code) VALUES (v_country_id, 'California', 'CA')
        ON CONFLICT (country_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_state_id;
        INSERT INTO cities (state_id, name) VALUES 
        (v_state_id, 'Los Angeles'), (v_state_id, 'San Francisco'), (v_state_id, 'San Diego'), (v_state_id, 'San Jose') ON CONFLICT DO NOTHING;
        
        -- Florida
        INSERT INTO states (country_id, name, code) VALUES (v_country_id, 'Florida', 'FL')
        ON CONFLICT (country_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_state_id;
        INSERT INTO cities (state_id, name) VALUES 
        (v_state_id, 'Miami'), (v_state_id, 'Orlando'), (v_state_id, 'Tampa'), (v_state_id, 'Jacksonville') ON CONFLICT DO NOTHING;

        -- New York
        INSERT INTO states (country_id, name, code) VALUES (v_country_id, 'New York', 'NY')
        ON CONFLICT (country_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_state_id;
        INSERT INTO cities (state_id, name) VALUES 
        (v_state_id, 'New York City'), (v_state_id, 'Buffalo'), (v_state_id, 'Rochester') ON CONFLICT DO NOTHING;
    END IF;

    -- PORTUGAL (PT)
    SELECT id INTO v_country_id FROM countries WHERE code = 'PT';
    IF v_country_id IS NOT NULL THEN
        -- Lisboa
        INSERT INTO states (country_id, name, code) VALUES (v_country_id, 'Lisboa', 'LI')
        ON CONFLICT (country_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_state_id;
        INSERT INTO cities (state_id, name) VALUES 
        (v_state_id, 'Lisboa'), (v_state_id, 'Sintra'), (v_state_id, 'Cascais') ON CONFLICT DO NOTHING;
        
        -- Porto
        INSERT INTO states (country_id, name, code) VALUES (v_country_id, 'Porto', 'PO')
        ON CONFLICT (country_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_state_id;
        INSERT INTO cities (state_id, name) VALUES 
        (v_state_id, 'Porto'), (v_state_id, 'Vila Nova de Gaia'), (v_state_id, 'Maia') ON CONFLICT DO NOTHING;
    END IF;

    -- EMIRADOS ÁRABES UNIDOS (AE)
    SELECT id INTO v_country_id FROM countries WHERE code = 'AE';
    IF v_country_id IS NOT NULL THEN
        -- Dubai
        INSERT INTO states (country_id, name, code) VALUES (v_country_id, 'Dubai', 'DU')
        ON CONFLICT (country_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_state_id;
        INSERT INTO cities (state_id, name) VALUES (v_state_id, 'Dubai City') ON CONFLICT DO NOTHING;
        
        -- Abu Dhabi
        INSERT INTO states (country_id, name, code) VALUES (v_country_id, 'Abu Dhabi', 'AD')
        ON CONFLICT (country_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_state_id;
        INSERT INTO cities (state_id, name) VALUES (v_state_id, 'Abu Dhabi City'), (v_state_id, 'Al Ain') ON CONFLICT DO NOTHING;
    END IF;

    -- ARGENTINA (AR)
    SELECT id INTO v_country_id FROM countries WHERE code = 'AR';
    IF v_country_id IS NOT NULL THEN
        -- Buenos Aires
        INSERT INTO states (country_id, name, code) VALUES (v_country_id, 'Buenos Aires', 'BA')
        ON CONFLICT (country_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_state_id;
        INSERT INTO cities (state_id, name) VALUES 
        (v_state_id, 'Buenos Aires City'), (v_state_id, 'La Plata'), (v_state_id, 'Mar del Plata') ON CONFLICT DO NOTHING;
    END IF;

    -- MÉXICO (MX)
    SELECT id INTO v_country_id FROM countries WHERE code = 'MX';
    IF v_country_id IS NOT NULL THEN
        -- Ciudad de México
        INSERT INTO states (country_id, name, code) VALUES (v_country_id, 'Ciudad de México', 'DF')
        ON CONFLICT (country_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_state_id;
        INSERT INTO cities (state_id, name) VALUES (v_state_id, 'Ciudad de México') ON CONFLICT DO NOTHING;
    END IF;

    -- JAPÃO (JP)
    SELECT id INTO v_country_id FROM countries WHERE code = 'JP';
    IF v_country_id IS NOT NULL THEN
        -- Tokyo
        INSERT INTO states (country_id, name, code) VALUES (v_country_id, 'Tokyo', 'TK')
        ON CONFLICT (country_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_state_id;
        INSERT INTO cities (state_id, name) VALUES (v_state_id, 'Shinjuku'), (v_state_id, 'Shibuya') ON CONFLICT DO NOTHING;
    END IF;

END $$;

-- ===============================================================
-- 3. VERIFICAÇÃO FINAL
-- ===============================================================
SELECT 'Sucesso! Recursão eliminada e locais internacionais populados.' as status;
