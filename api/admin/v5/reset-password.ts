
import { createClient } from '@supabase/supabase-js';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth as getFirebaseAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

// Helper to lazily initialize Firebase Admin
async function getFirebaseAdmin() {
  if (getApps().length === 0) {
    try {
      // Try to find config file at multiple levels
      const possiblePaths = [
        path.join(process.cwd(), 'firebase-applet-config.json'),
        path.join(process.cwd(), '..', 'firebase-applet-config.json'),
        path.join(process.cwd(), '..', '..', 'firebase-applet-config.json')
      ];
      
      let configData = null;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          configData = JSON.parse(fs.readFileSync(p, 'utf-8'));
          break;
        }
      }

      if (configData && configData.projectId) {
        initializeApp({
          projectId: configData.projectId,
        });
        console.log('[API-V5] Firebase Admin initialized lazily');
      }
    } catch (e) {
      console.error('[API-V5] Lazy Firebase Admin init failed:', e);
    }
  }
  return getFirebaseAuth();
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
    let adminInfo = null;
    
    // Try Supabase Auth token first
    try {
      const { data: authData, error: sbAuthError } = await supabase.auth.getUser(token);
      if (!sbAuthError && authData?.user) {
        // Use a client with the user's token or the secret key if available
        const authClient = supabaseSecretKey ? createClient(supabaseUrl, supabaseSecretKey) : createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } }
        });
        
        const { data: profile } = await authClient
          .from('profiles').select('role').eq('id', authData.user.id).single();
          
        if (profile?.role === 'admin') {
          isAdmin = true;
          adminInfo = { id: authData.user.id, provider: 'supabase' };
        }
      }
    } catch (e) {
      // Token might be Firebase
    }

    // Try Firebase Auth token if not admin yet
    if (!isAdmin) {
      try {
        const firebaseAuth = await getFirebaseAdmin();
        const decodedToken = await firebaseAuth.verifyIdToken(token);
        if (decodedToken) {
          // Check role in Supabase profiles (source of truth for roles)
          const authClient = supabaseSecretKey ? createClient(supabaseUrl, supabaseSecretKey) : supabase;
          const { data: profile } = await authClient
            .from('profiles').select('role').eq('id', decodedToken.uid).single();
            
          if (profile?.role === 'admin' || decodedToken.admin === true) {
            isAdmin = true;
            adminInfo = { id: decodedToken.uid, provider: 'firebase' };
          }
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
    let errorDetails = "";

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
        } else {
          errorDetails += `Supabase: ${sbUpdateError.message}. `;
        }
      } catch (e: any) {
        console.error('[API-V5] Supabase admin update failed:', e);
        errorDetails += `Supabase crash: ${e.message}. `;
      }
    } else {
      errorDetails += "Supabase Secret Key ausente. ";
    }

    // 3. Try to update in Firebase (as fallback or secondary)
    try {
      const firebaseAuth = await getFirebaseAdmin();
      await firebaseAuth.updateUser(targetId, {
        password: targetPassword
      });
      firebaseSuccess = true;
      successMessage += "Senha atualizada no Firebase. ";
    } catch (e: any) {
      // If user doesn't exist in Firebase, it's fine if it worked in Supabase
      if (e && e.code === 'auth/user-not-found') {
        // Normal if user is only in Supabase
      } else {
        console.error('[API-V5] Firebase admin update failed:', e);
        errorDetails += `Firebase: ${e?.message || 'Erro desconhecido'}. `;
      }
    }

    if (supabaseSuccess || firebaseSuccess) {
      return res.status(200).json({ 
        success: true, 
        message: successMessage.trim() || "Senha atualizada com sucesso!" 
      });
    }

    return res.status(500).json({ 
      success: false, 
      error: `Não foi possível atualizar a senha: ${errorDetails}`,
      message: "Verifique se a chave SUPABASE_SECRET_KEY está configurada."
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
