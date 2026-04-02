-- ArenaComp: National Social Network for Athletes
-- Database Schema (PostgreSQL / Supabase)

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('athlete', 'coach', 'gym', 'admin');
    CREATE TYPE event_level AS ENUM ('local', 'state', 'national', 'international');
    CREATE TYPE post_type AS ENUM ('text', 'image', 'video', 'result');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Tables

-- 3.1 Gyms (Academia)
CREATE TABLE IF NOT EXISTS gyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID, -- References profiles(id) later
    city TEXT,
    state CHAR(2),
    address TEXT,
    logo_url TEXT,
    bio TEXT,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.2 Profiles (Athletes, Coaches, Gym Staff)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    nickname TEXT,
    role user_role DEFAULT 'athlete',
    modality TEXT, -- Primary modality
    category TEXT, -- Weight/Age category
    weight DECIMAL(5,2),
    height DECIMAL(5,2),
    graduation TEXT,
    gym_id UUID REFERENCES gyms(id) ON DELETE SET NULL,
    gym_name TEXT,
    professor TEXT,
    city TEXT,
    state CHAR(2),
    country TEXT,
    avatar_url TEXT,
    profile_photo TEXT,
    team TEXT,
    team_id UUID, -- References teams(id) later
    team_leader TEXT DEFAULT 'false',
    genero TEXT,
    birth_date DATE,
    bio TEXT,
    instagram_url TEXT,
    youtube_url TEXT,
    tiktok_url TEXT,
    titles TEXT,
    medals INTEGER DEFAULT 0,
    perfil_publico BOOLEAN DEFAULT TRUE,
    permitir_seguidores BOOLEAN DEFAULT TRUE,
    arena_score DECIMAL(12,2) DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    total_fights INTEGER DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0,
    tipo TEXT, -- 'atleta' or 'nao_atleta'
    wallet_address TEXT,
    city_id TEXT,
    state_id TEXT,
    country_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.2.1 Teams (Equipes)
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.2.2 Fights (Lutas)
CREATE TABLE IF NOT EXISTS fights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    oponente_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    oponente_nome TEXT,
    evento_nome TEXT,
    data DATE,
    resultado TEXT, -- 'win', 'loss', 'draw'
    tipo_vitoria TEXT, -- 'finalização', 'nocaute', 'decisão', etc
    pontos_arena INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.2.3 Championship Results (Resultados de Campeonatos)
CREATE TABLE IF NOT EXISTS championship_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    campeonato_nome TEXT NOT NULL,
    data DATE,
    resultado TEXT, -- 'Campeão', 'Vice-campeão', 'Terceiro lugar', 'Participação'
    categoria TEXT,
    peso TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.3 Follows
