-- ARENA COMP - CERTIFICATES TABLE
-- Execute este script no SQL Editor do seu projeto Supabase

CREATE TABLE IF NOT EXISTS certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID REFERENCES usuarios(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('image', 'pdf')) NOT NULL,
  issue_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Certificados são visíveis por todos" ON certificates
  FOR SELECT USING (true);

CREATE POLICY "Atletas podem gerenciar seus próprios certificados" ON certificates
  FOR ALL USING (auth.uid() = athlete_id);
