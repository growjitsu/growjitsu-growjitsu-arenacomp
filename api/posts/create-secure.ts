
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { GoogleGenAI } from "@google/genai";

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vfefztzaiqhpsfnvpkba.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZWZ6dHphaXFocHNmbnZwa2JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzM1MzEsImV4cCI6MjA4NzAwOTUzMX0.G2AVN2yvCaGGtR7fK0nim2eRBAow2C57eeIaOEz1LDQ';
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = (supabaseSecretKey && supabaseSecretKey.length > 20) 
  ? createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }) 
  : createClient(supabaseUrl, supabaseAnonKey);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

async function analyzeMedia(mediaUrl: string, type: 'image' | 'video') {
  try {
    const response = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
    const base64Data = Buffer.from(response.data, 'binary').toString('base64');
    const mimeType = String(response.headers['content-type'] || 'image/jpeg');

    const prompt = `
      Analise esta imagem criteriosamente para segurança de uma plataforma social de esportes (Jiu-Jitsu).
      Identifique qualquer conteúdo impróprio (nudez, pornografia, violência externa, drogas).
      Responda EXCLUSIVAMENTE em formato JSON:
      {
        "safe": boolean,
        "score": number (0-1),
        "category": "SFW" | "NUDITY" | "SEXUAL" | "VIOLENCE" | "SPAM" | "OTHER",
        "reasoning": "Breve explicação em português",
        "status": "approved" | "blocked" | "flagged"
      }
    `;

    const modelResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { data: base64Data, mimeType } }
        ]
      },
      config: { responseMimeType: "application/json" }
    });

    return JSON.parse(modelResponse.text || "{}");
  } catch (error) {
    console.error('[MODERATION] Fail:', error);
    return { status: 'flagged', reasoning: 'Erro técnico na análise automática' };
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { author_id, content, type, media_url, media_urls } = req.body;

  if (!author_id) {
    return res.status(400).json({ success: false, error: "ID do autor é obrigatório" });
  }

  try {
    const urlsToAnalyze = media_urls || (media_url ? [media_url] : []);
    let moderationStatus = 'approved';
    let moderationInfo: any = { source: 'vercel-api', analyzed_at: new Date().toISOString() };

    if (urlsToAnalyze.length > 0) {
      const analysis = await analyzeMedia(urlsToAnalyze[0], type === 'video' ? 'video' : 'image');
      moderationStatus = analysis.status || 'approved';
      moderationInfo.ai_analysis = analysis;
    }

    const { data, error } = await supabaseAdmin
      .from('posts')
      .insert({
        author_id,
        content: content?.toUpperCase(),
        type: type || 'post',
        media_url: media_url || (media_urls && media_urls[0]) || null,
        media_urls: media_urls || (media_url ? [media_url] : null),
        moderation_status: moderationStatus,
        moderation_info: moderationInfo
      })
      .select()
      .single();

    if (error) throw error;

    if (moderationStatus === 'blocked') {
      return res.json({ 
        success: false, 
        error: "Conteúdo impróprio detectado.", 
        reason: moderationInfo.ai_analysis?.reasoning,
        post_id: data.id 
      });
    }

    return res.status(201).json({ success: true, data, status: moderationStatus });

  } catch (error: any) {
    console.error('[API] Error in create-secure:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
