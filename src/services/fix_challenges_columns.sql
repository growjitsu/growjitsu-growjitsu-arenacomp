-- ArenaComp: Fix Missing Columns in Challenges Table
-- Run this in your Supabase SQL Editor to resolve the 'could not find column' error

ALTER TABLE challenges ADD COLUMN IF NOT EXISTS challenge_type TEXT DEFAULT 'category';
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS challenger_result JSONB;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS challenged_result JSONB;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS challenger_points INTEGER DEFAULT 0;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS challenged_points INTEGER DEFAULT 0;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS winner_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Notify PostgREST to refresh schema cache
NOTIFY pgrst, 'reload schema';
