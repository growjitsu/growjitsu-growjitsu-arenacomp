
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vfefztzaiqhpsfnvpkba.supabase.co';
    const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseKey) {
      return res.status(500).json({ error: "Database key not configured" });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { placement, debug } = req.query;
    const isDebug = debug === 'true';
    
    // Geographic parameters from query
    const userCountryId = req.query.country_id as string;
    const userStateId = req.query.state_id as string;
    const userCityId = req.query.city_id as string;
    const userCountry = req.query.country as string;
    const userState = req.query.state as string;
    const userCity = req.query.city as string;

    // Query for active ads
    let query = supabase
      .from('arena_ads')
      .select('*')
      .eq('active', true);
    
    if (placement) {
      const placements = (placement as string).split(',').map(p => p.trim()).filter(p => p);
      if (placements.length > 0) {
        const orConditions = placements.map(p => `placement.ilike.%${p}%`);
        query = query.or(orConditions.join(','));
      }
    }

    const { data, error } = await query
      .order('order', { ascending: true })
      .order('created_at', { ascending: false });
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const now = new Date();
    const filteredAds = (data || []).filter(ad => {
      if (isDebug) return true;
      
      // 1. Date filtering
      let isStarted = true;
      let isNotEnded = true;
      
      if (ad.start_date) {
        const startDate = new Date(ad.start_date);
        isStarted = !isNaN(startDate.getTime()) && startDate <= now;
      }
      
      if (ad.end_date) {
        const endDate = new Date(ad.end_date);
        isNotEnded = !isNaN(endDate.getTime()) && endDate >= now;
      }
      
      if (!isStarted || !isNotEnded) return false;

      // 2. Geographic filtering
      const hasLocationConstraint = !!(ad.country_id || ad.country || ad.state_id || ad.state || ad.city_id || ad.city);

      if (hasLocationConstraint) {
        if (!userCountryId && !userCountry) return false;

        if (ad.country_id && userCountryId) {
          if (ad.country_id !== userCountryId) return false;
        } else if (ad.country && userCountry && ad.country.toLowerCase() !== userCountry.toLowerCase()) {
          return false;
        }

        if (ad.state_id && userStateId) {
          if (ad.state_id !== userStateId) return false;
        } else if (ad.state && userState && ad.state.toLowerCase() !== userState.toLowerCase()) {
          return false;
        }

        if (ad.city_id && userCityId) {
          if (ad.city_id !== userCityId) return false;
        } else if (ad.city && userCity && ad.city.toLowerCase() !== userCity.toLowerCase()) {
          return false;
        }
      }
      
      return true;
    });

    return res.status(200).json(filteredAds);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
