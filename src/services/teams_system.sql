-- ArenaComp Team System SQL
-- Run this in your Supabase SQL Editor

-- 1. Create teams table
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    professor TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'Brasil',
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add team_id to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- 3. Enable RLS on teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teams are viewable by everyone" ON teams;
CREATE POLICY "Teams are viewable by everyone" ON teams FOR SELECT USING (true);

-- 4. Import initial teams (FPJJ inspired list)
INSERT INTO teams (name, professor, city, state) VALUES
('ALLIANCE', 'Fabio Gurgel', 'São Paulo', 'SP'),
('ATOS JIU-JITSU', 'Andre Galvao', 'São Paulo', 'SP'),
('CHECKMAT', 'Leo Vieira', 'São Paulo', 'SP'),
('GRACIE BARRA', 'Carlos Gracie Jr.', 'Rio de Janeiro', 'RJ'),
('GF TEAM', 'Julio Cesar Pereira', 'Rio de Janeiro', 'RJ'),
('NOVA UNIÃO', 'Wendell Alexander', 'Rio de Janeiro', 'RJ'),
('PSLPB CICERO COSTHA', 'Cicero Costha', 'São Paulo', 'SP'),
('ZENITH BJJ', 'Robert Drysdale', 'Santos', 'SP'),
('BARBOSA JIU-JITSU', 'Marco Barbosa', 'São Paulo', 'SP'),
('GUIGO JIU-JITSU', 'Luiz Guilherme', 'São Paulo', 'SP'),
('NS BROTHERHOOD', 'Leandro Lo', 'São Paulo', 'SP'),
('CARLSON GRACIE TEAM', 'Carlson Gracie', 'Rio de Janeiro', 'RJ'),
('LOTUS CLUB', 'Moises Muradi', 'São Paulo', 'SP'),
('CANTAGALO TEAM', 'Douglas Rufino', 'São Paulo', 'SP'),
('COHAB JIU-JITSU', 'Danilo Silveira', 'São Paulo', 'SP'),
('G13 BJJ', 'Roberto Godoi', 'São Paulo', 'SP'),
('TEAM SYLVIO BEHRING', 'Sylvio Behring', 'Rio de Janeiro', 'RJ'),
('B9 JIU-JITSU', 'Marco Barbosa', 'São Paulo', 'SP'),
('ROGERS JIU-JITSU', 'Roger Gracie', 'Rio de Janeiro', 'RJ'),
('MARCIO RODRIGUES', 'Marcio Rodrigues', 'Rio de Janeiro', 'RJ')
ON CONFLICT (name) DO NOTHING;

-- 5. Update get_team_rankings function
CREATE OR REPLACE FUNCTION get_team_rankings(
  p_modality TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL
)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  logo_url TEXT,
  total_score NUMERIC,
  athlete_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as team_id,
    t.name as team_name,
    t.logo_url,
    COALESCE(SUM(p.arena_score), 0) as total_score,
    COUNT(p.id) as athlete_count
  FROM teams t
  JOIN profiles p ON p.team_id = t.id
  WHERE (p_modality IS NULL OR p.modality ILIKE '%' || p_modality || '%')
    AND (p_country IS NULL OR p.country = p_country)
    AND (p_city IS NULL OR p.city ILIKE p_city)
  GROUP BY t.id, t.name, t.logo_url
  ORDER BY total_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
