
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { uid, userId, athleteId, password, newPassword } = req.body;
  const targetId = uid || userId || athleteId;
  const targetPassword = password || newPassword;

  if (!targetId || !targetPassword) {
    return res.status(400).json({ success: false, error: "ID e senha são obrigatórios." });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vfefztzaiqhpsfnvpkba.supabase.co';
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZWZ6dHphaXFocHNmbnZwa2JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzM1MzEsImV4cCI6MjA4NzAwOTUzMX0.G2AVN2yvCaGGtR7fK0nim2eRBAow2C57eeIaOEz1LDQ';
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseSecretKey) {
      return res.status(500).json({ success: false, error: "Supabase Admin não disponível (SUPABASE_SECRET_KEY ausente)." });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetId, {
      password: targetPassword
    });

    if (updateError) {
      return res.status(updateError.status || 400).json({ success: false, error: updateError.message });
    }

    return res.status(200).json({ success: true, message: "Senha atualizada com sucesso no Supabase!" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
