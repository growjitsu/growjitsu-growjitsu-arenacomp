-- ArenaComp: Location System and Team Enhancements
-- Run this in your Supabase SQL Editor

-- 1. Create States Table
CREATE TABLE IF NOT EXISTS states (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    uf CHAR(2) NOT NULL UNIQUE
);

-- 2. Create Cities Table
CREATE TABLE IF NOT EXISTS cities (
    id INTEGER PRIMARY KEY,
    state_id INTEGER REFERENCES states(id) ON DELETE CASCADE,
    name TEXT NOT NULL
);

-- 3. Update Teams Table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES cities(id);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS state_id INTEGER REFERENCES states(id);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);
ALTER TABLE teams RENAME COLUMN logo_url TO image_url; -- Standardizing as requested

-- 4. Ensure Team Members Unique Index for Representative
-- (Already in migration script, but good to ensure here)
DROP INDEX IF EXISTS one_representative_per_team;
CREATE UNIQUE INDEX one_representative_per_team
ON team_members (team_id)
WHERE role = 'representative';

-- 5. Seed States (Initial list for Brazil)
INSERT INTO states (id, name, uf) VALUES
(11, 'Rondônia', 'RO'), (12, 'Acre', 'AC'), (13, 'Amazonas', 'AM'), (14, 'Roraima', 'RR'),
(15, 'Pará', 'PA'), (16, 'Amapá', 'AP'), (17, 'Tocantins', 'TO'), (21, 'Maranhão', 'MA'),
(22, 'Piauí', 'PI'), (23, 'Ceará', 'CE'), (24, 'Rio Grande do Norte', 'RN'), (25, 'Paraíba', 'PB'),
(26, 'Pernambuco', 'PE'), (27, 'Alagoas', 'AL'), (28, 'Sergipe', 'SE'), (29, 'Bahia', 'BA'),
(31, 'Minas Gerais', 'MG'), (32, 'Espírito Santo', 'ES'), (33, 'Rio de Janeiro', 'RJ'), (35, 'São Paulo', 'SP'),
(41, 'Paraná', 'PR'), (42, 'Santa Catarina', 'SC'), (43, 'Rio Grande do Sul', 'RS'), (50, 'Mato Grosso do Sul', 'MS'),
(51, 'Mato Grosso', 'MT'), (52, 'Goiás', 'GO'), (53, 'Distrito Federal', 'DF')
ON CONFLICT (id) DO NOTHING;

-- Note: Cities should be populated via API or a larger seed file. 
-- For now, we'll provide the structure and the frontend will handle fetching or we can add a few main cities.
INSERT INTO cities (id, state_id, name) VALUES
(3550308, 35, 'São Paulo'),
(3304557, 33, 'Rio de Janeiro'),
(3106200, 31, 'Belo Horizonte'),
(4106902, 41, 'Curitiba'),
(4314902, 43, 'Porto Alegre'),
(2910800, 29, 'Feira de Santana'),
(2927408, 29, 'Salvador')
ON CONFLICT (id) DO NOTHING;
