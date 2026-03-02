-- ARCHITECTURE: FULL CHAMPIONSHIP MANAGEMENT SYSTEM
-- Author: Senior Software Engineer
-- Description: Comprehensive schema for Jiu-Jitsu events with automated rules, financial batches, and RLS.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS & TYPES
DO $$ BEGIN
    CREATE TYPE event_status AS ENUM ('rascunho', 'aberto', 'fechado', 'em_andamento', 'finalizado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. CORE TABLES

-- 3.1. Eventos (Expanded)
CREATE TABLE IF NOT EXISTS eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coordenador_id UUID REFERENCES usuarios(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  edicao INTEGER DEFAULT 1,
  data DATE NOT NULL,
  horario_inicio TIME NOT NULL,
  modalidade TEXT NOT NULL, -- Ex: GI, NO-GI
  tipo_peso TEXT CHECK (tipo_peso IN ('com_kimono', 'sem_kimono')),
  
  -- Endereço
  cep TEXT,
  endereco TEXT,
  numero TEXT,
  bairro TEXT,
  cidade TEXT,
  uf CHAR(2),
  ponto_referencia TEXT,
  google_maps_url TEXT,
  
  -- Organização
  razao_social TEXT NOT NULL,
  email_contato TEXT NOT NULL,
  website TEXT,
  facebook_url TEXT,
  hashtag TEXT,
  
  -- Configurações Financeiras
  aceita_cartao BOOLEAN DEFAULT TRUE,
  cancelamento_automatico_dias INTEGER DEFAULT 15,
  abertura_checagem_geral TIMESTAMPTZ,
  
  -- Status
  status event_status DEFAULT 'rascunho',
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.2. Lotes de Inscrição
CREATE TABLE IF NOT EXISTS event_lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL, -- Ex: 1º Lote
  data_limite DATE NOT NULL,
  valor_peso DECIMAL(10,2) NOT NULL,
  valor_peso_absoluto DECIMAL(10,2) NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.3. Configuração de Absoluto
CREATE TABLE IF NOT EXISTS event_config_absoluto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE UNIQUE,
  ativo_masculino BOOLEAN DEFAULT FALSE,
  ativo_feminino BOOLEAN DEFAULT FALSE,
  premiacao_texto TEXT,
  min_atletas_50_porcento INTEGER DEFAULT 5,
  min_atletas_100_porcento INTEGER DEFAULT 10,
  regra_agrupamento TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.4. Regras Especiais
CREATE TABLE IF NOT EXISTS event_regras_especiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE UNIQUE,
  master_no_adulto_absoluto BOOLEAN DEFAULT FALSE,
  luta_casada_menores BOOLEAN DEFAULT FALSE,
  luta_casada_maiores BOOLEAN DEFAULT FALSE,
  venda_camiseta BOOLEAN DEFAULT FALSE,
  brinde_camiseta BOOLEAN DEFAULT FALSE,
  pontuacao_equipe BOOLEAN DEFAULT TRUE,
  ranking_individual BOOLEAN DEFAULT TRUE,
  exibir_edital BOOLEAN DEFAULT TRUE,
  edital_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.5. Documento de Regras (Cache/Generated)
CREATE TABLE IF NOT EXISTS event_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE UNIQUE,
  fuso_horario TEXT DEFAULT 'America/Sao_Paulo',
  horario_abertura TIME,
  regras_entrada TEXT,
  regras_vestimenta TEXT,
  regras_pesagem TEXT,
  regras_reembolso TEXT,
  divulgacao_fotos BOOLEAN DEFAULT TRUE,
  sms_ativado BOOLEAN DEFAULT FALSE,
  min_atletas INTEGER,
  max_atletas INTEGER,
  expectativa_publico INTEGER,
  conteudo_completo TEXT, -- Markdown ou JSON gerado
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. AUTOMATION TRIGGERS

-- 4.1. Default Categories Generation
CREATE OR REPLACE FUNCTION fn_populate_default_categories()
RETURNS TRIGGER AS $$
DECLARE
    v_cat RECORD;
BEGIN
    -- Standard Categories Data
    -- Format: (Nome, Idade_Min, Idade_Max, Faixas)
    -- We'll insert for each belt specified
    
    -- This is a simplified version of the logic. 
    -- In a real scenario, we'd have a 'master_categories' table.
    -- For this implementation, we'll hardcode the defaults.

    -- ADULTO (18-29)
    FOR v_cat IN SELECT * FROM (VALUES 
        ('ADULTO', 18, 29, ARRAY['Branca', 'Azul', 'Roxa', 'Marrom', 'Preta'])
    ) AS t(nome, imin, imax, faixas) LOOP
        FOR i IN 1..array_length(v_cat.faixas, 1) LOOP
            INSERT INTO categorias_evento (evento_id, nome, idade_min, idade_max, faixa)
            VALUES (NEW.id, v_cat.nome, v_cat.imin, v_cat.imax, v_cat.faixas[i]);
        END LOOP;
    END LOOP;

    -- MASTER 1-6
    FOR i IN 1..6 LOOP
        INSERT INTO categorias_evento (evento_id, nome, idade_min, idade_max, faixa)
        SELECT NEW.id, 'MASTER ' || i, 30 + (i-1)*5 + 1, 30 + i*5, f
        FROM unnest(ARRAY['Branca', 'Azul', 'Roxa', 'Marrom', 'Preta']) f;
    END LOOP;

    -- JUVENIL (16-17)
    INSERT INTO categorias_evento (evento_id, nome, idade_min, idade_max, faixa)
    SELECT NEW.id, 'JUVENIL', 16, 17, f
    FROM unnest(ARRAY['Branca', 'Azul', 'Roxa']) f;

    -- INFANTO, INFANTIL, MIRIM, PRE-MIRIM
    INSERT INTO categorias_evento (evento_id, nome, idade_min, idade_max, faixa)
    SELECT NEW.id, 'INFANTO B', 14, 15, f FROM unnest(ARRAY['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde']) f;
    INSERT INTO categorias_evento (evento_id, nome, idade_min, idade_max, faixa)
    SELECT NEW.id, 'INFANTO A', 12, 13, f FROM unnest(ARRAY['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde']) f;
    INSERT INTO categorias_evento (evento_id, nome, idade_min, idade_max, faixa)
    SELECT NEW.id, 'INFANTIL B', 10, 11, f FROM unnest(ARRAY['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde']) f;
    INSERT INTO categorias_evento (evento_id, nome, idade_min, idade_max, faixa)
    SELECT NEW.id, 'INFANTIL A', 8, 9, f FROM unnest(ARRAY['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde']) f;
    INSERT INTO categorias_evento (evento_id, nome, idade_min, idade_max, faixa)
    SELECT NEW.id, 'MIRIM', 6, 7, f FROM unnest(ARRAY['Branca', 'Cinza']) f;
    INSERT INTO categorias_evento (evento_id, nome, idade_min, idade_max, faixa)
    SELECT NEW.id, 'PRÉ MIRIM', 4, 5, f FROM unnest(ARRAY['Branca', 'Cinza']) f;

    -- Initialize Config Tables
    INSERT INTO event_config_absoluto (evento_id) VALUES (NEW.id);
    INSERT INTO event_regras_especiais (evento_id) VALUES (NEW.id);
    INSERT INTO event_documentos (evento_id) VALUES (NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.2. Match Time Automation
CREATE OR REPLACE FUNCTION fn_set_default_match_time()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.nome ILIKE '%ADULTO%' THEN
        CASE NEW.faixa
            WHEN 'Branca' THEN NEW.tempo_luta_minutos := 5;
            WHEN 'Azul' THEN NEW.tempo_luta_minutos := 6;
            WHEN 'Roxa' THEN NEW.tempo_luta_minutos := 7;
            WHEN 'Marrom' THEN NEW.tempo_luta_minutos := 8;
            WHEN 'Preta' THEN NEW.tempo_luta_minutos := 10;
            ELSE NEW.tempo_luta_minutos := 5;
        END CASE;
    ELSIF NEW.nome ILIKE '%MASTER%' THEN
        NEW.tempo_luta_minutos := 5;
    ELSIF NEW.nome ILIKE '%JUVENIL%' THEN
        NEW.tempo_luta_minutos := 5;
    ELSIF NEW.nome ILIKE '%INFANTO%' THEN
        NEW.tempo_luta_minutos := 4;
    ELSIF NEW.nome ILIKE '%INFANTIL%' OR NEW.nome ILIKE '%MIRIM%' OR NEW.nome ILIKE '%PRÉ MIRIM%' THEN
        NEW.tempo_luta_minutos := 3;
    ELSE
        NEW.tempo_luta_minutos := 5;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_set_match_time ON categorias_evento;
CREATE TRIGGER tr_set_match_time
BEFORE INSERT ON categorias_evento
FOR EACH ROW EXECUTE FUNCTION fn_set_default_match_time();

DROP TRIGGER IF EXISTS tr_init_event ON eventos;
CREATE TRIGGER tr_init_event
AFTER INSERT ON eventos
FOR EACH ROW EXECUTE FUNCTION fn_populate_default_categories();

-- 5. RLS POLICIES

ALTER TABLE event_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_config_absoluto ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_regras_especiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_documentos ENABLE ROW LEVEL SECURITY;

-- SELECT: Public for active events, Owner for all
CREATE POLICY "Lotes_Select_Public" ON event_lotes FOR SELECT USING (TRUE);
CREATE POLICY "Absoluto_Select_Public" ON event_config_absoluto FOR SELECT USING (TRUE);
CREATE POLICY "Regras_Select_Public" ON event_regras_especiais FOR SELECT USING (TRUE);
CREATE POLICY "Docs_Select_Public" ON event_documentos FOR SELECT USING (TRUE);

-- ALL: Only Owner (Coordinator)
CREATE POLICY "Lotes_Manage_Owner" ON event_lotes FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM eventos WHERE id = evento_id AND coordenador_id = auth.uid())
);
CREATE POLICY "Absoluto_Manage_Owner" ON event_config_absoluto FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM eventos WHERE id = evento_id AND coordenador_id = auth.uid())
);
CREATE POLICY "Regras_Manage_Owner" ON event_regras_especiais FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM eventos WHERE id = evento_id AND coordenador_id = auth.uid())
);
CREATE POLICY "Docs_Manage_Owner" ON event_documentos FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM eventos WHERE id = evento_id AND coordenador_id = auth.uid())
);

-- 6. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_event_lotes_evento ON event_lotes(evento_id);
CREATE INDEX IF NOT EXISTS idx_event_cats_evento ON categorias_evento(evento_id);
CREATE INDEX IF NOT EXISTS idx_inscricoes_evento ON inscricoes(evento_id);
CREATE INDEX IF NOT EXISTS idx_inscricoes_atleta ON inscricoes(atleta_id);
