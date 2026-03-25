import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import cors from "cors";
import { createClient } from '@supabase/supabase-js';
import { CardGenerator, CardData } from "./src/services/cardGenerator";
import dotenv from "dotenv";
import * as admin from 'firebase-admin';
import firebaseConfig from './firebase-applet-config.json';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin SDK
try {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
  console.log('[FIREBASE-ADMIN] SDK inicializado com sucesso.');
} catch (error) {
  console.error('[FIREBASE-ADMIN] Erro ao inicializar SDK:', error);
}

// ... (Supabase config remains same)
const rawUrl = process.env.VITE_SUPABASE_URL || 'https://vfefztzaiqhpsfnvpkba.supabase.co';
const rawKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZWZ6dHphaXFocHNmbnZwa2JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzM1MzEsImV4cCI6MjA4NzAwOTUzMX0.G2AVN2yvCaGGtR7fK0nim2eRBAow2C57eeIaOEz1LDQ';

const isValidUrl = (url: string) => {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

const supabaseUrl = isValidUrl(rawUrl) ? rawUrl : 'https://vfefztzaiqhpsfnvpkba.supabase.co';
const supabaseKey = rawKey.length > 20 ? rawKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZWZ6dHphaXFocHNmbnZwa2JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzM1MzEsImV4cCI6MjA4NzAwOTUzMX0.G2AVN2yvCaGGtR7fK0nim2eRBAow2C57eeIaOEz1LDQ';

const supabase = createClient(supabaseUrl, supabaseKey);

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

  // 0. INFRASTRUCTURE LOGGING - MUST BE ABSOLUTELY FIRST
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[INFRA-LOG] [${timestamp}] ${req.method} ${req.url}`);
    if (req.method === 'POST') {
      console.log(`[INFRA-LOG] Headers: ${JSON.stringify(req.headers)}`);
    }
    next();
  });

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

  // Catch-all for /api routes to prevent falling through to static files
  app.all("/api/*", (req, res) => {
    res.status(404).json({ success: false, error: "API route not found", path: req.path });
  });

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
      const user = await admin.auth().getUserByEmail(email);
      
      await admin.auth().setCustomUserClaims(user.uid, { admin: true });
      
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

  // 4. OG Tag Injection for Share Links
  app.get(["/share/:id", "/share/:type/:id"], async (req, res, next) => {
    const { id, type } = req.params;
    let cardData: any = null;

    try {
      // 1. Tenta decodificar como Base64 (formato antigo/fallback)
      if (id.length > 50) {
        try {
          const jsonString = Buffer.from(id, 'base64').toString('utf-8');
          cardData = JSON.parse(jsonString);
        } catch (e) {
          console.log("[OG-TAGS] ID longo mas não é Base64 JSON válido");
        }
      }

      // 2. Se não decodificou e temos type, busca no Supabase
      if (!cardData && type) {
        console.log(`[OG-TAGS] Buscando dados no Supabase para type: ${type}, id: ${id}`);
        
        if (type === 'post' || type === 'clip') {
          const { data: post } = await supabase
            .from('posts')
            .select('*, profiles(username, full_name, profile_photo, modality)')
            .eq('id', id)
            .single();
          
          if (post) {
            cardData = {
              athleteName: post.profiles?.full_name || 'Atleta Arena',
              achievement: post.content || (type === 'clip' ? 'Compartilhou um clip' : 'Compartilhou um post'),
              mainImageUrl: post.media_url || (post.media_urls && post.media_urls[0]),
              title: type === 'clip' ? 'Clip ArenaComp' : 'Post ArenaComp'
            };
          }
        } else if (type === 'profile') {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();
          
          if (profile) {
            cardData = {
              athleteName: profile.full_name || 'Atleta Arena',
              achievement: 'Confira meu perfil na ArenaComp!',
              mainImageUrl: profile.profile_photo,
              title: 'Perfil ArenaComp'
            };
          }
        } else if (type === 'certificate') {
          const { data: cert } = await supabase
            .from('certificates')
            .select('*, profiles(username, full_name, modality)')
            .eq('id', id)
            .single();
          
          if (cert) {
            cardData = {
              athleteName: cert.profiles?.full_name || 'Atleta Arena',
              achievement: `Certificado: ${cert.name}`,
              mainImageUrl: cert.media_url,
              title: 'Certificado ArenaComp'
            };
          }
        } else if (type === 'championship') {
           const { data: champ } = await supabase
            .from('championship_results')
            .select('*, profiles(username, full_name, modality)')
            .eq('id', id)
            .single();
          
          if (champ) {
            cardData = {
              athleteName: champ.profiles?.full_name || 'Atleta Arena',
              achievement: `${champ.resultado} no ${champ.evento}`,
              mainImageUrl: champ.media_url,
              title: 'Conquista ArenaComp'
            };
          }
        } else if (type === 'fight') {
           const { data: fight } = await supabase
            .from('fights')
            .select('*, profiles(username, full_name, modality)')
            .eq('id', id)
            .single();
          
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
      console.error("[OG-TAGS] Erro ao carregar dados para OG tags:", err);
    }

    const title = cardData?.title || "Conquista ArenaComp";
    const description = `${cardData?.athleteName || "Atleta"} conquistou ${cardData?.achievement || "um novo marco"} na ArenaComp! 🔥`;
    // For the image, we can use a generic one or the athlete's photo if available
    const imageUrl = cardData?.mainImageUrl || "https://arenacomp.com.br/og-image.png"; 
    const url = `${process.env.APP_URL || 'https://arenacomp.com.br'}/share/${type ? type + '/' : ''}${id}`;

    const ogTags = `
      <title>${title}</title>
      <meta name="description" content="${description}">
      <meta property="og:title" content="${title}">
      <meta property="og:description" content="${description}">
      <meta property="og:image" content="${imageUrl}">
      <meta property="og:url" content="${url}">
      <meta property="og:type" content="website">
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:title" content="${title}">
      <meta name="twitter:description" content="${description}">
      <meta name="twitter:image" content="${imageUrl}">
    `;

    if (process.env.NODE_ENV !== "production") {
      // In dev, we let the Vite middleware handle the SPA routing
      return next();
    } else {
      try {
        const fs = await import("fs");
        const indexPath = path.join(process.cwd(), 'dist', 'index.html');
        let html = fs.readFileSync(indexPath, 'utf8');
        
        // Inject tags before </head>
        html = html.replace('</head>', `${ogTags}</head>`);
        
        return res.send(html);
      } catch (err) {
        console.error("[OG-TAGS] Erro ao carregar index.html:", err);
        return res.redirect(`/share/${id}`);
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
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
