-- ARENACOMP: FINAL FIX FOR LOCATIONS AND RLS RECURSION
-- Execute este script no SQL Editor do seu projeto Supabase

-- ===============================================================
-- 1. CORREÇÃO DE RECURSÃO INFINITA NA TABELA team_members
-- ===============================================================

-- Remover TODAS as políticas existentes para evitar conflitos e recursão
DROP POLICY IF EXISTS "Membros são visíveis por todos" ON team_members;
DROP POLICY IF EXISTS "Usuários podem se cadastrar em equipes" ON team_members;
DROP POLICY IF EXISTS "Representantes podem gerenciar membros" ON team_members;
DROP POLICY IF EXISTS "Allow read team_members" ON team_members;
DROP POLICY IF EXISTS "Allow insert team_members" ON team_members;
DROP POLICY IF EXISTS "Allow update team_members" ON team_members;
DROP POLICY IF EXISTS "Allow delete team_members" ON team_members;
DROP POLICY IF EXISTS "team_members_select" ON team_members;
DROP POLICY IF EXISTS "team_members_insert" ON team_members;
DROP POLICY IF EXISTS "team_members_update" ON team_members;
DROP POLICY IF EXISTS "team_members_delete" ON team_members;

-- Garantir que RLS está habilitado
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Função auxiliar para verificar se o usuário é admin (sem recursão)
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

-- Função auxiliar para verificar se o usuário é representante de uma equipe (sem recursão)
-- SECURITY DEFINER faz a função rodar com privilégios de dono, ignorando RLS da tabela consultada
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

-- NOVAS POLÍTICAS NÃO RECURSIVAS

-- 1. Leitura: Todos podem ver membros das equipes
CREATE POLICY "team_members_read_policy" ON team_members
FOR SELECT USING (true);

-- 2. Inserção: 
-- - Admins podem inserir qualquer membro
-- - Usuários podem se inserir como membros
-- - Representantes podem inserir membros em suas equipes
CREATE POLICY "team_members_insert_policy" ON team_members
FOR INSERT WITH CHECK (
  is_admin() OR 
  auth.uid() = user_id OR 
  is_team_representative(team_id)
);

-- 3. Atualização:
-- - Admins podem atualizar qualquer membro
-- - O próprio usuário pode atualizar seus dados
-- - Representantes podem atualizar membros de suas equipes
CREATE POLICY "team_members_update_policy" ON team_members
FOR UPDATE USING (
  is_admin() OR 
  auth.uid() = user_id OR 
  is_team_representative(team_id)
);

-- 4. Deleção:
-- - Admins podem deletar qualquer membro
-- - O próprio usuário pode sair da equipe
-- - Representantes podem remover membros de suas equipes
CREATE POLICY "team_members_delete_policy" ON team_members
FOR DELETE USING (
  is_admin() OR 
  auth.uid() = user_id OR 
  is_team_representative(team_id)
);

-- ===============================================================
-- 2. POPULAR LOCALIZAÇÃO (ESTADOS E CIDADES INTERNACIONAIS)
-- ===============================================================

DO $$
DECLARE
    v_country_id UUID;
    v_state_id UUID;
