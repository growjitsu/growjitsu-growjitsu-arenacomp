-- 1. Limpar políticas recursivas na team_members
DROP POLICY IF EXISTS "Representantes podem gerenciar membros" ON team_members;
DROP POLICY IF EXISTS "Membros são visíveis por todos" ON team_members;
DROP POLICY IF EXISTS "Usuários podem se cadastrar em equipes" ON team_members;
DROP POLICY IF EXISTS "Allow read team_members" ON team_members;
DROP POLICY IF EXISTS "Allow insert team_members" ON team_members;
DROP POLICY IF EXISTS "Allow update team_members" ON team_members;
DROP POLICY IF EXISTS "Allow delete team_members" ON team_members;

-- 2. Criar novas políticas simples (não recursivas)
-- Leitura pública
CREATE POLICY "team_members_select" ON team_members FOR SELECT USING (true);

-- Inserção (usuário logado ou admin)
CREATE POLICY "team_members_insert" ON team_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Atualização (usuário logado ou admin)
CREATE POLICY "team_members_update" ON team_members FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Deleção (usuário logado ou admin)
CREATE POLICY "team_members_delete" ON team_members FOR DELETE USING (auth.uid() IS NOT NULL);

-- 3. Popular Países (Lista completa)
INSERT INTO countries (name, code) VALUES
('Afeganistão', 'AF'), ('África do Sul', 'ZA'), ('Albânia', 'AL'), ('Alemanha', 'DE'), ('Andorra', 'AD'),
('Angola', 'AO'), ('Antígua e Barbuda', 'AG'), ('Arábia Saudita', 'SA'), ('Argélia', 'DZ'), ('Argentina', 'AR'),
('Armênia', 'AM'), ('Austrália', 'AU'), ('Áustria', 'AT'), ('Azerbaijão', 'AZ'), ('Bahamas', 'BS'),
('Bahrein', 'BH'), ('Bangladesh', 'BD'), ('Barbados', 'BB'), ('Bélgica', 'BE'), ('Belize', 'BZ'),
('Benim', 'BJ'), ('Bielorrússia', 'BY'), ('Bolívia', 'BO'), ('Bósnia e Herzegovina', 'BA'), ('Botsuana', 'BW'),
('Brasil', 'BR'), ('Brunei', 'BN'), ('Bulgária', 'BG'), ('Burquina Faso', 'BF'), ('Burundi', 'BI'),
('Butão', 'BT'), ('Cabo Verde', 'CV'), ('Camarões', 'CM'), ('Camboja', 'KH'), ('Canadá', 'CA'),
('Catar', 'QA'), ('Cazaquistão', 'KZ'), ('Chade', 'TD'), ('Chile', 'CL'), ('China', 'CN'),
('Chipre', 'CY'), ('Colômbia', 'CO'), ('Comores', 'KM'), ('Congo-Brazzaville', 'CG'), ('Congo-Kinshasa', 'CD'),
('Coreia do Norte', 'KP'), ('Coreia do Sul', 'KR'), ('Costa do Marfim', 'CI'), ('Costa Rica', 'CR'), ('Croácia', 'HR'),
('Cuba', 'CU'), ('Dinamarca', 'DK'), ('Djibuti', 'DJ'), ('Dominica', 'DM'), ('Egito', 'EG'),
('El Salvador', 'SV'), ('Emirados Árabes Unidos', 'AE'), ('Equador', 'EC'), ('Eritreia', 'ER'), ('Eslováquia', 'SK'),
('Eslovênia', 'SI'), ('Espanha', 'ES'), ('Estados Unidos', 'US'), ('Estônia', 'EE'), ('Etiópia', 'ET'),
('Fiji', 'FJ'), ('Filipinas', 'PH'), ('Finlândia', 'FI'), ('França', 'FR'), ('Gabão', 'GA'),
('Gâmbia', 'GM'), ('Gana', 'GH'), ('Geórgia', 'GE'), ('Granada', 'GD'), ('Grécia', 'GR'),
('Guatemala', 'GT'), ('Guiana', 'GY'), ('Guiné', 'GN'), ('Guiné Equatorial', 'GQ'), ('Guiné-Bissau', 'GW'),
('Haiti', 'HT'), ('Honduras', 'HN'), ('Hungria', 'HU'), ('Iêmen', 'YE'), ('Ilhas Marshall', 'MH'),
('Ilhas Salomão', 'SB'), ('Índia', 'IN'), ('Indonésia', 'ID'), ('Irã', 'IR'), ('Iraque', 'IQ'),
('Irlanda', 'IE'), ('Islândia', 'IS'), ('Israel', 'IL'), ('Itália', 'IT'), ('Jamaica', 'JM'),
('Japão', 'JP'), ('Jordânia', 'JO'), ('Kiribati', 'KI'), ('Kuwait', 'KW'), ('Laos', 'LA'),
('Lesoto', 'LS'), ('Letônia', 'LV'), ('Líbano', 'LB'), ('Libéria', 'LR'), ('Líbia', 'LY'),
('Liechtenstein', 'LI'), ('Lituânia', 'LT'), ('Luxemburgo', 'LU'), ('Macedônia do Norte', 'MK'), ('Madagascar', 'MG'),
('Malásia', 'MY'), ('Malaui', 'MW'), ('Maldivas', 'MV'), ('Mali', 'ML'), ('Malta', 'MT'),
('Marrocos', 'MA'), ('Maurício', 'MU'), ('Mauritânia', 'MR'), ('México', 'MX'), ('Micronésia', 'FM'),
('Moçambique', 'MZ'), ('Moldávia', 'MD'), ('Mônaco', 'MC'), ('Mongólia', 'MN'), ('Montenegro', 'ME'),
('Namíbia', 'NA'), ('Nauru', 'NR'), ('Nepal', 'NP'), ('Nicarágua', 'NI'), ('Níger', 'NE'),
('Nigéria', 'NG'), ('Noruega', 'NO'), ('Nova Zelândia', 'NZ'), ('Omã', 'OM'), ('Países Baixos', 'NL'),
('Palau', 'PW'), ('Panamá', 'PA'), ('Papua-Nova Guiné', 'PG'), ('Paquistão', 'PK'), ('Paraguai', 'PY'),
('Peru', 'PE'), ('Polônia', 'PL'), ('Portugal', 'PT'), ('Quênia', 'KE'), ('Quirguistão', 'KG'),
('Reino Unido', 'GB'), ('República Centro-Africana', 'CF'), ('República Checa', 'CZ'), ('República Dominicana', 'DO'), ('Romênia', 'RO'),
('Ruanda', 'RW'), ('Rússia', 'RU'), ('Samoa', 'WS'), ('Santa Lúcia', 'LC'), ('São Cristóvão e Neves', 'KN'),
('São Marinho', 'SM'), ('São Tomé e Príncipe', 'ST'), ('São Vicente e Granadinas', 'VC'), ('Seicheles', 'SC'), ('Senegal', 'SN'),
('Serra Leoa', 'SL'), ('Sérvia', 'RS'), ('Singapura', 'SG'), ('Síria', 'SY'), ('Somália', 'SO'),
('Sri Lanka', 'LK'), ('Suazilândia', 'SZ'), ('Sudão', 'SD'), ('Sudão do Sul', 'SS'), ('Suécia', 'SE'),
('Suíça', 'CH'), ('Suriname', 'SR'), ('Tailândia', 'TH'), ('Taiwan', 'TW'), ('Tajiquistão', 'TJ'),
('Tanzânia', 'TZ'), ('Timor-Leste', 'TL'), ('Togo', 'TG'), ('Tonga', 'TO'), ('Trindade e Tobago', 'TT'),
('Tunísia', 'TN'), ('Turquemenistão', 'TM'), ('Turquia', 'TR'), ('Tuvalu', 'TV'), ('Ucrânia', 'UA'),
('Uganda', 'UG'), ('Uruguai', 'UY'), ('Usbequistão', 'UZ'), ('Vanuatu', 'VU'), ('Vaticano', 'VA'),
('Venezuela', 'VE'), ('Vietnã', 'VN'), ('Zâmbia', 'ZM'), ('Zimbábue', 'ZW')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- 4. Popular Estados do Brasil
DO $$
DECLARE
    v_br_id UUID;
