-- MIGRATION: ADD MODERATION CONTROLS
-- This migration adds status and moderation tracks to posts and profiles.

-- 1. Update Posts Table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'blocked', 'flagged'));
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS moderation_info JSONB DEFAULT '{}';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES auth.users(id);

-- 2. Update Profiles Table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'blocked'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS moderation_notes TEXT;

-- 3. Create Moderation Logs Table
CREATE TABLE IF NOT EXISTS public.moderation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL, -- 'post', 'profile', 'comment'
    entity_id UUID NOT NULL,
    admin_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL, -- 'approve', 'block', 'suspend', 'warn'
    reason TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS for Moderation
-- Only admins can see pending/blocked posts if we want strict filtering, 
-- but for now we'll allow public to see approved posts only.
-- We must update existing post policy.

-- Update Post Select Policy to only show approved posts to public
-- WARNING: This might break existing feed if not all posts are 'approved'
-- We should default all existing posts to 'approved' first.
UPDATE public.posts SET moderation_status = 'approved' WHERE moderation_status IS NULL;

-- 5. Update RLS Policies
-- Note: Supabase RLS policies are usually managed in the UI or separate SQL.
-- I will add them here but user might need to run them.
