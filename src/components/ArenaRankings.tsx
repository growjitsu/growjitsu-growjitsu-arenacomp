import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Trophy, Medal, Target, Filter, ChevronDown, Users, User, Database } from 'lucide-react';
import { supabase } from '../services/supabase';
import { ArenaProfile } from '../types';
import { modalities } from '../utils/data';

interface TeamRanking {
  team_id: string;
  team_name: string;
  logo_url?: string;
  total_score: number;
  athlete_count: number;
}

export const ArenaRankings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'athletes' | 'teams'>('athletes');
  const [rankings, setRankings] = useState<ArenaProfile[]>([]);
  const [teamRankings, setTeamRankings] = useState<TeamRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [filter, setFilter] = useState({
    scope: 'Mundial',
    modality: 'Todas',
    city: 'Todas',
    country: 'Brasil'
  });

  useEffect(() => {
    if (activeTab === 'athletes') {
      fetchRankings();
    } else {
      fetchTeamRankings();
    }
  }, [filter, activeTab]);

  const fetchRankings = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .neq('role', 'admin') // Exclude admins
        .order('arena_score', { ascending: false })
        .limit(50);

      if (filter.modality !== 'Todas') {
        const searchPattern = filter.modality.replace(/[-\s]/g, '%');
        query = query.ilike('modality', `%${searchPattern}%`);
      }
      
        if (filter.scope === 'Cidade' && filter.city !== 'Todas') {
          // Normalize city search: partial, case-insensitive
          // Note: Accent-insensitivity is harder without Postgres extensions, 
          // but ilike handles case-insensitivity and partial matches.
          query = query.ilike('city', `%${filter.city}%`);
        } else if (filter.scope === 'Nacional' && filter.country !== 'Todas') {
          query = query.eq('country', filter.country);
        }

      const { data, error } = await query;
      if (error) throw error;
      setRankings(data || []);
    } catch (error) {
      console.error('Error fetching rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamRankings = async () => {
    setLoading(true);
    try {
      // Try to use the RPC first
      const { data, error } = await supabase.rpc('get_team_rankings', {
        p_modality: filter.modality === 'Todas' ? null : filter.modality,
        p_country: filter.scope === 'Nacional' ? filter.country : null,
        p_city: filter.scope === 'Cidade' && filter.city !== 'Todas' ? filter.city : null
      });
      
      if (!error && data && data.length > 0) {
        // Normalize data if it comes from the old RPC version
        const normalizedData = data.map((item: any) => ({
          team_id: item.team_id || item.team || Math.random().toString(),
          team_name: item.team_name || item.team || 'Equipe Desconhecida',
          logo_url: item.logo_url,
          total_score: item.total_score || 0,
          athlete_count: item.athlete_count || 0
        }));
        setTeamRankings(normalizedData);
      } else {
        // Fallback: Calculate on client side if RPC fails or returns empty
        console.log('RPC failed or empty, falling back to client-side calculation');
        let query = supabase
          .from('profiles')
          .select('id, team, team_id, arena_score, modality, city, state, country')
          .not('team', 'is', null);

        if (filter.modality !== 'Todas') {
          const searchPattern = filter.modality.replace(/[-\s]/g, '%');
          query = query.ilike('modality', `%${searchPattern}%`);
        }
        
        if (filter.scope === 'Cidade' && filter.city !== 'Todas') {
          query = query.ilike('city', filter.city);
        } else if (filter.scope === 'Nacional' && filter.country !== 'Todas') {
          query = query.eq('country', filter.country);
        }

        const { data: profiles, error: profilesError } = await query;
        if (profilesError) throw profilesError;

        if (profiles) {
          const teamsMap = new Map<string, TeamRanking>();
          
          profiles.forEach(p => {
            const teamName = p.team || 'Sem Equipe';
            const teamId = p.team_id || teamName;
            
            if (teamsMap.has(teamId)) {
              const existing = teamsMap.get(teamId)!;
              existing.total_score += p.arena_score || 0;
              existing.athlete_count += 1;
            } else {
              teamsMap.set(teamId, {
                team_id: teamId,
                team_name: teamName,
                total_score: p.arena_score || 0,
                athlete_count: 1
              });
            }
          });

          const sortedTeams = Array.from(teamsMap.values())
            .sort((a, b) => b.total_score - a.total_score)
            .slice(0, 50);
            
          setTeamRankings(sortedTeams);
        }
      }
    } catch (error) {
      console.error('Error fetching team rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const seedSampleData = async () => {
    setSeeding(true);
    try {
      // 1. Create some sample teams
      const sampleTeams = [
        { name: 'Alliance', professor: 'Fabio Gurgel', city: 'São Paulo', state: 'SP' },
        { name: 'Gracie Barra', professor: 'Carlos Gracie Jr.', city: 'Rio de Janeiro', state: 'RJ' },
        { name: 'Checkmat', professor: 'Leo Vieira', city: 'São Paulo', state: 'SP' },
        { name: 'Atos', professor: 'Andre Galvao', city: 'San Diego', state: 'CA', country: 'EUA' }
      ];

      await supabase
        .from('teams')
        .upsert(sampleTeams, { onConflict: 'name' });

      // 2. Create some sample profiles linked to teams
      const sampleProfiles = [
        { 
          full_name: 'Ricardo Almeida', 
          username: 'ricardo_bjj', 
          arena_score: 1250, 
          team: 'Alliance', 
          modality: 'Jiu-Jitsu',
          city: 'São Paulo',
          state: 'SP',
          country: 'Brasil',
          wins: 15,
          losses: 2,
          perfil_publico: true,
          permitir_seguidores: true,
          arena_points: 1250
        },
        { 
          full_name: 'Beatriz Mesquita', 
          username: 'biamesquita', 
          arena_score: 1100, 
          team: 'Gracie Barra', 
          modality: 'Jiu-Jitsu',
          city: 'Rio de Janeiro',
          state: 'RJ',
          country: 'Brasil',
          wins: 12,
          losses: 1,
          perfil_publico: true,
          permitir_seguidores: true,
          arena_points: 1100
        },
        { 
          full_name: 'Marcus Buchecha', 
          username: 'buchecha', 
          arena_score: 1500, 
          team: 'Checkmat', 
          modality: 'Jiu-Jitsu',
          city: 'São Paulo',
          state: 'SP',
          country: 'Brasil',
          wins: 20,
          losses: 0,
          perfil_publico: true,
          permitir_seguidores: true,
          arena_points: 1500
        }
      ];

      await supabase
        .from('profiles')
        .upsert(sampleProfiles, { onConflict: 'username' });

      alert('Dados de exemplo gerados com sucesso!');
      if (activeTab === 'athletes') fetchRankings();
      else fetchTeamRankings();
    } catch (error) {
      console.error('Error seeding data:', error);
      alert('Erro ao gerar dados. Verifique se as tabelas existem no Supabase.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-[var(--text-main)] italic">
          Arena <span className="text-[var(--primary)]">Rankings</span>
        </h1>
        <p className="text-[var(--text-muted)] text-xs uppercase tracking-[0.3em] font-bold">O topo do esporte nacional</p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center p-1 bg-[var(--surface)] border border-[var(--border-ui)] rounded-2xl w-fit mx-auto">
        <button
          onClick={() => setActiveTab('athletes')}
          className={`flex items-center space-x-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'athletes' 
              ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20' 
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          <User size={14} />
          <span>Atletas</span>
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`flex items-center space-x-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'teams' 
              ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20' 
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          <Users size={14} />
          <span>Equipes</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 justify-center">
        <div className="relative group">
          <select 
            value={filter.scope}
            onChange={(e) => setFilter({...filter, scope: e.target.value})}
            className="appearance-none bg-[var(--surface)] border border-[var(--border-ui)] rounded-full px-6 py-2 text-xs font-bold uppercase tracking-widest text-[var(--text-main)] focus:border-[var(--primary)] outline-none cursor-pointer pr-10 transition-colors duration-300"
          >
            <option>Mundial</option>
            <option>Nacional</option>
            <option>Cidade</option>
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
        </div>

        <div className="relative group">
          <select 
            value={filter.modality}
            onChange={(e) => setFilter({...filter, modality: e.target.value})}
            className="appearance-none bg-[var(--surface)] border border-[var(--border-ui)] rounded-full px-6 py-2 text-xs font-bold uppercase tracking-widest text-[var(--text-main)] focus:border-[var(--primary)] outline-none cursor-pointer pr-10 transition-colors duration-300"
          >
            <option>Todas</option>
            {modalities.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
        </div>

        {filter.scope === 'Nacional' && (
          <div className="relative group">
            <select 
              value={filter.country}
              onChange={(e) => setFilter({...filter, country: e.target.value})}
              className="appearance-none bg-[var(--surface)] border border-[var(--border-ui)] rounded-full px-6 py-2 text-xs font-bold uppercase tracking-widest text-[var(--text-main)] focus:border-[var(--primary)] outline-none cursor-pointer pr-10 transition-colors duration-300"
            >
              <option value="Todas">Todas</option>
              <option value="AFEGANISTÃO">AFEGANISTÃO</option>
              <option value="ÁFRICA DO SUL">ÁFRICA DO SUL</option>
              <option value="ALBÂNIA">ALBÂNIA</option>
              <option value="ALEMANHA">ALEMANHA</option>
              <option value="ANDORRA">ANDORRA</option>
              <option value="ANGOLA">ANGOLA</option>
              <option value="ANTÍGUA E BARBUDA">ANTÍGUA E BARBUDA</option>
              <option value="ARÁBIA SAUDITA">ARÁBIA SAUDITA</option>
              <option value="ARGÉLIA">ARGÉLIA</option>
              <option value="ARGENTINA">ARGENTINA</option>
              <option value="ARMÊNIA">ARMÊNIA</option>
              <option value="AUSTRÁLIA">AUSTRÁLIA</option>
              <option value="ÁUSTRIA">ÁUSTRIA</option>
              <option value="AZERBAIJÃO">AZERBAIJÃO</option>
              <option value="BAHAMAS">BAHAMAS</option>
              <option value="BANGLADECHE">BANGLADECHE</option>
              <option value="BARBADOS">BARBADOS</option>
              <option value="BARÉM">BARÉM</option>
              <option value="BÉLGICA">BÉLGICA</option>
              <option value="BELIZE">BELIZE</option>
              <option value="BENIM">BENIM</option>
              <option value="BIELORRÚSSIA">BIELORRÚSSIA</option>
              <option value="BOLÍVIA">BOLÍVIA</option>
              <option value="BÓSNIA E HERZEGOVINA">BÓSNIA E HERZEGOVINA</option>
              <option value="BOTSUANA">BOTSUANA</option>
              <option value="BRASIL">BRASIL</option>
              <option value="BRUNEI">BRUNEI</option>
              <option value="BULGÁRIA">BULGÁRIA</option>
              <option value="BURQUINA FASO">BURQUINA FASO</option>
              <option value="BURUNDI">BURUNDI</option>
              <option value="BUTÃO">BUTÃO</option>
              <option value="CABO VERDE">CABO VERDE</option>
              <option value="CAMARÕES">CAMARÕES</option>
              <option value="CAMBOJA">CAMBOJA</option>
              <option value="CANADÁ">CANADÁ</option>
              <option value="CATAR">CATAR</option>
              <option value="CAZAQUISTÃO">CAZAQUISTÃO</option>
              <option value="CHADE">CHADE</option>
              <option value="CHILE">CHILE</option>
              <option value="CHINA">CHINA</option>
              <option value="CHIPRE">CHIPRE</option>
              <option value="COLÔMBIA">COLÔMBIA</option>
              <option value="COMORES">COMORES</option>
              <option value="CONGO-BRAZZAVILLE">CONGO-BRAZZAVILLE</option>
              <option value="CONGO-KINSHASA">CONGO-KINSHASA</option>
              <option value="COREIA DO NORTE">COREIA DO NORTE</option>
              <option value="COREIA DO SUL">COREIA DO SUL</option>
              <option value="COSTA DO MARFIM">COSTA DO MARFIM</option>
              <option value="COSTA RICA">COSTA RICA</option>
              <option value="CROÁCIA">CROÁCIA</option>
              <option value="CUBA">CUBA</option>
              <option value="DINAMARCA">DINAMARCA</option>
              <option value="DOMÍNICA">DOMÍNICA</option>
              <option value="EGITO">EGITO</option>
              <option value="EMIRADOS ÁRABES UNIDOS">EMIRADOS ÁRABES UNIDOS</option>
              <option value="EQUADOR">EQUADOR</option>
              <option value="ERITREIA">ERITREIA</option>
              <option value="ESLOVÁQUIA">ESLOVÁQUIA</option>
              <option value="ESLOVÉNIA">ESLOVÉNIA</option>
              <option value="ESPANHA">ESPANHA</option>
              <option value="ESTADOS UNIDOS">ESTADOS UNIDOS</option>
              <option value="ESTÓNIA">ESTÓNIA</option>
              <option value="ETIÓPIA">ETIÓPIA</option>
              <option value="FIJI">FIJI</option>
              <option value="FILIPINAS">FILIPINAS</option>
              <option value="FINLÂNDIA">FINLÂNDIA</option>
              <option value="FRANÇA">FRANÇA</option>
              <option value="GABÃO">GABÃO</option>
              <option value="GÂMBIA">GÂMBIA</option>
              <option value="GANA">GANA</option>
              <option value="GEÓRGIA">GEÓRGIA</option>
              <option value="GRANADA">GRANADA</option>
              <option value="GRÉCIA">GRÉCIA</option>
              <option value="GUATEMALA">GUATEMALA</option>
              <option value="GUIANA">GUIANA</option>
              <option value="GUINÉ">GUINÉ</option>
              <option value="GUINÉ EQUATORIAL">GUINÉ EQUATORIAL</option>
              <option value="GUINÉ-BISSAU">GUINÉ-BISSAU</option>
              <option value="HAITI">HAITI</option>
              <option value="HONDURAS">HONDURAS</option>
              <option value="HUNGRIA">HUNGRIA</option>
              <option value="IÉMEN">IÉMEN</option>
              <option value="ILHAS MARECHAL">ILHAS MARECHAL</option>
              <option value="ILHAS SALOMÃO">ILHAS SALOMÃO</option>
              <option value="ÍNDIA">ÍNDIA</option>
              <option value="INDONÉSIA">INDONÉSIA</option>
              <option value="IRÃO">IRÃO</option>
              <option value="IRAQUE">IRAQUE</option>
              <option value="IRLANDA">IRLANDA</option>
              <option value="ISLÂNDIA">ISLÂNDIA</option>
              <option value="ISRAEL">ISRAEL</option>
              <option value="ITÁLIA">ITÁLIA</option>
              <option value="JAMAICA">JAMAICA</option>
              <option value="JAPÃO">JAPÃO</option>
              <option value="JIBUTI">JIBUTI</option>
              <option value="JORDÂNIA">JORDÂNIA</option>
              <option value="LAOS">LAOS</option>
              <option value="LESOTO">LESOTO</option>
              <option value="LETÓNIA">LETÓNIA</option>
              <option value="LÍBANO">LÍBANO</option>
              <option value="LIBÉRIA">LIBÉRIA</option>
              <option value="LÍBIA">LÍBIA</option>
              <option value="LISTENSTAINE">LISTENSTAINE</option>
              <option value="LITUÂNIA">LITUÂNIA</option>
              <option value="LUXEMBURGO">LUXEMBURGO</option>
              <option value="MACEDÓNIA DO NORTE">MACEDÓNIA DO NORTE</option>
              <option value="MADAGASCAR">MADAGASCAR</option>
              <option value="MALÁSIA">MALÁSIA</option>
              <option value="MALÁUI">MALÁUI</option>
              <option value="MALDIVAS">MALDIVAS</option>
              <option value="MALI">MALI</option>
              <option value="MALTA">MALTA</option>
              <option value="MARROCOS">MARROCOS</option>
              <option value="MAURÍCIA">MAURÍCIA</option>
              <option value="MAURITÂNIA">MAURITÂNIA</option>
              <option value="MÉXICO">MÉXICO</option>
              <option value="MICRONÉSIA">MICRONÉSIA</option>
              <option value="MOÇAMBIQUE">MOÇAMBIQUE</option>
              <option value="MOLDÁVIA">MOLDÁVIA</option>
              <option value="MÓNACO">MÓNACO</option>
              <option value="MONGÓLIA">MONGÓLIA</option>
              <option value="MONTENEGRO">MONTENEGRO</option>
              <option value="NAMÍBIA">NAMÍBIA</option>
              <option value="NAURU">NAURU</option>
              <option value="NEPAL">NEPAL</option>
              <option value="NICARÁGUA">NICARÁGUA</option>
              <option value="NÍGER">NÍGER</option>
              <option value="NIGÉRIA">NIGÉRIA</option>
              <option value="NORUEGA">NORUEGA</option>
              <option value="NOVA ZELÂNDIA">NOVA ZELÂNDIA</option>
              <option value="OMÃ">OMÃ</option>
              <option value="PAÍSES BAIXOS">PAÍSES BAIXOS</option>
              <option value="PALAU">PALAU</option>
              <option value="PANAMÁ">PANAMÁ</option>
              <option value="PAPUA NOVA GUINÉ">PAPUA NOVA GUINÉ</option>
              <option value="PAQUISTÃO">PAQUISTÃO</option>
              <option value="PARAGUAI">PARAGUAI</option>
              <option value="PERU">PERU</option>
              <option value="POLÓNIA">POLÓNIA</option>
              <option value="PORTUGAL">PORTUGAL</option>
              <option value="QUÉNIA">QUÉNIA</option>
              <option value="QUIRGUISTÃO">QUIRGUISTÃO</option>
              <option value="QUIRIBATI">QUIRIBATI</option>
              <option value="REINO UNIDO">REINO UNIDO</option>
              <option value="REPÚBLICA CENTRO-AFRICANA">REPÚBLICA CENTRO-AFRICANA</option>
              <option value="REPÚBLICA CHECA">REPÚBLICA CHECA</option>
              <option value="REPÚBLICA DOMINICANA">REPÚBLICA DOMINICANA</option>
              <option value="ROMÉNIA">ROMÉNIA</option>
              <option value="RUANDA">RUANDA</option>
              <option value="RÚSSIA">RÚSSIA</option>
              <option value="SALVADOR">SALVADOR</option>
              <option value="SAMOA">SAMOA</option>
              <option value="SANTA LÚCIA">SANTA LÚCIA</option>
              <option value="SÃO CRISTÓVÃO E NEVES">SÃO CRISTÓVÃO E NEVES</option>
              <option value="SÃO MARINO">SÃO MARINO</option>
              <option value="SÃO TOMÉ E PRÍNCIPE">SÃO TOMÉ E PRÍNCIPE</option>
              <option value="SÃO VICENTE E GRANADINAS">SÃO VICENTE E GRANADINAS</option>
              <option value="SEICHELES">SEICHELES</option>
              <option value="SENEGAL">SENEGAL</option>
              <option value="SERRA LEOA">SERRA LEOA</option>
              <option value="SÉRVIA">SÉRVIA</option>
              <option value="SINGAPURA">SINGAPURA</option>
              <option value="SÍRIA">SÍRIA</option>
              <option value="SOMÁLIA">SOMÁLIA</option>
              <option value="SRI LANCA">SRI LANCA</option>
              <option value="ESSUATÍNI">ESSUATÍNI</option>
              <option value="SUDÃO">SUDÃO</option>
              <option value="SUDÃO DO SUL">SUDÃO DO SUL</option>
              <option value="SUÉCIA">SUÉCIA</option>
              <option value="SUÍÇA">SUÍÇA</option>
              <option value="SURINAME">SURINAME</option>
              <option value="TAILÂNDIA">TAILÂNDIA</option>
              <option value="TAIWAN">TAIWAN</option>
              <option value="TAJIQUISTÃO">TAJIQUISTÃO</option>
              <option value="TANZÂNIA">TANZÂNIA</option>
              <option value="TIMOR-LESTE">TIMOR-LESTE</option>
              <option value="TOGO">TOGO</option>
              <option value="TONGA">TONGA</option>
              <option value="TRINDADE E TOBAGO">TRINDADE E TOBAGO</option>
              <option value="TUNÍSIA">TUNÍSIA</option>
              <option value="TURQUEMENISTÃO">TURQUEMENISTÃO</option>
              <option value="TURQUIA">TURQUIA</option>
              <option value="TUVALU">TUVALU</option>
              <option value="UCRÂNIA">UCRÂNIA</option>
              <option value="UGANDA">UGANDA</option>
              <option value="URUGUAI">URUGUAI</option>
              <option value="USBEQUISTÃO">USBEQUISTÃO</option>
              <option value="VANUATU">VANUATU</option>
              <option value="VATICANO">VATICANO</option>
              <option value="VENEZUELA">VENEZUELA</option>
              <option value="VIETNAME">VIETNAME</option>
              <option value="ZÂMBIA">ZÂMBIA</option>
              <option value="ZIMBÁBUE">ZIMBÁBUE</option>
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
          </div>
        )}

        {filter.scope === 'Cidade' && (
          <input 
            type="text"
            placeholder="Digite a cidade..."
            value={filter.city === 'Todas' ? '' : filter.city}
            onChange={(e) => setFilter({...filter, city: e.target.value || 'Todas'})}
            className="bg-[var(--surface)] border border-[var(--border-ui)] rounded-full px-6 py-2 text-xs font-bold uppercase tracking-widest text-[var(--text-main)] focus:border-[var(--primary)] outline-none transition-all w-48"
          />
        )}
      </div>

      {/* Ranking Table */}
      <div className="bg-[var(--surface)] border border-[var(--border-ui)] rounded-3xl overflow-hidden transition-colors duration-300">
        <div className="grid grid-cols-12 p-4 border-b border-[var(--border-ui)] text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-6 md:col-span-7">{activeTab === 'athletes' ? 'Atleta' : 'Equipe'}</div>
          <div className="col-span-3 md:col-span-2 text-center">Arena Score</div>
          <div className="col-span-2 text-center hidden md:block">{activeTab === 'athletes' ? 'Vitórias' : 'Atletas'}</div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" />
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-ui)]">
            {(activeTab === 'athletes' ? rankings : teamRankings).length === 0 && (
              <div className="p-12 text-center space-y-4">
                <div className="w-16 h-16 bg-[var(--primary)]/10 rounded-full flex items-center justify-center mx-auto text-[var(--primary)]">
                  <Database size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-[var(--text-main)]">Nenhum dado encontrado</h3>
                  <p className="text-sm text-[var(--text-muted)] max-w-xs mx-auto">
                    Ainda não há {activeTab === 'athletes' ? 'atletas' : 'equipes'} registrados com os filtros selecionados.
                  </p>
                </div>
                <button
                  onClick={seedSampleData}
                  disabled={seeding}
                  className="px-6 py-2 bg-[var(--primary)] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50"
                >
                  {seeding ? 'Gerando...' : 'Gerar Dados de Exemplo'}
                </button>
              </div>
            )}

            {activeTab === 'athletes' ? (
              rankings.map((athlete, index) => (
                <Link 
                  to={`/user/@${athlete.username}`}
                  key={athlete.id}
                  className="grid grid-cols-12 p-4 items-center hover:bg-[var(--primary)]/5 transition-colors cursor-pointer"
                >
                  <div className="col-span-1 text-center">
                    {index < 3 ? (
                      <div className={`w-6 h-6 rounded-full mx-auto flex items-center justify-center text-[10px] font-black ${
                        index === 0 ? 'bg-yellow-500 text-black' :
                        index === 1 ? 'bg-zinc-300 text-black' :
                        'bg-amber-700 text-white'
                      }`}>
                        {index + 1}
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-[var(--text-muted)]">{index + 1}</span>
                    )}
                  </div>
                  <div className="col-span-6 md:col-span-7 flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--bg)] overflow-hidden flex-shrink-0">
                      {(athlete.profile_photo || athlete.avatar_url) && (
                        <img src={athlete.profile_photo || athlete.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[var(--text-main)]">{athlete.full_name}</h3>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">
                        {athlete.modality} • {athlete.state} {athlete.team && `• ${athlete.team}`}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-3 md:col-span-2 text-center">
                    <span className="text-[var(--primary)] font-black text-sm">{Math.round(athlete.arena_score)}</span>
                  </div>
                  <div className="col-span-2 text-center hidden md:block">
                    <span className="text-[var(--text-muted)] font-bold text-sm">{athlete.wins}</span>
                  </div>
                </Link>
              ))
            ) : (
              teamRankings.map((team, index) => (
                <div 
                  key={team.team_id}
                  className="grid grid-cols-12 p-4 items-center hover:bg-[var(--primary)]/5 transition-colors"
                >
                  <div className="col-span-1 text-center">
                    {index < 3 ? (
                      <div className={`w-6 h-6 rounded-full mx-auto flex items-center justify-center text-[10px] font-black ${
                        index === 0 ? 'bg-yellow-500 text-black' :
                        index === 1 ? 'bg-zinc-300 text-black' :
                        'bg-amber-700 text-white'
                      }`}>
                        {index + 1}
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-[var(--text-muted)]">{index + 1}</span>
                    )}
                  </div>
                  <div className="col-span-6 md:col-span-7 flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] flex-shrink-0 overflow-hidden">
                      {team.logo_url ? (
                        <img src={team.logo_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Users size={20} />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[var(--text-main)]">{team.team_name}</h3>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">Equipe / Academia</p>
                    </div>
                  </div>
                  <div className="col-span-3 md:col-span-2 text-center">
                    <span className="text-[var(--primary)] font-black text-sm">{Math.round(team.total_score)}</span>
                  </div>
                  <div className="col-span-2 text-center hidden md:block">
                    <span className="text-[var(--text-muted)] font-bold text-sm">{team.athlete_count}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
