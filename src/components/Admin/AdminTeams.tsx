import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Shield, 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  MoreVertical,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  User
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { Team } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

export const AdminTeams: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [representatives, setRepresentatives] = useState<any[]>([]);
  const [formData, setFormData] = useState<any>({
    name: '',
    description: '',
    country_id: '',
    state_id: '',
    city_id: '',
    logo_url: '',
    professor: '',
    representative_id: ''
  });
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<any[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [teamStats, setTeamStats] = useState<Record<string, number>>({});
  const pageSize = 10;

  useEffect(() => {
    fetchTeams();
    fetchCountries();
  }, [page]);

  useEffect(() => {
    if (isModalOpen && formData.country_id) {
      fetchStates(formData.country_id);
    }
    if (isModalOpen && formData.state_id) {
      fetchCities(formData.state_id);
    }
  }, [isModalOpen, formData.country_id, formData.state_id]);

  const fetchCountries = async () => {
    const { data } = await supabase
      .from('countries')
      .select('*')
      .order('name');

    setCountries(data || []);
  };

  const fetchStates = async (countryId: string) => {
    const { data } = await supabase
      .from('states')
      .select('*')
      .eq('country_id', countryId);

    setStates(data || []);
  };

  const fetchCities = async (stateId: string) => {
    const { data } = await supabase
      .from('cities')
      .select('*')
      .eq('state_id', stateId);

    setCities(data || []);
  };

  const fetchTeams = async () => {
    setLoading(true);
    console.log("[LOG] Admin: Buscando equipes...");
    try {
      // Test query without joins
      const { count: simpleCount, error: simpleError } = await supabase
        .from('teams')
        .select('*', { count: 'exact', head: true });
      console.log("[LOG] Admin: Contagem simples de equipes:", simpleCount, "Erro:", simpleError);

      let query = supabase
        .from('teams')
        .select(`
          *,
          countries(name),
          states(name),
          cities(name)
        `, { count: 'exact' });

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;
      
      // Fetch representatives for these teams
      const teamIds = data?.map(t => t.id) || [];
      const { data: repsData } = await supabase
        .from('team_members')
        .select('team_id, user_id, profiles(full_name)')
        .in('team_id', teamIds)
        .eq('role', 'representative');

      const repsMap: Record<string, any[]> = {};
      repsData?.forEach(r => {
        if (!repsMap[r.team_id]) repsMap[r.team_id] = [];
        repsMap[r.team_id].push({
          id: r.user_id,
          name: (r.profiles as any)?.full_name
        });
      });

      const teamsWithReps = data?.map(t => ({
        ...t,
        representatives: repsMap[t.id] || []
      })) || [];

      setTeams(teamsWithReps);
      console.log("[LOG] Admin: Equipes encontradas:", teamsWithReps);
      setTotalCount(count || 0);

      // Fetch athlete counts for these teams
      if (data && data.length > 0) {
        const { data: countData, error: countError } = await supabase
          .from('profiles')
          .select('team_id')
          .in('team_id', teamIds);
        
        if (!countError && countData) {
          const counts: Record<string, number> = {};
          countData.forEach(p => {
            if (p.team_id) {
              counts[p.team_id] = (counts[p.team_id] || 0) + 1;
            }
          });
          setTeamStats(counts);
        }
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    setUserSearch(query);
    if (query.length < 2) {
      setUserResults([]);
      return;
    }

    console.log("[LOG] Admin: Buscando usuário:", query);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, username')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(10);
      
      if (error) {
        console.error("[LOG] Admin: Erro ao buscar usuários:", error);
        // If email search fails (column might not exist yet), try without it
        if (error.message.includes('column "email" does not exist')) {
          console.log("[LOG] Admin: Tentando busca sem coluna 'email'...");
          const { data: retryData, error: retryError } = await supabase
            .from('profiles')
            .select('id, full_name, username')
            .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
            .limit(10);
          
          if (retryError) throw retryError;
          setUserResults(retryData || []);
          return;
        }
        throw error;
      }

      console.log("[LOG] Admin: Resultado da busca de usuários:", data);
      if (data) {
        setUserResults(data);
      }
    } catch (err: any) {
      console.error("[LOG] Admin: Falha na busca de usuários:", err);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Tipo de arquivo inválido. Use JPG, PNG ou WEBP.');
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Arquivo muito grande. Máximo 2MB.');
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    setUploading(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from('team-logos')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        // Fallback to base64 if storage fails
        setFormData(prev => ({ ...prev, logo_url: reader.result as string }));
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('team-logos')
          .getPublicUrl(filePath);

        setFormData(prev => ({ ...prev, logo_url: publicUrl }));
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Erro ao fazer upload do logo. Tentando usar versão local...');
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTeams();
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta equipe?')) return;
    
    try {
      const { error } = await supabase.from('teams').delete().eq('id', teamId);
      if (error) throw error;
      setTeams(prev => prev.filter(t => t.id !== teamId));
      alert('Equipe excluída com sucesso.');
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Erro ao excluir equipe.');
    }
  };

  const handleSaveTeam = async () => {
    try {
      // Standardize text to uppercase
      const standardizedData = {
        name: formData.name?.toUpperCase(),
        description: formData.description,
        professor: formData.professor?.toUpperCase(),
        country_id: formData.country_id,
        state_id: formData.state_id,
        city_id: formData.city_id,
        logo_url: formData.logo_url
      };

      if (!standardizedData.name || !standardizedData.country_id || !standardizedData.state_id || !standardizedData.city_id) {
        alert('Por favor, preencha todos os campos obrigatórios (Nome, País, Estado e Cidade).');
        return;
      }

      let teamId = selectedTeam?.id;

      if (selectedTeam) {
        const { data, error } = await supabase
          .from('teams')
          .update(standardizedData)
          .eq('id', selectedTeam.id)
          .select();
        
        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error('Nenhuma linha foi atualizada. Verifique as permissões (RLS).');
        }
      } else {
        const { data, error } = await supabase
          .from('teams')
          .insert([standardizedData])
          .select()
          .single();
        if (error) throw error;
        teamId = data.id;
      }

      // Save representatives in team_members
      if (teamId) {
        console.log("Salvando representantes:", representatives);

        // Obter representantes atuais no banco
        const { data: currentReps } = await supabase
          .from('team_members')
          .select('user_id')
          .eq('team_id', teamId)
          .eq('role', 'representative');
        
        const currentRepIds = currentReps?.map(r => r.user_id) || [];
        const newRepIds = representatives.map(r => r.id);

        // Representatives to remove
        const toRemove = currentRepIds.filter(id => !newRepIds.includes(id));
        // Representatives to add
        const toAdd = newRepIds.filter(id => !currentRepIds.includes(id));

        if (toRemove.length > 0) {
          const { error: deleteError } = await supabase
            .from('team_members')
            .delete()
            .eq('team_id', teamId)
            .eq('role', 'representative')
            .in('user_id', toRemove);
          
          if (deleteError) throw deleteError;
        }

        if (toAdd.length > 0) {
          const { error: insertError } = await supabase
            .from('team_members')
            .insert(toAdd.map(userId => ({
              team_id: teamId,
              user_id: userId,
              role: 'representative'
            })));
          
          if (insertError) throw insertError;
        }

        console.log("Representantes atualizados com sucesso");
      }

      fetchTeams();
      setIsModalOpen(false);
      alert(`Equipe ${selectedTeam ? 'atualizada' : 'criada'} com sucesso.`);
    } catch (error: any) {
      console.error('Error saving team:', error);
      alert(`Erro ao salvar equipe: ${error.message || 'Verifique se o nome já existe ou se os dados estão corretos.'}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearch} className="w-full md:w-96 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Buscar equipes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0f0f0f] border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm outline-none focus:border-blue-500 transition-all"
          />
        </form>
        <button
          onClick={() => {
            setSelectedTeam(null);
            setFormData({ name: '', city: '', state: '', logo_url: '', professor: '' });
            setIsModalOpen(true);
          }}
          className="w-full md:w-auto bg-blue-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center space-x-2"
        >
          <Plus size={18} />
          <span>Nova Equipe</span>
        </button>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[#0f0f0f] border border-white/10 rounded-3xl p-6 animate-pulse">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-16 h-16 bg-white/5 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/5 rounded w-3/4" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-white/5 rounded w-full" />
                <div className="h-3 bg-white/5 rounded w-full" />
              </div>
            </div>
          ))
        ) : teams.length > 0 ? (
          teams.map((team) => (
            <motion.div
              layout
              key={team.id}
              className="bg-[#0f0f0f] border border-white/10 rounded-3xl p-6 hover:border-blue-500/30 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 overflow-hidden p-2">
                    {team.logo_url ? (
                      <img src={team.logo_url} alt={team.name} className="w-full h-full object-contain" />
                    ) : (
                      <Shield className="w-full h-full text-gray-700" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-tight">{team.name}</h3>
                    <div className="flex flex-col space-y-1 mt-1">
                      <div className="flex items-center space-x-1 text-gray-500">
                        <MapPin size={10} />
                        <span className="text-[9px] font-bold uppercase tracking-widest">
                          {team.cities?.name && team.states?.name && team.countries?.name
                            ? `${team.cities.name}, ${team.states.name} - ${team.countries.name}`
                            : 'Sem Localização'}
                        </span>
                      </div>
                      {team.professor && (
                        <div className="flex items-center space-x-1 text-gray-400">
                          <User size={10} />
                          <span className="text-[9px] font-bold uppercase tracking-widest">Professor: {team.professor}</span>
                        </div>
                      )}
                      {team.representatives && team.representatives.length > 0 ? (
                        <div className="flex flex-col space-y-0.5 mt-1">
                          {team.representatives.map((rep: any) => (
                            <div key={rep.id} className="flex items-center space-x-1 text-blue-500">
                              <Shield size={10} />
                              <span className="text-[9px] font-black uppercase tracking-widest">Líder: {rep.name}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button 
                    onClick={() => {
                      setSelectedTeam(team);
                      setFormData({ 
                        ...team,
                        professor: team.professor || '',
                      });
                      setRepresentatives(team.representatives || []);
                      setUserSearch('');
                      setIsModalOpen(true);
                    }}
                    className="p-2 text-gray-500 hover:text-blue-500 transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => handleDeleteTeam(team.id)}
                    className="p-2 text-gray-500 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <p className="text-[10px] font-medium text-gray-400 line-clamp-2 mb-4 h-8">
                {team.description || 'Nenhuma descrição fornecida.'}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex items-center space-x-2">
                  <Users size={14} className="text-blue-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {teamStats[team.id] || 0} Atletas
                  </span>
                </div>
                <button className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:underline">
                  Ver Detalhes
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-gray-500 font-bold italic bg-[#0f0f0f] border border-white/10 rounded-3xl">
            Nenhuma equipe encontrada
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalCount > pageSize && (
        <div className="flex items-center justify-center space-x-4 mt-8">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="p-3 rounded-2xl bg-[#0f0f0f] border border-white/10 text-gray-400 disabled:opacity-30 hover:text-white transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-black uppercase tracking-widest">Página {page}</span>
          <button
            disabled={page * pageSize >= totalCount}
            onClick={() => setPage(page + 1)}
            className="p-3 rounded-2xl bg-[#0f0f0f] border border-white/10 text-gray-400 disabled:opacity-30 hover:text-white transition-all"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Team Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#0f0f0f] border border-white/10 rounded-[1.5rem] md:rounded-[2.5rem] flex flex-col max-h-[95vh] md:max-h-[90vh] shadow-2xl overflow-hidden"
            >
              <div className="p-5 md:p-8 border-b border-white/10 flex items-center justify-between shrink-0">
                <h3 className="text-lg md:text-xl font-black uppercase italic tracking-tight">
                  {selectedTeam ? 'Editar Equipe' : 'Nova Equipe'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-white transition-colors">
                  <X size={20} className="md:size-6" />
                </button>
              </div>

              <div className="p-5 md:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Nome da Equipe</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 text-sm outline-none focus:border-blue-500"
                    placeholder="Ex: Alliance Jiu-Jitsu"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Professor Responsável</label>
                  <input
                    type="text"
                    value={formData.professor || ''}
                    onChange={(e) => setFormData({ ...formData, professor: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 text-sm outline-none focus:border-blue-500"
                    placeholder="Ex: Mestre Hélio Gracie"
                  />
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Descrição da Equipe</label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 text-sm outline-none focus:border-blue-500 min-h-[80px] md:min-h-[100px] resize-none"
                      placeholder="Descreva a história ou foco da equipe..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">País</label>
                    <select
                      value={formData.country_id}
                      onChange={(e) => {
                        const countryId = e.target.value;
                        setFormData({ ...formData, country_id: countryId, state_id: '', city_id: '' });
                        setStates([]);
                        setCities([]);
                        if (countryId) fetchStates(countryId);
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="">Selecionar País</option>
                      {countries.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Estado</label>
                      <select
                        value={formData.state_id}
                        disabled={!formData.country_id}
                        onChange={(e) => {
                          const stateId = e.target.value;
                          setFormData({ ...formData, state_id: stateId, city_id: '' });
                          setCities([]);
                          if (stateId) fetchCities(stateId);
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 text-sm outline-none focus:border-blue-500 disabled:opacity-50"
                      >
                        <option value="">{formData.country_id ? (states.length === 0 ? 'Carregando estados...' : 'Selecionar Estado') : 'Selecione um País'}</option>
                        {states.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Cidade</label>
                      <select
                        value={formData.city_id}
                        disabled={!formData.state_id}
                        onChange={(e) => setFormData({ ...formData, city_id: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 text-sm outline-none focus:border-blue-500 disabled:opacity-50"
                      >
                        <option value="">{formData.state_id ? (cities.length === 0 ? 'Nenhuma cidade encontrada' : 'Selecionar Cidade') : 'Selecione um Estado'}</option>
                        {cities.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Responsáveis pela Equipe</label>
                  
                  {/* List of current representatives */}
                  <div className="space-y-2">
                    {representatives.map(rep => (
                      <div key={rep.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <User size={14} className="text-blue-500" />
                          </div>
                          <span className="text-xs font-bold uppercase tracking-tight">{rep.name}</span>
                        </div>
                        <button 
                          onClick={() => setRepresentatives(prev => prev.filter(r => r.id !== rep.id))}
                          className="p-2 text-gray-500 hover:text-rose-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                      <input
                        type="text"
                        value={userSearch}
                        onChange={(e) => searchUsers(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 md:py-4 pl-12 pr-4 text-sm outline-none focus:border-blue-500"
                        placeholder="Adicionar novo responsável..."
                      />
                    </div>

                    {userResults.length > 0 && (
                      <div className="absolute z-[110] w-full mt-1 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                        {userResults.map(user => (
                          <button
                            key={user.id}
                            disabled={representatives.some(r => r.id === user.id)}
                            onClick={() => {
                              if (!representatives.some(r => r.id === user.id)) {
                                setRepresentatives(prev => [...prev, { id: user.id, name: user.full_name }]);
                              }
                              setUserSearch('');
                              setUserResults([]);
                            }}
                            className="w-full px-4 py-3 text-left text-xs hover:bg-blue-600 transition-colors border-b border-white/5 last:border-0 flex flex-col disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="font-black uppercase tracking-tight">{user.full_name}</span>
                            <span className="text-[9px] text-gray-500">{user.email || user.username}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Logo da Equipe</label>
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                      {formData.logo_url ? (
                        <img src={formData.logo_url} alt="Preview" className="w-full h-full object-contain" />
                      ) : (
                        <Shield className="w-6 h-6 md:w-8 md:h-8 text-gray-700" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={handleLogoUpload}
                        className="hidden"
                        id="logo-upload"
                      />
                      <label
                        htmlFor="logo-upload"
                        className={`inline-flex items-center space-x-2 px-3 md:px-4 py-2 rounded-lg border border-white/10 text-[9px] md:text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        <Plus size={14} />
                        <span>{uploading ? 'Enviando...' : 'Fazer Upload'}</span>
                      </label>
                      <p className="text-[8px] text-gray-500 mt-2 uppercase font-bold tracking-widest">PNG, JPG ou WEBP. Máx 2MB.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 md:p-8 border-t border-white/10 bg-white/5 flex items-center justify-end space-x-3 md:space-x-4 shrink-0">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 md:px-6 py-2 md:py-3 text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveTeam}
                  className="bg-blue-600 text-white px-6 md:px-8 py-2 md:py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
                >
                  {selectedTeam ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
