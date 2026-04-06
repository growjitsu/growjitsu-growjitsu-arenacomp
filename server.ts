import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import cors from "cors";
import { createClient } from '@supabase/supabase-js';
import { CardGenerator, CardData } from "./src/services/cardGenerator";
import dotenv from "dotenv";
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from './firebase-applet-config.json';

// Load environment variables
dotenv.config();

// Supabase configuration
const rawUrl = process.env.VITE_SUPABASE_URL || 'https://vfefztzaiqhpsfnvpkba.supabase.co';
const rawKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZWZ6dHphaXFocHNmbnZwa2JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzM1MzEsImV4cCI6MjA4NzAwOTUzMX0.G2AVN2yvCaGGtR7fK0nim2eRBAow2C57eeIaOEz1LDQ';
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

const isValidUrl = (url: string) => {
  try {
    const u = new URL(url.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

const supabaseUrl = isValidUrl(rawUrl) ? rawUrl.trim() : 'https://vfefztzaiqhpsfnvpkba.supabase.co';
const supabaseAnonKey = rawKey.trim();

// Create Supabase clients
// Use secret key if available for backend operations, otherwise fallback to anon key
const supabase = createClient(supabaseUrl, supabaseSecretKey || supabaseAnonKey);
const supabaseAdmin = (supabaseSecretKey && supabaseSecretKey.length > 20) 
  ? createClient(supabaseUrl, supabaseSecretKey) 
  : supabase;

// Initialize Firebase Admin SDK
try {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
  console.log('[FIREBASE-ADMIN] SDK inicializado com sucesso.');
} catch (error) {
  console.error('[FIREBASE-ADMIN] Erro ao inicializar SDK:', error);
}

const db = new Database("arenacomp.db");

// ... (Database init remains same)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    belt TEXT,
    academy TEXT,
    is_pro BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS championships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    organizer_id INTEGER,
    date DATETIME,
    location TEXT,
    status TEXT DEFAULT 'draft',
    FOREIGN KEY(organizer_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS athletes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    championship_id INTEGER,
    name TEXT NOT NULL,
    belt TEXT,
    weight_class TEXT,
    age_group TEXT,
    FOREIGN KEY(championship_id) REFERENCES championships(id)
  );

  CREATE TABLE IF NOT EXISTS brackets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    championship_id INTEGER,
    round INTEGER,
    match_number INTEGER,
    athlete1_id INTEGER,
    athlete2_id INTEGER,
    winner_id INTEGER,
    score_a1 TEXT,
    score_a2 TEXT,
    FOREIGN KEY(championship_id) REFERENCES championships(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Vite variable at the top of the scope
  let vite: any = null;
  if (process.env.NODE_ENV !== "production") {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
  }

  // 0. INFRASTRUCTURE LOGGING - MUST BE ABSOLUTELY FIRST
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const userAgent = req.get('User-Agent') || 'Unknown';
    const isCrawler = userAgent.includes('WhatsApp') || 
                      userAgent.includes('facebookexternalhit') || 
                      userAgent.includes('Twitterbot') || 
                      userAgent.includes('Slackbot') ||
                      userAgent.includes('LinkedInBot');

    if (isCrawler) {
      console.log(`[CRAWLER-LOG] [${timestamp}] ${req.method} ${req.url} | UA: ${userAgent}`);
    } else if (req.url.startsWith('/api') || req.url.startsWith('/share')) {
      console.log(`[INFRA-LOG] [${timestamp}] ${req.method} ${req.url}`);
    }
    next();
  });

  // 1. OG Tag Injection for Share Links - MOVED TO TOP for priority
  const handleShareRequest = async (req: any, res: any, next: any) => {
    const { id, type } = req.params;
    const userAgent = req.get('User-Agent') || '';
    console.log(`[OG-TAGS] Processing request for id: ${id}, type: ${type} | URL: ${req.url} | UA: ${userAgent}`);
    
    if (req.url.startsWith('/api')) {
      console.log(`[OG-TAGS] API request detected in share handler, passing to next()`);
      return next();
    }

    let cardData: any = null;
    try {
      // 1. Tenta decodificar como Base64 (formato antigo/fallback)
      if (id && id.length > 40 && !type) {
        try {
          const base64 = id.replace(/-/g, '+').replace(/_/g, '/');
          const jsonString = decodeURIComponent(escape(Buffer.from(base64, 'base64').toString('binary')));
          cardData = JSON.parse(jsonString);
          console.log(`[OG-TAGS] Decoded Base64 data`);
        } catch (e) {
          console.log("[OG-TAGS] ID long but not valid Base64 JSON");
        }
      }

      // 2. Se não decodificou e temos type, busca no Supabase usando ADMIN para garantir acesso
      if (!cardData && type && id) {
        console.log(`[OG-TAGS] Fetching from Supabase (Admin): type=${type}, id=${id}`);
        
        if (type === 'post' || type === 'clip') {
          const { data: post, error: postError } = await supabaseAdmin
            .from('posts')
            .select('*, profiles(username, full_name, profile_photo, modality)')
            .eq('id', id)
            .single();
          
          if (postError) console.error(`[OG-TAGS] Supabase error (post):`, postError.message);

          if (post) {
            cardData = {
              athleteName: post.profiles?.full_name || 'Atleta Arena',
              achievement: post.content || (type === 'clip' ? 'Compartilhou um clip' : 'Compartilhou um post'),
              mainImageUrl: post.media_url || (post.media_urls && post.media_urls[0]),
              title: type === 'clip' ? 'Clip ArenaComp' : 'Post ArenaComp'
            };
          }
        } else if (type === 'profile' || type === 'ranking') {
          const { data: profile, error: profError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();
          
          if (profError) console.error(`[OG-TAGS] Supabase error (profile):`, profError.message);

          if (profile) {
            cardData = {
              athleteName: profile.full_name || 'Atleta Arena',
              achievement: type === 'ranking' ? `Confira minha posição no Ranking ArenaComp!` : 'Confira meu perfil na ArenaComp!',
              mainImageUrl: profile.profile_photo,
              title: type === 'ranking' ? 'Ranking ArenaComp' : 'Perfil ArenaComp'
            };
          }
        } else if (type === 'certificate') {
          const { data: cert, error: certError } = await supabaseAdmin
            .from('certificates')
            .select('*, profiles(username, full_name, modality)')
            .eq('id', id)
            .single();
          
          if (certError) console.error(`[OG-TAGS] Supabase error (cert):`, certError.message);

          if (cert) {
            cardData = {
              athleteName: cert.profiles?.full_name || 'Atleta Arena',
              achievement: `Certificado: ${cert.name}`,
              mainImageUrl: cert.media_url,
              title: 'Certificado ArenaComp'
            };
          }
        } else if (type === 'championship') {
           const { data: champ, error: champError } = await supabaseAdmin
            .from('championship_results')
            .select('*, profiles(username, full_name, modality)')
            .eq('id', id)
            .single();
          
          if (champError) console.error(`[OG-TAGS] Supabase error (champ):`, champError.message);

          if (champ) {
            cardData = {
              athleteName: champ.profiles?.full_name || 'Atleta Arena',
              achievement: `${champ.resultado} no ${champ.evento}`,
              mainImageUrl: champ.media_url,
              title: 'Conquista ArenaComp'
            };
          }
        } else if (type === 'fight') {
           const { data: fight, error: fightError } = await supabaseAdmin
            .from('fights')
            .select('*, profiles(username, full_name, modality)')
            .eq('id', id)
            .single();
          
          if (fightError) console.error(`[OG-TAGS] Supabase error (fight):`, fightError.message);

          if (fight) {
            cardData = {
              athleteName: fight.profiles?.full_name || 'Atleta Arena',
              achievement: `Luta no ${fight.evento}`,
              mainImageUrl: fight.media_url,
              title: 'Luta ArenaComp'
            };
          }
        }
      }
    } catch (err) {
      console.error("[OG-TAGS] Error loading data:", err);
    }

    const athleteName = cardData?.athleteName || "Atleta";
    let title = cardData?.title || "Conquista";
    // Remove brand indication from title as per WhatsApp docs
    title = title.replace("ArenaComp", "").replace("-", "").trim();
    if (!title) title = "Conquista";

    let description = cardData?.achievement || `${athleteName} compartilhou uma conquista! 🔥`;
    // WhatsApp limit: 80 characters
    if (description.length > 80) {
      description = description.substring(0, 77) + "...";
    }
    
    const currentHost = req.get('host');
    const protocol = 'https';
    const baseUrl = process.env.APP_URL || `${protocol}://${currentHost}`;

    let imageUrl = cardData?.mainImageUrl;
    
    if (imageUrl && imageUrl.startsWith('/')) {
      imageUrl = `${baseUrl}${imageUrl}`;
    }
    if (imageUrl && imageUrl.startsWith('http:')) {
      imageUrl = imageUrl.replace('http:', 'https:');
    }

    // Fallback image - use a reliable one
    if (!imageUrl || !imageUrl.startsWith('http')) {
      imageUrl = `https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&h=630&fit=crop`;
    }

    const imageCacheBuster = `v=${Date.now()}`;
    const finalImageUrl = imageUrl.includes('?') ? `${imageUrl}&${imageCacheBuster}` : `${imageUrl}?${imageCacheBuster}`;
    const url = `${baseUrl}/share/${type ? type + '/' : ''}${id}`;

    const ogTags = [
      `<title>${title}</title>`,
      `<meta name="description" content="${description}">`,
      `<meta property="og:title" content="${title}">`,
      `<meta property="og:description" content="${description}">`,
      `<meta property="og:url" content="${url}">`,
      `<meta property="og:image" content="${finalImageUrl}">`,
      `<meta property="og:image:url" content="${finalImageUrl}">`,
      `<meta property="og:image:secure_url" content="${finalImageUrl}">`,
      `<meta property="og:image:type" content="image/jpeg">`,
      `<meta property="og:image:width" content="1200">`,
      `<meta property="og:image:height" content="630">`,
      `<meta property="og:image:alt" content="${title} - ${athleteName}">`,
      `<meta property="og:type" content="website">`,
      `<meta property="og:site_name" content="ArenaComp">`,
      `<meta property="og:locale" content="pt_BR">`,
      `<meta name="twitter:card" content="summary_large_image">`,
      `<meta name="twitter:title" content="${title}">`,
      `<meta name="twitter:description" content="${description}">`,
      `<meta name="twitter:image" content="${finalImageUrl}">`,
      `<meta name="twitter:image:src" content="${finalImageUrl}">`,
      `<meta itemprop="name" content="${title}">`,
      `<meta itemprop="description" content="${description}">`,
      `<meta itemprop="image" content="${finalImageUrl}">`,
      `<link rel="canonical" href="${url}">`
    ].join('\n    ');

    const serveHtml = async (indexPath: string, isDev: boolean) => {
      try {
        if (!fs.existsSync(indexPath)) {
          console.error(`[OG-TAGS] Index file not found: ${indexPath}`);
          return next();
        }

        let html = fs.readFileSync(indexPath, 'utf8');
        
        if (isDev && vite) {
          html = await vite.transformIndexHtml(req.url, html);
        }

        // 1. Remove any existing title tags to avoid duplicates (including those with attributes)
        html = html.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '');
        
        // 2. Remove any existing OG/Twitter tags that might be in the base template
        html = html.replace(/<meta property="og:.*?" content=".*?" \/?>/gi, '');
        html = html.replace(/<meta name="twitter:.*?" content=".*?" \/?>/gi, '');
        html = html.replace(/<meta name="description" content=".*?" \/?>/gi, '');
        
        // 3. Inject new tags right after <head>
        html = html.replace(/(<head[^>]*>)/i, `$1\n    ${ogTags}`);

        // 4. Ensure the <html> tag has the correct prefix
        if (!html.includes('prefix="og: http://ogp.me/ns#"')) {
          html = html.replace(/(<html[^>]*)/i, '$1 prefix="og: http://ogp.me/ns#"');
        }
        
        // 5. Add a marker to verify injection
        html = html.replace('</body>', '<!-- OG-TAGS-INJECTED-V3 -->\n</body>');
        
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('Accept-Ranges', 'none');
        res.setHeader('X-Arena-OG', 'injected');
        
        console.log(`[OG-TAGS] Successfully serving injected HTML for ${req.url}`);
        return res.status(200).send(html);
      } catch (err) {
        console.error(`[OG-TAGS] Error serving HTML (${isDev ? 'dev' : 'prod'}):`, err);
        return next();
      }
    };

    if (process.env.NODE_ENV !== "production") {
      return serveHtml(path.join(process.cwd(), 'index.html'), true);
    } else {
      const distIndex = path.join(process.cwd(), 'dist', 'index.html');
      const rootIndex = path.join(process.cwd(), 'index.html');
      
      if (fs.existsSync(distIndex)) {
        return serveHtml(distIndex, false);
      } else {
        return serveHtml(rootIndex, false);
      }
    }
  };

  // 1. CORS Middleware
  app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
    maxAge: 86400
  }));

  // Handle OPTIONS preflight explicitly for all routes
  app.options("*", (req, res) => {
    res.sendStatus(200);
  });

  // 3. Body Parsing
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Endpoints using Supabase Admin (Secret Key) - Move to top for priority
  app.all("/api/getAdReports", async (req, res) => {
    console.log(`[DEBUG-API] Entrou em /api/getAdReports | Método: ${req.method} | URL: ${req.url}`);
    try {
      const { adId, startDate, endDate } = req.query;
      console.log(`[API] Buscando relatórios de anúncios: adId=${adId}, startDate=${startDate}, endDate=${endDate} | Método: ${req.method}`);

      if (!supabaseAdmin) {
        console.error('[API] Supabase Admin client not initialized!');
        return res.status(500).json({ success: false, error: "Database client not initialized" });
      }

      let query = supabaseAdmin
        .from('arena_ad_events')
        .select('*');

      if (adId && adId !== 'all') query = query.eq('ad_id', adId);
      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);

      const { data: events, error } = await query;

      if (error) {
        console.error('[API] Erro Supabase em getAdReports:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      if (!events) {
        return res.json({
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
        
        // Device stats
        const device = event.device_type || 'desktop';
        stats.deviceStats[device] = (stats.deviceStats[device] || 0) + 1;

        // Browser stats
        const browser = event.browser || 'Unknown';
        stats.browserStats[browser] = (stats.browserStats[browser] || 0) + 1;

        // Country stats
        const country = event.country || 'Unknown';
        stats.countryStats[country] = (stats.countryStats[country] || 0) + 1;

        // Daily stats
        try {
          const date = typeof event.created_at === 'string' 
            ? event.created_at.split('T')[0] 
            : new Date(event.created_at).toISOString().split('T')[0];
            
          if (!stats.dailyStats[date]) {
            stats.dailyStats[date] = { impressions: 0, clicks: 0 };
          }
          if (event.event_type === 'impression') stats.dailyStats[date].impressions++;
          if (event.event_type === 'click') stats.dailyStats[date].clicks++;
        } catch (e) {
          console.warn('[API] Erro ao processar data do evento:', event.created_at);
        }
      });

      res.json({
        success: true,
        stats,
        events: events
      });
    } catch (error: any) {
      console.error('[API] Erro crítico ao obter relatórios de anúncios:', error);
      res.status(500).json({ success: false, error: error.message || "Erro interno no servidor" });
    }
  });

  app.get("/share/:type/:id", handleShareRequest);
  app.get("/share/:id", handleShareRequest);

  app.get("/api/getTopAtletas", async (req, res) => {
    try {
      console.log('[API] Buscando melhores atletas (Elite Arena)...');
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .neq('role', 'admin')
        .eq('perfil_publico', true)
        .gt('arena_score', 0)
        .order('arena_score', { ascending: false, nullsFirst: false })
        .limit(10);
      
      if (error) {
        console.error('[API] Erro Supabase em getTopAtletas:', error);
        throw error;
      }
      
      console.log(`[API] Sucesso: ${data?.length || 0} atletas encontrados.`);
      res.json(data || []);
    } catch (error: any) {
      console.error('[API] Erro crítico em getTopAtletas:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // NEW ENDPOINT: /api/eliteArena
  app.get("/api/eliteArena", async (req, res) => {
    try {
      console.log('[API] Buscando Elite Arena (atletas)...');
      
      if (!supabaseSecretKey) {
        console.warn('[API] SUPABASE_SECRET_KEY não configurada. Usando chave anônima (pode falhar se RLS for restrito).');
      }

      // Tentamos buscar da tabela 'atletas'
      const { data, error } = await supabaseAdmin
        .from('atletas')
        .select('*')
        .order('ranking', { ascending: false })
        .limit(5);
      
      let finalData = [];

      // Se houver erro OU se a lista estiver vazia, tentamos o fallback para 'profiles'
      if (error || !data || data.length === 0) {
        if (error) {
          console.warn('[API] Erro ao buscar da tabela atletas, tentando fallback para profiles:', error.message);
        } else {
          console.log('[API] Tabela atletas vazia, tentando fallback para profiles...');
        }

        // Fallback para profiles - Relaxamos o critério (gt 0) se necessário
        const { data: profileData, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .neq('role', 'admin')
          .eq('perfil_publico', true)
          .order('arena_score', { ascending: false, nullsFirst: false })
          .limit(5);
        
        if (profileError) {
          console.error('[API] Erro no fallback para profiles:', profileError);
          // Se falhar o fallback, retornamos lista vazia em vez de erro 500 para não quebrar o feed
          return res.json([]);
        }

        finalData = profileData || [];
        console.log(`[API] Sucesso no fallback: ${finalData.length} atletas encontrados em profiles.`);
      } else {
        finalData = data;
        console.log(`[API] Sucesso: ${finalData.length} atletas encontrados na tabela atletas.`);
      }
      
      // Normalizar dados para o formato esperado pelo frontend
      let normalizedData = finalData.map(atleta => {
        const username = atleta.username || (atleta.nome_completo ? atleta.nome_completo.split(' ')[0].toLowerCase() : 'atleta');
        return {
          id: atleta.usuario_id || atleta.id,
          full_name: atleta.nome_completo || atleta.full_name || 'Atleta Arena',
          profile_photo: atleta.foto_perfil || atleta.profile_photo || atleta.avatar_url,
          arena_score: atleta.ranking || atleta.arena_score || 0,
          username: username,
          role: atleta.role || 'athlete'
        };
      });
      
      // Se ainda estiver vazio (nenhum atleta em nenhuma tabela), usamos dados de exemplo para não deixar o feed vazio
      if (normalizedData.length === 0) {
        console.log('[API] NENHUM atleta encontrado. Usando dados de exemplo para o Elite Arena.');
        normalizedData = [
          {
            id: 'demo-1',
            full_name: 'Atleta Exemplo 1',
            profile_photo: 'https://picsum.photos/seed/athlete1/200/200',
            arena_score: 1500,
            username: 'exemplo1',
            role: 'athlete'
          },
          {
            id: 'demo-2',
            full_name: 'Atleta Exemplo 2',
            profile_photo: 'https://picsum.photos/seed/athlete2/200/200',
            arena_score: 1200,
            username: 'exemplo2',
            role: 'athlete'
          }
        ];
      }
      
      res.json(normalizedData);
    } catch (error: any) {
      console.error('[API] Erro crítico em /api/eliteArena:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/getPerfisDestaque", async (req, res) => {
    try {
      console.log('[API] Buscando perfis em destaque...');
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('is_promoted', true)
        .limit(5);
      
      if (error) {
        console.warn('[API] Erro ao buscar perfis em destaque:', error.message);
      }

      if (!data || data.length === 0) {
        console.log('[API] Nenhum perfil em destaque encontrado, buscando top atletas como fallback...');
        const { data: fallbackData, error: fallbackError } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .neq('role', 'admin')
          .eq('perfil_publico', true)
          .order('arena_score', { ascending: false })
          .limit(5);
        
        if (fallbackError) throw fallbackError;
        return res.json(fallbackData || []);
      }
      
      res.json(data);
    } catch (error: any) {
      console.error('[API] Erro ao buscar perfis em destaque:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/getTrendingPosts", async (req, res) => {
    try {
      console.log('[API] Buscando posts em alta...');
      let { data: postsData, error: postsError } = await supabaseAdmin
        .from('posts')
        .select('*')
        .eq('is_archived', false)
        .order('likes_count', { ascending: false })
        .limit(3);
      
      if (postsError && (postsError.message?.includes('column') || postsError.code === '42703')) {
        const { data: retryData, error: retryError } = await supabaseAdmin
          .from('posts')
          .select('*')
          .order('likes_count', { ascending: false })
          .limit(3);
        
        if (retryError) throw retryError;
        postsData = retryData;
      } else if (postsError) {
        throw postsError;
      }
      
      const authorIds = Array.from(new Set((postsData || []).map(p => p.author_id)));
      const { data: authorsData } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .neq('role', 'admin')
        .in('id', authorIds);
      
      const authorsMap = new Map((authorsData || []).map(a => [a.id, a]));
      const postsWithAuthors = (postsData || []).map(p => ({
        ...p,
        author: authorsMap.get(p.author_id)
      })).filter(p => p.author);
      
      res.json(postsWithAuthors);
    } catch (error: any) {
      console.error('[API] Erro ao buscar posts em alta:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Debug endpoint to check ads
  app.get("/api/debug/ads", async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('arena_ads')
        .select('*');
      
      if (error) throw error;
      res.json({
        count: data?.length || 0,
        ads: data
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/getAds", async (req, res) => {
    try {
      const isDebug = req.query.debug === 'true';
      console.log(`[API] Buscando anúncios ativos... (Debug: ${isDebug})`);
      
      // Query for active ads
      // We fetch all active ads and filter by date in JS for maximum robustness
      const { data, error } = await supabaseAdmin
        .from('arena_ads')
        .select('*')
        .eq('active', true)
        .order('order', { ascending: true })
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('[API] Erro do Supabase ao buscar anúncios:', error);
        throw error;
      }

      console.log(`[API] Anúncios brutos do Supabase: ${data?.length || 0}`);
      if (data && data.length > 0) {
        data.forEach(ad => {
          console.log(`[API] Ad: ID=${ad.id}, Title=${ad.title}, Placement=${ad.placement}, Start=${ad.start_date}, End=${ad.end_date}, Active=${ad.active}`);
        });
      }

      const now = new Date();
      const filteredAds = (data || []).filter(ad => {
        if (isDebug) return true;
        
        // Safe date parsing
        const startDate = ad.start_date ? new Date(ad.start_date) : null;
        const endDate = ad.end_date ? new Date(ad.end_date) : null;
        
        const isStarted = !startDate || (startDate instanceof Date && !isNaN(startDate.getTime()) && startDate <= now);
        const isNotEnded = !endDate || (endDate instanceof Date && !isNaN(endDate.getTime()) && endDate >= now);
        
        const result = isStarted && isNotEnded;
        if (!result) {
          console.log(`[API] Ad ${ad.id} filtrado: isStarted=${isStarted}, isNotEnded=${isNotEnded}`);
        }
        return result;
      });

      console.log(`[API] Anúncios encontrados: ${data?.length || 0}, Filtrados por data: ${filteredAds.length}`);
      res.json(filteredAds);
    } catch (error: any) {
      console.error('[API] Erro ao buscar anúncios:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // AD TRACKING API
  app.post("/api/trackAdEvent", async (req, res) => {
    try {
      const { adId, eventType, userId, deviceInfo } = req.body;
      
      if (!adId || !eventType) {
        return res.status(400).json({ error: "adId and eventType are required" });
      }

      const userAgent = req.headers['user-agent'] || '';
      const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

      // Basic geolocation (placeholder for now, can be enhanced with an external API)
      // In a real production environment, we'd use a service like MaxMind or ip-api.com
      const country = req.headers['cf-ipcountry'] as string || 'Unknown';

      const { error } = await supabaseAdmin
        .from('arena_ad_events')
        .insert([{
          ad_id: adId,
          event_type: eventType,
          user_id: userId || null,
          ip_address: typeof ipAddress === 'string' ? ipAddress : (Array.isArray(ipAddress) ? ipAddress[0] : null),
          user_agent: userAgent,
          device_type: deviceInfo?.device || 'desktop',
          os: deviceInfo?.os || 'Unknown',
          browser: deviceInfo?.browser || 'Unknown',
          country: country,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      // Update summary counts in arena_ads
      if (eventType === 'impression') {
        await supabaseAdmin.rpc('increment_ad_impressions', { ad_id_param: adId });
      } else if (eventType === 'click') {
        await supabaseAdmin.rpc('increment_ad_clicks', { ad_id_param: adId });
      }

      res.json({ status: "ok" });
    } catch (error: any) {
      console.error('[API] Erro ao rastrear evento de anúncio:', error);
      res.status(500).json({ error: error.message });
    }
  });


  // NEW ROBUST API STRUCTURE
  const cardGenerationHandler = async (req: any, res: any) => {
    console.log(`[API-CORE] Requisição recebida em ${req.url} | Método: ${req.method}`);
    
    // Se for GET, retorna status para verificação
    if (req.method === 'GET') {
      return res.json({ 
        status: "active", 
        message: "Card generation API is ready. Use POST to generate.",
        endpoints: ["/", "/gc", "/generate-card-v3", "/api/v1/generate-card"]
      });
    }

    // Se não for POST, retorna 405 mas com corpo JSON claro
    if (req.method !== 'POST') {
      console.warn(`[API-CORE] Método inválido: ${req.method}`);
      return res.status(405).json({ 
        error: "Method Not Allowed", 
        details: `O endpoint ${req.url} aceita apenas POST para geração de cards. Recebido: ${req.method}` 
      });
    }

    try {
      // 5️⃣ TESTE SEM PUPPETEER (ISOLAR PROBLEMA)
      if (req.query.test === 'true') {
        console.log('🧪 MODO TESTE ATIVADO: API respondendo sem Puppeteer');
        return res.status(200).json({
          success: true,
          test: 'API funcionando',
          message: 'O servidor está recebendo requisições corretamente.'
        });
      }

      const cardData: CardData = req.body;
      if (!cardData || !cardData.athleteName || !cardData.achievement) {
        console.warn("[API-CORE] Dados ausentes:", req.body);
        return res.status(400).json({ error: "Missing required card data", received: req.body });
      }

      console.log('🔥 DATA REAL ENVIADA PARA O CARD:', cardData);
      
      if (!cardData || !cardData.athleteName) {
        console.error('❌ DADOS INVÁLIDOS PARA O CARD:', cardData);
        throw new Error('Dados inválidos para geração do card');
      }

      console.log(`[API-CORE] Gerando card para: ${cardData.athleteName}`);
      const buffer = await CardGenerator.generateAchievementCard({
        ...cardData,
        date: cardData.date || new Date().toLocaleDateString('pt-BR'),
        title: cardData.title || "🏆 NOVA CONQUISTA",
        modality: cardData.modality || "ATLETA ARENACOMP",
        profileUrl: cardData.profileUrl || "https://arenacomp.com.br"
      });

      console.log("[API-CORE] Card gerado com sucesso!");
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.send(buffer);
    } catch (error: any) {
      console.error('🔥 ERRO REAL:', error);
      
      // 6️⃣ FALLBACK DE SEGURANÇA
      return res.status(200).json({
        success: false,
        fallback: true,
        message: 'Falha no render, mas sistema ativo',
        details: error.message || 'Erro interno'
      });
    }
  };

  // ULTIMATE BYPASS: Handle POST on root /
  // This is the most robust route as it's never blocked by path filters
  app.post("/", (req, res, next) => {
    if (req.body && req.body.athleteName && req.body.achievement) {
      return cardGenerationHandler(req, res);
    }
    next();
  });

  // Register the handler on multiple paths to ensure maximum compatibility
  // Root level routes are often less restricted by proxies
  app.all("/generate", cardGenerationHandler);
  app.all("/gc", cardGenerationHandler);
  app.all("/generate-card-v3", cardGenerationHandler);
  app.all("/api/v1/generate-card", cardGenerationHandler);
  app.all("/api-core/generate", cardGenerationHandler);
  app.all("/post-receiver", cardGenerationHandler);
  
  // POST Ping for connectivity test
  app.post("/api/ping", (req, res) => {
    res.json({ success: true, message: "POST reached server successfully" });
  });

  // Keep old routes for backward compatibility but make them direct handlers
  app.all("/api/cards/generate-card", cardGenerationHandler);
  app.all("/api/cards/generate", cardGenerationHandler);

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "ArenaComp API is running" });
  });

  // FIREBASE ADMIN: Set Custom Claims
  app.post("/api/admin/set-admin-claim", async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, error: "Email é obrigatório." });
    }

    try {
      console.log(`[FIREBASE-ADMIN] Tentando definir claim de admin para: ${email}`);
      const auth = getAuth();
      const user = await auth.getUserByEmail(email);
      
      await auth.setCustomUserClaims(user.uid, { admin: true });
      
      console.log(`[FIREBASE-ADMIN] Claim 'admin: true' definido com sucesso para ${email} (UID: ${user.uid})`);
      
      return res.json({ 
        success: true, 
        message: `Claim de administrador definido com sucesso para ${email}.`,
        uid: user.uid
      });
    } catch (error: any) {
      console.error('[FIREBASE-ADMIN] Erro ao definir claim:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message || "Erro interno ao definir claim." 
      });
    }
  });

  // Location Endpoints
  app.get("/api/locations/states", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('states')
        .select('*')
        .order('name');

      if (error) throw error;
      return res.json({ success: true, data });
    } catch (error: any) {
      console.error("[BACKEND] Erro ao buscar estados:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get("/api/locations/cities/:stateId", async (req, res) => {
    const { stateId } = req.params;
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .eq('state_id', stateId)
        .order('name');

      if (error) throw error;
      return res.json({ success: true, data });
    } catch (error: any) {
      console.error("[BACKEND] Erro ao buscar cidades:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // Team Representative Validation Endpoint
  app.post("/api/auth/validate-representative", async (req, res) => {
    console.log("[BACKEND] Recebida requisição POST em /api/auth/validate-representative");
    const { teamId } = req.body;

    if (!teamId) {
      console.error("[BACKEND] ID da equipe ausente na validação");
      return res.status(400).json({ 
        success: false,
        error: "Missing teamId", 
        message: "O ID da equipe é obrigatório." 
      });
    }

    console.log(`[BACKEND] Validando equipe ID: ${teamId}`);

    try {
      // Check if team has a representative in team_members
      const { count, error } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('role', 'representative');

      if (error) {
        console.error("[BACKEND] Erro ao consultar team_members:", error.message, error.details);
        return res.status(500).json({ 
          success: false,
          error: "Database query failed", 
          message: error.message,
          details: error.details 
        });
      }

      console.log(`[BACKEND] Representantes encontrados para equipe ${teamId}: ${count}`);

      if (count && count > 0) {
        return res.status(400).json({ 
          success: false,
          error: "Equipe já representada", 
          message: "Esta equipe já possui um representante oficial cadastrado." 
        });
      }

      return res.status(200).json({ 
        success: true,
        status: "ok", 
        message: "Equipe disponível",
        hasRepresentative: false
      });
    } catch (error: any) {
      console.error("[BACKEND] Erro na validação de representante:", error);
      return res.status(500).json({ 
        success: false,
        error: "Internal server error during validation",
        message: error.message 
      });
    }
  });

  // Endpoint for creating a team and automatically linking the creator as representative
  app.post("/api/teams/create", async (req, res) => {
    const { name, cityId, stateId, imageUrl, userId } = req.body;

    if (!name || !userId) {
      console.error("[BACKEND] Dados incompletos para criação de equipe");
      return res.status(400).json({ 
        success: false,
        error: "Missing required fields", 
        message: "Nome da equipe e ID do usuário são obrigatórios." 
      });
    }

    console.log(`[BACKEND] Criando equipe: ${name} para usuário: ${userId}`);

    try {
      // 1. Create the team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name,
          city_id: cityId,
          state_id: stateId,
          logo_url: imageUrl, // Using logo_url to store the uploaded image URL
          created_by: userId
        })
        .select()
        .single();

      if (teamError) {
        console.error("[BACKEND] Erro ao criar equipe:", teamError.message);
        return res.status(400).json({ 
          success: false,
          error: "Team creation failed", 
          message: teamError.message 
        });
      }

      console.log(`[BACKEND] Equipe criada com ID: ${team.id}. Vinculando usuário como representante.`);

      // 2. Link user as representative in team_members
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: userId,
          role: 'representative'
        });

      if (memberError) {
        console.error("[BACKEND] Erro ao vincular representante:", memberError.message);
        return res.status(500).json({ 
          success: false,
          error: "Member linking failed", 
          message: "Equipe criada, mas falhou ao vincular representante. Contate o suporte." 
        });
      }

      // 3. Update profile as well (legacy support)
      await supabase
        .from('profiles')
        .update({
          team_id: team.id,
          team_leader: 'true'
        })
        .eq('id', userId);

      console.log(`[BACKEND] Fluxo de criação de equipe concluído com sucesso para ${name}`);

      return res.status(201).json({ 
        success: true,
        message: "Equipe criada e representante vinculado com sucesso",
        teamId: team.id 
      });
    } catch (error: any) {
      console.error("[BACKEND] Erro interno na criação de equipe:", error);
      return res.status(500).json({ 
        success: false,
        error: "Internal server error during team creation",
        message: error.message 
      });
    }
  });

  // Mock Championship Data
  app.get("/api/championships", (req, res) => {
    try {
      const championships = db.prepare("SELECT * FROM championships").all();
      res.json({ success: true, data: championships });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/championships", (req, res) => {
    try {
      const { name, date, location } = req.body;
      const info = db.prepare("INSERT INTO championships (name, date, location) VALUES (?, ?, ?)").run(name, date, location);
      res.json({ success: true, id: info.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Catch-all for /api routes to prevent falling through to static files
  app.all("/api/*", (req, res) => {
    res.status(404).json({ success: false, error: "API route not found", path: req.path });
  });

  // Global Error Handler (Standardizing all errors to JSON)
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("[GLOBAL ERROR]", err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(err.status || 500).json({
      success: false,
      error: err.message || "Internal Server Error",
      path: req.path
    });
  });

  // Vite middleware for development (already handled above if not production)
  if (process.env.NODE_ENV !== "production") {
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ArenaComp Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("[CRITICAL] Failed to start server:", err);
});
