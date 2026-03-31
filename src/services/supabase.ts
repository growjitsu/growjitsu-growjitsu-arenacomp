import { createClient } from '@supabase/supabase-js';

/**
 * CONFIGURAÇÃO DEFINITIVA DO SUPABASE
 * 
 * Nota: As chaves foram hardcoded para garantir o funcionamento imediato no ambiente AI Studio,
 * conforme solicitado para eliminar erros de configuração ausente.
 */
const rawUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vfefztzaiqhpsfnvpkba.supabase.co';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZWZ6dHphaXFocHNmbnZwa2JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzM1MzEsImV4cCI6MjA4NzAwOTUzMX0.G2AVN2yvCaGGtR7fK0nim2eRBAow2C57eeIaOEz1LDQ';

// Limpeza e validação rigorosa
const supabaseUrl = rawUrl.trim();
const supabaseAnonKey = rawKey.trim();

// Verificação de segurança: Se a chave começar com 'sb_secret_' ou for uma service_role key, 
// ela não deve ser usada no frontend.
const isSecretKey = (key: string) => {
  if (key.startsWith('sb_secret_')) return true;
  try {
    const payload = JSON.parse(atob(key.split('.')[1]));
    return payload.role === 'service_role';
  } catch {
    return false;
  }
};

const isValidUrl = (url: string) => {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

// Fallback final se a URL ainda for inválida ou a chave for secreta
const finalUrl = isValidUrl(supabaseUrl) ? supabaseUrl : 'https://vfefztzaiqhpsfnvpkba.supabase.co';
const finalKey = (supabaseAnonKey.length > 20 && !isSecretKey(supabaseAnonKey)) 
  ? supabaseAnonKey 
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZWZ6dHphaXFocHNmbnZwa2JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzM1MzEsImV4cCI6MjA4NzAwOTUzMX0.G2AVN2yvCaGGtR7fK0nim2eRBAow2C57eeIaOEz1LDQ';

// Validação de segurança para o restante do app
export const isSupabaseConfigured = isValidUrl(finalUrl) && finalKey.length > 20;

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
