-- TABLE FOR ATHLETE CHALLENGES (1v1)
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  challenged_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES eventos(id) ON DELETE SET NULL, -- Optional: Challenge for a specific event
  event_name TEXT, -- Fallback for events not in our 'eventos' table
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'completed', 'finished')) DEFAULT 'pending',
  challenge_type TEXT DEFAULT 'category',
  challenger_result JSONB,
  challenged_result JSONB,
  challenger_points INTEGER DEFAULT 0,
  challenged_points INTEGER DEFAULT 0,
  winner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  outcome TEXT CHECK (outcome IN ('challenger_win', 'challenged_win', 'draw')),
  resolution_type TEXT CHECK (resolution_type IN ('fight', 'non_attendance', 'manual')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Ensure an athlete cannot challenge themselves
  CONSTRAINT cannot_challenge_self CHECK (challenger_id <> challenged_id)
);

-- RLS POLICIES
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Challenges viewable by involved athletes" 
ON challenges FOR SELECT 
USING (auth.uid() = challenger_id OR auth.uid() = challenged_id);

CREATE POLICY "Athletes can create challenges" 
ON challenges FOR INSERT 
WITH CHECK (auth.uid() = challenger_id);

CREATE POLICY "Involved athletes can update challenges" 
ON challenges FOR UPDATE 
USING (auth.uid() = challenger_id OR auth.uid() = challenged_id);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_challenges_challenger ON challenges(challenger_id);
CREATE INDEX IF NOT EXISTS idx_challenges_challenged ON challenges(challenged_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status);