BEGIN
    SELECT id INTO v_br_id FROM countries WHERE code = 'BR';
    
    INSERT INTO states (country_id, name, code) VALUES
    (v_br_id, 'Acre', 'AC'), (v_br_id, 'Alagoas', 'AL'), (v_br_id, 'Amapá', 'AP'), (v_br_id, 'Amazonas', 'AM'),
    (v_br_id, 'Bahia', 'BA'), (v_br_id, 'Ceará', 'CE'), (v_br_id, 'Distrito Federal', 'DF'), (v_br_id, 'Espírito Santo', 'ES'),
    (v_br_id, 'Goiás', 'GO'), (v_br_id, 'Maranhão', 'MA'), (v_br_id, 'Mato Grosso', 'MT'), (v_br_id, 'Mato Grosso do Sul', 'MS'),
    (v_br_id, 'Minas Gerais', 'MG'), (v_br_id, 'Pará', 'PA'), (v_br_id, 'Paraíba', 'PB'), (v_br_id, 'Paraná', 'PR'),
    (v_br_id, 'Pernambuco', 'PE'), (v_br_id, 'Piauí', 'PI'), (v_br_id, 'Rio de Janeiro', 'RJ'), (v_br_id, 'Rio Grande do Norte', 'RN'),
    (v_br_id, 'Rio Grande do Sul', 'RS'), (v_br_id, 'Rondônia', 'RO'), (v_br_id, 'Roraima', 'RR'), (v_br_id, 'Santa Catarina', 'SC'),
    (v_br_id, 'São Paulo', 'SP'), (v_br_id, 'Sergipe', 'SE'), (v_br_id, 'Tocantins', 'TO')
    ON CONFLICT (country_id, code) DO UPDATE SET name = EXCLUDED.name;
