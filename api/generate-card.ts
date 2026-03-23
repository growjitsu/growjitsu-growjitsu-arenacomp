import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Permitir apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { athleteName, achievement, username } = req.body;
    
    // Suporte para ambos os formatos (o novo do usuário e o antigo do sistema)
    const name = athleteName || username;

    // Validação simples
    if (!name) {
      return res.status(400).json({ error: 'Usuário ou Atleta inválido' });
    }

    console.log(`[Serverless] Gerando card para: ${name}`);

    // Simulação de geração de card (pode evoluir depois para usar o CardGenerator real)
    const cardData = {
      username: name,
      achievement: achievement || 'Conquista ArenaComp',
      score: req.body.score || 0,
      message: 'Card gerado com sucesso 🚀',
      timestamp: new Date().toISOString(),
      // Mock de uma URL de imagem para não quebrar totalmente o frontend se ele esperar uma
      imageUrl: `https://picsum.photos/seed/${encodeURIComponent(name)}/800/1000`
    };

    return res.status(200).json({
      success: true,
      card: cardData,
      // Se o frontend esperar um blob/url, podemos retornar a imageUrl aqui
      url: cardData.imageUrl 
    });

  } catch (error: any) {
    console.error('[Serverless] Erro ao gerar card:', error);
    return res.status(500).json({
      error: 'Erro ao gerar card',
      details: error.message
    });
  }
}
