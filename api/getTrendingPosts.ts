
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

    // 1. Fetch trending posts
    let { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .eq('is_archived', false)
      .order('likes_count', { ascending: false })
      .limit(3);
    
    // Handle potential column missing error (likes_count)
    if (postsError && (postsError.message?.includes('column') || postsError.code === '42703')) {
      const { data: retryData, error: retryError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (retryError) throw retryError;
      postsData = retryData;
    } else if (postsError) {
      throw postsError;
    }
    
    if (!postsData || postsData.length === 0) {
      return res.status(200).json([]);
    }

    // 2. Fetch authors for these posts
    const authorIds = Array.from(new Set(postsData.map(p => p.author_id)));
    const { data: authorsData, error: authorsError } = await supabase
      .from('profiles')
      .select('*')
      .neq('role', 'admin')
      .in('id', authorIds);
    
    if (authorsError) {
      console.warn('Error fetching authors for trending posts:', authorsError.message);
    }

    const authorsMap = new Map((authorsData || []).map(a => [a.id, a]));
    const postsWithAuthors = postsData.map(p => ({
      ...p,
      author: authorsMap.get(p.author_id)
    })).filter(p => p.author);
    
    return res.status(200).json(postsWithAuthors);
  } catch (error: any) {
    console.error('[Serverless] Error in getTrendingPosts:', error);
    return res.status(500).json({ error: error.message });
  }
}
