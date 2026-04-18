-- EVOLUTION OF CHALLENGES SYSTEM
-- This migration updates the 'challenges' table with new fields for robust tracking and automated results.

ALTER TABLE public.challenges 
  ADD COLUMN IF NOT EXISTS challenge_type TEXT DEFAULT 'category' CHECK (challenge_type IN ('category', 'category_absolute')),
  ADD COLUMN IF NOT EXISTS challenger_result JSONB,
  ADD COLUMN IF NOT EXISTS challenged_result JSONB,
  ADD COLUMN IF NOT EXISTS challenger_points INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS challenged_points INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Update status constraint to include user requested values
ALTER TABLE public.challenges 
  DROP CONSTRAINT IF EXISTS challenges_status_check;

ALTER TABLE public.challenges 
  ADD CONSTRAINT challenges_status_check 
  CHECK (status IN ('pending', 'accepted', 'finished', 'cancelled', 'declined'));

-- Add specialized notification types index/comment for developer clarity (optional)
COMMENT ON COLUMN public.notifications.type IS 'Supported: challenge_received, challenge_accepted, challenge_finished, challenge_cancelled, challenge_declined, etc.';
