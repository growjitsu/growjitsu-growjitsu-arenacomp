import { GoogleGenAI } from "@google/genai";
import axios from "axios";

// This service handles automated content moderation using Gemini Vision AI.
// It detects nudity, pornography, violence, and other improper content.

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ModerationVerdict {
  safe: boolean;
  score: number; // 0 to 1, higher is more dangerous
  category: "SFW" | "NUDITY" | "SEXUAL" | "VIOLENCE" | "SPAM" | "OTHER";
  reasoning: string;
  status: "approved" | "blocked" | "flagged";
}

export const analyzeMedia = async (mediaUrl: string, type: 'image' | 'video'): Promise<ModerationVerdict> => {
  try {
    console.log(`[MODERATION] Analisando mídia (${type}): ${mediaUrl}`);

    // If it's a video, for now we will assume analyzing the first frame or thumbnail
    // In a full production system, we'd extract frames, but for this demo/preview 
    // we'll treat it as a visual analysis.
    
    // Download image data
    const response = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
    const base64Data = Buffer.from(response.data, 'binary').toString('base64');
    const mimeType = String(response.headers['content-type'] || 'image/jpeg');

    const prompt = `
      Analise esta imagem criteriosamente para segurança de uma plataforma social de esportes (Jiu-Jitsu).
      Você deve identificar qualquer conteúdo impróprio, incluindo mas não limitado a:
      - Nudez total ou parcial
      - Conteúdo sexualmente explícito ou sugestivo (Pornografia)
      - Violência extrema (não relacionada a esportes)
      - Drogas ou apologia ao crime
      - Conteúdo impróprio para menores
      
      Responda EXCLUSIVAMENTE em formato JSON com a seguinte estrutura:
      {
        "safe": boolean,
        "score": number (0-1, onde 1 é extremamente perigoso),
        "category": "SFW" | "NUDITY" | "SEXUAL" | "VIOLENCE" | "SPAM" | "OTHER",
        "reasoning": "Breve explicação em português",
        "status": "approved" | "blocked" | "flagged"
      }
      
      Regra de Ouro: Se houver qualquer dúvida sobre conteúdo sexual ou nudez em uma plataforma com crianças, o status deve ser "blocked".
    `;

    const modelResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { data: base64Data, mimeType } }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const result = JSON.parse(modelResponse.text || "{}");
    
    console.log(`[MODERATION] Resultado para ${mediaUrl}: ${result.status} (${result.category})`);
    
    return {
      safe: result.safe ?? true,
      score: result.score ?? 0,
      category: result.category ?? "SFW",
      reasoning: result.reasoning ?? "Análise automatizada concluída",
      status: result.status ?? "approved"
    };

  } catch (error) {
    console.error(`[MODERATION] Erro ao analisar mídia:`, error);
    // Fallback: If AI fails, we flag for manual review instead of auto-approving
    return {
      safe: false,
      score: 0.5,
      category: "OTHER",
      reasoning: "Falha técnica na análise automática. Necessita revisão manual.",
      status: "flagged"
    };
  }
};
