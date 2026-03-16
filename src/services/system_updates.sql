-- ArenaComp System Updates SQL
-- Run this in your Supabase SQL Editor

-- 1. Update teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS representative_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. Create certificates table
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    issuer TEXT,
    issue_date DATE,
    media_url TEXT NOT NULL, -- Image or PDF URL
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create arena_ads table
CREATE TABLE IF NOT EXISTS arena_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    media_url TEXT, -- Image or Video URL
    media_type TEXT CHECK (media_type IN ('image', 'video')),
    link_url TEXT,
    placement TEXT CHECK (placement IN ('feed_top', 'feed_between')),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Update profiles for promotion
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_promoted BOOLEAN DEFAULT FALSE;

-- 5. Create regional_events table
CREATE TABLE IF NOT EXISTS regional_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    modality TEXT NOT NULL,
    city TEXT NOT NULL,
    state CHAR(2) NOT NULL,
    country TEXT DEFAULT 'Brasil',
    banner_url TEXT,
    link_url TEXT,
    is_promoted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enable RLS
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE regional_events ENABLE ROW LEVEL SECURITY;

-- 7. Policies
CREATE POLICY "Certificates are viewable by everyone" ON certificates FOR SELECT USING (true);
CREATE POLICY "Users can manage their own certificates" ON certificates FOR ALL USING (auth.uid() = athlete_id);

CREATE POLICY "Ads are viewable by everyone" ON arena_ads FOR SELECT USING (true);
CREATE POLICY "Admins can manage ads" ON arena_ads FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Events are viewable by everyone" ON regional_events FOR SELECT USING (true);
CREATE POLICY "Producers can manage their own events" ON regional_events FOR ALL USING (auth.uid() = producer_id);
CREATE POLICY "Admins can manage all events" ON regional_events FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
