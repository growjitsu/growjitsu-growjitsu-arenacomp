-- Add deleted_at for soft delete in challenges table
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Update RLS policies for challenges to respect deleted_at and allow admin access
-- First, ensure users don't see deleted challenges
DROP POLICY IF EXISTS "Challenges are viewable by participants" ON challenges;
CREATE POLICY "Challenges are viewable by participants" ON challenges
FOR SELECT
USING (
  (challenger_id = auth.uid() OR challenged_id = auth.uid()) 
  AND deleted_at IS NULL
);

-- Admin can see all challenges including deleted ones
DROP POLICY IF EXISTS "Admins can view all challenges" ON challenges;
CREATE POLICY "Admins can view all challenges" ON challenges
FOR SELECT
USING (is_admin());

-- Admin can update all challenges
DROP POLICY IF EXISTS "Admins can update all challenges" ON challenges;
CREATE POLICY "Admins can update all challenges" ON challenges
FOR UPDATE
USING (is_admin());

-- Admin can insert challenges
DROP POLICY IF EXISTS "Admins can insert challenges" ON challenges;
CREATE POLICY "Admins can insert challenges" ON challenges
FOR INSERT
WITH CHECK (is_admin());
