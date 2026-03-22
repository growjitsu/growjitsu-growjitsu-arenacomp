import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium-min';
import QRCode from 'qrcode';
import Handlebars from 'handlebars';

export interface CardData {
  title: string;
  athleteName: string;
  achievement: string;
  modality: string;
  date?: string;
  profileUrl: string;
}

const CARD_TEMPLATE = `
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
      height: 1350px;
      background: #050505;
      font-family: 'Inter', sans-serif;
      color: #FFFFFF;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .card-container {
      width: 100%;
      height: 100%;
      position: relative;
      padding: 80px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 20px solid #D4AF37; /* Gold border */
    }

    /* Background pattern */
    .bg-pattern {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: 
        radial-gradient(circle at 20% 20%, rgba(212, 175, 55, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 80% 80%, rgba(212, 175, 55, 0.1) 0%, transparent 50%);
      z-index: 0;
    }

    .header {
      z-index: 1;
      text-align: center;
    }

    .title {
      font-size: 80px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: -2px;
      color: #D4AF37;
      margin-bottom: 20px;
      text-shadow: 0 0 30px rgba(212, 175, 55, 0.3);
    }

    .content {
      z-index: 1;
      text-align: center;
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .athlete-name {
      font-size: 120px;
      font-weight: 900;
      line-height: 0.9;
      margin-bottom: 40px;
      text-transform: uppercase;
    }

    .achievement-desc {
      font-size: 48px;
      font-weight: 400;
      color: #AAAAAA;
      margin-bottom: 60px;
      max-width: 800px;
      margin-left: auto;
      margin-right: auto;
    }

    .modality-tag {
      display: inline-block;
      padding: 15px 40px;
      background: #D4AF37;
      color: #000;
      font-weight: 700;
      font-size: 32px;
      border-radius: 100px;
      text-transform: uppercase;
      margin-bottom: 40px;
    }

    .footer {
      z-index: 1;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      width: 100%;
    }

    .info-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .date {
      font-size: 24px;
      color: #666666;
      text-transform: uppercase;
      font-weight: 700;
    }

    .branding {
      font-size: 40px;
      font-weight: 900;
      letter-spacing: 2px;
      color: #FFFFFF;
    }

    .qr-container {
      background: #FFFFFF;
      padding: 15px;
      border-radius: 20px;
      width: 180px;
      height: 180px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .qr-container img {
      width: 100%;
      height: 100%;
    }

    .badge {
      position: absolute;
      top: 60px;
      right: 60px;
      width: 150px;
      height: 150px;
      background: #D4AF37;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 60px;
      box-shadow: 0 0 50px rgba(212, 175, 55, 0.5);
    }
  </style>
</head>
<body>
  <div class="bg-pattern"></div>
  <div class="card-container">
    <div class="badge">🏆</div>
    
    <div class="header">
      <div class="title">{{title}}</div>
    </div>

    <div class="content">
      <div class="athlete-name">{{athleteName}}</div>
      <div class="modality-tag">{{modality}}</div>
      <div class="achievement-desc">{{achievement}}</div>
    </div>

    <div class="footer">
      <div class="info-group">
        <div class="branding">ARENACOMP</div>
        <div class="date">{{date}}</div>
      </div>
      <div class="qr-container">
        <img src="{{qrCode}}" alt="Profile QR">
      </div>
    </div>
  </div>
</body>
</html>
`;

export class CardGenerator {
  private static template = Handlebars.compile(CARD_TEMPLATE);

  static async generateAchievementCard(data: CardData): Promise<Buffer> {
    console.log('[CardGenerator] Iniciando geração de QR Code...');
    // 1. Generate QR Code
    const qrCodeDataUrl = await QRCode.toDataURL(data.profileUrl, {
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    // 2. Compile Template
    const html = this.template({
      ...data,
      qrCode: qrCodeDataUrl,
    });

    console.log('[CardGenerator] Preparando lançamento do Puppeteer...');
    
    const launchOptions: any = {
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--font-render-hinting=none'],
      headless: true,
    };

    // Se estiver em produção (Google Cloud Run), usa o chromium-min
    if (process.env.NODE_ENV === 'production') {
      try {
        console.log('[CardGenerator] Detectado ambiente de produção. Carregando chromium-min...');
        const executablePath = await chromium.executablePath();
        if (!executablePath) {
          throw new Error('Chromium executable path is empty');
        }
        launchOptions.executablePath = executablePath;
        launchOptions.args = [...launchOptions.args, ...chromium.args];
        console.log('[CardGenerator] ExecutablePath obtido com sucesso:', launchOptions.executablePath);
      } catch (err) {
        console.error("[CardGenerator] Erro crítico ao obter executablePath do chromium-min:", err);
      }
    }

    // 3. Launch Puppeteer
    console.log('[CardGenerator] Iniciando browser com opções:', JSON.stringify({ ...launchOptions, executablePath: launchOptions.executablePath ? 'HIDDEN' : undefined }));
    const browser = await puppeteer.launch(launchOptions);

    try {
      console.log('[CardGenerator] Abrindo nova página...');
      const page = await browser.newPage();
      
      // Set viewport to card size
      await page.setViewport({
        width: 1080,
        height: 1350,
        deviceScaleFactor: 2, // High resolution
      });

      console.log('[CardGenerator] Definindo conteúdo HTML...');
      // Set content and wait for fonts/images
      await page.setContent(html, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      console.log('[CardGenerator] Capturando screenshot...');
      // Take screenshot
      const buffer = await page.screenshot({
        type: 'png',
        fullPage: true,
      });

      console.log('[CardGenerator] Card gerado com sucesso!');
      return buffer as Buffer;
    } catch (error) {
      console.error('[CardGenerator] Erro durante a geração:', error);
      throw error;
    } finally {
      await browser.close();
    }
  }
}
