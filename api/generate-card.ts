import { VercelRequest, VercelResponse } from '@vercel/node';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.error('[Serverless] Erro ao fazer parse do body:', e);
      }
    }

    const { type, user, content } = body || {};
    const username = user?.username || 'atleta';
    const name = user?.name || 'Arena Fighter';
    const avatarUrl = user?.avatar || 'https://picsum.photos/seed/fighter/200/200';
    
    const title = content?.title || 'ArenaComp';
    const description = content?.description || '';
    const score = content?.score || 0;
    const city = content?.city || 'Brasil';
    const date = content?.date || new Date().toLocaleDateString('pt-BR');
    const contentImage = content?.image;

    let highlight = '';
    switch (type) {
      case 'profile': highlight = '🔥 MEU PERFIL'; break;
      case 'post': highlight = '📢 NOVA POSTAGEM'; break;
      case 'certificate': highlight = '🏆 CONQUISTA'; break;
      case 'clip': highlight = '🎥 NOVO CLIP'; break;
      default: highlight = '🔥 DESTAQUE';
    }

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        
        body {
          margin: 0;
          padding: 0;
          width: 1080px;
          height: 1920px;
          background: linear-gradient(180deg, #0A1F44 0%, #050A1A 50%, #000000 100%);
          font-family: 'Inter', sans-serif;
          color: #FFFFFF;
          display: flex;
          flex-direction: column;
          align-items: center;
          overflow: hidden;
        }

        .glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 1000px;
          height: 1000px;
          background: radial-gradient(circle, rgba(255, 215, 0, 0.08) 0%, transparent 70%);
          z-index: 0;
        }

        .container {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 100px 0;
          box-sizing: border-box;
        }

        .branding {
          font-size: 70px;
          font-weight: 900;
          color: #FFD700;
          text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
          margin-bottom: 100px;
        }

        .main-image-container {
          width: 880px;
          height: 600px;
          margin-bottom: 60px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .main-image-content {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 40px;
          border: 10px solid #FFD700;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }

        .avatar-circle {
          width: 440px;
          height: 440px;
          border-radius: 50%;
          border: 15px solid #FFD700;
          object-fit: cover;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }

        .athlete-info {
          text-align: center;
          margin-bottom: 80px;
        }

        .athlete-name {
          font-size: 85px;
          font-weight: 700;
          margin-bottom: 10px;
        }

        .athlete-username {
          font-size: 50px;
          color: #1E90FF;
        }

        .highlight-box {
          font-size: 100px;
          font-weight: 900;
          color: #FFD700;
          margin-bottom: 60px;
          text-transform: uppercase;
        }

        .stats-row {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          margin-bottom: 60px;
        }

        .stat-item {
          font-size: 60px;
          font-weight: 700;
        }

        .city-item {
          font-size: 45px;
          color: #AAAAAA;
        }

        .date-item {
          font-size: 40px;
          color: #888888;
        }

        .description {
          font-size: 45px;
          font-style: italic;
          text-align: center;
          max-width: 900px;
          line-height: 1.4;
          color: #EEEEEE;
          margin-top: 40px;
        }

        .footer {
          margin-top: auto;
          text-align: center;
        }

        .url {
          font-size: 45px;
          font-weight: 700;
          color: #FFD700;
          margin-bottom: 10px;
        }

        .cta {
          font-size: 30px;
          color: rgba(255, 255, 255, 0.5);
        }
      </style>
    </head>
    <body>
      <div class="glow"></div>
      <div class="container">
        <div class="branding">ARENACOMP</div>
        
        <div class="main-image-container">
          ${contentImage && (type === 'post' || type === 'clip' || type === 'certificate') 
            ? `<img src="${contentImage}" class="main-image-content">`
            : `<img src="${avatarUrl}" class="avatar-circle">`
          }
        </div>

        <div class="athlete-info">
          <div class="athlete-name">${name}</div>
          <div class="athlete-username">@${username}</div>
        </div>

        <div class="highlight-box">${highlight}</div>

        <div class="stats-row">
          ${(type === 'profile' || score > 0) ? `<div class="stat-item">SCORE: ${score}</div>` : ''}
          ${(city && city !== 'Brasil') ? `<div class="city-item">${city}</div>` : ''}
          <div class="date-item">${date}</div>
        </div>

        <div class="description">${description || title}</div>

        <div class="footer">
          <div class="url">WWW.ARENACOMP.COM.BR</div>
          <div class="cta">Siga sua jornada no ArenaComp</div>
        </div>
      </div>
    </body>
    </html>
    `;

    console.log('[Serverless] Iniciando renderização com Puppeteer...');
    
    let browser;
    try {
      const executablePath = await chromium.executablePath();
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: (chromium as any).defaultViewport,
        executablePath: executablePath,
        headless: (chromium as any).headless || true,
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1080, height: 1920 });
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const buffer = await page.screenshot({ type: 'png' });
      await browser.close();

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      
      return res.status(200).end(buffer);

    } catch (err: any) {
      console.error('[Serverless] Erro no Puppeteer:', err);
      if (browser) await (browser as any).close();
      throw err;
    }

  } catch (error: any) {
    console.error('[Serverless] Erro ao gerar card:', error);
    return res.status(500).json({
      error: 'Erro ao gerar card',
      details: error.message
    });
  }
}
