-- ARENACOMP: TEAM MEMBERS MIGRATION
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Criar tabela team_members
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('representative', 'member')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- 2. Habilitar RLS na team_members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- 3. Políticas para team_members
DROP POLICY IF EXISTS "Membros são visíveis por todos" ON team_members;
CREATE POLICY "Membros são visíveis por todos" ON team_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Usuários podem se cadastrar em equipes" ON team_members;
CREATE POLICY "Usuários podem se cadastrar em equipes" ON team_members FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Representantes podem gerenciar membros" ON team_members;
CREATE POLICY "Representantes podem gerenciar membros" ON team_members FOR ALL USING (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_id = team_members.team_id 
    AND user_id = auth.uid() 
    AND role = 'representative'
  )
);

-- 4. Migrar dados existentes de perfis (profiles) para team_members
-- Assumindo que profiles.team_leader indica representante
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'team_leader') THEN
        INSERT INTO team_members (team_id, user_id, role)
        SELECT team_id, id, 'representative'
        FROM profiles
        WHERE team_id IS NOT NULL AND (team_leader = 'true' OR team_leader = 'TRUE')
        ON CONFLICT (team_id, user_id) DO NOTHING;
    END IF;
END $$;

-- 5. Atualizar Trigger de Validação
CREATE OR REPLACE FUNCTION fn_validate_team_representative()
RETURNS TRIGGER AS $$
DECLARE
    representative_count INTEGER;
BEGIN
    -- Só valida se o usuário está tentando se tornar um líder de equipe
    -- Agora verificamos na tabela team_members
    IF NEW.team_leader = 'true' OR NEW.team_leader = 'TRUE' THEN
        
        -- Verifica se já existe outro usuário representante para esta equipe na tabela team_members
        SELECT COUNT(*) INTO representative_count
        FROM public.team_members
        WHERE team_id = NEW.team_id
          AND role = 'representative'
          AND user_id != NEW.id;

        IF representative_count > 0 THEN
            RAISE EXCEPTION 'TEAM_HAS_REPRESENTATIVE'
            USING DETAIL = 'Esta equipe já possui um representante cadastrado na plataforma.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Garantir que a trigger esteja ativa na tabela profiles para manter compatibilidade
DROP TRIGGER IF EXISTS trg_validate_team_representative ON profiles;
CREATE TRIGGER trg_validate_team_representative
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION fn_validate_team_representative();
