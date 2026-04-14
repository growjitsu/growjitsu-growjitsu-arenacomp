import puppeteer from 'puppeteer-core';
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
      width: 1200px;
      height: 630px;
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
      padding: 60px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 15px solid #1D4ED8; /* Blue border */
      background: linear-gradient(135deg, #050505 0%, #0F172A 100%);
    }

    /* Background pattern */
    .bg-pattern {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: 
        radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%);
      z-index: 0;
    }

    .header {
      z-index: 1;
      display: flex;
      align-items: center;
      gap: 30px;
    }

    .logo-svg {
      width: 100px;
      height: 100px;
    }

    .title {
      font-size: 50px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: -1px;
      color: #3B82F6;
      text-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
    }

    .content {
      z-index: 1;
      text-align: left;
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      margin-top: 20px;
    }

    .athlete-name {
      font-size: 80px;
      font-weight: 900;
      line-height: 1;
      margin-bottom: 20px;
      text-transform: uppercase;
      background: linear-gradient(to right, #FFFFFF, #94A3B8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .achievement-desc {
      font-size: 32px;
      font-weight: 400;
      color: #94A3B8;
      max-width: 800px;
      line-height: 1.4;
    }

    .modality-tag {
      display: inline-block;
      padding: 10px 25px;
      background: #1D4ED8;
      color: #FFFFFF;
      font-weight: 700;
      font-size: 20px;
      border-radius: 50px;
      text-transform: uppercase;
      margin-bottom: 20px;
      width: fit-content;
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
      gap: 5px;
    }

    .date {
      font-size: 18px;
      color: #475569;
      text-transform: uppercase;
      font-weight: 700;
    }

    .branding {
      font-size: 32px;
      font-weight: 900;
      letter-spacing: 1px;
      color: #FFFFFF;
      display: flex;
      align-items: baseline;
    }
    
    .branding .comp {
      color: #3B82F6;
    }

    .qr-container {
      background: #FFFFFF;
      padding: 10px;
      border-radius: 15px;
      width: 120px;
      height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }

    .qr-container img {
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <div class="bg-pattern"></div>
  <div class="card-container">
    <div class="header">
      <svg class="logo-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E3A8A" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
          <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="50%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
          <linearGradient id="trophyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
        </defs>
        <path d="M50 5 L15 20 V45 C15 65 30 85 50 95 C70 85 85 65 85 45 V20 L50 5Z" fill="url(#shieldGradient)" stroke="url(#borderGradient)" strokeWidth="4" strokeLinejoin="round" />
        <g transform="translate(25, 25) scale(0.5)">
          <path d="M20 10 H80 V40 C80 56.5 66.5 70 50 70 C33.5 70 20 56.5 20 40 V10Z" fill="url(#trophyGradient)" />
          <path d="M20 20 H5 V35 C5 43.3 11.7 50 20 50 V20Z" fill="#2563EB" />
          <path d="M80 20 H95 V35 C95 43.3 88.3 50 80 50 V20Z" fill="#2563EB" />
          <rect x="42" y="70" width="16" height="15" fill="#1D4ED8" />
          <path d="M30 85 H70 L75 95 H25 L30 85Z" fill="#1E40AF" />
          <path d="M30 15 H40 V35 C40 40.5 35.5 45 30 45 V15Z" fill="white" fillOpacity="0.2" />
        </g>
      </svg>
      <div class="title">{{title}}</div>
    </div>

    <div class="content">
      <div class="modality-tag">{{modality}}</div>
      <div class="athlete-name">{{athleteName}}</div>
      <div class="achievement-desc">{{achievement}}</div>
    </div>

    <div class="footer">
      <div class="info-group">
        <div class="branding">ARENA<span class="comp">COMP</span></div>
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
    console.log('🚀 Iniciando geração de card...');
    console.log('📦 DATA RECEBIDA NO CARD GENERATOR:', data);
    
    if (!data || !data.athleteName) {
      console.error('❌ DADOS INVÁLIDOS PARA O CARD:', data);
      throw new Error('Dados inválidos para geração do card');
    }

    console.log('[CardGenerator] Iniciando geração de QR Code...');
    try {
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

      console.log('🧠 Tentando iniciar browser...');
      
      const executablePath = await chromium.executablePath();

      if (!executablePath) {
        console.error('❌ Chromium não encontrado');
        throw new Error('Chromium não encontrado');
      }

      console.log('[CardGenerator] Usando executablePath:', executablePath);

      const browser = await puppeteer.launch({
        args: [
          ...chromium.args,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--single-process',
        ],
        executablePath,
        headless: true,
      });

      console.log('[CardGenerator] Browser iniciado com sucesso');
      return await this.renderCard(browser, html);
    } catch (error: any) {
      console.error('🔥 ERRO REAL NA GERAÇÃO:', error);
      throw error;
    }
  }

  private static async renderCard(browser: any, html: string): Promise<Buffer> {
    try {
      console.log('[CardGenerator] Abrindo nova página...');
      const page = await browser.newPage();
      
      // Set viewport to card size (1200x630 for standard OG)
      await page.setViewport({
        width: 1200,
        height: 630,
        deviceScaleFactor: 2, // High resolution
      });

      console.log('[CardGenerator] Definindo conteúdo HTML...');
      // Set content and wait for fonts/images
      await page.setContent(html, { 
        waitUntil: 'domcontentloaded',
        timeout: 20000 
      });

      // Pequeno delay para garantir que fontes do Google Fonts carreguem se possível
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('[CardGenerator] Capturando screenshot...');
      // Take screenshot
      const buffer = await page.screenshot({
        type: 'png',
        fullPage: true,
      });

      console.log('[CardGenerator] Card gerado com sucesso!');
      return buffer as Buffer;
    } catch (error) {
      console.error('[CardGenerator] Erro durante a renderização:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
