-- NEW TABLES FOR CHAMPIONSHIP MANAGEMENT

-- 1. Eventos (Campeonatos Oficiais)
CREATE TABLE IF NOT EXISTS eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coordenador_id UUID REFERENCES usuarios(id) ON DELETE CASCADE DEFAULT auth.uid() NOT NULL,
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
  coordenador_id UUID REFERENCES usuarios(id) ON DELETE CASCADE DEFAULT auth.uid() NOT NULL,
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
-- Tabela unificada abaixo

-- 1. Categorias por Evento
CREATE TABLE IF NOT EXISTS categorias_evento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL, -- Ex: Adulto / Marrom / Meio-Pesado
  peso_min DECIMAL,
  peso_max DECIMAL,
  faixa TEXT,
  idade_min INTEGER,
  idade_max INTEGER,
  sexo TEXT CHECK (sexo IN ('M', 'F', 'Unissex')),
  status_chave TEXT CHECK (status_chave IN ('pendente', 'gerada', 'finalizada')) DEFAULT 'pendente',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Inscrições (Refinada)
CREATE TABLE IF NOT EXISTS inscricoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,
  atleta_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES categorias_evento(id) ON DELETE CASCADE,
  nome_atleta TEXT NOT NULL,
  equipe TEXT NOT NULL,
  faixa TEXT NOT NULL,
  peso_atual DECIMAL,
  status_pagamento TEXT DEFAULT 'pendente',
  status_operacional TEXT CHECK (status_operacional IN ('inscrito', 'peso_ok', 'aquecimento', 'pronto', 'lutando', 'finalizado')) DEFAULT 'inscrito',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(atleta_id, categoria_id) -- Regra: Não pode se inscrever 2x na mesma categoria
);

