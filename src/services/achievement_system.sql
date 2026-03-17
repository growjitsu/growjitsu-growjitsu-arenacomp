-- ArenaComp: Achievement and Card Generation System
-- Database Schema (PostgreSQL / Supabase)

-- 1. Achievement Events Table
CREATE TABLE IF NOT EXISTS achievement_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL, -- 'new_certificate', 'follower_milestone', 'ranking_up', 'sport_achievement'
    title TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}', -- Store dynamic data like certificate name, follower count, etc.
    card_url TEXT, -- URL of the generated card in Storage
    shared BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS Policies
ALTER TABLE achievement_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own achievement events" 
ON achievement_events FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert achievement events" 
ON achievement_events FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own achievement events" 
ON achievement_events FOR UPDATE 
USING (auth.uid() = user_id);

-- 3. Trigger for Follower Milestones (Example)
CREATE OR REPLACE FUNCTION fn_check_follower_milestone()
RETURNS TRIGGER AS $$
DECLARE
    v_follower_count INTEGER;
    v_milestone INTEGER;
BEGIN
    -- Get current follower count for the followed user
    SELECT COUNT(*) INTO v_follower_count 
    FROM followers 
    WHERE following_id = NEW.following_id;

    -- Check for milestones: 10, 50, 100, 500, 1000, etc.
    IF v_follower_count IN (10, 50, 100, 500, 1000, 5000, 10000) THEN
        INSERT INTO achievement_events (user_id, type, title, description, metadata)
        VALUES (
            NEW.following_id,
            'follower_milestone',
            '🏆 Marca Histórica!',
            'Você atingiu a marca de ' || v_follower_count || ' seguidores na ArenaComp!',
            jsonb_build_object('count', v_follower_count)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_check_follower_milestone ON followers;
CREATE TRIGGER tr_check_follower_milestone
AFTER INSERT ON followers
FOR EACH ROW EXECUTE FUNCTION fn_check_follower_milestone();
