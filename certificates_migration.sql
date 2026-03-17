-- ARENA COMP - CERTIFICATES TABLE
-- Execute este script no SQL Editor do seu projeto Supabase

CREATE TABLE IF NOT EXISTS certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('image', 'pdf')) NOT NULL,
  issue_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Certificados são visíveis por todos" ON certificates;
DROP POLICY IF EXISTS "Atletas podem gerenciar seus próprios certificados" ON certificates;

CREATE POLICY "Certificados são visíveis por todos" ON certificates
  FOR SELECT USING (true);

CREATE POLICY "Atletas podem inserir seus próprios certificados" ON certificates
  FOR INSERT WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Atletas podem atualizar seus próprios certificados" ON certificates
  FOR UPDATE USING (auth.uid() = athlete_id);

CREATE POLICY "Atletas podem excluir seus próprios certificados" ON certificates
  FOR DELETE USING (auth.uid() = athlete_id);
