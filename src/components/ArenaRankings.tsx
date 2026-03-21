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
  const [availableLocations, setAvailableLocations] = useState<{city: string, country: string, city_id?: string, country_id?: string}[]>([]);
  const [dbCountries, setDbCountries] = useState<{id: string, name: string}[]>([]);
  const [dbCities, setDbCities] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [filter, setFilter] = useState({
    scope: 'Mundial',
    modality: 'Todas',
    city: 'Todas',
    country: 'Todas'
  });

  useEffect(() => {
    fetchAvailableLocations();
    fetchDbCountries();
  }, []);

  useEffect(() => {
    if (filter.country !== 'Todas') {
      fetchCitiesByCountry(filter.country);
    } else {
      setDbCities([]);
    }
  }, [filter.country]);

  const fetchCitiesByCountry = async (countryId: string) => {
    try {
      // Fetch cities using a join through states
      const { data, error } = await supabase
        .from('cities')
        .select(`
          id,
          name,
          states!inner(
            country_id
          )
        `)
        .eq('states.country_id', countryId)
        .order('name');
      
      if (error) throw error;
      if (data) {
        // Map to objects with id and normalized name
        const cities = data.map((c: any) => ({
          id: c.id,
          name: c.name.toUpperCase()
        }));
        setDbCities(cities);
      }
    } catch (error) {
      console.error('Error fetching cities for country:', error);
    }
  };

  const fetchDbCountries = async () => {
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      if (data) {
        setDbCountries(data);
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
    }
  };

  const fetchAvailableLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('city, country, city_id, country_id')
        .not('city', 'is', null)
        .neq('city', '')
        .not('country', 'is', null)
        .neq('country', '');
      
      if (error) throw error;
      
      if (data) {
        const locations = data.map(d => ({
          city: d.city.toUpperCase(),
          country: d.country.toUpperCase(),
          city_id: d.city_id,
          country_id: d.country_id
        }));
        
        // Unique locations
        const uniqueLocations = Array.from(new Set(locations.map(l => JSON.stringify(l))))
          .map(s => JSON.parse(s))
          .sort((a, b) => a.city.localeCompare(b.city));
          
        setAvailableLocations(uniqueLocations);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const countriesList = dbCountries.length > 0 
    ? dbCountries 
    : Array.from(
        availableLocations
          .reduce((acc, l) => {
            if (l.country_id) {
              if (!acc.has(l.country_id)) {
                acc.set(l.country_id, { id: l.country_id, name: l.country });
              }
            }
            return acc;
          }, new Map<string, { id: string, name: string }>())
          .values()
      ).sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

  const citiesList = dbCities.length > 0
    ? dbCities
    : Array.from(
        availableLocations
          .filter(l => (filter.country === 'Todas' || l.country_id === filter.country) && l.city_id)
          .reduce((acc, l) => {
            const key = l.city_id!;
            if (!acc.has(key)) {
              acc.set(key, { id: key, name: l.city });
            }
            return acc;
          }, new Map<string, { id: string, name: string }>())
          .values()
      ).sort((a: { id: string, name: string }, b: { id: string, name: string }) => a.name.localeCompare(b.name));

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
      
      if (filter.country !== 'Todas') {
        // Use country_id for precise filtering as requested
        query = query.eq('country_id', filter.country);
      }
      
      if (filter.city !== 'Todas') {
        // Use city_id for precise filtering as requested
        query = query.eq('city_id', filter.city);
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
        p_country_id: (filter.country !== 'Todas') ? filter.country : null,
        p_city_id: (filter.city !== 'Todas') ? filter.city : null
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
          .select('id, team, team_id, arena_score, modality, city, state, country, city_id')
          .not('team', 'is', null);

        if (filter.modality !== 'Todas') {
          const searchPattern = filter.modality.replace(/[-\s]/g, '%');
          query = query.ilike('modality', `%${searchPattern}%`);
        }
        
        if (filter.country !== 'Todas') {
          // Use country_id for precise filtering as requested
          query = query.eq('country_id', filter.country);
        }
        
        if (filter.city !== 'Todas') {
          // Use city_id for precise filtering as requested
          query = query.eq('city_id', filter.city);
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
            onChange={(e) => {
              const newScope = e.target.value;
              if (newScope === 'Mundial') {
                setFilter({...filter, scope: newScope, country: 'Todas', city: 'Todas'});
              } else if (newScope === 'Nacional') {
                setFilter({...filter, scope: newScope, city: 'Todas'});
              } else {
                setFilter({...filter, scope: newScope});
              }
            }}
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

        {(filter.scope === 'Nacional' || filter.scope === 'Cidade') && (
          <div className="relative group">
            <select 
              value={filter.country}
              onChange={(e) => {
                const newCountry = e.target.value;
                setFilter({
                  ...filter, 
                  country: newCountry, 
                  city: 'Todas',
                  scope: newCountry === 'Todas' ? 'Mundial' : filter.scope
                });
              }}
              className="appearance-none bg-[var(--surface)] border border-[var(--border-ui)] rounded-full px-6 py-2 text-xs font-bold uppercase tracking-widest text-[var(--text-main)] focus:border-[var(--primary)] outline-none cursor-pointer pr-10 transition-colors duration-300"
            >
              <option value="Todas">Selecionar País</option>
              {countriesList.map(country => (
                <option key={country.id} value={country.id}>{country.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
          </div>
        )}

        {filter.scope === 'Cidade' && (
          <div className="relative group">
            <select 
              value={filter.city}
              onChange={(e) => setFilter({...filter, city: e.target.value})}
              className="appearance-none bg-[var(--surface)] border border-[var(--border-ui)] rounded-full px-6 py-2 text-xs font-bold uppercase tracking-widest text-[var(--text-main)] focus:border-[var(--primary)] outline-none cursor-pointer pr-10 transition-colors duration-300"
            >
              <option value="Todas">Todas as Cidades</option>
              {citiesList.map(city => (
                <option key={city.id} value={city.id}>{city.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
          </div>
        )}
      </div>

      {/* Ranking Table */}
      <div className="bg-[var(--surface)] border border-[var(--border-ui)] rounded-3xl overflow-hidden transition-colors duration-300">
        <div className="grid grid-cols-12 p-4 border-b border-[var(--border-ui)] text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-8 md:col-span-7">{activeTab === 'athletes' ? 'Atleta' : 'Equipe'}</div>
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
                  <div className="col-span-8 md:col-span-7 flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[var(--bg)] overflow-hidden flex-shrink-0">
                      {(athlete.profile_photo || athlete.avatar_url) && (
                        <img src={athlete.profile_photo || athlete.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-[var(--text-main)] truncate">{athlete.full_name}</h3>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest truncate">
                        {athlete.modality} • {athlete.state} {athlete.team && `• ${athlete.team}`}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-3 md:col-span-2 text-center">
                    <span className="text-[var(--primary)] font-extrabold text-sm">{Math.round(athlete.arena_score)}</span>
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
                  <div className="col-span-8 md:col-span-7 flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] flex-shrink-0 overflow-hidden">
                      {team.logo_url ? (
                        <img src={team.logo_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Users size={20} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-[var(--text-main)] truncate">{team.team_name}</h3>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest truncate">Equipe / Academia</p>
                    </div>
                  </div>
                  <div className="col-span-3 md:col-span-2 text-center">
                    <span className="text-[var(--primary)] font-extrabold text-sm">{Math.round(team.total_score)}</span>
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
