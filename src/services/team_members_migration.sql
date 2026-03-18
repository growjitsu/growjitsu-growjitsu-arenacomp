-- ArenaComp: Team Members and Representative Logic
-- Database Schema Updates (PostgreSQL / Supabase)

-- 1. Update Teams Table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS image_url TEXT; -- Alias for logo_url if needed

-- 2. Create Team Members Table
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'athlete', -- 'representative', 'athlete', 'coach'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- 3. Create Unique Index for Representative (One per team)
CREATE UNIQUE INDEX IF NOT EXISTS one_representative_per_team
ON team_members (team_id)
WHERE role = 'representative';

-- 4. RLS Policies for team_members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members are viewable by everyone" ON team_members FOR SELECT USING (true);
CREATE POLICY "Admins can manage all team members" ON team_members FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users can join teams" ON team_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave teams" ON team_members FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Representatives can manage team members" ON team_members FOR ALL USING (
    EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_id = team_members.team_id 
        AND user_id = auth.uid() 
        AND role = 'representative'
    )
);

-- 5. RLS Policies for profiles (Ensure admins can update)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete profiles" ON profiles FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 6. Migrate existing representatives from profiles (Optional but good for consistency)
-- This assumes profiles.team_id and profiles.team_leader exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='team_id') THEN
        INSERT INTO team_members (team_id, user_id, role)
        SELECT team_id, id, 'representative'
        FROM profiles
        WHERE team_id IS NOT NULL AND (team_leader = 'true' OR team_leader = 'TRUE')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
