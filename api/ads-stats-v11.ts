
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
  res.setHeader('X-Express-Init', 'serverless-v11');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const dbPath = path.join(process.cwd(), 'arenacomp.db');
    if (!fs.existsSync(dbPath)) {
      return res.status(200).json({ 
        success: true, 
        summary: { total_clicks: 0, unique_clicks: 0, total_views: 0 },
        message: "Database note found in serverless env - expected if distributed"
      });
    }

    const db = new Database(dbPath);
    const { period, adId } = req.query;
    
    let dateFilter = "created_at IS NOT NULL";
    if (period === 'today') dateFilter = "DATE(created_at) = DATE('now')";
    else if (period === 'yesterday') dateFilter = "DATE(created_at) = DATE('now', '-1 day')";
    else if (period === '7d') dateFilter = "DATETIME(created_at) >= DATETIME('now', '-7 days')";
    else if (period === '30d') dateFilter = "DATETIME(created_at) >= DATETIME('now', '-30 days')";
    
    const adIdStr = adId ? String(adId) : '';
    const adFilter = adIdStr && adIdStr !== 'all' ? `AND ad_id = '${adIdStr}'` : "";

    const statsQuery = `
      SELECT 
        COUNT(CASE WHEN event_type = 'click' THEN 1 END) as total_clicks,
        COUNT(DISTINCT CASE WHEN event_type = 'click' THEN ip_address END) as unique_clicks,
        COUNT(CASE WHEN event_type = 'impression' THEN 1 END) as total_views
      FROM ad_analytics 
      WHERE ${dateFilter} ${adFilter}
    `;
    
    const stats = db.prepare(statsQuery).get() as any;
    const dailyStats = db.prepare(`SELECT DATE(created_at) as date, COUNT(*) as count FROM ad_analytics WHERE ${dateFilter} ${adFilter} AND event_type = 'click' GROUP BY DATE(created_at) ORDER BY date ASC`).all();
    const deviceStats = db.prepare(`SELECT device, COUNT(*) as count FROM ad_analytics WHERE ${dateFilter} ${adFilter} GROUP BY device`).all();
    const osStats = db.prepare(`SELECT os, COUNT(*) as count FROM ad_analytics WHERE ${dateFilter} ${adFilter} GROUP BY os`).all();
    
    db.close();

    return res.status(200).json({
      success: true,
      summary: {
        total_clicks: stats?.total_clicks || 0,
        unique_clicks: stats?.unique_clicks || 0,
        total_views: stats?.total_views || 0
      },
      daily: dailyStats || [],
      devices: deviceStats || [],
      os: osStats || [],
      v: '11-serverless'
    });
  } catch (error: any) {
    console.error('[V11-SERVERLESS-ERR]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
