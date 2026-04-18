import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import cors from "cors";
import { createClient } from '@supabase/supabase-js';
import { CardGenerator, CardData } from "./src/services/cardGenerator";
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';
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

// Institutional branded image for fallbacks - Professional Jiu-Jitsu competition image
// This is the official institutional image for ArenaComp share previews
const ARENA_FALLBACK_IMAGE = '/logo-arenacomp.jpg';
const ARENA_LOGO_IMAGE = '/logo-arenacomp.jpg';

// Unified Crawler Detection Regex
const CRAWLER_REGEX = /bot|googlebot|crawler|spider|robot|crawling|facebookexternalhit|facebookcatalog|WhatsApp|TelegramBot|Slackbot|Discordbot|Twitterbot|LinkedInBot|Pinterest|Bingbot|DuckDuckBot|Baiduspider|YandexBot|facebot|ia_archiver|Lighthouse|Chrome-Lighthouse/i;

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

  CREATE TABLE IF NOT EXISTS share_links (
    token TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    image TEXT,
    type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
`);

function generateShortToken(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

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
    const isCrawler = CRAWLER_REGEX.test(userAgent);
    
    // Check if it's the root path (home)
    const isHome = !type && (!id || id === 'undefined' || id === '/');

    // Official logo mapping for homepage
    const OFFICIAL_LOGO_URL = ARENA_LOGO_IMAGE.startsWith('http') ? ARENA_LOGO_IMAGE : `https://${req.get('host')}${ARENA_LOGO_IMAGE}`;

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
          title: 'ArenaComp - Jiu-Jitsu Platform',
          modality: 'Jiu-Jitsu',
          profileUrl: 'https://www.arenacomp.com.br',
          mainImageUrl: ARENA_LOGO_IMAGE // Always use official logo
        };
      } else {
        // --- 1. PRIORITY: Short Token Lookup ---
        if (id && id.length >= 6 && id.length <= 12) {
          try {
            const shareLink = db.prepare('SELECT * FROM share_links WHERE token = ?').get(id) as any;
            if (shareLink) {
              cardData = {
                title: shareLink.title,
                achievement: shareLink.description,
                mainImageUrl: shareLink.image,
                type: shareLink.type,
                athleteName: shareLink.title,
                modality: 'Arena'
              };
              console.log(`[OG-TAGS] Successfully retrieved short link data for token: ${id}`);
            }
          } catch (e) {
            console.error(`[OG-TAGS] Error looking up token ${id}:`, e);
          }
        }

        // --- 2. SECOND PRIORITY: Base64 Decoding (Retro-compatibility) ---
        // Check if ID looks like a Base64 payload (typically longer and no dots)
        if (!cardData && id && id.length > 30) {
          try {
            // Support URL-safe Base64
            const base64 = id.replace(/-/g, '+').replace(/_/g, '/');
            const decodedString = Buffer.from(base64, 'base64').toString('utf-8');
            
            // Try to parse JSON
            const decoded = JSON.parse(decodedString);
            
            // Standardize decoded data
            if (decoded && (decoded.title || decoded.athleteName)) {
              cardData = {
                title: decoded.title || decoded.athleteName,
                achievement: decoded.description || decoded.achievement,
                mainImageUrl: decoded.image || decoded.mainImageUrl,
                type: decoded.type || type,
                athleteName: decoded.athleteName || decoded.title,
                modality: decoded.modality || 'Arena'
              };
              console.log(`[OG-TAGS] Successfully decoded Base64 payload for ${id}`);
            }
          } catch (e) {
            // Not a valid Base64 JSON, continue to fallback
          }
        }

        // --- 2. FALLBACK: Type-based lookup (Retro-compatibility) ---
        if (!cardData && type && id) {
          // If Base64 decoding failed or wasn't present, use the fallback logic
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
                profilePhoto: post.profiles?.profile_photo,
                title: type === 'clip' ? 'Clip ArenaComp' : 'Post ArenaComp',
                modality: post.profiles?.modality || 'Arena'
              };
            }
          } else if (type === 'profile') {
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('*')
              .eq('id', id)
              .single();
            
            if (profile) {
              cardData = {
                athleteName: profile.full_name || 'Atleta Arena',
                achievement: 'Confira meu perfil na ArenaComp!',
                mainImageUrl: profile.profile_photo || profile.avatar_url,
                title: 'Perfil ArenaComp',
                modality: profile.modality || 'Arena'
              };
            }
          } else if (type === 'certificate') {
            const { data: cert } = await supabaseAdmin
              .from('certificates')
              .select('*, profiles(username, full_name, profile_photo, modality)')
              .eq('id', id)
              .single();
            
            if (cert) {
              cardData = {
                athleteName: cert.profiles?.full_name || 'Atleta Arena',
                achievement: `Certificado: ${cert.name}`,
                mainImageUrl: cert.media_url,
                profilePhoto: cert.profiles?.profile_photo,
                title: 'Certificado ArenaComp',
                modality: cert.profiles?.modality || 'Arena'
              };
            }
          } else if (type === 'championship') {
             const { data: champ } = await supabaseAdmin
              .from('championship_results')
              .select('*, profiles(username, full_name, profile_photo, modality)')
              .eq('id', id)
              .single();
            
            if (champ) {
              cardData = {
                athleteName: champ.profiles?.full_name || 'Atleta Arena',
                achievement: `${champ.resultado} no ${champ.evento}`,
                mainImageUrl: champ.media_url,
                profilePhoto: champ.profiles?.profile_photo,
                title: 'Conquista ArenaComp',
                modality: champ.profiles?.modality || 'Arena'
              };
            }
          } else if (type === 'fight') {
             const { data: fight } = await supabaseAdmin
              .from('fights')
              .select('*, profiles(username, full_name, profile_photo, modality)')
              .eq('id', id)
              .single();
            
            if (fight) {
              cardData = {
                athleteName: fight.profiles?.full_name || 'Atleta Arena',
                achievement: `Luta no ${fight.evento}`,
                mainImageUrl: fight.media_url,
                profilePhoto: fight.profiles?.profile_photo,
                title: 'Luta ArenaComp',
                modality: fight.profiles?.modality || 'Arena'
              };
            }
          } else if (type === 'ranking-atleta' || type === 'atleta' || type === 'ranking') {
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('*')
              .eq('id', id)
              .single();
            
            if (profile) {
              const { count: rankCount } = await supabaseAdmin
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .neq('role', 'admin')
                .eq('perfil_publico', true)
                .gt('arena_score', profile.arena_score || 0);

              const rank = (rankCount || 0) + 1;
              cardData = {
                athleteName: profile.full_name || 'Atleta Arena',
                achievement: `Posição #${rank} no ranking. Veja agora no ArenaComp.`,
                mainImageUrl: profile.profile_photo || profile.avatar_url,
                title: `${profile.full_name || 'Atleta'} no ranking ArenaComp`,
                modality: profile.modality || 'Arena'
              };
            }
          } else if (type === 'ranking-equipe' || type === 'equipe') {
            // First try to find team in the teams table for the logo
            const { data: teamData } = await supabaseAdmin
              .from('teams')
              .select('name, logo_url')
              .or(`id.eq."${id}",name.eq."${id}"`)
              .maybeSingle();

            const teamName = teamData?.name || id;
            let logoUrl = teamData?.logo_url || null;
            
            const { data: teamProfiles } = await supabaseAdmin
              .from('profiles')
              .select('arena_score, team, team_id')
              .or(`team_id.eq."${id}",team.eq."${id}"`);
            
            if (teamProfiles && teamProfiles.length > 0) {
              const actualTeamName = teamProfiles[0].team || teamName;
              const teamId = teamProfiles[0].team_id || actualTeamName;
              
              const { data: allRankings } = await supabaseAdmin.rpc('get_team_rankings');
              let rank = 1;
              if (allRankings) {
                const sorted = allRankings.sort((a: any, b: any) => (b.total_score || 0) - (a.total_score || 0));
                const idx = sorted.findIndex((t: any) => (t.team_id === teamId || t.team_name === actualTeamName));
                if (idx !== -1) {
                  rank = idx + 1;
                  if (!logoUrl) logoUrl = sorted[idx].logo_url;
                }
              }

              cardData = {
                athleteName: actualTeamName,
                achievement: `Posição #${rank} no ranking. Veja agora no ArenaComp.`,
                mainImageUrl: logoUrl,
                title: `${actualTeamName} no ranking ArenaComp`,
                modality: 'Equipe'
              };
            } else if (teamData) {
               // If no profiles found but team exists
               cardData = {
                athleteName: teamName,
                achievement: `Veja o ranking da equipe ${teamName} no ArenaComp.`,
                mainImageUrl: logoUrl,
                title: `${teamName} no ranking ArenaComp`,
                modality: 'Equipe'
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
    
    // WhatsApp limit: 80 characters for description in some previews, but OG allows more.
    // We'll keep it concise for better UX.
    if (description.length > 150) {
      description = description.substring(0, 147) + "...";
    }
    
    // Robust Base URL detection - FORCE HTTPS for WhatsApp
    const host = req.get('x-forwarded-host') || req.get('host') || 'www.arenacomp.com.br';
    let baseUrl = `https://${host}`;
    
    // Override with APP_URL if it seems correct for the current host
    if (process.env.APP_URL && process.env.APP_URL.includes(host)) {
      baseUrl = process.env.APP_URL.replace(/\/$/, '');
      if (!baseUrl.startsWith('https')) baseUrl = baseUrl.replace('http', 'https');
    }

    let ogImageUrl = ARENA_FALLBACK_IMAGE;

    if (isHome) {
      ogImageUrl = ARENA_FALLBACK_IMAGE;
    } else if (cardData?.mainImageUrl) {
      ogImageUrl = cardData.mainImageUrl;
    } else if (cardData?.media_url) {
      ogImageUrl = cardData.media_url;
    } else if (cardData?.profilePhoto) {
      ogImageUrl = cardData.profilePhoto;
    } else {
      const name = cardData?.athleteName || 'ArenaComp';
      ogImageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff&size=512`;
    }

    // Ensure ogImageUrl is absolute and HTTPS
    if (ogImageUrl && !ogImageUrl.startsWith('http') && !ogImageUrl.startsWith('data:')) {
      if (ogImageUrl.startsWith('/')) {
        ogImageUrl = `${baseUrl}${ogImageUrl}`;
      } else {
        // If it doesn't start with / but is relative, prefix it anyway
        ogImageUrl = `${baseUrl}/${ogImageUrl}`;
      }
    }
    
    // Force HTTPS for all image URLs to ensure WhatsApp compatibility
    if (ogImageUrl && ogImageUrl.startsWith('http:')) {
      ogImageUrl = ogImageUrl.replace('http:', 'https:');
    }
    
    // Add cache buster ONLY for local images (starts with baseUrl) to avoid breaking external signed URLs
    if (ogImageUrl && ogImageUrl.startsWith(baseUrl)) {
      const cacheBuster = `v=${Date.now()}`;
      ogImageUrl = ogImageUrl.includes('?') ? `${ogImageUrl}&${cacheBuster}` : `${ogImageUrl}?${cacheBuster}`;
    }

    const shareUrl = isHome ? baseUrl : `${baseUrl}/share/${type ? type + '/' : ''}${id}`;
    const redirectUrl = isHome ? '/' : `/${type ? type + '/' : ''}${id}`;
    
    // Safety check for ogImageUrl
    if (isHome) {
      ogImageUrl = ARENA_LOGO_IMAGE;
    }
    
    if (ogImageUrl && ogImageUrl.startsWith('/')) {
       ogImageUrl = `${baseUrl}${ogImageUrl}`;
    }

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
    <meta property="og:type" content="website">
    <meta property="og:url" content="${shareUrl}">
    <meta property="og:title" content="${title.replace(/"/g, '&quot;')}">
    <meta property="og:description" content="${description.replace(/"/g, '&quot;')}">
    <meta property="og:image" content="${ogImageUrl}">
    <meta property="og:image:secure_url" content="${ogImageUrl}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:type" content="${ogImageUrl.toLowerCase().includes('.png') ? 'image/png' : 'image/jpeg'}">
    <meta property="og:image:alt" content="${title.replace(/"/g, '&quot;')}">
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
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Arena-Status', 'crawler-ssr');
    return res.status(200).send(buffer);
  };

  // 1. Crawler Detection Middleware - MUST BE FIRST
  app.use(async (req, res, next) => {
    const userAgent = req.get('User-Agent') || '';
    const isCrawler = CRAWLER_REGEX.test(userAgent);
    
    if (isCrawler && !req.url.startsWith('/api') && !req.url.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js|woff2?)$/i)) {
      const pathParts = req.path.split('/').filter(Boolean);
      
      console.log(`[CRAWLER-DETECT] Path: ${req.path} | Parts: ${pathParts.join('/')}`);

      // 1. Handle /share/:type/:id or /share/:id
      if (pathParts[0] === 'share' && pathParts.length >= 2) {
        req.params = pathParts.length >= 3 ? { type: pathParts[1], id: pathParts[2] } : { id: pathParts[1] };
        return handleShareRequest(req, res, next);
      }
      
      // 2. Handle /post/:id, /profile/:id, etc. directly
      if (pathParts.length >= 2) {
        // Support /ranking/atleta/:id and /ranking/equipe/:id
        if (pathParts[0] === 'ranking' && pathParts.length >= 3) {
           const subType = pathParts[1]; // atleta or equipe
           req.params = { type: `ranking-${subType}`, id: pathParts[2] };
           return handleShareRequest(req, res, next);
        }

        const type = pathParts[0] === 'user' ? 'profile' : pathParts[0];
        const id = pathParts[1];
        const validTypes = ['profile', 'post', 'clip', 'certificate', 'ranking', 'fights', 'championship', 'eventos'];
        
        if (validTypes.includes(type)) {
          req.params = { type, id };
          return handleShareRequest(req, res, next);
        }
      }

      // 3. Fallback for home or other pages
      if (!req.path.includes('.')) {
        // Ensure params are clean for home
        req.params = {};
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

  // --- NEW: SHORT LINK CREATION API ---
  app.post("/api/share/create", (req, res) => {
    const { title, description, image, type } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ error: "Title and description are required" });
    }

    // Security: Filter out Base64 images if they somehow payloaded here
    let imageUrl = image;
    if (imageUrl && imageUrl.startsWith('data:image')) {
      console.warn('[API-SHARE] Ignored Base64 image in share creation');
      imageUrl = null; 
    }

    // Logic for official fallback image if no image provided
    if (!imageUrl) {
      const host = (req.get('x-forwarded-host') || req.get('host'));
      imageUrl = `https://${host}/logo-arenacomp.jpg`;
    }

    const token = generateShortToken(8);
    
    try {
      db.prepare('INSERT INTO share_links (token, title, description, image, type) VALUES (?, ?, ?, ?, ?)')
        .run(token, title, description, imageUrl, type || 'post');
      
      console.log(`[API-SHARE] Created short link: ${token} for type: ${type}`);
      res.json({ 
        success: true,
        token, 
        shareUrl: `/share/${type || 'post'}/${token}` 
      });
    } catch (e) {
      console.error("[API-SHARE] Error creating share link:", e);
      res.status(500).json({ error: "Failed to create share link" });
    }
  });

  app.get("/api/share/token/:token", (req, res) => {
    const { token } = req.params;
    try {
      const shareLink = db.prepare('SELECT * FROM share_links WHERE token = ?').get(token) as any;
      if (shareLink) {
        res.json({
          success: true,
          data: {
            title: shareLink.title,
            description: shareLink.description,
            image: shareLink.image,
            type: shareLink.type,
            created_at: shareLink.created_at
          }
        });
      } else {
        res.status(404).json({ error: "Token not found" });
      }
    } catch (e) {
      console.error("[API-SHARE] Error fetching token:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- NEW: ATHLETE RESUME PDF GENERATION (SERVER-SIDE RENDERED) ---
  app.get("/api/resume/pdf/:userId", async (req, res) => {
    const { userId } = req.params;
    console.log(`[API-RESUME] Starting PDF generation for user: ${userId}`);
    
    try {
      // 1. Fetch Complete Athlete Data
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError || !profile) {
        throw new Error(`Atleta não encontrado: ${profileError?.message || 'ID inválido'}`);
      }

      const { data: championships } = await supabaseAdmin
        .from('championship_results')
        .select('*')
        .eq('athlete_id', userId)
        .order('data_evento', { ascending: false });

      const { data: fights } = await supabaseAdmin
        .from('fights')
        .select('*')
        .eq('athlete_id', userId)
        .order('data_luta', { ascending: false });

      // 2. Build Professional HTML Template
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Currículo Atleta - ArenaComp</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
          <style>
            :root {
              --primary: #0047FF;
              --text-main: #0f172a;
              --text-muted: #64748b;
              --border: #e2e8f0;
              --surface: #f8fafc;
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Inter', sans-serif; 
              color: var(--text-main); 
              line-height: 1.5;
              padding: 20mm;
              background: white;
            }
            .header { 
              display: flex; 
              align-items: center; 
              gap: 24px; 
              margin-bottom: 32px;
              padding-bottom: 24px;
              border-bottom: 1px solid var(--border);
            }
            .avatar {
              width: 100px;
              height: 100px;
              border-radius: 20px;
              object-fit: cover;
              border: 3px solid var(--primary);
            }
            .title-info h1 { 
              font-size: 24px; 
              font-weight: 900; 
              text-transform: uppercase; 
              letter-spacing: -1px;
              margin-bottom: 4px;
            }
            .subtitle {
              color: var(--primary);
              font-weight: 700;
              font-size: 14px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .section { margin-bottom: 32px; }
            .section-title {
              font-size: 11px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 2px;
              color: var(--text-muted);
              margin-bottom: 16px;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .stats-grid {
              display: grid;
              grid-template-cols: repeat(4, 1fr);
              gap: 16px;
              margin-bottom: 32px;
            }
            .stat-card {
              background: var(--surface);
              padding: 16px;
              border-radius: 16px;
              text-align: center;
              border: 1px solid var(--border);
            }
            .stat-value { font-weight: 900; font-size: 18px; color: var(--primary); }
            .stat-label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); }
            
            .item { 
              padding: 12px; 
              border-radius: 12px; 
              border: 1px solid var(--border);
              margin-bottom: 8px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .item-main { font-weight: 700; font-size: 13px; text-transform: uppercase; }
            .item-sub { color: var(--text-muted); font-size: 11px; font-weight: 500; }
            .badge {
              padding: 4px 8px;
              border-radius: 6px;
              font-size: 10px;
              font-weight: 900;
              text-transform: uppercase;
              background: var(--primary);
              color: white;
            }
            .footer {
              margin-top: 48px;
              text-align: center;
              font-size: 10px;
              color: var(--text-muted);
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${profile.profile_photo || profile.avatar_url || 'https://via.placeholder.com/150'}" class="avatar" alt="">
            <div class="title-info">
              <h1>${profile.full_name}</h1>
              <div class="subtitle">${profile.modality || 'Jiu-Jitsu'} • ${profile.graduation || 'N/A'}</div>
              <div class="item-sub" style="margin-top: 4px;">${profile.team || 'Sem Equipe'} • ${profile.city || 'Cidade'}, ${profile.state || 'Estado'}</div>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${profile.arena_score || 0}</div>
              <div class="stat-label">Arena Score</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${profile.wins || 0}</div>
              <div class="stat-label">Vitórias</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${profile.total_fights || 0}</div>
              <div class="stat-label">Total Lutas</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${profile.medals || 0}</div>
              <div class="stat-label">Medalhas</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">🏆 Conquistas Recentes</div>
            ${championships && championships.length > 0 ? 
              championships.slice(0, 5).map(c => `
                <div class="item">
                  <div>
                    <div class="item-main">${c.championship_name}</div>
                    <div class="item-sub">${c.modalidade} • ${c.categoria_idade} • ${new Date(c.data_evento).toLocaleDateString('pt-BR')}</div>
                  </div>
                  <div class="badge">${c.resultado}</div>
                </div>
              `).join('') : '<p class="item-sub">Nenhum resultado registrado.</p>'}
          </div>

          <div class="section">
            <div class="section-title">👊 Histórico de Lutas</div>
            ${fights && fights.length > 0 ? 
              fights.slice(0, 5).map(f => `
                <div class="item">
                  <div>
                    <div class="item-main">vs ${f.opponent_name}</div>
                    <div class="item-sub">${f.evento} • ${new Date(f.data_luta).toLocaleDateString('pt-BR')}</div>
                  </div>
                  <div class="badge" style="background: ${f.resultado === 'win' ? '#22c55e' : '#ef4444'}">${f.resultado === 'win' ? 'Vitória' : 'Derrota'}</div>
                </div>
              `).join('') : '<p class="item-sub">Nenhuma luta registrada.</p>'}
          </div>

          <div class="footer">
            Gerado automaticamente por ArenaComp • arenalabs.com
          </div>
        </body>
        </html>
      `;

      // 3. Launch Puppeteer and Render
      const executablePath = await chromium.executablePath();
      const browser = await puppeteer.launch({
        args: chromium.args,
        executablePath,
        headless: true,
      });

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
      });

      await browser.close();

      console.log(`[API-RESUME] PDF generated successfully for ${profile.full_name}. Size: ${pdf.length} bytes`);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Length': pdf.length,
        'Content-Disposition': `attachment; filename="Curriculo_${profile.full_name.replace(/\s+/g, '_')}.pdf"`,
      });
      
      res.send(pdf);

    } catch (error: any) {
      console.error('[API-RESUME] Error generating PDF:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Falha crítica ao gerar PDF real: ' + error.message });
      }
    }
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
            profile_photo: 'https://ui-avatars.com/api/?name=Atleta+Exemplo+1&background=0D8ABC&color=fff',
            arena_score: 1500,
            username: 'exemplo1',
            role: 'athlete'
          },
          {
            id: 'demo-2',
            full_name: 'Atleta Exemplo 2',
            profile_photo: 'https://ui-avatars.com/api/?name=Atleta+Exemplo+2&background=0D8ABC&color=fff',
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

  // PROMOTION ANALYTICS API (Bypassing ad blockers)
  app.post("/api/pAnalytics", async (req, res) => {
    res.setHeader('X-API-Route', 'pAnalytics');
    try {
      const { pid, et, uid, cli } = req.body;
      
      if (!pid || !et) {
        return res.status(400).json({ error: "Missing parameters" });
      }

      const userAgent = req.headers['user-agent'] || '';
      const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

      // Basic geolocation
      const country = req.headers['cf-ipcountry'] as string || 'Unknown';

      const { error } = await supabaseAdmin
        .from('arena_ad_events')
        .insert([{
          ad_id: pid,
          event_type: et,
          user_id: uid || null,
          ip_address: typeof ipAddress === 'string' ? ipAddress : (Array.isArray(ipAddress) ? ipAddress[0] : null),
          user_agent: userAgent,
          device_type: cli?.device || 'desktop',
          os: cli?.os || 'Unknown',
          browser: cli?.browser || 'Unknown',
          country: country,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      // Update summary counts in arena_ads
      if (et === 'impression') {
        await supabaseAdmin.rpc('increment_ad_impressions', { ad_id_param: pid });
      } else if (et === 'click') {
        await supabaseAdmin.rpc('increment_ad_clicks', { ad_id_param: pid });
      }

      res.json({ status: "ok" });
    } catch (error: any) {
      console.error('[API] Erro ao rastrear analiticos:', error);
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

  // 0.6. OG IMAGE GENERATION ENDPOINT (GET) - NOW A REDIRECT/PROXY TO AVOID PUPPETEER
  app.get("/api/og-image/:type/:id", async (req, res) => {
    const { type, id } = req.params;
    console.log(`[OG-IMAGE] Request received for type: ${type}, id: ${id}`);

    try {
      let imageUrl = ARENA_FALLBACK_IMAGE;

      if (type === 'home' || type === 'default') {
        imageUrl = ARENA_FALLBACK_IMAGE;
      } else if (type === 'post' || type === 'clip') {
        const { data: post } = await supabaseAdmin
          .from('posts')
          .select('media_url, media_urls, profiles(full_name, profile_photo)')
          .eq('id', id)
          .single();
        
        const profile = Array.isArray(post?.profiles) ? post.profiles[0] : post?.profiles;
        
        if (post?.media_url || (post?.media_urls && post.media_urls[0])) {
          imageUrl = post.media_url || post.media_urls[0];
        } else if (profile?.profile_photo) {
          imageUrl = profile.profile_photo;
        } else if (profile?.full_name) {
          imageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name)}&background=0D8ABC&color=fff&size=512`;
        }
      } else if (type === 'profile' || type === 'ranking') {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('profile_photo, full_name')
          .eq('id', id)
          .single();
        
        if (profile?.profile_photo) {
          imageUrl = profile.profile_photo;
        } else if (profile?.full_name) {
          imageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name)}&background=0D8ABC&color=fff&size=512`;
        }
      } else if (type === 'certificate') {
        const { data: cert } = await supabaseAdmin
          .from('certificates')
          .select('media_url, profiles(full_name, profile_photo)')
          .eq('id', id)
          .single();
        
        const profile = Array.isArray(cert?.profiles) ? cert.profiles[0] : cert?.profiles;
        
        if (cert?.media_url) {
          imageUrl = cert.media_url;
        } else if (profile?.profile_photo) {
          imageUrl = profile.profile_photo;
        } else if (profile?.full_name) {
          imageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name)}&background=0D8ABC&color=fff&size=512`;
        }
      } else if (type === 'championship') {
         const { data: champ } = await supabaseAdmin
          .from('championship_results')
          .select('media_url, profiles(full_name, profile_photo)')
          .eq('id', id)
          .single();
        
        const profile = Array.isArray(champ?.profiles) ? champ.profiles[0] : champ?.profiles;
        
        if (champ?.media_url) {
          imageUrl = champ.media_url;
        } else if (profile?.profile_photo) {
          imageUrl = profile.profile_photo;
        } else if (profile?.full_name) {
          imageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name)}&background=0D8ABC&color=fff&size=512`;
        }
      } else if (type === 'fight') {
         const { data: fight } = await supabaseAdmin
          .from('fights')
          .select('media_url, profiles(full_name, profile_photo)')
          .eq('id', id)
          .single();
        
        const profile = Array.isArray(fight?.profiles) ? fight.profiles[0] : fight?.profiles;
        
        if (fight?.media_url) {
          imageUrl = fight.media_url;
        } else if (profile?.profile_photo) {
          imageUrl = profile.profile_photo;
        } else if (profile?.full_name) {
          imageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name)}&background=0D8ABC&color=fff&size=512`;
        }
      }

      // Ensure HTTPS
      if (imageUrl && imageUrl.startsWith('http:')) {
        imageUrl = imageUrl.replace('http:', 'https:');
      }

      console.log(`[OG-IMAGE] Redirecting to: ${imageUrl}`);
      
      // Add cache buster to ensure fresh preview
      const cacheBuster = `v=${Date.now()}`;
      const finalUrl = imageUrl.includes('?') ? `${imageUrl}&${cacheBuster}` : `${imageUrl}?${cacheBuster}`;
      
      return res.redirect(finalUrl);
    } catch (error: any) {
      console.error(`[OG-IMAGE] Error resolving image:`, error);
      return res.redirect(ARENA_FALLBACK_IMAGE);
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
