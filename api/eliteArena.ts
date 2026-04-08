
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

    // Try to fetch from 'atletas' table
    const { data, error } = await supabase
      .from('atletas')
      .select('*')
      .order('ranking', { ascending: false })
      .limit(5);
    
    if (error || !data || data.length === 0) {
      // Fallback to 'profiles'
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'admin')
        .eq('perfil_publico', true)
        .order('arena_score', { ascending: false, nullsFirst: false })
        .limit(5);
      
      if (profileError) {
        return res.status(200).json([]);
      }

      return res.status(200).json(profileData || []);
    }
    
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('[Serverless] Error in eliteArena:', error);
    return res.status(500).json({ error: error.message });
  }
}
