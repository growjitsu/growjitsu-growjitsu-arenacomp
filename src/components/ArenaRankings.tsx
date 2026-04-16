import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link, useParams } from 'react-router-dom';
import { Trophy, Medal, Target, Filter, ChevronDown, Users, User, Database, Share2 } from 'lucide-react';
import { EliteArena } from './EliteArena';
import { RankingShareModal } from './RankingShareModal';
import { RankingPickerModal } from './RankingPickerModal';
import { supabase } from '../services/supabase';
import { ArenaProfile } from '../types';
import { modalities } from '../utils/data';
import { getAthleteRankings } from '../services/arenaService';
import { toast } from 'sonner';

interface TeamRanking {
  team_id: string;
  team_name: string;
  logo_url?: string;
  total_score: number;
  athlete_count: number;
}

export const ArenaRankings: React.FC<{ initialTab?: 'athletes' | 'teams' }> = ({ initialTab }) => {
  const { id: urlId } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'athletes' | 'teams'>(initialTab || 'athletes');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(activeTab === 'teams' ? urlId || null : null);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(activeTab === 'athletes' ? urlId || null : null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState<'athletes' | 'teams'>('athletes');
  const [rankings, setRankings] = useState<ArenaProfile[]>([]);
  const [teamRankings, setTeamRankings] = useState<TeamRanking[]>([]);
  const [shareData, setShareData] = useState<any>(null);
  const [availableLocations, setAvailableLocations] = useState<{city: string, country: string, city_id?: string, country_id?: string}[]>([]);
  const [dbCountries, setDbCountries] = useState<{id: string, name: string}[]>([]);
  const [dbCities, setDbCities] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [currentUser, setCurrentUser] = useState<ArenaProfile | null>(null);
  const [userRankings, setUserRankings] = useState<{world: number, national: number, city: number} | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [filter, setFilter] = useState({
    scope: 'Mundial',
    modality: 'Todas',
    city: 'Todas',
    country: 'Todas'
  });

  useEffect(() => {
    fetchAvailableLocations();
    fetchDbCountries();
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    let title = "Rankings | ArenaComp";
    let description = "Confira os melhores atletas e equipes de Jiu-Jitsu no Ranking Oficial ArenaComp.";
    
    if (activeTab === 'athletes') {
      title = "Ranking de Atletas | ArenaComp";
      description = "Veja quem são os atletas de elite que lideram o Ranking ArenaComp nesta temporada.";
    } else {
      title = "Ranking de Equipes | ArenaComp";
      description = "As academias mais fortes do Brasil e do mundo no Ranking de Equipes ArenaComp.";
    }
    
    document.title = title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', description);
  }, [activeTab]);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        if (profile) {
          setCurrentUser(profile);
          const rankings = await getAthleteRankings(profile);
          setUserRankings(rankings);
        }
      }
    } catch (error) {
      console.error('Error fetching current user for rankings:', error);
    }
  };

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
    const refresh = () => {
      if (activeTab === 'athletes') {
        fetchRankings(false); // Don't show loading spinner on auto-refresh
      } else {
        fetchTeamRankings(false);
      }
    };

    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [filter, activeTab]);

  useEffect(() => {
    if (activeTab === 'athletes') {
      fetchRankings(true);
    } else {
      fetchTeamRankings(true);
    }
  }, [filter, activeTab]);

  const fetchRankings = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .neq('role', 'admin') // Exclude admins
        .eq('perfil_publico', true)
        .gt('arena_score', 0)
        .order('arena_score', { ascending: false, nullsFirst: false })
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

  const fetchTeamRankings = async (showLoading = true) => {
    if (showLoading) setLoading(true);
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
          permitir_seguidores: true
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
          permitir_seguidores: true
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
          permitir_seguidores: true
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

  const handleShareGeneralRanking = async () => {
    // If we have a selection, use it. If not, open picker.
    let selectedEntity = null;
    let type: 'athletes' | 'teams' = activeTab;

    if (activeTab === 'athletes' && selectedAthleteId) {
      selectedEntity = rankings.find(a => a.id === selectedAthleteId);
    } else if (activeTab === 'teams' && selectedTeamId) {
      selectedEntity = teamRankings.find(t => t.team_id === selectedTeamId);
    }

    if (!selectedEntity) {
      setPickerType(activeTab);
      setIsPickerOpen(true);
      return;
    }

    // If we have a selected entity, open the share modal for it
    if (activeTab === 'athletes') {
      const athlete = selectedEntity as ArenaProfile;
      const rankingInfo = await getAthleteRankings(athlete);
      setShareData({
        athleteName: athlete.full_name,
        profilePhoto: athlete.profile_photo || athlete.avatar_url,
        position: rankingInfo.world,
        modality: athlete.modality || 'Jiu-Jitsu',
        score: Math.round(athlete.arena_score || 0),
        scope: 'Mundial',
        profileUrl: `${window.location.origin}/share/ranking/${athlete.id}`
      });
    } else {
      const team = selectedEntity as TeamRanking;
      setShareData({
        athleteName: team.team_name,
        profilePhoto: team.logo_url,
        position: teamRankings.findIndex(t => t.team_id === team.team_id) + 1,
        modality: 'Equipe',
        score: Math.round(team.total_score),
        scope: 'Mundial',
        profileUrl: `${window.location.origin}/share/ranking/equipe/${team.team_id}`
      });
    }
    setIsShareModalOpen(true);
  };

  const handleMyRankingShare = () => {
    if (!currentUser || !userRankings) return;
    
    setShareData({
      athleteName: currentUser.full_name,
      profilePhoto: currentUser.profile_photo || currentUser.avatar_url,
      position: filter.scope === 'Mundial' ? userRankings.world : 
                filter.scope === 'Nacional' ? userRankings.national : 
                userRankings.city,
      modality: currentUser.modality || 'Atleta',
      score: currentUser.arena_score,
      category: currentUser.category,
      scope: filter.scope,
      location: filter.scope === 'Mundial' ? 'Mundo' : 
                filter.scope === 'Nacional' ? currentUser.country : 
                currentUser.city,
      profileUrl: `${window.location.origin}/user/@${currentUser.username}`
    });
    setIsShareModalOpen(true);
  };

  const handleEntitySelect = async (entity: any) => {
    setIsPickerOpen(false);
    setLoading(true);
    
    try {
      if (pickerType === 'athletes') {
        const rankingInfo = await getAthleteRankings(entity);
        setShareData({
          athleteName: entity.full_name,
          profilePhoto: entity.profile_photo || entity.avatar_url,
          position: rankingInfo.world,
          modality: entity.modality || 'Jiu-Jitsu',
          score: Math.round(entity.arena_score || 0),
          scope: 'Mundial',
          profileUrl: `${window.location.origin}/share/ranking/${entity.id}`
        });
        setIsShareModalOpen(true);
      } else {
        // For teams, we need to find their position
        // If they are in the current teamRankings, it's easy
        const foundIndex = teamRankings.findIndex(t => t.team_id === entity.id);
        let pos = foundIndex !== -1 ? foundIndex + 1 : 0;
        let score = 0;
        
        if (foundIndex !== -1) {
          score = teamRankings[foundIndex].total_score;
        } else {
          // Fallback: use RPC to get team ranking specifically
          const { data } = await supabase.rpc('get_team_rankings', {
            p_modality: null,
            p_country_id: null,
            p_city_id: null
          });
          const extendedIndex = data?.findIndex((t: any) => (t.team_id === entity.id || t.team === entity.name));
          pos = extendedIndex !== -1 ? extendedIndex + 1 : 100; // Fallback to 100+
          score = data?.[extendedIndex]?.total_score || 0;
        }

        setShareData({
          athleteName: entity.name,
          profilePhoto: entity.logo_url,
          position: pos,
          modality: 'Equipe',
          score: Math.round(score),
          scope: 'Mundial',
          profileUrl: `${window.location.origin}/share/ranking/equipe/${entity.id}`
        });
        setIsShareModalOpen(true);
      }
    } catch (error) {
      console.error('Error sharing entity:', error);
      toast.error('Erro ao buscar dados do ranking.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      <RankingPickerModal 
        isOpen={isPickerOpen} 
        onClose={() => setIsPickerOpen(false)} 
        type={pickerType}
        onSelect={handleEntitySelect}
      />
      {shareData && (
        <RankingShareModal 
          isOpen={isShareModalOpen} 
          onClose={() => {
            setIsShareModalOpen(false);
            setShareData(null);
          }} 
          data={shareData}
        />
      )}
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-[var(--text-main)] italic">
            Arena <span className="text-[var(--primary)]">Rankings</span>
          </h1>
          <p className="text-[var(--text-muted)] text-xs uppercase tracking-[0.3em] font-bold">O topo do esporte nacional</p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {currentUser && userRankings && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleMyRankingShare}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all hover:scale-105 group"
            >
              <Share2 size={14} className="text-[var(--primary)] group-hover:rotate-12 transition-transform" />
              <span>Compartilhar Meu Ranking</span>
            </motion.button>
          )}

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleShareGeneralRanking}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 border border-blue-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-600/20 transition-all hover:scale-105 group"
          >
            <Share2 size={14} className="group-hover:rotate-12 transition-transform" />
            <span>
              {activeTab === 'athletes' 
                ? (selectedAthleteId ? 'Compartilhar Ranking Atleta' : 'Compartilhar Ranking Atletas') 
                : (selectedTeamId ? 'Compartilhar Ranking Equipe' : 'Compartilhar Ranking Equipes')}
            </span>
          </motion.button>
        </div>
      </div>

      {/* Elite Arena Section */}
      <EliteArena />

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
                <div 
                  key={athlete.id}
                  onClick={() => setSelectedAthleteId(selectedAthleteId === athlete.id ? null : athlete.id)}
                  className={`grid grid-cols-12 p-4 items-center transition-all cursor-pointer border-l-4 ${
                    selectedAthleteId === athlete.id 
                      ? 'bg-blue-600/10 border-blue-600' 
                      : 'hover:bg-[var(--primary)]/5 border-transparent'
                  }`}
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
                      <div className="flex items-center gap-2">
                        <h3 className={`font-bold text-sm truncate ${selectedAthleteId === athlete.id ? 'text-blue-500' : 'text-[var(--text-main)]'}`}>
                          {athlete.full_name}
                        </h3>
                        {selectedAthleteId === athlete.id && (
                          <Link 
                            to={`/user/@${athlete.username}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            title="Ver Perfil"
                          >
                            <User size={10} />
                          </Link>
                        )}
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest truncate">
                        {athlete.modality} • {athlete.state} {athlete.team && `• ${athlete.team}`}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-3 md:col-span-2 text-center">
                    <span className={`font-extrabold text-sm ${selectedAthleteId === athlete.id ? 'text-blue-500' : 'text-[var(--primary)]'}`}>
                      {Math.round(athlete.arena_score)}
                    </span>
                  </div>
                  <div className="col-span-2 text-center hidden md:block">
                    <span className="text-[var(--text-muted)] font-bold text-sm">{athlete.wins}</span>
                  </div>
                </div>
              ))
            ) : (
              teamRankings.map((team, index) => (
                <div 
                  key={team.team_id}
                  onClick={() => setSelectedTeamId(selectedTeamId === team.team_id ? null : team.team_id)}
                  className={`grid grid-cols-12 p-4 items-center transition-all cursor-pointer border-l-4 ${
                    selectedTeamId === team.team_id 
                      ? 'bg-blue-600/10 border-blue-600' 
                      : 'hover:bg-[var(--primary)]/5 border-transparent'
                  }`}
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
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${
                      selectedTeamId === team.team_id ? 'bg-blue-600/20 text-blue-600' : 'bg-[var(--primary)]/10 text-[var(--primary)]'
                    }`}>
                      {team.logo_url ? (
                        <img src={team.logo_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Users size={20} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className={`font-bold text-sm truncate ${selectedTeamId === team.team_id ? 'text-blue-500' : 'text-[var(--text-main)]'}`}>
                        {team.team_name}
                      </h3>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest truncate">Equipe / Academia</p>
                    </div>
                  </div>
                  <div className="col-span-3 md:col-span-2 text-center">
                    <span className={`font-extrabold text-sm ${selectedTeamId === team.team_id ? 'text-blue-500' : 'text-[var(--primary)]'}`}>
                      {Math.round(team.total_score)}
                    </span>
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
