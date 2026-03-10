-- ArenaComp Ranking System SQL
-- Run this in your Supabase SQL Editor

-- 1. Create the fights table
CREATE TABLE IF NOT EXISTS fights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    opponent_name TEXT NOT NULL,
    modalidade TEXT NOT NULL,
    resultado TEXT CHECK (resultado IN ('win', 'loss')),
    tipo_vitoria TEXT CHECK (tipo_vitoria IN ('pontos', 'finalização', 'nocaute', 'decisão', 'outro')),
    evento TEXT NOT NULL,
    cidade TEXT NOT NULL,
    pais TEXT NOT NULL,
    data_luta DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add new columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_fights INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS win_rate DECIMAL(5,2) DEFAULT 0;

-- 3. Enable RLS on fights table
ALTER TABLE fights ENABLE ROW LEVEL SECURITY;

-- 4. Create policies for fights table
CREATE POLICY "Atletas podem ver todas as lutas" 
ON fights FOR SELECT 
USING (true);

CREATE POLICY "Atletas podem registrar suas próprias lutas" 
ON fights FOR INSERT 
WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Atletas podem editar suas próprias lutas" 
ON fights FOR UPDATE 
USING (auth.uid() = athlete_id);

CREATE POLICY "Atletas podem deletar suas próprias lutas" 
ON fights FOR DELETE 
USING (auth.uid() = athlete_id);

-- 5. Create championship_results table
CREATE TABLE IF NOT EXISTS championship_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    championship_name TEXT NOT NULL,
    modalidade TEXT NOT NULL,
    categoria_idade TEXT NOT NULL,
    faixa TEXT,
    peso TEXT,
    cidade TEXT NOT NULL,
    pais TEXT NOT NULL,
    data_evento DATE NOT NULL,
    resultado TEXT CHECK (resultado IN ('Campeão', 'Vice-campeão', 'Terceiro lugar', 'Participação')),
    foto_podio_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Enable RLS on championship_results
ALTER TABLE championship_results ENABLE ROW LEVEL SECURITY;

-- 7. Create policies for championship_results
CREATE POLICY "Championship results are viewable by everyone" ON championship_results FOR SELECT USING (true);
CREATE POLICY "Users can insert their own championship results" ON championship_results FOR INSERT WITH CHECK (auth.uid() = athlete_id);
CREATE POLICY "Users can update/delete their own championship results" ON championship_results FOR ALL USING (auth.uid() = athlete_id);

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_arena_score ON profiles(arena_score DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_country_score ON profiles(country, arena_score DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_city_score ON profiles(city, arena_score DESC);
CREATE INDEX IF NOT EXISTS idx_fights_athlete_id ON fights(athlete_id);
CREATE INDEX IF NOT EXISTS idx_championship_results_athlete_id ON championship_results(athlete_id);
