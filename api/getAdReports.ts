
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

    const { adId, startDate, endDate } = req.query;

    let query = supabase
      .from('arena_ad_events')
      .select('*');

    if (adId && adId !== 'all') query = query.eq('ad_id', adId);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data: events, error } = await query;

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    if (!events || events.length === 0) {
      return res.status(200).json({
        success: true,
        stats: {
          totalImpressions: 0,
          totalClicks: 0,
          ctr: 0,
          deviceStats: {},
          browserStats: {},
          countryStats: {},
          dailyStats: {}
        },
        events: []
      });
    }

    // Aggregate data
    const stats = {
      totalImpressions: events.filter(e => e.event_type === 'impression').length || 0,
      totalClicks: events.filter(e => e.event_type === 'click').length || 0,
      ctr: 0,
      deviceStats: {} as Record<string, number>,
      browserStats: {} as Record<string, number>,
      countryStats: {} as Record<string, number>,
      dailyStats: {} as Record<string, { impressions: number, clicks: number }>
    };

    if (stats.totalImpressions > 0) {
      stats.ctr = (stats.totalClicks / stats.totalImpressions) * 100;
    }

    events.forEach(event => {
      if (!event.created_at) return;
      
      const date = typeof event.created_at === 'string' 
        ? event.created_at.split('T')[0] 
        : new Date(event.created_at).toISOString().split('T')[0];
        
      if (!stats.dailyStats[date]) {
        stats.dailyStats[date] = { impressions: 0, clicks: 0 };
      }
      
      if (event.event_type === 'impression') {
        stats.dailyStats[date].impressions++;
        const device = event.device_type || 'desktop';
        stats.deviceStats[device] = (stats.deviceStats[device] || 0) + 1;
        const browser = event.browser_family || 'Unknown';
        stats.browserStats[browser] = (stats.browserStats[browser] || 0) + 1;
        const country = event.country_code || 'Unknown';
        stats.countryStats[country] = (stats.countryStats[country] || 0) + 1;
      } else if (event.event_type === 'click') {
        stats.dailyStats[date].clicks++;
      }
    });

    return res.status(200).json({
      success: true,
      stats,
      events: events.slice(0, 100)
    });
  } catch (error: any) {
    console.error('[Serverless] Error in getAdReports:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