-- 3. Lutas (Matches - Evoluída para Brackets)
CREATE TABLE IF NOT EXISTS lutas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES categorias_evento(id) ON DELETE CASCADE,
  atleta_a_id UUID REFERENCES usuarios(id),
  atleta_b_id UUID REFERENCES usuarios(id),
  vencedor_id UUID REFERENCES usuarios(id),
  rodada INTEGER NOT NULL, -- 1: Oitavas, 2: Quartas, 3: Semi, 4: Final
  posicao_chave INTEGER NOT NULL, -- Posição na vertical da chave
  status TEXT CHECK (status IN ('agendada', 'em_andamento', 'finalizada', 'bye')) DEFAULT 'agendada',
  luta_anterior_a_id UUID REFERENCES lutas(id),
  luta_anterior_b_id UUID REFERENCES lutas(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Resultados Oficiais e Premiação
CREATE TABLE IF NOT EXISTS resultados_oficiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID REFERENCES categorias_evento(id) ON DELETE CASCADE,
  primeiro_lugar_id UUID REFERENCES usuarios(id),
  segundo_lugar_id UUID REFERENCES usuarios(id),
  terceiro_lugar_1_id UUID REFERENCES usuarios(id),
  terceiro_lugar_2_id UUID REFERENCES usuarios(id),
  premiada BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BRACKET GENERATION LOGIC (PL/pgSQL)
CREATE OR REPLACE FUNCTION gerar_chaves_categoria(p_categoria_id UUID)
RETURNS void AS $$
DECLARE
    v_evento_id UUID;
    v_atletas UUID[];
    v_count INTEGER;
    v_luta_id UUID;
    -- Ordem específica solicitada: 1vs9, 5vs13, 3vs11, 7vs15, 2vs10, 6vs14, 4vs12, 8vs16
    v_ordem_oitavas INTEGER[] := ARRAY[1, 9, 5, 13, 3, 11, 7, 15, 2, 10, 6, 14, 4, 12, 8, 16];
BEGIN
    SELECT evento_id INTO v_evento_id FROM categorias_evento WHERE id = p_categoria_id;
    
    -- Coletar atletas inscritos (ordem de inscrição para seed simples)
    SELECT array_agg(atleta_id) INTO v_atletas 
    FROM (SELECT atleta_id FROM inscricoes WHERE categoria_id = p_categoria_id ORDER BY created_at ASC) s;
    
    v_count := array_length(v_atletas, 1);

    -- LÓGICA ESPECIAL PARA 3 ATLETAS
    IF v_count = 3 THEN
        -- Luta 1: 1 vs 3
        INSERT INTO lutas (evento_id, categoria_id, atleta_a_id, atleta_b_id, rodada, posicao_chave)
        VALUES (v_evento_id, p_categoria_id, v_atletas[1], v_atletas[3], 1, 1);
        
        -- Luta 2: Perdedor da L1 vs 2 (Placeholder)
        INSERT INTO lutas (evento_id, categoria_id, atleta_b_id, rodada, posicao_chave, status)
        VALUES (v_evento_id, p_categoria_id, v_atletas[2], 2, 1, 'agendada');
        
        -- Final: Vencedor L2 vs 1 (Placeholder)
        INSERT INTO lutas (evento_id, categoria_id, atleta_a_id, rodada, posicao_chave, status)
        VALUES (v_evento_id, p_categoria_id, v_atletas[1], 3, 1, 'agendada');
        
    -- LÓGICA PADRÃO (ATÉ 16)
    ELSE
        -- Gerar Oitavas (Rodada 1)
        FOR i IN 1..8 LOOP
            INSERT INTO lutas (evento_id, categoria_id, atleta_a_id, atleta_b_id, rodada, posicao_chave)
            VALUES (
                v_evento_id, 
                p_categoria_id, 
                CASE WHEN v_ordem_oitavas[i*2-1] <= v_count THEN v_atletas[v_ordem_oitavas[i*2-1]] ELSE NULL END,
                CASE WHEN v_ordem_oitavas[i*2] <= v_count THEN v_atletas[v_ordem_oitavas[i*2]] ELSE NULL END,
                1, 
                i
            );
        END LOOP;
        
        -- Gerar placeholders para Quartas, Semi e Final
        FOR i IN 1..4 LOOP
            INSERT INTO lutas (evento_id, categoria_id, rodada, posicao_chave)
            VALUES (v_evento_id, p_categoria_id, 2, i);
        END LOOP;
        
        FOR i IN 1..2 LOOP
            INSERT INTO lutas (evento_id, categoria_id, rodada, posicao_chave)
            VALUES (v_evento_id, p_categoria_id, 3, i);
        END LOOP;
        
        INSERT INTO lutas (evento_id, categoria_id, rodada, posicao_chave)
        VALUES (v_evento_id, p_categoria_id, 4, 1);
    END IF;

    UPDATE categorias_evento SET status_chave = 'gerada' WHERE id = p_categoria_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS POLICIES FOR TABLES
-- Configuração do bucket e políticas de storage para logos de eventos

-- 1. Criar bucket 'eventos'
INSERT INTO storage.buckets (id, name, public)
VALUES ('eventos', 'eventos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas de Storage
DROP POLICY IF EXISTS "Logo_Upload_Policy" ON storage.objects;
DROP POLICY IF EXISTS "Logo_Update_Policy" ON storage.objects;
DROP POLICY IF EXISTS "Logo_Delete_Policy" ON storage.objects;
DROP POLICY IF EXISTS "Logo_Public_View" ON storage.objects;

CREATE POLICY "Logo_Upload_Policy" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'eventos' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Logo_Update_Policy" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'eventos' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Logo_Delete_Policy" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'eventos' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Logo_Public_View" ON storage.objects
    FOR SELECT USING (bucket_id = 'eventos');

-- RLS POLICIES FOR TABLES

-- 0. Security Functions & Triggers (Força o dono do registro no INSERT)
CREATE OR REPLACE FUNCTION public.force_item_owner()
RETURNS TRIGGER AS $$
BEGIN
  NEW.coordenador_id := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gatilhos para garantir que o coordenador_id seja sempre o auth.uid()
DROP TRIGGER IF EXISTS tr_force_owner_eventos ON eventos;
CREATE TRIGGER tr_force_owner_eventos
  BEFORE INSERT ON eventos
  FOR EACH ROW EXECUTE FUNCTION public.force_item_owner();

DROP TRIGGER IF EXISTS tr_force_owner_pedidos ON pedidos_evento;
CREATE TRIGGER tr_force_owner_pedidos
  BEFORE INSERT ON pedidos_evento
  FOR EACH ROW EXECUTE FUNCTION public.force_item_owner();

-- Enable RLS
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_evento ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_evento ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscricoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lutas ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultados_oficiais ENABLE ROW LEVEL SECURITY;

-- 1. Eventos Policies
DROP POLICY IF EXISTS "Eventos_Select_Public" ON eventos;
DROP POLICY IF EXISTS "Eventos_Insert_Owner" ON eventos;
DROP POLICY IF EXISTS "Eventos_Update_Owner" ON eventos;
DROP POLICY IF EXISTS "Eventos_Delete_Owner" ON eventos;

CREATE POLICY "Eventos_Select_Public" ON eventos FOR SELECT USING (true);
CREATE POLICY "Eventos_Insert_Owner" ON eventos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Eventos_Update_Owner" ON eventos FOR UPDATE TO authenticated USING (auth.uid() = coordenador_id);
CREATE POLICY "Eventos_Delete_Owner" ON eventos FOR DELETE TO authenticated USING (auth.uid() = coordenador_id);

-- 2. Pedidos Policies
DROP POLICY IF EXISTS "Pedidos_Select_Owner" ON pedidos_evento;
DROP POLICY IF EXISTS "Pedidos_Insert_Owner" ON pedidos_evento;
DROP POLICY IF EXISTS "Pedidos_Update_Owner" ON pedidos_evento;

CREATE POLICY "Pedidos_Select_Owner" ON pedidos_evento FOR SELECT TO authenticated USING (auth.uid() = coordenador_id);
CREATE POLICY "Pedidos_Insert_Owner" ON pedidos_evento FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Pedidos_Update_Owner" ON pedidos_evento FOR UPDATE TO authenticated USING (auth.uid() = coordenador_id);

-- 3. Categorias Policies
DROP POLICY IF EXISTS "Categorias_Select_Public" ON categorias_evento;
DROP POLICY IF EXISTS "Categorias_Manage_Coordinator" ON categorias_evento;

CREATE POLICY "Categorias_Select_Public" ON categorias_evento FOR SELECT USING (true);
CREATE POLICY "Categorias_Manage_Coordinator" ON categorias_evento FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM eventos WHERE eventos.id = categorias_evento.evento_id AND eventos.coordenador_id = auth.uid())
);

