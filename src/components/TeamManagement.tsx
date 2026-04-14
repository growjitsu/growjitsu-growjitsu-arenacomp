import React, { useState, useEffect } from 'react';
import { Users, Plus, ShieldCheck, Loader2, Save, X, Trash2, UserPlus, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../services/supabase';
import { Equipe } from '../types';

export default function TeamManagement() {
  const [teams, setTeams] = useState<Equipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Equipe | null>(null);
  const [teamAthletes, setTeamAthletes] = useState<any[]>([]);
  const [loadingAthletes, setLoadingAthletes] = useState(false);
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [locationData, setLocationData] = useState({
    country_id: '',
    state_id: '',
    city_id: ''
  });

  useEffect(() => {
    if (showAddModal) {
      fetchCountries();
    }
  }, [showAddModal]);

  const fetchCountries = async () => {
    const { data } = await supabase.from('countries').select('*').order('name');
    if (data) setCountries(data);
  };

  const fetchStates = async (countryId: string) => {
    const { data } = await supabase.from('states').select('*').eq('country_id', countryId).order('name');
    if (data) setStates(data);
    setCities([]);
    setLocationData(prev => ({ ...prev, country_id: countryId, state_id: '', city_id: '' }));
  };

  const fetchCities = async (stateId: string) => {
    const { data } = await supabase.from('cities').select('*').eq('state_id', stateId).order('name');
    if (data) setCities(data);
    setLocationData(prev => ({ ...prev, state_id: stateId, city_id: '' }));
  };

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // First, get the team IDs where the user is a representative
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', session.user.id)
        .eq('role', 'representative');

      if (memberError) throw memberError;

      const teamIds = memberData?.map(m => m.team_id) || [];

      if (teamIds.length === 0) {
        setTeams([]);
        return;
      }

      // Then, fetch the team details
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          countries(name),
          states(name),
          cities(name)
        `)
        .in('id', teamIds)
        .order('name', { ascending: true });

      if (error) throw error;
      setTeams(data || []);
    } catch (err) {
      console.error('Erro ao buscar equipes:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamAthletes = async (teamId: string) => {
    setLoadingAthletes(true);
    try {
      const { data, error } = await supabase
        .from('atletas')
        .select('*, usuarios(nome, email, foto_url)')
        .eq('equipe_id', teamId);
      
      if (error) throw error;
      setTeamAthletes(data || []);
    } catch (err) {
      console.error('Erro ao buscar atletas da equipe:', err);
    } finally {
      setLoadingAthletes(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleAddTeam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const formData = new FormData(e.currentTarget);
      const newTeam = {
        name: (formData.get('nome') as string).toUpperCase(),
        description: (formData.get('filiacao') as string).toUpperCase(),
        professor: (formData.get('professor') as string)?.toUpperCase() || null,
        country_id: locationData.country_id || null,
        state_id: locationData.state_id || null,
        city_id: locationData.city_id || null
      };

      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert(newTeam)
        .select()
        .single();
      
      if (teamError) throw teamError;

      if (teamData) {
        // Also add to team_members as representative
        const { error: memberError } = await supabase
          .from('team_members')
          .insert({
            team_id: teamData.id,
            user_id: session.user.id,
            role: 'representative'
          });
        
        if (memberError) {
          console.error("Erro ao salvar representante em team_members:", memberError);
        }
      }

      setShowAddModal(false);
      fetchTeams();
    } catch (err: any) {
      alert(`Erro ao criar equipe: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black font-display tracking-tight text-[var(--text-main)] uppercase">Gestão de Equipes</h2>
          <p className="text-[var(--text-muted)]">Gerencie suas academias e monitore seus atletas federados.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-primary bg-emerald-500 hover:bg-emerald-600 border-emerald-500 py-3 px-6 flex items-center gap-2 shadow-lg shadow-emerald-500/20"
        >
          <Plus size={20} /> Nova Equipe
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Teams List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-black uppercase text-[var(--text-muted)] tracking-widest">Minhas Academias</h3>
          {teams.length > 0 ? (
            teams.map(team => (
              <div 
                key={team.id}
                onClick={() => {
                  setSelectedTeam(team);
                  fetchTeamAthletes(team.id);
                }}
                className={`card-surface p-6 cursor-pointer transition-all border-2 ${selectedTeam?.id === team.id ? 'border-emerald-500 bg-emerald-500/5' : 'hover:border-emerald-500/30'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedTeam?.id === team.id ? 'bg-emerald-500 text-white' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-[var(--text-main)] uppercase">{team.name}</h4>
                    <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-tighter">
                      {team.description || 'Sem Filiação'}
                      {team.professor && ` • PROF: ${team.professor}`}
                      {team.cities?.name && ` • ${team.cities.name}`}
                      {team.states?.name && ` • ${team.states.name}`}
                      {team.countries?.name && ` • ${team.countries.name}`}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="card-surface p-12 text-center text-[var(--text-muted)] italic text-sm">
              Nenhuma equipe cadastrada.
            </div>
          )}
        </div>

        {/* Team Details & Athletes */}
        <div className="lg:col-span-2 space-y-4">
          {selectedTeam ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="card-surface p-8 bg-emerald-500/5 border-emerald-500/20">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-black text-[var(--text-main)] uppercase">{selectedTeam.name}</h3>
                    <p className="text-sm text-emerald-500 font-bold uppercase tracking-widest">
                      {selectedTeam.description}
                      {selectedTeam.professor && ` • PROF: ${selectedTeam.professor}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-emerald-500/10 rounded-lg text-emerald-500 transition-colors">
                      <Save size={20} />
                    </button>
                    <button className="p-2 hover:bg-red-500/10 rounded-lg text-red-500 transition-colors">
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase text-[var(--text-muted)] tracking-widest">Atletas Vinculados ({teamAthletes.length})</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                    <input 
                      className="input-standard pl-9 py-1.5 text-xs" 
                      placeholder="Buscar atleta..."
                    />
                  </div>
                </div>

                {loadingAthletes ? (
                  <div className="flex justify-center p-12">
                    <Loader2 className="animate-spin text-emerald-500" size={24} />
                  </div>
                ) : teamAthletes.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teamAthletes.map(athlete => (
                      <div key={athlete.usuario_id} className="card-surface p-4 flex items-center gap-4 hover:border-emerald-500/30 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-[var(--border-ui)] overflow-hidden">
                          <img 
                            src={athlete.usuarios?.foto_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(athlete.usuarios?.nome || 'Atleta')}&background=random`} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-[var(--text-main)] truncate">{athlete.nome_completo}</h5>
                          <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase">{athlete.graduacao} | {athlete.peso_kg}kg</p>
                        </div>
                        <button className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors">
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="card-surface p-12 text-center space-y-4">
                    <UserPlus className="mx-auto text-[var(--text-muted)]" size={32} />
                    <p className="text-[var(--text-muted)] text-sm italic">Nenhum atleta vinculado a esta equipe ainda.</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 card-surface border-dashed">
              <ShieldCheck size={48} className="text-[var(--text-muted)] mb-4 opacity-20" />
              <p className="text-[var(--text-muted)] font-medium">Selecione uma equipe para gerenciar os detalhes e atletas.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Team Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-card)] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-[var(--border-ui)]"
            >
              <div className="p-6 border-b border-[var(--border-ui)] flex justify-between items-center bg-emerald-500/5">
                <h3 className="text-xl font-black font-display text-[var(--text-main)] uppercase">Nova Equipe</h3>
                <button onClick={() => setShowAddModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddTeam} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="label-standard">Nome da Equipe</label>
                  <input 
                    required 
                    name="nome" 
                    className="input-standard py-4 px-6" 
                    placeholder="Ex: GRACIE BARRA" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="label-standard">Filiação / Matriz</label>
                  <input 
                    name="filiacao" 
                    className="input-standard py-4 px-6" 
                    placeholder="Ex: GB BRASIL" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="label-standard">Professor Responsável</label>
                  <input 
                    name="professor" 
                    className="input-standard py-4 px-6" 
                    placeholder="Ex: MESTRE HÉLIO GRACIE" 
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="label-standard">País <span className="text-red-500">*</span></label>
                    <select 
                      className="input-standard py-4 px-6"
                      value={locationData.country_id}
                      onChange={(e) => fetchStates(e.target.value)}
                    >
                      <option value="">Selecione o País</option>
                      {countries.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="label-standard">Estado <span className="text-red-500">*</span></label>
                      <select 
                        disabled={!locationData.country_id}
                        className="input-standard py-4 px-6 disabled:opacity-50"
                        value={locationData.state_id}
                        onChange={(e) => fetchCities(e.target.value)}
                      >
                        <option value="">{locationData.country_id ? (states.length === 0 ? 'Carregando...' : 'Estado') : 'Selecione o País'}</option>
                        {states.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="label-standard">Cidade <span className="text-red-500">*</span></label>
                      <select 
                        disabled={!locationData.state_id}
                        className="input-standard py-4 px-6 disabled:opacity-50"
                        value={locationData.city_id}
                        onChange={(e) => setLocationData(prev => ({ ...prev, city_id: e.target.value }))}
                      >
                        <option value="">{locationData.state_id ? (cities.length === 0 ? 'Nenhuma cidade' : 'Cidade') : 'Selecione o Estado'}</option>
                        {cities.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <button 
                  disabled={saving}
                  type="submit" 
                  className="w-full btn-primary bg-emerald-500 hover:bg-emerald-600 border-emerald-500 py-5 font-black text-lg uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20"
                >
                  {saving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
                  {saving ? 'Criando...' : 'Cadastrar Equipe'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
