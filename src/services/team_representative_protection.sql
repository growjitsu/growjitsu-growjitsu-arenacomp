-- ArenaComp: Database Protection for Team Representatives
-- This ensures that each team can have only one representative automatically assigned.

-- 1. Add a partial unique index to enforce the rule at the database level
-- This prevents race conditions and manual bypasses.
CREATE UNIQUE INDEX IF NOT EXISTS one_representative_per_team
ON profiles (team_id)
WHERE (team_leader = 'true' OR team_leader = 'TRUE');

-- 2. Optional: Add a check constraint to ensure team_leader is always 'true' or 'false'
-- (Already handled by the TEXT type and application logic, but good for integrity)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_team_leader_value;
ALTER TABLE profiles ADD CONSTRAINT check_team_leader_value 
CHECK (team_leader IN ('true', 'false', 'TRUE', 'FALSE'));

-- 3. Update existing teams if necessary (Audit)
-- This query helps identify teams that might already have multiple representatives (if any)
-- SELECT team_id, COUNT(*) 
-- FROM profiles 
-- WHERE team_leader = 'true' 
-- GROUP BY team_id 
-- HAVING COUNT(*) > 1;
