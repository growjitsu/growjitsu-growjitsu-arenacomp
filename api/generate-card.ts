import { VercelRequest, VercelResponse } from '@vercel/node';
import { createCanvas, loadImage, registerFont } from 'canvas';

// 🚨 ETAPA 3 — CORRIGIR FONTE DO CANVAS (CRÍTICO)
try {
  registerFont('/var/task/fonts/Arial.ttf', { family: 'ArialCustom' });
} catch (e) {
  console.warn('Aviso: Não foi possível registrar a fonte ArialCustom. Usando fallbacks do sistema.');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 🚨 ETAPA 1 — DEBUG DE DADOS (OBRIGATÓRIO)
  console.log('BODY RECEBIDO:', req.body);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 🚨 ETAPA 2 — GARANTIR DADOS VÁLIDOS
    const { user = {}, content = {}, type = 'default' } = req.body;

    const name = user.name || 'Atleta';
    const username = user.username || 'usuario';
    const title = content.title || 'Sem título';
    const avatarUrl = user.avatar;
    const contentImage = content.image || user.avatar || null;
    
    const description = content.description;
    const score = content.score || 0;
    const city = content.city || 'Brasil';
    const date = content.date;

    // 🚨 ETAPA 6 — PROTEGER CONTRA CARD VAZIO
    if (!name && !title) {
      return res.status(400).json({
        error: 'Dados insuficientes para gerar card'
      });
    }

    // 🚨 ETAPA 7 — LOG DE TEXTO FINAL
    console.log({ name, username, title });

    let highlight = '';
    switch (type) {
      case 'profile':
        highlight = '🔥 Meu Perfil';
        break;
      case 'post':
        highlight = '📢 Nova Postagem';
        break;
      case 'certificate':
        highlight = '🏆 Conquista';
        break;
      case 'clip':
        highlight = '🎥 Novo Clip';
        break;
      default:
        highlight = '🔥 Destaque';
    }

    const width = 1080;
    const height = 1920;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 🔵 Fundo gradiente (Azul Escuro Profundo -> Preto)
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0A1F44');
    gradient.addColorStop(0.5, '#050A1A');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // ✨ Glow dourado central
    const radialGlow = ctx.createRadialGradient(width / 2, height / 2, 100, width / 2, height / 2, 800);
    radialGlow.addColorStop(0, 'rgba(255, 215, 0, 0.08)');
    radialGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = radialGlow;
    ctx.fillRect(0, 0, width, height);

    // 🏆 Branding Superior
    // 🚨 ETAPA 5 — GARANTIR TEXTO VISÍVEL
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    
    // 🚨 ETAPA 4 — FALLBACK SE FONTE FALHAR
    const getFont = (style: string) => {
      return `${style} ArialCustom, Arial, sans-serif`;
    };

    ctx.font = getFont('bold 70px');
    ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.fillText('ARENACOMP', width / 2, 150);
    ctx.shadowBlur = 0;

    // 👤 Imagem de Destaque (Avatar ou Conteúdo)
    const mainImageUrl = contentImage || avatarUrl;
    if (mainImageUrl) {
      try {
        const image = await loadImage(mainImageUrl);
        ctx.save();
        
        if (contentImage && (type === 'post' || type === 'clip' || type === 'certificate')) {
          // Para posts, clips e certificados, usamos um retângulo arredondado
          const r = 40;
          const x = 100;
          const y = 300;
          const w = 880;
          const h = 600;
          
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + w - r, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + r);
          ctx.lineTo(x + w, y + h - r);
          ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
          ctx.lineTo(x + r, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - r);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.closePath();
          
          ctx.strokeStyle = '#FFD700';
          ctx.lineWidth = 10;
          ctx.stroke();
          
          ctx.clip();
          // Aspect fill logic
          const scale = Math.max(w / image.width, h / image.height);
          const drawW = image.width * scale;
          const drawH = image.height * scale;
          const drawX = x + (w - drawW) / 2;
          const drawY = y + (h - drawH) / 2;
          ctx.drawImage(image, drawX, drawY, drawW, drawH);
        } else {
          // Para perfil, mantemos o círculo
          ctx.beginPath();
          ctx.arc(width / 2, 550, 220, 0, Math.PI * 2);
          ctx.closePath();
          
          ctx.strokeStyle = '#FFD700';
          ctx.lineWidth = 15;
          ctx.stroke();
          
          ctx.clip();
          ctx.drawImage(image, width / 2 - 220, 330, 440, 440);
        }
        ctx.restore();
      } catch (err) {
        console.error('[Serverless] Erro ao carregar imagem:', err);
        // Fallback: Círculo com inicial
        ctx.fillStyle = '#1E90FF';
        ctx.beginPath();
        ctx.arc(width / 2, 550, 220, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = getFont('bold 150px');
        ctx.fillText(name.charAt(0).toUpperCase(), width / 2, 600);
      }
    }

    // 🧾 Nome do Atleta
    ctx.fillStyle = '#FFFFFF';
    ctx.font = getFont('bold 85px');
    ctx.fillText(name, width / 2, 1000);

    // @username
    ctx.fillStyle = '#1E90FF';
    ctx.font = getFont('50px');
    ctx.fillText(`@${username}`, width / 2, 1080);

    // 🏆 Destaque Dinâmico
    ctx.fillStyle = '#FFD700';
    ctx.font = getFont('bold 100px');
    ctx.fillText(highlight, width / 2, 1250);

    // 📊 Informações Adicionais (Score e Cidade)
    if (type === 'profile' || score > 0) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = getFont('bold 60px');
      ctx.fillText(`SCORE: ${score}`, width / 2, 1400);
    }

    if (city && city !== 'Brasil') {
      ctx.fillStyle = '#AAAAAA';
      ctx.font = getFont('45px');
      ctx.fillText(city, width / 2, 1480);
    }

    if (date) {
      ctx.fillStyle = '#AAAAAA';
      ctx.font = getFont('40px');
      ctx.fillText(date, width / 2, 1550);
    }

    // 🏷️ Título da Conquista / Descrição
    const textToDisplay = description || title;
    if (textToDisplay && textToDisplay !== 'ArenaComp') {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = getFont('italic 40px');
      const words = textToDisplay.split(' ');
      let line = '';
      let y = 1650;
      for(let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        if (testLine.length > 40) {
          ctx.fillText(line, width / 2, y);
          line = words[n] + ' ';
          y += 50;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, width / 2, y);
    }

    // 🔻 Rodapé / CTA
    ctx.fillStyle = '#FFD700';
    ctx.font = getFont('bold 45px');
    ctx.fillText('WWW.ARENACOMP.COM.BR', width / 2, 1800);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = getFont('30px');
    ctx.fillText('Siga sua jornada no ArenaComp', width / 2, 1850);

    const buffer = canvas.toBuffer('image/png');

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'inline; filename=card.png');

    return res.status(200).send(buffer);

  } catch (error: any) {
    console.error('[Serverless] Erro ao gerar card:', error);
    return res.status(500).json({
      error: 'Erro ao gerar card',
      details: error.message
    });
  }
}
