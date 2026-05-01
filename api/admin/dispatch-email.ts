
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { recipients, subject, htmlBody } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ success: false, error: "Token de autorização ausente." });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vfefztzaiqhpsfnvpkba.supabase.co';
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZWZ6dHphaXFocHNmbnZwa2JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzM1MzEsImV4cCI6MjA4NzAwOTUzMX0.G2AVN2yvCaGGtR7fK0nim2eRBAow2C57eeIaOEz1LDQ';
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('[Serverless] Dispatch Email - URL:', supabaseUrl);
    console.log('[Serverless] Dispatch Email - AnonKey length:', supabaseAnonKey?.length);
    console.log('[Serverless] Dispatch Email - SecretKey length:', supabaseSecretKey?.length);

    if (!supabaseUrl || !supabaseAnonKey) {
       throw new Error("supabaseUrl and supabaseKey are required (check env vars)");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const supabaseAdmin = supabaseSecretKey ? createClient(supabaseUrl, supabaseSecretKey) : null;

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ success: false, error: "Usuário não autenticado." });
    }

    const client = supabaseAdmin || supabase;
    const { data: profile } = await client.from('profiles').select('role').eq('id', user.id).single();

    if (profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: "Acesso negado. Apenas administradores." });
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, error: "Lista de destinatários inválida." });
    }
    if (!subject || !htmlBody) {
      return res.status(400).json({ success: false, error: "Assunto e corpo do e-mail são obrigatórios." });
    }

    const smtpUser = process.env.SMTP_USER || 'contato@arenacomp.com.br';
    const smtpPass = process.env.SMTP_PASS || 'C@rlucya@7625';
    const smtpHost = process.env.SMTP_HOST || 'smtp.titan.email';
    const smtpPort = parseInt(process.env.SMTP_PORT || '465');

    if (!smtpUser || !smtpPass) {
      return res.status(500).json({ success: false, error: "Configuração de SMTP incompleta no servidor." });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, 
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const batchSize = 20;
    const delayBetweenBatches = 2000;
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (let i = 0; i < recipients.length; i += batchSize) {
      const currentBatch = recipients.slice(i, i + batchSize);
      await Promise.all(currentBatch.map(async (email: string) => {
        try {
          await transporter.sendMail({
            from: `"${process.env.SMTP_FROM_NAME || 'ArenaComp'}" <${smtpUser}>`,
            to: email,
            subject: subject,
            html: htmlBody,
          });
          results.success++;
        } catch (err: any) {
          results.failed++;
          results.errors.push(`${email}: ${err.message}`);
        }
      }));

      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    return res.status(200).json({ 
      success: true, 
      message: `Disparo concluído: ${results.success} enviados, ${results.failed} falhas.`,
      results 
    });

  } catch (error: any) {
    console.error('[Serverless] Error in dispatch-email:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
