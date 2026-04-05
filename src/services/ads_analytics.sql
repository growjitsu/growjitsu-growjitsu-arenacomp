
-- Analytics System for Arena Ads

-- 1. Create arena_ad_events table
CREATE TABLE IF NOT EXISTS arena_ad_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_id UUID REFERENCES arena_ads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click')),
  user_id UUID, -- Optional, if logged in
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT, -- mobile, desktop, tablet
  os TEXT,
  browser TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_arena_ad_events_ad_id ON arena_ad_events(ad_id);
CREATE INDEX IF NOT EXISTS idx_arena_ad_events_event_type ON arena_ad_events(event_type);
CREATE INDEX IF NOT EXISTS idx_arena_ad_events_created_at ON arena_ad_events(created_at);

-- 3. Enable RLS
ALTER TABLE arena_ad_events ENABLE ROW LEVEL SECURITY;

-- 4. Policies
DROP POLICY IF EXISTS "Admins can view events" ON arena_ad_events;
CREATE POLICY "Admins can view events" ON arena_ad_events 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Anyone can insert events" ON arena_ad_events;
CREATE POLICY "Anyone can insert events" ON arena_ad_events 
  FOR INSERT WITH CHECK (true);

-- 5. Add summary columns to arena_ads for quick access (optional but recommended)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='arena_ads' AND column_name='total_impressions') THEN
    ALTER TABLE arena_ads ADD COLUMN total_impressions INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='arena_ads' AND column_name='total_clicks') THEN
    ALTER TABLE arena_ads ADD COLUMN total_clicks INTEGER DEFAULT 0;
  END IF;
END $$;

-- 6. RPC functions for atomic increments
CREATE OR REPLACE FUNCTION increment_ad_impressions(ad_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE arena_ads
  SET total_impressions = total_impressions + 1
  WHERE id = ad_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_ad_clicks(ad_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE arena_ads
  SET total_clicks = total_clicks + 1
  WHERE id = ad_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
