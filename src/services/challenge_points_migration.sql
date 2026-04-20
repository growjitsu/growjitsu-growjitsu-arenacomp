-- MIGRATION TO ADD CHALLENGE_SCORE TO PROFILES
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS challenge_score INTEGER DEFAULT 0;

-- COMMENT FOR DOCUMENTATION
COMMENT ON COLUMN profiles.challenge_score IS 'Separate scoring layer for 1v1 challenges (1st: 100, 2nd: 50, 3rd: 25, Part: 5)';

-- INITIAL CALCULATION (Optional, but good for data consistency)
-- This logic would ideally be run once to populate the new column based on existing finished challenges
-- However, calculateAndUpdateStats will handle this the next time a profile is updated.
