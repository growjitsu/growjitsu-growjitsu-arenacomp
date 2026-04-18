-- MIGRATION: CREATE CHALLENGES TABLE
-- This script creates the 'challenges' table and its associated RLS policies.
-- Execute this in your Supabase SQL Editor.

-- Create Challenges Table
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenger_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  challenged_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.arena_ads(id) ON DELETE SET NULL,
  event_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
  outcome TEXT CHECK (outcome IN ('challenger_win', 'challenged_win', 'draw', 'none')),
  resolution_type TEXT CHECK (resolution_type IN ('manual', 'non_attendance')),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Add Winner ID field
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Ensure Foreign Keys point to profiles for maximum reliability
ALTER TABLE public.challenges 
  DROP CONSTRAINT IF EXISTS challenges_challenger_id_fkey,
  DROP CONSTRAINT IF EXISTS challenges_challenged_id_fkey,
  DROP CONSTRAINT IF EXISTS challenges_winner_id_fkey;

ALTER TABLE public.challenges
  ADD CONSTRAINT challenges_challenger_id_fkey FOREIGN KEY (challenger_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT challenges_challenged_id_fkey FOREIGN KEY (challenged_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT challenges_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Challenges are visible to everyone" ON public.challenges;
DROP POLICY IF EXISTS "Users can create their own challenges" ON public.challenges;
DROP POLICY IF EXISTS "Participants can update their challenges" ON public.challenges;
DROP POLICY IF EXISTS "Participants can delete their challenges" ON public.challenges;

-- 1. Challenges are visible to everyone (for display in profiles)
CREATE POLICY "Challenges are visible to everyone" ON public.challenges
  FOR SELECT USING (true);

-- 2. Authenticated users can create challenges where they are the challenger
CREATE POLICY "Users can create their own challenges" ON public.challenges
  FOR INSERT WITH CHECK (auth.uid() = challenger_id);

-- 3. Participants can update their own challenges (accept/decline/resolve)
CREATE POLICY "Participants can update their challenges" ON public.challenges
  FOR UPDATE USING (auth.uid() = challenger_id OR auth.uid() = challenged_id);

-- 4. Participants can delete their own challenges (if pending or cancelled)
CREATE POLICY "Participants can delete their challenges" ON public.challenges
  FOR DELETE USING (auth.uid() = challenger_id OR auth.uid() = challenged_id);

-- Indices for performance
CREATE INDEX IF NOT EXISTS challenges_challenger_id_idx ON public.challenges(challenger_id);
CREATE INDEX IF NOT EXISTS challenges_challenged_id_idx ON public.challenges(challenged_id);
CREATE INDEX IF NOT EXISTS challenges_status_idx ON public.challenges(status);

-- Comments for documentation
COMMENT ON COLUMN public.challenges.status IS 'Status of the challenge: pending, accepted, declined, completed, cancelled';
COMMENT ON COLUMN public.challenges.outcome IS 'Result of the completed challenge: challenger_win, challenged_win, draw, none';
