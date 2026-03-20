-- Update get_team_rankings to support city_id
CREATE OR REPLACE FUNCTION get_team_rankings(
  p_modality TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_city_id UUID DEFAULT NULL
)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  logo_url TEXT,
  total_score NUMERIC,
  athlete_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as team_id,
    t.name as team_name,
    t.logo_url,
    COALESCE(SUM(p.arena_score), 0) as total_score,
    COUNT(p.id) as athlete_count
  FROM teams t
  JOIN profiles p ON p.team_id = t.id
  WHERE (p_modality IS NULL OR p.modality ILIKE '%' || p_modality || '%')
    AND (p_country IS NULL OR p.country = p_country)
    AND (p_city_id IS NULL OR p.city_id = p_city_id)
    AND (p_city IS NULL OR p.city ILIKE p_city)
  GROUP BY t.id, t.name, t.logo_url
  ORDER BY total_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
