
import { createClient } from '@supabase/supabase-js';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth as getFirebaseAuth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    initializeApp({
      projectId: firebaseConfig.projectId,
    });
  } catch (e) {
    console.error('[API] Error initializing Firebase Admin:', e);
  }
}

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

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, error: "Token de autorização ausente." });
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

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.split(' ')[1];
    
    // 1. Verify if the caller is an admin
    let isAdmin = false;
    
    // Try Supabase Auth token first
    const { data: { user: sbUser }, error: sbAuthError } = await supabase.auth.getUser(token);
    if (!sbAuthError && sbUser) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', sbUser.id).single();
      if (profile?.role === 'admin') isAdmin = true;
    }

    // Try Firebase Auth token if not admin yet
    if (!isAdmin) {
      try {
        const decodedToken = await getFirebaseAuth().verifyIdToken(token);
        if (decodedToken) {
          // Check role in Supabase profiles (source of truth for roles)
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', decodedToken.uid).single();
          if (profile?.role === 'admin' || decodedToken.admin === true) isAdmin = true;
        }
      } catch (e) {
        // Not a valid Firebase token or not an admin
      }
    }

    if (!isAdmin) {
      return res.status(403).json({ success: false, error: "Apenas administradores podem alterar senhas." });
    }

    let successMessage = "";
    let supabaseSuccess = false;
    let firebaseSuccess = false;

    // 2. Try to update in Supabase (if secret key is available)
    if (supabaseSecretKey && supabaseSecretKey.length > 20) {
      try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        });
        const { error: sbUpdateError } = await supabaseAdmin.auth.admin.updateUserById(targetId, {
          password: targetPassword
        });
        if (!sbUpdateError) {
          supabaseSuccess = true;
          successMessage += "Senha atualizada no Supabase. ";
        }
      } catch (e) {
        console.error('[API] Supabase admin update failed:', e);
      }
    }

    // 3. Try to update in Firebase (as fallback or secondary)
    try {
      await getFirebaseAuth().updateUser(targetId, {
        password: targetPassword
      });
      firebaseSuccess = true;
      successMessage += "Senha atualizada no Firebase. ";
    } catch (e: any) {
      // If user doesn't exist in Firebase, it's fine if it worked in Supabase
      if (e.code !== 'auth/user-not-found') {
        console.error('[API] Firebase admin update failed:', e);
      }
    }

    if (supabaseSuccess || firebaseSuccess) {
      return res.status(200).json({ 
        success: true, 
        message: successMessage.trim() || "Senha atualizada com sucesso!" 
      });
    }

    // If we reached here, both failed or were unavailable
    let finalError = "Não foi possível atualizar a senha.";
    if (!supabaseSecretKey && !firebaseSuccess) {
      finalError = "Erro: Chave mestra ausente (SUPABASE_SECRET_KEY) e usuário não encontrado no Firebase.";
    }

    return res.status(500).json({ success: false, error: finalError });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
