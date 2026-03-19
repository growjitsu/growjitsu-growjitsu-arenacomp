-- ARENACOMP: POPULATE LOCATIONS
-- Popula a base de dados com mais países e estados para resolver o problema de opções limitadas.

DO $$
DECLARE
    v_country_br_id UUID;
    v_country_us_id UUID;
    v_country_pt_id UUID;
    v_country_jp_id UUID;
    v_country_ae_id UUID;
BEGIN
    -- 1. Países
    INSERT INTO countries (name, code) VALUES ('Brasil', 'BR')
    ON CONFLICT (name) DO UPDATE SET code = EXCLUDED.code
    RETURNING id INTO v_country_br_id;

    INSERT INTO countries (name, code) VALUES ('Estados Unidos', 'US')
    ON CONFLICT (name) DO UPDATE SET code = EXCLUDED.code
    RETURNING id INTO v_country_us_id;

    INSERT INTO countries (name, code) VALUES ('Portugal', 'PT')
    ON CONFLICT (name) DO UPDATE SET code = EXCLUDED.code
    RETURNING id INTO v_country_pt_id;

    INSERT INTO countries (name, code) VALUES ('Japão', 'JP')
    ON CONFLICT (name) DO UPDATE SET code = EXCLUDED.code
    RETURNING id INTO v_country_jp_id;

    INSERT INTO countries (name, code) VALUES ('Emirados Árabes', 'AE')
    ON CONFLICT (name) DO UPDATE SET code = EXCLUDED.code
    RETURNING id INTO v_country_ae_id;

    -- 2. Estados do Brasil
    INSERT INTO states (country_id, name, code) VALUES (v_country_br_id, 'Acre', 'AC') ON CONFLICT DO NOTHING;
    INSERT INTO states (country_id, name, code) VALUES (v_country_br_id, 'Alagoas', 'AL') ON CONFLICT DO NOTHING;
    INSERT INTO states (country_id, name, code) VALUES (v_country_br_id, 'Amapá', 'AP') ON CONFLICT DO NOTHING;
    INSERT INTO states (country_id, name, code) VALUES (v_country_br_id, 'Amazonas', 'AM') ON CONFLICT DO NOTHING;
    INSERT INTO states (country_id, name, code) VALUES (v_country_br_id, 'Bahia', 'BA') ON CONFLICT DO NOTHING;
    INSERT INTO states (country_id, name, code) VALUES (v_country_br_id, 'Ceará', 'CE') ON CONFLICT DO NOTHING;
    INSERT INTO states (country_id, name, code) VALUES (v_country_br_id, 'Distrito Federal', 'DF') ON CONFLICT DO NOTHING;
    INSERT INTO states (country_id, name, code) VALUES (v_country_br_id, 'Espírito Santo', 'ES') ON CONFLICT DO NOTHING;
    INSERT INTO states (country_id, name, code) VALUES (v_country_br_id, 'Goiás', 'GO') ON CONFLICT DO NOTHING;
    INSERT INTO states (country_id, name, code) VALUES (v_country_br_id, 'Maranhão', 'MA') ON CONFLICT DO NOTHING;
    INSERT INTO states (country_id, name, code) VALUES (v_country_br_id, 'Mato Grosso', 'MT') ON CONFLICT DO NOTHING;
    INSERT INTO states (country_id, name, code) VALUES (v_country_br_id, 'Mato Grosso do Sul', 'MS') ON CONFLICT DO NOTHING;
    INSERT INTO states (country_id, name, code) VALUES (v_country_br_id, 'Minas Gerais', 'MG') ON CONFLICT DO NOTHING;
    INSERT INTO states (country_id, name, code) VALUES (v_country_br_id, 'Pará', 'PA') ON CONFLICT DO NOTHING;
    INSERT INTO states (country_id, name, code) VALUES (v_country_br_id, 'Paraíba', 'PB') ON CONFLICT DO NOTHING;
    INSERT INTO states (country_id, name, code) VALUES (v_country_br_id, 'Paraná', 'PR') ON CONFLICT DO NOTHING;
    INSERT INTO states (country_id, name, code) VALUES (v_country_br_id, 'Pernambuco', 'PE') ON CONFLICT DO NOTHING;
    INSERT INTO states (country_id, name, code) VALUES (v_country_br_id, 'Piauí', 'PI') ON CONFLICT DO NOTHING;
    INSERT INTO states (country_id, name, code) VALUES (v_country_br_id, 'Rio de Janeiro', 'RJ') ON CONFLICT DO NOTHING;
    INSERT INTO states (country_id, name, code) VALUES (v_country_br_id, 'Rio Grande do Norte', 'RN') ON CONFLICT DO NOTHING;
    INSERT INTO states (country_id, name, code) VALUES (v_country_br_id, 'Rio Grande do Sul', 'RS') ON CONFLICT DO NOTHING;
    INSERT INTO states (country_id, name, code) VALUES (v_country_br_id, 'Rondônia', 'RO') ON CONFLICT DO NOTHING;
    INSERT INTO states (country_id, name, code) VALUES (v_country_br_id, 'Roraima', 'RR') ON CONFLICT DO NOTHING;
    INSERT INTO states (country_id, name, code) VALUES (v_country_br_id, 'Santa Catarina', 'SC') ON CONFLICT DO NOTHING;
    INSERT INTO states (country_id, name, code) VALUES (v_country_br_id, 'São Paulo', 'SP') ON CONFLICT DO NOTHING;
    INSERT INTO states (country_id, name, code) VALUES (v_country_br_id, 'Sergipe', 'SE') ON CONFLICT DO NOTHING;
    INSERT INTO states (country_id, name, code) VALUES (v_country_br_id, 'Tocantins', 'TO') ON CONFLICT DO NOTHING;

    -- 3. Cidades Principais (Exemplos para teste)
    -- São Paulo
    DECLARE
        v_sp_id UUID;
        v_rj_id UUID;
        v_mg_id UUID;
        v_pr_id UUID;
    BEGIN
        SELECT id INTO v_sp_id FROM states WHERE country_id = v_country_br_id AND code = 'SP';
        SELECT id INTO v_rj_id FROM states WHERE country_id = v_country_br_id AND code = 'RJ';
        SELECT id INTO v_mg_id FROM states WHERE country_id = v_country_br_id AND code = 'MG';
        SELECT id INTO v_pr_id FROM states WHERE country_id = v_country_br_id AND code = 'PR';

        IF v_sp_id IS NOT NULL THEN
            INSERT INTO cities (state_id, name) VALUES (v_sp_id, 'São Paulo') ON CONFLICT DO NOTHING;
            INSERT INTO cities (state_id, name) VALUES (v_sp_id, 'Campinas') ON CONFLICT DO NOTHING;
            INSERT INTO cities (state_id, name) VALUES (v_sp_id, 'Santos') ON CONFLICT DO NOTHING;
            INSERT INTO cities (state_id, name) VALUES (v_sp_id, 'São Bernardo do Campo') ON CONFLICT DO NOTHING;
        END IF;

        IF v_rj_id IS NOT NULL THEN
            INSERT INTO cities (state_id, name) VALUES (v_rj_id, 'Rio de Janeiro') ON CONFLICT DO NOTHING;
            INSERT INTO cities (state_id, name) VALUES (v_rj_id, 'Niterói') ON CONFLICT DO NOTHING;
            INSERT INTO cities (state_id, name) VALUES (v_rj_id, 'Búzios') ON CONFLICT DO NOTHING;
        END IF;

        IF v_mg_id IS NOT NULL THEN
            INSERT INTO cities (state_id, name) VALUES (v_mg_id, 'Belo Horizonte') ON CONFLICT DO NOTHING;
            INSERT INTO cities (state_id, name) VALUES (v_mg_id, 'Uberlândia') ON CONFLICT DO NOTHING;
        END IF;

        IF v_pr_id IS NOT NULL THEN
            INSERT INTO cities (state_id, name) VALUES (v_pr_id, 'Curitiba') ON CONFLICT DO NOTHING;
            INSERT INTO cities (state_id, name) VALUES (v_pr_id, 'Londrina') ON CONFLICT DO NOTHING;
        END IF;
    END;

END $$;
