-- NEW TABLES FOR CHAMPIONSHIP MANAGEMENT

-- 1. Eventos (Campeonatos Oficiais)
CREATE TABLE IF NOT EXISTS eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coordenador_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  data DATE NOT NULL,
  horario_inicio TIME NOT NULL,
  local TEXT,
  logo_url TEXT,
  status TEXT CHECK (status IN ('rascunho', 'aberto', 'fechado', 'em_andamento', 'finalizado')) DEFAULT 'rascunho',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Pedidos de Evento (Solicitações de análise)
CREATE TABLE IF NOT EXISTS pedidos_evento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coordenador_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  modalidade TEXT NOT NULL,
  modalidade_outros TEXT,
  responsavel_nome TEXT NOT NULL,
  responsavel_email TEXT NOT NULL,
  responsavel_cpf TEXT NOT NULL,
  responsavel_rg TEXT NOT NULL,
  responsavel_celular TEXT NOT NULL,
  responsavel_profissao TEXT NOT NULL,
  tipo_nota TEXT CHECK (tipo_nota IN ('PF', 'PJ')) NOT NULL,
  fiscal_razao_social TEXT NOT NULL,
  fiscal_documento TEXT NOT NULL,
  fiscal_cep TEXT NOT NULL,
  fiscal_endereco TEXT NOT NULL,
  fiscal_numero TEXT NOT NULL,
  fiscal_bairro TEXT NOT NULL,
  fiscal_cidade TEXT NOT NULL,
  fiscal_estado TEXT NOT NULL,
  fiscal_complemento TEXT,
  status TEXT CHECK (status IN ('analise', 'aprovado', 'rejeitado')) DEFAULT 'analise',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Inscrições (Relacionando Atletas a Eventos)
CREATE TABLE IF NOT EXISTS inscricoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,
  categoria TEXT,
  peso TEXT,
  faixa TEXT,
  idade TEXT,
  final_category TEXT, -- Categoria formatada (ex: Adulto / Marrom / Pesado)
  status TEXT DEFAULT 'pendente',
  peso_confirmado BOOLEAN DEFAULT FALSE,
  status_operacional TEXT CHECK (status_operacional IN ('inscrito', 'peso_ok', 'aquecimento', 'pronto', 'lutando', 'finalizado')) DEFAULT 'inscrito',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir que as colunas existam caso a tabela já existisse sem elas
ALTER TABLE inscricoes ADD COLUMN IF NOT EXISTS evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE;
ALTER TABLE inscricoes ADD COLUMN IF NOT EXISTS peso_confirmado BOOLEAN DEFAULT FALSE;
ALTER TABLE inscricoes ADD COLUMN IF NOT EXISTS status_operacional TEXT CHECK (status_operacional IN ('inscrito', 'peso_ok', 'aquecimento', 'pronto', 'lutando', 'finalizado')) DEFAULT 'inscrito';
ALTER TABLE inscricoes ADD COLUMN IF NOT EXISTS final_category TEXT;

-- 3. Lutas (Matches)
CREATE TABLE IF NOT EXISTS lutas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,
  atleta_a_id UUID REFERENCES usuarios(id),
  atleta_b_id UUID REFERENCES usuarios(id),
  status TEXT CHECK (status IN ('agendada', 'em_andamento', 'finalizada')) DEFAULT 'agendada',
  tempo_luta INTEGER DEFAULT 300, -- em segundos
  ordem INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Resultados
CREATE TABLE IF NOT EXISTS resultados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  luta_id UUID REFERENCES lutas(id) ON DELETE CASCADE,
  vencedor_id UUID REFERENCES usuarios(id),
  motivo TEXT CHECK (motivo IN ('finalizacao', 'pontos', 'decisao', 'desclassificacao', 'outros')),
  descricao_outro TEXT,
  pontos_a JSONB DEFAULT '{"points": 0, "advantages": 0, "penalties": 0}'::jsonb,
  pontos_b JSONB DEFAULT '{"points": 0, "advantages": 0, "penalties": 0}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS POLICIES

-- Enable RLS
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_evento ENABLE ROW LEVEL SECURITY;
ALTER TABLE lutas ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultados ENABLE ROW LEVEL SECURITY;

-- 1. Eventos Policies
DROP POLICY IF EXISTS "Eventos_Select_Public" ON eventos;
DROP POLICY IF EXISTS "Eventos_Insert_Owner" ON eventos;
DROP POLICY IF EXISTS "Eventos_Update_Owner" ON eventos;
DROP POLICY IF EXISTS "Eventos_Delete_Owner" ON eventos;

-- Qualquer pessoa pode ver eventos
CREATE POLICY "Eventos_Select_Public" ON eventos 
    FOR SELECT USING (true);

-- Apenas o coordenador dono pode inserir
CREATE POLICY "Eventos_Insert_Owner" ON eventos 
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = coordenador_id);

-- Apenas o coordenador dono pode atualizar ou deletar
CREATE POLICY "Eventos_Update_Owner" ON eventos 
    FOR UPDATE TO authenticated 
    USING (auth.uid() = coordenador_id);

CREATE POLICY "Eventos_Delete_Owner" ON eventos 
    FOR DELETE TO authenticated 
    USING (auth.uid() = coordenador_id);


-- 2. Pedidos de Evento Policies
DROP POLICY IF EXISTS "Pedidos_Select_Owner" ON pedidos_evento;
DROP POLICY IF EXISTS "Pedidos_Insert_Owner" ON pedidos_evento;
DROP POLICY IF EXISTS "Pedidos_Update_Owner" ON pedidos_evento;
DROP POLICY IF EXISTS "Coordenadores veem seus pedidos" ON pedidos_evento;
DROP POLICY IF EXISTS "Coordenadores criam seus pedidos" ON pedidos_evento;

-- Coordenadores gerenciam apenas seus próprios pedidos
CREATE POLICY "Pedidos_Select_Owner" ON pedidos_evento 
    FOR SELECT TO authenticated 
    USING (auth.uid() = coordenador_id);

CREATE POLICY "Pedidos_Insert_Owner" ON pedidos_evento 
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = coordenador_id);

CREATE POLICY "Pedidos_Update_Owner" ON pedidos_evento 
    FOR UPDATE TO authenticated 
    USING (auth.uid() = coordenador_id);


-- 3. Lutas e Resultados Policies
DROP POLICY IF EXISTS "Lutas visíveis por todos" ON lutas;
DROP POLICY IF EXISTS "Coordenadores gerenciam lutas" ON lutas;
DROP POLICY IF EXISTS "Resultados visíveis por todos" ON resultados;
DROP POLICY IF EXISTS "Coordenadores gerenciam resultados" ON resultados;

CREATE POLICY "Lutas_Select_Public" ON lutas FOR SELECT USING (true);
CREATE POLICY "Lutas_Manage_Owner" ON lutas FOR ALL USING (
  EXISTS (SELECT 1 FROM eventos WHERE eventos.id = lutas.evento_id AND eventos.coordenador_id = auth.uid())
);

CREATE POLICY "Resultados_Select_Public" ON resultados FOR SELECT USING (true);
CREATE POLICY "Resultados_Manage_Owner" ON resultados FOR ALL USING (
  EXISTS (
    SELECT 1 FROM lutas 
    JOIN eventos ON eventos.id = lutas.evento_id 
    WHERE lutas.id = resultados.luta_id AND eventos.coordenador_id = auth.uid()
  )
);
