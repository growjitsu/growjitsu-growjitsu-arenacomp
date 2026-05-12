-- ArenaComp: Evolution System Migration
-- Database Schema (PostgreSQL / Supabase)

-- 1. Add new columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS post_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS image_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS championship_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_date DATE,
ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]';

-- 2. Update existing counts (as a baseline)
UPDATE profiles p set
  post_count = (SELECT count(*) FROM posts WHERE author_id = p.id AND is_archived = false),
  image_count = (SELECT count(*) FROM posts WHERE author_id = p.id AND type = 'image' AND is_archived = false),
  video_count = (SELECT count(*) FROM posts WHERE author_id = p.id AND type = 'video' AND is_archived = false),
  championship_count = (SELECT count(*) FROM championship_results WHERE athlete_id = p.id);

-- 3. Function to handle streak and activity
CREATE OR REPLACE FUNCTION fn_update_user_streak()
RETURNS TRIGGER AS $$
DECLARE
    v_last_activity DATE;
    v_streak INTEGER;
BEGIN
    -- Get last activity date and current streak
    SELECT last_activity_date, streak_count INTO v_last_activity, v_streak
    FROM profiles
    WHERE id = NEW.author_id;

    -- If same day, do nothing for streak
    IF v_last_activity = CURRENT_DATE THEN
        RETURN NEW;
    END IF;

    -- If yesterday, increment streak
    IF v_last_activity = CURRENT_DATE - INTERVAL '1 day' THEN
        v_streak := v_streak + 1;
    ELSE
        -- Reset streak if more than 1 day passed
        v_streak := 1;
    END IF;

    -- Update profile
    UPDATE profiles 
    SET 
        streak_count = v_streak,
        last_activity_date = CURRENT_DATE,
        post_count = post_count + 1,
        image_count = CASE WHEN NEW.type = 'image' THEN image_count + 1 ELSE image_count END,
        video_count = CASE WHEN NEW.type = 'video' THEN video_count + 1 ELSE video_count END,
        updated_at = NOW()
    WHERE id = NEW.author_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Triggers for automations
-- Note: These triggers will keep the cache columns in sync
-- We already have calculateAndUpdateStats in frontend, but triggers are more reliable for streaks.

DROP TRIGGER IF EXISTS tr_update_streak_on_post ON posts;
CREATE TRIGGER tr_update_streak_on_post
AFTER INSERT ON posts
FOR EACH ROW EXECUTE FUNCTION fn_update_user_streak();

-- Trigger for championships count
CREATE OR REPLACE FUNCTION fn_increment_championship_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles 
    SET 
        championship_count = championship_count + 1,
        last_activity_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE id = NEW.athlete_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_inc_champ_count ON championship_results;
CREATE TRIGGER tr_inc_champ_count
AFTER INSERT ON championship_results
FOR EACH ROW EXECUTE FUNCTION fn_increment_championship_count();
