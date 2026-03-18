-- ArenaComp: Team Representative Validation Trigger
-- Run this in your Supabase SQL Editor to ensure data integrity.

-- 1. Function to validate team representative
CREATE OR REPLACE FUNCTION fn_validate_team_representative()
RETURNS TRIGGER AS $$
DECLARE
    team_professor TEXT;
    representative_count INTEGER;
BEGIN
    -- Só valida se o usuário está tentando se tornar um líder de equipe
    IF NEW.team_leader = 'true' OR NEW.team_leader = 'TRUE' THEN
        
        -- 1. Verifica se a equipe já tem um professor definido no cadastro base (tabela teams)
        SELECT professor INTO team_professor
        FROM public.teams
        WHERE id = NEW.team_id;

        IF team_professor IS NOT NULL AND TRIM(team_professor) != '' THEN
            RAISE EXCEPTION 'TEAM_HAS_REPRESENTATIVE'
            USING DETAIL = 'Esta equipe já possui um professor/líder definido no cadastro da academia.';
        END IF;

        -- 2. Verifica se já existe outro usuário líder para esta equipe (tabela profiles)
        -- Exclui o próprio usuário em caso de update
        SELECT COUNT(*) INTO representative_count
        FROM public.profiles
        WHERE team_id = NEW.team_id
          AND (team_leader = 'true' OR team_leader = 'TRUE')
          AND id != NEW.id;

        IF representative_count > 0 THEN
            RAISE EXCEPTION 'TEAM_HAS_REPRESENTATIVE'
            USING DETAIL = 'Esta equipe já possui um representante cadastrado na plataforma.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger
DROP TRIGGER IF EXISTS trg_validate_team_representative ON profiles;
CREATE TRIGGER trg_validate_team_representative
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION fn_validate_team_representative();