BEGIN
    -- ESTADOS UNIDOS (US)
    SELECT id INTO v_country_id FROM countries WHERE code = 'US';
    IF v_country_id IS NOT NULL THEN
        -- New York
        INSERT INTO states (country_id, name, code) VALUES (v_country_id, 'New York', 'NY')
        ON CONFLICT (country_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_state_id;
        INSERT INTO cities (state_id, name) VALUES (v_state_id, 'New York City'), (v_state_id, 'Buffalo'), (v_state_id, 'Rochester'), (v_state_id, 'Yonkers'), (v_state_id, 'Syracuse') ON CONFLICT DO NOTHING;
        
        -- California
        INSERT INTO states (country_id, name, code) VALUES (v_country_id, 'California', 'CA')
        ON CONFLICT (country_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_state_id;
        INSERT INTO cities (state_id, name) VALUES (v_state_id, 'Los Angeles'), (v_state_id, 'San Francisco'), (v_state_id, 'San Diego'), (v_state_id, 'San Jose'), (v_state_id, 'Sacramento') ON CONFLICT DO NOTHING;
        
        -- Florida
        INSERT INTO states (country_id, name, code) VALUES (v_country_id, 'Florida', 'FL')
        ON CONFLICT (country_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_state_id;
        INSERT INTO cities (state_id, name) VALUES (v_state_id, 'Miami'), (v_state_id, 'Orlando'), (v_state_id, 'Tampa'), (v_state_id, 'Jacksonville'), (v_state_id, 'Tallahassee') ON CONFLICT DO NOTHING;
        
        -- Texas
        INSERT INTO states (country_id, name, code) VALUES (v_country_id, 'Texas', 'TX')
        ON CONFLICT (country_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_state_id;
        INSERT INTO cities (state_id, name) VALUES (v_state_id, 'Houston'), (v_state_id, 'Dallas'), (v_state_id, 'Austin'), (v_state_id, 'San Antonio'), (v_state_id, 'Fort Worth') ON CONFLICT DO NOTHING;
    END IF;

    -- PORTUGAL (PT)
    SELECT id INTO v_country_id FROM countries WHERE code = 'PT';
    IF v_country_id IS NOT NULL THEN
        -- Lisboa
        INSERT INTO states (country_id, name, code) VALUES (v_country_id, 'Lisboa', 'LI')
        ON CONFLICT (country_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_state_id;
        INSERT INTO cities (state_id, name) VALUES (v_state_id, 'Lisboa'), (v_state_id, 'Sintra'), (v_state_id, 'Cascais'), (v_state_id, 'Loures'), (v_state_id, 'Amadora') ON CONFLICT DO NOTHING;
        
        -- Porto
        INSERT INTO states (country_id, name, code) VALUES (v_country_id, 'Porto', 'PO')
        ON CONFLICT (country_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_state_id;
        INSERT INTO cities (state_id, name) VALUES (v_state_id, 'Porto'), (v_state_id, 'Vila Nova de Gaia'), (v_state_id, 'Maia'), (v_state_id, 'Matosinhos'), (v_state_id, 'Gondomar') ON CONFLICT DO NOTHING;
        
        -- Braga
        INSERT INTO states (country_id, name, code) VALUES (v_country_id, 'Braga', 'BR')
        ON CONFLICT (country_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_state_id;
        INSERT INTO cities (state_id, name) VALUES (v_state_id, 'Braga'), (v_state_id, 'Guimarães'), (v_state_id, 'Famalicão'), (v_state_id, 'Barcelos') ON CONFLICT DO NOTHING;
    END IF;

    -- JAPÃO (JP)
    SELECT id INTO v_country_id FROM countries WHERE code = 'JP';
    IF v_country_id IS NOT NULL THEN
        -- Tokyo
        INSERT INTO states (country_id, name, code) VALUES (v_country_id, 'Tokyo', 'TK')
        ON CONFLICT (country_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_state_id;
        INSERT INTO cities (state_id, name) VALUES (v_state_id, 'Shinjuku'), (v_state_id, 'Shibuya'), (v_state_id, 'Minato') ON CONFLICT DO NOTHING;
        
        -- Osaka
        INSERT INTO states (country_id, name, code) VALUES (v_country_id, 'Osaka', 'OS')
        ON CONFLICT (country_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_state_id;
        INSERT INTO cities (state_id, name) VALUES (v_state_id, 'Osaka City'), (v_state_id, 'Sakai') ON CONFLICT DO NOTHING;
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

END $$;

-- ===============================================================
-- 3. VERIFICAÇÃO FINAL
-- ===============================================================
SELECT 'Sucesso! Recursão eliminada e locais internacionais populados.' as status;
