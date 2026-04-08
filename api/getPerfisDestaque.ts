
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

    // Try to fetch promoted profiles
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_promoted', true)
      .limit(5);
    
    if (error) {
      console.warn('Error fetching promoted profiles:', error.message);
    }

    if (!data || data.length === 0) {
      // Fallback to top athletes
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'admin')
        .eq('perfil_publico', true)
        .order('arena_score', { ascending: false })
        .limit(5);
      
      if (fallbackError) throw fallbackError;
      return res.status(200).json(fallbackData || []);
    }
    
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('[Serverless] Error in getPerfisDestaque:', error);
    return res.status(500).json({ error: error.message });
  }
}
