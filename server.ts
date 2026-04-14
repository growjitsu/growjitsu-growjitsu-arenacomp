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

  // --- START OF SHARE LOGIC ---
  const handleShareRequest = async (req: any, res: any, next: any) => {
    const { id, type } = req.params;
    const userAgent = req.get('User-Agent') || '';
    
    // Detect if it's a crawler
    const isCrawler = /bot|googlebot|crawler|spider|robot|crawling|facebookexternalhit|facebookcatalog|WhatsApp|TelegramBot|Slackbot|Discordbot|Twitterbot|LinkedInBot|Pinterest|Bingbot|DuckDuckBot|Baiduspider|YandexBot|facebot|ia_archiver/i.test(userAgent);
    
    // Check if it's the root path (home)
    const isHome = !type && (!id || id === 'undefined' || id === '/');

    console.log(`[OG-TAGS] Request for id: ${id}, type: ${type} | Home: ${isHome} | Crawler: ${isCrawler} | UA: ${userAgent}`);
    
    if (req.url.startsWith('/api') || req.url.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js|woff2?)$/i)) {
      return next();
    }

    let cardData: any = null;
    try {
      if (isHome) {
        cardData = {
          athleteName: 'ArenaComp',
          achievement: 'A plataforma definitiva para atletas e organizadores de Jiu-Jitsu. Compartilhe suas conquistas e acompanhe rankings.',
          title: 'ArenaComp Platform',
          modality: 'Jiu-Jitsu',
          profileUrl: 'https://www.arenacomp.com.br'
        };
      } else {
        // 1. Tenta decodificar como Base64 (formato antigo/fallback)
        if (id && id.length > 40 && !type) {
          try {
            const base64 = id.replace(/-/g, '+').replace(/_/g, '/');
            const jsonString = decodeURIComponent(escape(Buffer.from(base64, 'base64').toString('binary')));
            cardData = JSON.parse(jsonString);
          } catch (e) {}
        }

        // 2. Se não decodificou e temos type, busca no Supabase usando ADMIN
        if (!cardData && type && id) {
          if (type === 'post' || type === 'clip') {
            const { data: post } = await supabaseAdmin
              .from('posts')
              .select('*, profiles(username, full_name, profile_photo, modality)')
              .eq('id', id)
              .single();
            
            if (post) {
              cardData = {
                athleteName: post.profiles?.full_name || 'Atleta Arena',
                achievement: post.content || (type === 'clip' ? 'Compartilhou um clip' : 'Compartilhou um post'),
                mainImageUrl: post.media_url || (post.media_urls && post.media_urls[0]),
                title: type === 'clip' ? 'Clip ArenaComp' : 'Post ArenaComp',
                modality: post.profiles?.modality || 'Arena'
              };
            }
          } else if (type === 'profile' || type === 'ranking') {
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('*')
              .eq('id', id)
              .single();
            
            if (profile) {
              cardData = {
                athleteName: profile.full_name || 'Atleta Arena',
                achievement: type === 'ranking' ? `Confira minha posição no Ranking ArenaComp!` : 'Confira meu perfil na ArenaComp!',
                mainImageUrl: profile.profile_photo,
                title: type === 'ranking' ? 'Ranking ArenaComp' : 'Perfil ArenaComp',
                modality: profile.modality || 'Arena'
              };
            }
          } else if (type === 'certificate') {
            const { data: cert } = await supabaseAdmin
              .from('certificates')
              .select('*, profiles(username, full_name, modality)')
              .eq('id', id)
              .single();
            
            if (cert) {
              cardData = {
                athleteName: cert.profiles?.full_name || 'Atleta Arena',
                achievement: `Certificado: ${cert.name}`,
                mainImageUrl: cert.media_url,
                title: 'Certificado ArenaComp',
                modality: cert.profiles?.modality || 'Arena'
              };
            }
          } else if (type === 'championship') {
             const { data: champ } = await supabaseAdmin
              .from('championship_results')
              .select('*, profiles(username, full_name, modality)')
              .eq('id', id)
              .single();
            
            if (champ) {
              cardData = {
                athleteName: champ.profiles?.full_name || 'Atleta Arena',
                achievement: `${champ.resultado} no ${champ.evento}`,
                mainImageUrl: champ.media_url,
                title: 'Conquista ArenaComp',
                modality: champ.profiles?.modality || 'Arena'
              };
            }
          } else if (type === 'fight') {
             const { data: fight } = await supabaseAdmin
              .from('fights')
              .select('*, profiles(username, full_name, modality)')
              .eq('id', id)
              .single();
            
            if (fight) {
              cardData = {
                athleteName: fight.profiles?.full_name || 'Atleta Arena',
                achievement: `Luta no ${fight.evento}`,
                mainImageUrl: fight.media_url,
                title: 'Luta ArenaComp',
                modality: fight.profiles?.modality || 'Arena'
              };
            }
          }
        }
      }
    } catch (err) {
      console.error("[OG-TAGS] Error loading data:", err);
    }

    const athleteName = cardData?.athleteName || "Atleta";
    let title = isHome ? "ArenaComp - Jiu-Jitsu Platform" : (cardData?.title || "ArenaComp");
    let description = isHome 
      ? "A plataforma definitiva para atletas e organizadores de Jiu-Jitsu. Compartilhe conquistas, acompanhe rankings e muito mais."
      : (cardData?.achievement || `${athleteName} compartilhou uma conquista! 🔥`);
    
    // WhatsApp limit: 80 characters for description
    if (description.length > 80) {
      description = description.substring(0, 77) + "...";
    }
    
    // Robust Base URL detection - FORCE HTTPS for WhatsApp
    const host = req.get('x-forwarded-host') || req.get('host') || 'www.arenacomp.com.br';
    let baseUrl = `https://${host}`;
    
    // Override with APP_URL if it seems correct for the current host
    if (process.env.APP_URL && process.env.APP_URL.includes(host)) {
      baseUrl = process.env.APP_URL.replace(/\/$/, '');
      if (!baseUrl.startsWith('https')) baseUrl = baseUrl.replace('http', 'https');
    }

    const ogImageUrl = isHome
      ? `${baseUrl}/api/og-image/home/default?v=17`
      : `${baseUrl}/api/og-image/${type || 'achievement'}/${id}?v=17`;
    
    const shareUrl = isHome ? baseUrl : `${baseUrl}/share/${type ? type + '/' : ''}${id}`;
    const redirectUrl = isHome ? '/' : `/${type ? type + '/' : ''}${id}`;

    // If it's NOT a crawler, we can just let the SPA handle it or redirect
    if (!isCrawler) {
      return res.redirect(redirectUrl);
    }

    // FOR CRAWLERS: Return minimal HTML with OG tags
    const html = `<!DOCTYPE html>
<html lang="pt-BR" prefix="og: http://ogp.me/ns#">
<head>
    <meta charset="UTF-8">
    <title>${title} | ArenaComp</title>
    <meta name="description" content="${description.replace(/"/g, '&quot;')}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article">
    <meta property="og:url" content="${shareUrl}">
    <meta property="og:title" content="${title.replace(/"/g, '&quot;')}">
    <meta property="og:description" content="${description.replace(/"/g, '&quot;')}">
    <meta property="og:image" content="${ogImageUrl}">
    <meta property="og:image:secure_url" content="${ogImageUrl}">
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${title} - ArenaComp">
    <meta property="og:site_name" content="ArenaComp">
    <meta property="og:locale" content="pt_BR">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="${shareUrl}">
    <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}">
    <meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}">
    <meta name="twitter:image" content="${ogImageUrl}">

    <!-- Redirection for non-bots that might still hit this -->
    <script type="text/javascript">
        window.location.href = "${redirectUrl}";
    </script>
</head>
<body>
    <h1>ArenaComp</h1>
    <p>${description}</p>
    <img src="${ogImageUrl}" alt="${title}">
    <p>Redirecionando para a plataforma...</p>
</body>
</html>`;

    const buffer = Buffer.from(html, 'utf-8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('X-Arena-Status', 'crawler-ssr');
    return res.status(200).send(buffer);
  };

  // 1. Crawler Detection Middleware - MUST BE FIRST
  app.use(async (req, res, next) => {
    const userAgent = req.get('User-Agent') || '';
    const isCrawler = /bot|googlebot|crawler|spider|robot|crawling|facebookexternalhit|facebookcatalog|WhatsApp|TelegramBot|Slackbot|Discordbot|Twitterbot|LinkedInBot|Pinterest|Bingbot|DuckDuckBot|Baiduspider|YandexBot|facebot|ia_archiver/i.test(userAgent);
    
    if (isCrawler && !req.url.startsWith('/api') && !req.url.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js|woff2?)$/i)) {
      const pathParts = req.path.split('/').filter(Boolean);
      if (pathParts[0] === 'share' && pathParts.length >= 2) {
        req.params = pathParts.length >= 3 ? { type: pathParts[1], id: pathParts[2] } : { id: pathParts[1] };
        return handleShareRequest(req, res, next);
      }
      if (pathParts.length >= 2) {
        const type = pathParts[0] === 'user' ? 'profile' : pathParts[0];
        const id = pathParts[1];
        if (['profile', 'post', 'clip', 'certificate', 'ranking', 'fights', 'championships'].includes(type)) {
          req.params = { type, id };
          return handleShareRequest(req, res, next);
        }
      }
      // If it's a crawler but doesn't match a specific share path, we still want to return a basic HTML with default tags
      // but only if it's hitting a page route, not an asset
      if (!req.path.includes('.')) {
        return handleShareRequest(req, res, next);
      }
    }
    next();
  });

  // 2. Share Routes
  app.get("/share/:type/:id", handleShareRequest);
  app.get("/share/:id", handleShareRequest);

  // 3. Infrastructure Logging
  app.use((req, res, next) => {
    res.setHeader('X-API-Route', 'express-server-start');
    next();
  });
  // --- END OF SHARE LOGIC ---

  // 1. CORS Middleware
  app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["X-API-Route"],
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

  // ===========================================================================
  // API SECTION - ALL API ROUTES MUST BE DEFINED HERE
  // ===========================================================================
  
  // Force JSON for all /api routes and prevent HTML fallback
  app.use("/api", (req, res, next) => {
    console.log(`[API-CORE] Incoming API request: ${req.method} ${req.url}`);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-API-Route', 'api-middleware-active');
    
    // Prevent caching for API routes
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    next();
  });

  // 0.1. CRITICAL API ROUTE - ANALYTICS
  app.all("/api/getAdReports", async (req, res) => {
    console.log(`[DEBUG-API] Entrou em /api/getAdReports | Método: ${req.method} | URL: ${req.url}`);
    res.setHeader('X-API-Route', 'getAdReports');
    try {
      const { adId, startDate, endDate } = req.query;
      console.log(`[API] Buscando relatórios de anúncios: adId=${adId}, startDate=${startDate}, endDate=${endDate}`);

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

      if (!events || events.length === 0) {
        console.log('[API] Nenhum evento encontrado para os critérios informados.');
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
        
        // Daily stats
        const date = typeof event.created_at === 'string' 
          ? event.created_at.split('T')[0] 
          : new Date(event.created_at).toISOString().split('T')[0];
          
        if (!stats.dailyStats[date]) {
          stats.dailyStats[date] = { impressions: 0, clicks: 0 };
        }
        
        if (event.event_type === 'impression') {
          stats.dailyStats[date].impressions++;
          
          // Device stats
          const device = event.device_type || 'desktop';
          stats.deviceStats[device] = (stats.deviceStats[device] || 0) + 1;
          
          // Browser stats
          const browser = event.browser_family || 'Unknown';
          stats.browserStats[browser] = (stats.browserStats[browser] || 0) + 1;
          
          // Country stats
          const country = event.country_code || 'Unknown';
          stats.countryStats[country] = (stats.countryStats[country] || 0) + 1;
        } else if (event.event_type === 'click') {
          stats.dailyStats[date].clicks++;
        }
      });

      console.log(`[API] Relatório gerado com sucesso: ${events.length} eventos processados.`);
      return res.json({
        success: true,
        stats,
        events: events.slice(0, 100) // Return only first 100 events for performance
      });
    } catch (error: any) {
      console.error('[API] Erro crítico em getAdReports:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 0.2. PROMOTIONS DELIVERY API (Renamed from getAds to bypass ad blockers)
  app.get("/api/getPromotions", async (req, res) => {
    res.setHeader('X-API-Route', 'getPromotions');
    // Force no-cache for promotions to avoid stale empty results in production
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    try {
      const isDebug = req.query.debug === 'true';
      const placement = req.query.placement as string;
      
      // Geographic parameters from query
      const userCountryId = req.query.country_id as string;
      const userStateId = req.query.state_id as string;
      const userCityId = req.query.city_id as string;
      const userCountry = req.query.country as string;
      const userState = req.query.state as string;
      const userCity = req.query.city as string;

      console.log(`[API] Buscando anúncios ativos... (Debug: ${isDebug}, Placement: ${placement || 'Todos'}, Location: ${userCountry || 'N/A'}/${userState || 'N/A'}/${userCity || 'N/A'})`);
      
      if (!supabaseAdmin) {
        console.error('[API] Supabase Admin client not initialized for getPromotions!');
        return res.status(500).json({ error: "Database client not initialized" });
      }

      // Query for active ads
      let query = supabaseAdmin
        .from('arena_ads')
        .select('*')
        .eq('active', true);
      
      if (placement) {
        const placements = placement.split(',').map(p => p.trim()).filter(p => p);
        if (placements.length > 0) {
          // Use a more robust OR query for placements
          const orConditions = placements.map(p => `placement.ilike.%${p}%`);
          query = query.or(orConditions.join(','));
        }
      }

      const { data, error } = await query
        .order('order', { ascending: true })
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('[API] Erro do Supabase ao buscar anúncios:', error);
        return res.status(500).json({ error: error.message });
      }

      const now = new Date();
      const filteredAds = (data || []).filter(ad => {
        if (isDebug) {
          return true;
        }
        
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
        
        if (!isStarted || !isNotEnded) {
          return false;
        }

        // 2. Geographic filtering
        const hasLocationConstraint = !!(ad.country_id || ad.country || ad.state_id || ad.state || ad.city_id || ad.city);

        // If the ad has a location constraint, we check if the user matches it
        if (hasLocationConstraint) {
          // If no user location is provided, we hide ads with constraints (standard behavior)
          if (!userCountryId && !userCountry) return false;

          // Match Country: Match if ID matches OR if Name matches (case insensitive)
          let countryMatch = false;
          if (ad.country_id && userCountryId && ad.country_id === userCountryId) {
            countryMatch = true;
          } else if (ad.country && userCountry && ad.country.toLowerCase() === userCountry.toLowerCase()) {
            countryMatch = true;
          }
          
          // If ad has country constraint and it doesn't match, reject
          if ((ad.country_id || ad.country) && !countryMatch) return false;

          // Match State: Only check if ad has state constraint
          if (ad.state_id || ad.state) {
            let stateMatch = false;
            if (ad.state_id && userStateId && ad.state_id === userStateId) {
              stateMatch = true;
            } else if (ad.state && userState && ad.state.toLowerCase() === userState.toLowerCase()) {
              stateMatch = true;
            }
            if (!stateMatch) return false;
          }

          // Match City: Only check if ad has city constraint
          if (ad.city_id || ad.city) {
            let cityMatch = false;
            if (ad.city_id && userCityId && ad.city_id === userCityId) {
              cityMatch = true;
            } else if (ad.city && userCity && ad.city.toLowerCase() === userCity.toLowerCase()) {
              cityMatch = true;
            }
            if (!cityMatch) return false;
          }
        }
        
        return true;
      });

      console.log(`[API] getPromotions Result: Raw=${data?.length || 0}, Filtered=${filteredAds.length}, Placement=${placement}`);
      return res.json(filteredAds);
    } catch (error: any) {
      console.error('[API] Erro crítico ao buscar anúncios:', error);
      return res.status(500).json({ error: error.message });
    }
  });

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

  app.get("/api/eliteArena", async (req, res) => {
    try {
      console.log('[API] Buscando Elite Arena (atletas)...');
      
      if (!supabaseSecretKey) {
        console.warn('[API] SUPABASE_SECRET_KEY não configurada. Usando chave anônima (pode falhar se RLS for restrito).');
      }

      const { data, error } = await supabaseAdmin
        .from('atletas')
        .select('*')
        .order('ranking', { ascending: false })
        .limit(5);
      
      let finalData = [];

      if (error || !data || data.length === 0) {
        if (error) {
          console.warn('[API] Erro ao buscar da tabela atletas, tentando fallback para profiles:', error.message);
        } else {
          console.log('[API] Tabela atletas vazia, tentando fallback para profiles...');
        }

        const { data: profileData, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .neq('role', 'admin')
          .eq('perfil_publico', true)
          .order('arena_score', { ascending: false, nullsFirst: false })
          .limit(5);
        
        if (profileError) {
          console.error('[API] Erro no fallback para profiles:', profileError);
          return res.json([]);
        }

        finalData = profileData || [];
        console.log(`[API] Sucesso no fallback: ${finalData.length} atletas encontrados em profiles.`);
      } else {
        finalData = data;
        console.log(`[API] Sucesso: ${finalData.length} atletas encontrados na tabela atletas.`);
      }
      
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
    res.setHeader('X-API-Route', 'getTrendingPosts');
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

  app.get("/api/championships", (req, res) => {
    res.setHeader('X-API-Route', 'championships-get');
    try {
      const championships = db.prepare("SELECT * FROM championships").all();
      res.json({ success: true, data: championships });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/championships", (req, res) => {
    res.setHeader('X-API-Route', 'championships-post');
    try {
      const { name, date, location } = req.body;
      const info = db.prepare("INSERT INTO championships (name, date, location) VALUES (?, ?, ?)").run(name, date, location);
      res.json({ success: true, id: info.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Debug endpoint to check ads
  app.get("/api/debug/ads", async (req, res) => {
    res.setHeader('X-API-Route', 'debug-ads');
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

  // PROMOTION TRACKING API (Renamed from trackAdEvent to bypass ad blockers)
  app.post("/api/trackPromotionEvent", async (req, res) => {
    res.setHeader('X-API-Route', 'trackPromotionEvent');
    try {
      const { adId, eventType, userId, deviceInfo } = req.body;
      
      if (!adId || !eventType) {
        return res.status(400).json({ error: "adId and eventType are required" });
      }

      const userAgent = req.headers['user-agent'] || '';
      const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

      // Basic geolocation
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

  app.get("/api/health", (req, res) => {
    res.setHeader('X-API-Route', 'health');
    res.json({ status: "ok", message: "ArenaComp API is running" });
  });

  // FIREBASE ADMIN: Set Custom Claims
  app.post("/api/admin/set-admin-claim", async (req, res) => {
    res.setHeader('X-API-Route', 'set-admin-claim');
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
    res.setHeader('X-API-Route', 'locations-states');
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
    res.setHeader('X-API-Route', 'locations-cities');
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
    res.setHeader('X-API-Route', 'validate-representative');
    const { teamId } = req.body;

    if (!teamId) {
      return res.status(400).json({ 
        success: false,
        error: "Missing teamId", 
        message: "O ID da equipe é obrigatório." 
      });
    }

    try {
      const { count, error } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('role', 'representative');

      if (error) {
        return res.status(500).json({ 
          success: false,
          error: "Database query failed", 
          message: error.message
        });
      }

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
      return res.status(500).json({ 
        success: false,
        error: "Internal server error during validation",
        message: error.message 
      });
    }
  });

  // Endpoint for creating a team
  app.post("/api/teams/create", async (req, res) => {
    res.setHeader('X-API-Route', 'teams-create');
    const { name, cityId, stateId, imageUrl, userId } = req.body;

    if (!name || !userId) {
      return res.status(400).json({ 
        success: false,
        error: "Missing required fields", 
        message: "Nome da equipe e ID do usuário são obrigatórios." 
      });
    }

    try {
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name,
          city_id: cityId,
          state_id: stateId,
          logo_url: imageUrl,
          created_by: userId
        })
        .select()
        .single();

      if (teamError) {
        return res.status(400).json({ 
          success: false,
          error: "Team creation failed", 
          message: teamError.message 
        });
      }

      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: userId,
          role: 'representative'
        });

      if (memberError) {
        return res.status(500).json({ 
          success: false,
          error: "Member linking failed", 
          message: "Equipe criada, mas falhou ao vincular representante." 
        });
      }

      await supabase
        .from('profiles')
        .update({
          team_id: team.id,
          team_leader: 'true'
        })
        .eq('id', userId);

      return res.status(201).json({ 
        success: true,
        message: "Equipe criada e representante vinculado com sucesso",
        teamId: team.id 
      });
    } catch (error: any) {
      return res.status(500).json({ 
        success: false,
        error: "Internal server error during team creation",
        message: error.message 
      });
    }
  });

  // 0.4. CARD GENERATION API
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
  app.post("/", (req, res, next) => {
    if (req.body && req.body.athleteName && req.body.achievement) {
      return cardGenerationHandler(req, res);
    }
    next();
  });

  // Register the handler on multiple paths
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

  // 0.5. CATCH-ALL FOR API - MUST BE AFTER ALL SPECIFIC API ROUTES
  app.all("/api/*", (req, res) => {
    console.log(`[API-CORE] Catch-all /api/* hit for: ${req.url} - Returning 404 JSON`);
    res.setHeader('X-API-Route', 'api-catch-all-404');
    res.status(404).json({ success: false, error: "API route not found", path: req.path });
  });

  // ===========================================================================
  // END OF API SECTION
  // ===========================================================================

  // 0.6. OG IMAGE GENERATION ENDPOINT (GET)
  app.get("/api/og-image/:type/:id", async (req, res) => {
    const { type, id } = req.params;
    console.log(`[OG-IMAGE] Request received for type: ${type}, id: ${id}`);

    // Set a timeout for the entire operation to avoid hanging the scraper
    const timeout = setTimeout(() => {
      console.error(`[OG-IMAGE] Timeout reached for ${type}/${id}`);
      if (!res.headersSent) {
        res.redirect('https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&h=630&fit=crop');
      }
    }, 8000);

    try {
      let cardData: any = null;

      // Fetch data from Supabase
      if (type === 'home' || type === 'default') {
        cardData = {
          athleteName: 'ArenaComp',
          achievement: 'A plataforma definitiva para atletas e organizadores de Jiu-Jitsu.',
          title: 'ArenaComp Platform',
          modality: 'Jiu-Jitsu',
          profileUrl: 'https://www.arenacomp.com.br'
        };
      } else if (type === 'post' || type === 'clip') {
        const { data: post } = await supabaseAdmin
          .from('posts')
          .select('*, profiles(username, full_name, profile_photo, modality)')
          .eq('id', id)
          .single();
        
        if (post) {
          cardData = {
            athleteName: post.profiles?.full_name || 'Atleta Arena',
            achievement: post.content || (type === 'clip' ? 'Compartilhou um clip' : 'Compartilhou um post'),
            mainImageUrl: post.media_url || (post.media_urls && post.media_urls[0]),
            title: type === 'clip' ? 'Clip ArenaComp' : 'Post ArenaComp',
            modality: post.profiles?.modality || 'Arena',
            profileUrl: `https://arenacomp.com.br/post/${id}`
          };
        }
      } else if (type === 'profile' || type === 'ranking') {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();
        
        if (profile) {
          cardData = {
            athleteName: profile.full_name || 'Atleta Arena',
            achievement: type === 'ranking' ? `Confira minha posição no Ranking ArenaComp!` : 'Confira meu perfil na ArenaComp!',
            mainImageUrl: profile.profile_photo,
            title: type === 'ranking' ? 'Ranking ArenaComp' : 'Perfil ArenaComp',
            modality: profile.modality || 'Arena',
            profileUrl: `https://arenacomp.com.br/user/${profile.username}`
          };
        }
      } else if (type === 'certificate') {
        const { data: cert } = await supabaseAdmin
          .from('certificates')
          .select('*, profiles(username, full_name, modality)')
          .eq('id', id)
          .single();
        
        if (cert) {
          cardData = {
            athleteName: cert.profiles?.full_name || 'Atleta Arena',
            achievement: `Certificado: ${cert.name}`,
            mainImageUrl: cert.media_url,
            title: 'Certificado ArenaComp',
            modality: cert.profiles?.modality || 'Arena',
            profileUrl: `https://arenacomp.com.br/certificates/${id}`
          };
        }
      } else if (type === 'championship') {
         const { data: champ } = await supabaseAdmin
          .from('championship_results')
          .select('*, profiles(username, full_name, modality)')
          .eq('id', id)
          .single();
        
        if (champ) {
          cardData = {
            athleteName: champ.profiles?.full_name || 'Atleta Arena',
            achievement: `${champ.resultado} no ${champ.evento}`,
            mainImageUrl: champ.media_url,
            title: 'Conquista ArenaComp',
            modality: champ.profiles?.modality || 'Arena',
            profileUrl: `https://arenacomp.com.br/share/championship/${id}`
          };
        }
      } else if (type === 'fight') {
         const { data: fight } = await supabaseAdmin
          .from('fights')
          .select('*, profiles(username, full_name, modality)')
          .eq('id', id)
          .single();
        
        if (fight) {
          cardData = {
            athleteName: fight.profiles?.full_name || 'Atleta Arena',
            achievement: `Luta no ${fight.evento}`,
            mainImageUrl: fight.media_url,
            title: 'Luta ArenaComp',
            modality: fight.profiles?.modality || 'Arena',
            profileUrl: `https://arenacomp.com.br/share/fight/${id}`
          };
        }
      }

      if (!cardData) {
        clearTimeout(timeout);
        return res.redirect('https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&h=630&fit=crop');
      }

      // Generate card using Puppeteer
      const buffer = await CardGenerator.generateAchievementCard({
        athleteName: cardData.athleteName,
        achievement: cardData.achievement,
        title: cardData.title,
        modality: cardData.modality,
        date: new Date().toLocaleDateString('pt-BR'),
        profileUrl: cardData.profileUrl
      });

      clearTimeout(timeout);
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      res.send(buffer);
    } catch (error: any) {
      clearTimeout(timeout);
      console.error(`[OG-IMAGE] Error generating image:`, error);
      res.redirect('https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&h=630&fit=crop');
    }
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
      res.setHeader('X-API-Route', 'static-catch-all');
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