END $$;

-- 5. Popular Cidades (Exemplo abrangente para os maiores estados)
DO $$
DECLARE
    v_state_id UUID;
BEGIN
    -- São Paulo
    SELECT id INTO v_state_id FROM states WHERE code = 'SP';
    INSERT INTO cities (state_id, name) VALUES
    (v_state_id, 'São Paulo'), (v_state_id, 'Campinas'), (v_state_id, 'Guarulhos'), (v_state_id, 'São Bernardo do Campo'),
    (v_state_id, 'São José dos Campos'), (v_state_id, 'Santo André'), (v_state_id, 'Ribeirão Preto'), (v_state_id, 'Osasco'),
    (v_state_id, 'Sorocaba'), (v_state_id, 'Mauá'), (v_state_id, 'São José do Rio Preto'), (v_state_id, 'Mogi das Cruzes'),
    (v_state_id, 'Santos'), (v_state_id, 'Diadema'), (v_state_id, 'Jundiaí'), (v_state_id, 'Piracicaba'), (v_state_id, 'Carapicuíba'),
    (v_state_id, 'Bauru'), (v_state_id, 'Itaquaquecetuba'), (v_state_id, 'São Vicente'), (v_state_id, 'Franca'),
    (v_state_id, 'Guarujá'), (v_state_id, 'Praia Grande'), (v_state_id, 'Taubaté'), (v_state_id, 'Limeira'),
    (v_state_id, 'Suzano'), (v_state_id, 'Taboão da Serra'), (v_state_id, 'Sumaré'), (v_state_id, 'Barueri'),
    (v_state_id, 'Embu das Artes'), (v_state_id, 'Indaiatuba'), (v_state_id, 'Cotia'), (v_state_id, 'Americana'),
    (v_state_id, 'Itu'), (v_state_id, 'Araraquara'), (v_state_id, 'Jacareí'), (v_state_id, 'Hortolândia'),
    (v_state_id, 'Presidente Prudente'), (v_state_id, 'Marília'), (v_state_id, 'Itapevi'), (v_state_id, 'Araras'),
    (v_state_id, 'Rio Claro'), (v_state_id, 'Bragança Paulista'), (v_state_id, 'Atibaia'),
    (v_state_id, 'Valinhos'), (v_state_id, 'Vinhedo'), (v_state_id, 'Paulínia'), (v_state_id, 'Nova Odessa'), (v_state_id, 'Santa Bárbara d''Oeste'),
    (v_state_id, 'Cordeirópolis'), (v_state_id, 'Iracemápolis'),
    (v_state_id, 'Mogi Guaçu'), (v_state_id, 'Itatiba'), (v_state_id, 'Sertãozinho'), (v_state_id, 'Jandira'),
    (v_state_id, 'Birigui'), (v_state_id, 'Votorantim'), (v_state_id, 'Barretos'), (v_state_id, 'Catanduva'),
    (v_state_id, 'Guaratinguetá'), (v_state_id, 'Tatuí'), (v_state_id, 'Caraguatatuba')
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Rio de Janeiro
    SELECT id INTO v_state_id FROM states WHERE code = 'RJ';
    INSERT INTO cities (state_id, name) VALUES
    (v_state_id, 'Rio de Janeiro'), (v_state_id, 'São Gonçalo'), (v_state_id, 'Duque de Caxias'), (v_state_id, 'Nova Iguaçu'),
    (v_state_id, 'Niterói'), (v_state_id, 'Belford Roxo'), (v_state_id, 'Campos dos Goytacazes'), (v_state_id, 'São João de Meriti'),
    (v_state_id, 'Petrópolis'), (v_state_id, 'Volta Redonda'), (v_state_id, 'Macaé'), (v_state_id, 'Magé'),
    (v_state_id, 'Itaboraí'), (v_state_id, 'Cabo Frio'), (v_state_id, 'Angra dos Reis'), (v_state_id, 'Nova Friburgo'),
    (v_state_id, 'Barra Mansa'), (v_state_id, 'Teresópolis'), (v_state_id, 'Mesquita'), (v_state_id, 'Nilópolis'),
    (v_state_id, 'Araruama'), (v_state_id, 'Rio das Ostras'), (v_state_id, 'Queimados'), (v_state_id, 'Itaguaí'),
    (v_state_id, 'Maricá'), (v_state_id, 'Resende'), (v_state_id, 'Itaperuna'), (v_state_id, 'Barra do Piraí'),
    (v_state_id, 'Japeri'), (v_state_id, 'Rio Bonito'), (v_state_id, 'Saquarema'),
    (v_state_id, 'Três Rios'), (v_state_id, 'Valença'), (v_state_id, 'Vassouras')
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Minas Gerais
    SELECT id INTO v_state_id FROM states WHERE code = 'MG';
    INSERT INTO cities (state_id, name) VALUES
    (v_state_id, 'Belo Horizonte'), (v_state_id, 'Uberlândia'), (v_state_id, 'Contagem'), (v_state_id, 'Juiz de Fora'),
    (v_state_id, 'Betim'), (v_state_id, 'Montes Claros'), (v_state_id, 'Ribeirão das Neves'), (v_state_id, 'Uberaba'),
    (v_state_id, 'Governador Valadares'), (v_state_id, 'Ipatinga'), (v_state_id, 'Sete Lagoas'), (v_state_id, 'Divinópolis'),
    (v_state_id, 'Santa Luzia'), (v_state_id, 'Ibirité'), (v_state_id, 'Poços de Caldas'), (v_state_id, 'Patos de Minas'),
    (v_state_id, 'Pouso Alegre'), (v_state_id, 'Teófilo Otoni'), (v_state_id, 'Barbacena'), (v_state_id, 'Sabará'),
    (v_state_id, 'Varginha'), (v_state_id, 'Conselheiro Lafaiete'), (v_state_id, 'Itabira'), (v_state_id, 'Araguari'),
    (v_state_id, 'Ubá'), (v_state_id, 'Passos'), (v_state_id, 'Coronel Fabriciano'), (v_state_id, 'Muriaé')
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Rio Grande do Sul
    SELECT id INTO v_state_id FROM states WHERE code = 'RS';
    INSERT INTO cities (state_id, name) VALUES
    (v_state_id, 'Porto Alegre'), (v_state_id, 'Caxias do Sul'), (v_state_id, 'Canoas'), (v_state_id, 'Pelotas'),
    (v_state_id, 'Santa Maria'), (v_state_id, 'Gravataí'), (v_state_id, 'Viamão'), (v_state_id, 'Novo Hamburgo'),
    (v_state_id, 'São Leopoldo'), (v_state_id, 'Rio Grande'), (v_state_id, 'Alvorada'), (v_state_id, 'Passo Fundo'),
    (v_state_id, 'Sapucaia do Sul'), (v_state_id, 'Uruguaiana'), (v_state_id, 'Santa Cruz do Sul'), (v_state_id, 'Cachoeirinha'),
    (v_state_id, 'Bento Gonçalves'), (v_state_id, 'Erechim'), (v_state_id, 'Guaíba'), (v_state_id, 'Ijuí'),
    (v_state_id, 'Bagé'), (v_state_id, 'Lajeado'), (v_state_id, 'Esteio'), (v_state_id, 'Sapiranga')
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Paraná
    SELECT id INTO v_state_id FROM states WHERE code = 'PR';
    INSERT INTO cities (state_id, name) VALUES
    (v_state_id, 'Curitiba'), (v_state_id, 'Londrina'), (v_state_id, 'Maringá'), (v_state_id, 'Ponta Grossa'),
    (v_state_id, 'Cascavel'), (v_state_id, 'São José dos Pinhais'), (v_state_id, 'Foz do Iguaçu'), (v_state_id, 'Colombo'),
    (v_state_id, 'Guarapuava'), (v_state_id, 'Paranaguá'), (v_state_id, 'Araucária'), (v_state_id, 'Toledo'),
    (v_state_id, 'Apucarana'), (v_state_id, 'Pinhais'), (v_state_id, 'Campo Largo'), (v_state_id, 'Arapongas'),
    (v_state_id, 'Almirante Tamandaré'), (v_state_id, 'Piraquara'), (v_state_id, 'Umuarama'), (v_state_id, 'Cambé'),
    (v_state_id, 'Fazenda Rio Grande'), (v_state_id, 'Sarandi'), (v_state_id, 'Campo Mourão'), (v_state_id, 'Paranavaí')
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Bahia
    SELECT id INTO v_state_id FROM states WHERE code = 'BA';
    INSERT INTO cities (state_id, name) VALUES
    (v_state_id, 'Salvador'), (v_state_id, 'Feira de Santana'), (v_state_id, 'Vitória da Conquista'), (v_state_id, 'Camaçari'),
    (v_state_id, 'Itabuna'), (v_state_id, 'Juazeiro'), (v_state_id, 'Lauro de Freitas'), (v_state_id, 'Ilhéus'),
    (v_state_id, 'Jequié'), (v_state_id, 'Teixeira de Freitas'), (v_state_id, 'Barreiras'), (v_state_id, 'Alagoinhas'),
    (v_state_id, 'Porto Seguro'), (v_state_id, 'Simões Filho'), (v_state_id, 'Paulo Afonso'), (v_state_id, 'Eunápolis'),
    (v_state_id, 'Santo Antônio de Jesus'), (v_state_id, 'Valença'), (v_state_id, 'Candeias'), (v_state_id, 'Guanambi')
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Ceará
    SELECT id INTO v_state_id FROM states WHERE code = 'CE';
    INSERT INTO cities (state_id, name) VALUES
    (v_state_id, 'Fortaleza'), (v_state_id, 'Caucaia'), (v_state_id, 'Juazeiro do Norte'), (v_state_id, 'Maracanaú'),
    (v_state_id, 'Sobral'), (v_state_id, 'Itapipoca'), (v_state_id, 'Maranguape'), (v_state_id, 'Crato'),
    (v_state_id, 'Iguatu'), (v_state_id, 'Quixadá'), (v_state_id, 'Pacatuba'), (v_state_id, 'Quixeramobim'),
    (v_state_id, 'Aquiraz'), (v_state_id, 'Canindé'), (v_state_id, 'Tianguá'), (v_state_id, 'Aracati')
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Pernambuco
    SELECT id INTO v_state_id FROM states WHERE code = 'PE';
    INSERT INTO cities (state_id, name) VALUES
    (v_state_id, 'Recife'), (v_state_id, 'Jaboatão dos Guararapes'), (v_state_id, 'Olinda'), (v_state_id, 'Caruaru'),
    (v_state_id, 'Petrolina'), (v_state_id, 'Paulista'), (v_state_id, 'Cabo de Santo Agostinho'), (v_state_id, 'Camaragibe'),
    (v_state_id, 'Garanhuns'), (v_state_id, 'Vitória de Santo Antão'), (v_state_id, 'Igarassu'), (v_state_id, 'São Lourenço da Mata'),
    (v_state_id, 'Santa Cruz do Capibaribe'), (v_state_id, 'Serra Talhada'), (v_state_id, 'Araripina'), (v_state_id, 'Gravatá')
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Santa Catarina
    SELECT id INTO v_state_id FROM states WHERE code = 'SC';
    INSERT INTO cities (state_id, name) VALUES
    (v_state_id, 'Joinville'), (v_state_id, 'Florianópolis'), (v_state_id, 'Blumenau'), (v_state_id, 'São José'),
    (v_state_id, 'Itajaí'), (v_state_id, 'Chapecó'), (v_state_id, 'Criciúma'), (v_state_id, 'Jaraguá do Sul'),
    (v_state_id, 'Palhoça'), (v_state_id, 'Lages'), (v_state_id, 'Balneário Camboriú'), (v_state_id, 'Brusque'),
    (v_state_id, 'Tubarão'), (v_state_id, 'São Bento do Sul'), (v_state_id, 'Caçador'), (v_state_id, 'Concórdia')
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Goiás
    SELECT id INTO v_state_id FROM states WHERE code = 'GO';
    INSERT INTO cities (state_id, name) VALUES
    (v_state_id, 'Goiânia'), (v_state_id, 'Aparecida de Goiânia'), (v_state_id, 'Anápolis'), (v_state_id, 'Rio Verde'),
    (v_state_id, 'Luziânia'), (v_state_id, 'Águas Lindas de Goiás'), (v_state_id, 'Valparaíso de Goiás'), (v_state_id, 'Trindade'),
    (v_state_id, 'Formosa'), (v_state_id, 'Novo Gama'), (v_state_id, 'Senador Canedo'), (v_state_id, 'Itumbiara'),
    (v_state_id, 'Catalão'), (v_state_id, 'Jataí'), (v_state_id, 'Planaltina'), (v_state_id, 'Caldas Novas')
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Espirito Santo
    SELECT id INTO v_state_id FROM states WHERE code = 'ES';
    INSERT INTO cities (state_id, name) VALUES
    (v_state_id, 'Serra'), (v_state_id, 'Vila Velha'), (v_state_id, 'Cariacica'), (v_state_id, 'Vitória'),
    (v_state_id, 'Cachoeiro de Itapemirim'), (v_state_id, 'Linhares'), (v_state_id, 'São Mateus'), (v_state_id, 'Guarapari'),
    (v_state_id, 'Colatina'), (v_state_id, 'Aracruz'), (v_state_id, 'Viana'), (v_state_id, 'Nova Venécia')
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Mato Grosso
    SELECT id INTO v_state_id FROM states WHERE code = 'MT';
    INSERT INTO cities (state_id, name) VALUES
    (v_state_id, 'Cuiabá'), (v_state_id, 'Várzea Grande'), (v_state_id, 'Rondonópolis'), (v_state_id, 'Sinop'),
    (v_state_id, 'Tangará da Serra'), (v_state_id, 'Cáceres'), (v_state_id, 'Sorriso'), (v_state_id, 'Lucas do Rio Verde'),
    (v_state_id, 'Primavera do Leste'), (v_state_id, 'Barra do Garças'), (v_state_id, 'Alta Floresta'), (v_state_id, 'Pontes e Lacerda')
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Mato Grosso do Sul
    SELECT id INTO v_state_id FROM states WHERE code = 'MS';
    INSERT INTO cities (state_id, name) VALUES
    (v_state_id, 'Campo Grande'), (v_state_id, 'Dourados'), (v_state_id, 'Três Lagoas'), (v_state_id, 'Corumbá'),
    (v_state_id, 'Ponta Porã'), (v_state_id, 'Sidrolândia'), (v_state_id, 'Naviraí'), (v_state_id, 'Nova Andradina'),
    (v_state_id, 'Aquidauana'), (v_state_id, 'Maracaju'), (v_state_id, 'Paranaíba'), (v_state_id, 'Amambai')
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Paraíba
    SELECT id INTO v_state_id FROM states WHERE code = 'PB';
    INSERT INTO cities (state_id, name) VALUES
    (v_state_id, 'João Pessoa'), (v_state_id, 'Campina Grande'), (v_state_id, 'Santa Rita'), (v_state_id, 'Patos'),
    (v_state_id, 'Bayeux'), (v_state_id, 'Sousa'), (v_state_id, 'Cabedelo'), (v_state_id, 'Cajazeiras'),
    (v_state_id, 'Guarabira'), (v_state_id, 'Sapé'), (v_state_id, 'Queimadas'), (v_state_id, 'Mamanguape')
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Rio Grande do Norte
    SELECT id INTO v_state_id FROM states WHERE code = 'RN';
    INSERT INTO cities (state_id, name) VALUES
    (v_state_id, 'Natal'), (v_state_id, 'Mossoró'), (v_state_id, 'Parnamirim'), (v_state_id, 'São Gonçalo do Amarante'),
    (v_state_id, 'Macaíba'), (v_state_id, 'Ceará-Mirim'), (v_state_id, 'Caicó'), (v_state_id, 'Assu'),
    (v_state_id, 'Currais Novos'), (v_state_id, 'São José de Mipibu'), (v_state_id, 'Santa Cruz'), (v_state_id, 'Apodi')
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Alagoas
    SELECT id INTO v_state_id FROM states WHERE code = 'AL';
    INSERT INTO cities (state_id, name) VALUES
    (v_state_id, 'Maceió'), (v_state_id, 'Arapiraca'), (v_state_id, 'Rio Largo'), (v_state_id, 'Palmeira dos Índios'),
    (v_state_id, 'União dos Palmares'), (v_state_id, 'Penedo'), (v_state_id, 'São Miguel dos Campos'), (v_state_id, 'Coruripe'),
    (v_state_id, 'Marechal Deodoro'), (v_state_id, 'Delmiro Gouveia'), (v_state_id, 'Santana do Ipanema'), (v_state_id, 'Atalaia')
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Sergipe
    SELECT id INTO v_state_id FROM states WHERE code = 'SE';
    INSERT INTO cities (state_id, name) VALUES
    (v_state_id, 'Aracaju'), (v_state_id, 'Nossa Senhora do Socorro'), (v_state_id, 'Lagarto'), (v_state_id, 'Itabaiana'),
    (v_state_id, 'São Cristóvão'), (v_state_id, 'Estância'), (v_state_id, 'Tobias Barreto'), (v_state_id, 'Itabaianinha'),
    (v_state_id, 'Simão Dias'), (v_state_id, 'Nossa Senhora da Glória'), (v_state_id, 'Propriá'), (v_state_id, 'Capela')
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Amazonas
    SELECT id INTO v_state_id FROM states WHERE code = 'AM';
    INSERT INTO cities (state_id, name) VALUES
    (v_state_id, 'Manaus'), (v_state_id, 'Parintins'), (v_state_id, 'Itacoatiara'), (v_state_id, 'Manacapuru'),
    (v_state_id, 'Coari'), (v_state_id, 'Tabatinga'), (v_state_id, 'Maués'), (v_state_id, 'Tefé'),
    (v_state_id, 'Manicoré'), (v_state_id, 'Humaitá'), (v_state_id, 'Iranduba'), (v_state_id, 'Lábrea')
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Pará
    SELECT id INTO v_state_id FROM states WHERE code = 'PA';
    INSERT INTO cities (state_id, name) VALUES
    (v_state_id, 'Belém'), (v_state_id, 'Ananindeua'), (v_state_id, 'Santarém'), (v_state_id, 'Marabá'),
    (v_state_id, 'Parauapebas'), (v_state_id, 'Castanhal'), (v_state_id, 'Abaetetuba'), (v_state_id, 'Cametá'),
    (v_state_id, 'Marituba'), (v_state_id, 'Bragança'), (v_state_id, 'São Félix do Xingu'), (v_state_id, 'Barcarena'),
    (v_state_id, 'Altamira'), (v_state_id, 'Tucuruí'), (v_state_id, 'Paragominas'), (v_state_id, 'Tailândia')
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Maranhão
    SELECT id INTO v_state_id FROM states WHERE code = 'MA';
    INSERT INTO cities (state_id, name) VALUES
    (v_state_id, 'São Luís'), (v_state_id, 'Imperatriz'), (v_state_id, 'São José de Ribamar'), (v_state_id, 'Timon'),
    (v_state_id, 'Caxias'), (v_state_id, 'Codó'), (v_state_id, 'Paço do Lumiar'), (v_state_id, 'Açailândia'),
    (v_state_id, 'Bacabal'), (v_state_id, 'Balsas'), (v_state_id, 'Santa Inês'), (v_state_id, 'Pinheiro')
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Piauí
    SELECT id INTO v_state_id FROM states WHERE code = 'PI';
    INSERT INTO cities (state_id, name) VALUES
    (v_state_id, 'Teresina'), (v_state_id, 'Parnaíba'), (v_state_id, 'Picos'), (v_state_id, 'Piripiri'),
    (v_state_id, 'Floriano'), (v_state_id, 'Barras'), (v_state_id, 'Campo Maior'), (v_state_id, 'União'),
    (v_state_id, 'Altos'), (v_state_id, 'Esperantina'), (v_state_id, 'José de Freitas'), (v_state_id, 'Pedro II')
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Tocantins
    SELECT id INTO v_state_id FROM states WHERE code = 'TO';
    INSERT INTO cities (state_id, name) VALUES
    (v_state_id, 'Palmas'), (v_state_id, 'Araguaína'), (v_state_id, 'Gurupi'), (v_state_id, 'Porto Nacional'),
    (v_state_id, 'Paraíso do Tocantins'), (v_state_id, 'Araguatins'), (v_state_id, 'Colinas do Tocantins'), (v_state_id, 'Guaraí')
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Rondônia
    SELECT id INTO v_state_id FROM states WHERE code = 'RO';
    INSERT INTO cities (state_id, name) VALUES
    (v_state_id, 'Porto Velho'), (v_state_id, 'Ji-Paraná'), (v_state_id, 'Ariquemes'), (v_state_id, 'Vilhena'),
    (v_state_id, 'Cacoal'), (v_state_id, 'Rolim de Moura'), (v_state_id, 'Jaru'), (v_state_id, 'Guajará-Mirim')
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Acre
    SELECT id INTO v_state_id FROM states WHERE code = 'AC';
    INSERT INTO cities (state_id, name) VALUES
    (v_state_id, 'Rio Branco'), (v_state_id, 'Cruzeiro do Sul'), (v_state_id, 'Sena Madureira'), (v_state_id, 'Tarauacá'),
    (v_state_id, 'Feijó'), (v_state_id, 'Brasiléia'), (v_state_id, 'Senador Guiomard'), (v_state_id, 'Plácido de Castro')
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Amapá
    SELECT id INTO v_state_id FROM states WHERE code = 'AP';
    INSERT INTO cities (state_id, name) VALUES
    (v_state_id, 'Macapá'), (v_state_id, 'Santana'), (v_state_id, 'Laranjal do Jari'), (v_state_id, 'Oiapoque'),
    (v_state_id, 'Mazagão'), (v_state_id, 'Porto Grande'), (v_state_id, 'Tartarugalzinho'), (v_state_id, 'Vitória do Jari')
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Roraima
    SELECT id INTO v_state_id FROM states WHERE code = 'RR';
    INSERT INTO cities (state_id, name) VALUES
    (v_state_id, 'Boa Vista'), (v_state_id, 'Rorainópolis'), (v_state_id, 'Caracaraí'), (v_state_id, 'Pacaraima'),
    (v_state_id, 'Cantá'), (v_state_id, 'Mucajaí'), (v_state_id, 'Alto Alegre'), (v_state_id, 'Bonfim')
    ON CONFLICT (state_id, name) DO NOTHING;

END $$;
