import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { createClient } from '@supabase/supabase-js';
import { CardGenerator, CardData } from "./src/services/cardGenerator";

// Supabase Configuration (Backend)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vfefztzaiqhpsfnvpkba.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZWZ6dHphaXFocHNmbnZwa2JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzM1MzEsImV4cCI6MjA4NzAwOTUzMX0.G2AVN2yvCaGGtR7fK0nim2eRBAow2C57eeIaOEz1LDQ';
const supabase = createClient(supabaseUrl, supabaseKey);

const db = new Database("arenacomp.db");

// Initialize Database
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

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "ArenaComp API is running" });
  });

  // Team Representative Validation Endpoint
  app.post("/api/auth/validate-representative", async (req, res) => {
    const { teamId } = req.body;
    console.log(`[BACKEND] Validando representante para equipe: ${teamId}`);

    if (!teamId) {
      return res.status(400).json({ error: "Team ID is required" });
    }

    try {
      // SELECT COUNT(*) FROM profiles WHERE team_id = ? AND team_leader = 'true'
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .or('team_leader.eq.true,team_leader.eq.TRUE');

      if (error) {
        console.error("[BACKEND] Erro ao consultar Supabase:", error);
        throw error;
      }

      console.log(`[BACKEND] Resultado para equipe ${teamId}: ${count} representantes`);

      if (count && count > 0) {
        return res.status(400).json({ 
          error: "Equipe já representada", 
          message: "Esta equipe já possui um representante oficial cadastrado." 
        });
      }

      res.json({ status: "ok", message: "Equipe disponível" });
    } catch (error: any) {
      console.error("[BACKEND] Erro na validação de representante:", error);
      res.status(500).json({ error: "Internal server error during validation" });
    }
  });

  // Card Generation Endpoint
  app.post("/api/cards/generate", async (req, res) => {
    console.log("[API] Recebida requisição para gerar card:", req.body);
    try {
      const cardData: CardData = req.body;
      
      if (!cardData.athleteName || !cardData.achievement) {
        console.warn("[API] Dados incompletos para geração de card:", cardData);
        return res.status(400).json({ error: "Missing required card data" });
      }

      console.log(`[API] Iniciando geração para ${cardData.athleteName}: ${cardData.achievement}`);
      
      const buffer = await CardGenerator.generateAchievementCard({
        ...cardData,
        date: cardData.date || new Date().toLocaleDateString('pt-BR'),
        title: cardData.title || "🏆 NOVA CONQUISTA",
        modality: cardData.modality || "ATLETA ARENACOMP",
        profileUrl: cardData.profileUrl || "https://arenacomp.com.br"
      });

      console.log("[API] Card gerado com sucesso, enviando buffer...");
      res.set('Content-Type', 'image/png');
      res.send(buffer);
    } catch (error: any) {
      console.error("[API] Erro crítico na geração de card:", error);
      res.status(500).json({ 
        error: "Failed to generate card", 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // Mock Championship Data
  app.get("/api/championships", (req, res) => {
    const championships = db.prepare("SELECT * FROM championships").all();
    res.json(championships);
  });

  app.post("/api/championships", (req, res) => {
    const { name, date, location } = req.body;
    const info = db.prepare("INSERT INTO championships (name, date, location) VALUES (?, ?, ?)").run(name, date, location);
    res.json({ id: info.lastInsertRowid });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ArenaComp Server running on http://localhost:${PORT}`);
  });
}

startServer();