CREATE TABLE IF NOT EXISTS follows (
    follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

-- 3.4 Posts
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type post_type DEFAULT 'text',
    content TEXT,
    media_url TEXT,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.5 Likes
CREATE TABLE IF NOT EXISTS likes (
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

-- 3.6 Comments
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.7 Competitions (Events)
CREATE TABLE IF NOT EXISTS competitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    date DATE NOT NULL,
    level event_level DEFAULT 'local',
    modality TEXT NOT NULL,
    city TEXT,
    state CHAR(2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.8 Competition Results
CREATE TABLE IF NOT EXISTS competition_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
    athlete_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    placement INTEGER, -- 1, 2, 3, 0 (participation)
    points_earned DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(competition_id, athlete_id)
);

-- 3.9 Followers
CREATE TABLE IF NOT EXISTS followers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);

-- 3.10 Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'follow', 'like', 'comment', 'post'
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.11 User Modalities (Multiple Modalities per User)
CREATE TABLE IF NOT EXISTS user_modalities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    modality TEXT NOT NULL,
    belt TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.12 Team Members
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('representative', 'member')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- 4. Arena Score Algorithm Logic

CREATE OR REPLACE FUNCTION calculate_result_points(p_placement INTEGER, p_level event_level)
RETURNS DECIMAL AS $$
DECLARE
    v_base_points INTEGER;
    v_multiplier DECIMAL;
BEGIN
    -- Base Points
    CASE p_placement
        WHEN 1 THEN v_base_points := 100;
        WHEN 2 THEN v_base_points := 70;
        WHEN 3 THEN v_base_points := 50;
        ELSE v_base_points := 10; -- Participation
    END CASE;

    -- Level Multiplier
    CASE p_level
        WHEN 'local' THEN v_multiplier := 1.0;
        WHEN 'state' THEN v_multiplier := 1.3;
        WHEN 'national' THEN v_multiplier := 1.8;
        WHEN 'international' THEN v_multiplier := 2.5;
    END CASE;

    RETURN v_base_points * v_multiplier;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update Arena Score on result insert
CREATE OR REPLACE FUNCTION fn_on_result_inserted()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate points
    NEW.points_earned := calculate_result_points(
        NEW.placement, 
        (SELECT level FROM competitions WHERE id = NEW.competition_id)
    );

    -- Update Athlete's Total Score
    UPDATE profiles 
    SET arena_score = arena_score + NEW.points_earned,
        wins = wins + (CASE WHEN NEW.placement = 1 THEN 1 ELSE 0 END),
        updated_at = NOW()
    WHERE id = NEW.athlete_id;

    -- Create a post automatically for the result
    INSERT INTO posts (author_id, type, content)
    VALUES (
        NEW.athlete_id, 
        'result', 
        'Conquistei o ' || NEW.placement || 'º lugar no ' || (SELECT name FROM competitions WHERE id = NEW.competition_id) || '!'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_on_result_inserted
BEFORE INSERT ON competition_results
FOR EACH ROW EXECUTE FUNCTION fn_on_result_inserted();

-- 5. RLS Policies (Basic)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Posts are viewable by everyone" ON posts FOR SELECT USING (true);
CREATE POLICY "Users can create posts" ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update/delete their own posts" ON posts FOR ALL USING (auth.uid() = author_id);

CREATE POLICY "Follows are viewable by everyone" ON follows FOR SELECT USING (true);
CREATE POLICY "Users can follow others" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON follows FOR DELETE USING (auth.uid() = follower_id);

-- 3.11 User Modalities Policies
ALTER TABLE user_modalities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Modalities are viewable by everyone" ON user_modalities FOR SELECT USING (true);
CREATE POLICY "Users can manage their own modalities" ON user_modalities FOR ALL USING (auth.uid() = user_id);

-- 3.12 Team Members Policies
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_members_select_policy" ON team_members FOR SELECT USING (true);
CREATE POLICY "team_members_insert_policy" ON team_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "team_members_update_policy" ON team_members FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "team_members_delete_policy" ON team_members FOR DELETE USING (auth.uid() IS NOT NULL);

-- Phase 1: Enable RLS with permissive policies for production safety (Zero Downtime)
-- These policies ensure that RLS is active but does not block existing traffic.
-- Refinement (Phase 2) should be done after validating stability.

ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_gyms" ON public.gyms;
CREATE POLICY "allow_all_gyms" ON public.gyms FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_likes" ON public.likes;
CREATE POLICY "allow_all_likes" ON public.likes FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.competition_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_competition_results" ON public.competition_results;
CREATE POLICY "allow_all_competition_results" ON public.competition_results FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.event_lotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_event_lotes" ON public.event_lotes;
CREATE POLICY "allow_all_event_lotes" ON public.event_lotes FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.event_config_absoluto ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_event_config_absoluto" ON public.event_config_absoluto;
CREATE POLICY "allow_all_event_config_absoluto" ON public.event_config_absoluto FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.event_regras_especiais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_event_regras_especiais" ON public.event_regras_especiais;
CREATE POLICY "allow_all_event_regras_especiais" ON public.event_regras_especiais FOR ALL USING (true) WITH CHECK (true);

-- ===============================================================
-- MIGRATION COMMANDS (Run these if you already have the tables)
-- ===============================================================
--
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_photo TEXT;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS team TEXT;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS team_id UUID;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS genero TEXT;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_fights INTEGER DEFAULT 0;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS win_rate DECIMAL(5,2) DEFAULT 0;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet_address TEXT;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city_id TEXT;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state_id TEXT;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country_id TEXT;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tipo TEXT;
--
-- CREATE TABLE IF NOT EXISTS teams (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     name TEXT NOT NULL UNIQUE,
--     logo_url TEXT,
--     description TEXT,
--     created_at TIMESTAMPTZ DEFAULT NOW()
-- );
--
-- CREATE TABLE IF NOT EXISTS fights (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     athlete_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
--     oponente_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
--     oponente_nome TEXT,
--     evento_nome TEXT,
--     data DATE,
--     resultado TEXT,
--     tipo_vitoria TEXT,
--     pontos_arena INTEGER DEFAULT 0,
--     created_at TIMESTAMPTZ DEFAULT NOW()
-- );
--
-- CREATE TABLE IF NOT EXISTS championship_results (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     athlete_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
--     campeonato_nome TEXT NOT NULL,
--     data DATE,
--     resultado TEXT,
--     categoria TEXT,
--     peso TEXT,
--     created_at TIMESTAMPTZ DEFAULT NOW()
-- );