-- 4. Inscrições Policies
DROP POLICY IF EXISTS "Inscricoes_Select_Owner" ON inscricoes;
DROP POLICY IF EXISTS "Inscricoes_Insert_Auth" ON inscricoes;
DROP POLICY IF EXISTS "Inscricoes_Manage_Coordinator" ON inscricoes;

CREATE POLICY "Inscricoes_Select_Owner" ON inscricoes FOR SELECT TO authenticated USING (auth.uid() = atleta_id);
CREATE POLICY "Inscricoes_Insert_Auth" ON inscricoes FOR INSERT TO authenticated WITH CHECK (auth.uid() = atleta_id);
CREATE POLICY "Inscricoes_Manage_Coordinator" ON inscricoes FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM eventos WHERE eventos.id = inscricoes.evento_id AND eventos.coordenador_id = auth.uid())
);

-- 5. Lutas Policies
DROP POLICY IF EXISTS "Lutas_Select_Public" ON lutas;
DROP POLICY IF EXISTS "Lutas_Manage_Coordinator" ON lutas;

CREATE POLICY "Lutas_Select_Public" ON lutas FOR SELECT USING (true);
CREATE POLICY "Lutas_Manage_Coordinator" ON lutas FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM eventos WHERE eventos.id = lutas.evento_id AND eventos.coordenador_id = auth.uid())
);

-- 6. Resultados Oficiais Policies
DROP POLICY IF EXISTS "Resultados_Oficiais_Select_Public" ON resultados_oficiais;
DROP POLICY IF EXISTS "Resultados_Oficiais_Manage_Coordinator" ON resultados_oficiais;

CREATE POLICY "Resultados_Oficiais_Select_Public" ON resultados_oficiais FOR SELECT USING (true);
CREATE POLICY "Resultados_Oficiais_Manage_Coordinator" ON resultados_oficiais FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM categorias_evento ce
    JOIN eventos e ON e.id = ce.evento_id
    WHERE ce.id = resultados_oficiais.categoria_id AND e.coordenador_id = auth.uid()
  )
);
