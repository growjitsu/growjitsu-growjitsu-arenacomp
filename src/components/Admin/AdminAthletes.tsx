import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Lock, 
  Unlock, 
  Key,
  Mail, 
  Shield,
  X,
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { auth } from '../../firebase';
import { ArenaProfile } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { BELTS } from '../../utils/data';

export const AdminAthletes: React.FC = () => {
  const [athletes, setAthletes] = useState<ArenaProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    team: '',
    graduation: '',
    country: ''
  });
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [teams, setTeams] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<ArenaProfile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const pageSize = 10;

  useEffect(() => {
    fetchAthletes();
    fetchTeams();
    fetchCountries();
  }, [page, filters]);

  const fetchCountries = async () => {
    const { data } = await supabase.from('countries').select('*').order('name');
    if (data) setCountries(data);
  };

  const fetchStates = async (countryId: string) => {
    const { data } = await supabase.from('states').select('*').eq('country_id', countryId).order('name');
    if (data) setStates(data);
    setCities([]);
  };

  const fetchCities = async (stateId: string) => {
    const { data } = await supabase.from('cities').select('*').eq('state_id', stateId).order('name');
    if (data) setCities(data);
  };

  const fetchTeams = async () => {
    const { data, error } = await supabase.from('teams').select('id, name').order('name');
    if (!error && data) setTeams(data);
  };

  const fetchAthletes = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' });

      if (search) {
        // Search by full_name or username. Email is excluded if it's not in the table, 
        // but we'll try to include it safely if possible or just stick to what we know exists.
        query = query.or(`full_name.ilike.%${search}%,username.ilike.%${search}%`);
      }

      if (filters.team) query = query.eq('team', filters.team);
      if (filters.graduation) query = query.ilike('graduation', filters.graduation);
      if (filters.country) query = query.eq('country', filters.country);

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;
      setAthletes(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching athletes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAthletes();
  };

  const handleBlockUser = async (userId: string, isBlocked: boolean) => {
    // In a real app, you'd have a 'blocked' column or use Supabase Auth Admin API
    // For now, we'll simulate it by updating a metadata field if it exists or just logging
    alert(`Usuário ${isBlocked ? 'bloqueado' : 'desbloqueado'} (Simulado)`);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este atleta? Esta ação é irreversível.')) return;
    
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
      setAthletes(prev => prev.filter(a => a.id !== userId));
      alert('Atleta excluído com sucesso.');
    } catch (error) {
      console.error('Error deleting athlete:', error);
      alert('Erro ao excluir atleta.');
    }
  };

  const handleSaveEdit = async () => {
    try {
      // Find team ID if name was selected
      const selectedTeamObj = teams.find(t => t.name === editData.team || t.id === editData.team_id);
      const teamId = selectedTeamObj?.id || editData.team_id;

      // Standardize text to uppercase
      const standardizedData = {
        ...editData,
        full_name: editData.full_name?.toUpperCase(),
        nickname: editData.nickname?.toUpperCase(),
        modality: editData.modality?.toUpperCase(),
        category: editData.category?.toUpperCase(),
        graduation: editData.graduation?.toUpperCase(),
        gym_name: editData.gym_name?.toUpperCase(),
        professor: editData.professor?.toUpperCase(),
        // Keep text version for ranking compatibility
        city: editData.city?.toUpperCase(),
        state: editData.state?.toUpperCase(),
        country: editData.country?.toUpperCase(),
        // Save IDs for consistency
        country_id: editData.country_id,
        state_id: editData.state_id,
        city_id: editData.city_id,
        team: selectedTeamObj?.name || editData.team?.toUpperCase(),
        team_id: teamId,
        titles: editData.titles?.toUpperCase(),
        team_leader: (editData.team_leader === true || editData.team_leader === 'true') ? 'true' : 'false',
      };

      // 1. Update Profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update(standardizedData)
        .eq('id', selectedAthlete?.id);
      
      if (profileError) {
        if (profileError.message.includes('TEAM_HAS_REPRESENTATIVE')) {
          alert('Erro: Esta equipe já possui um representante oficial.');
          return;
        }
        throw profileError;
      }

      // 2. Update team_members if representative status changed
      const isRepresentative = standardizedData.team_leader === 'true';
      const wasRepresentative = selectedAthlete?.team_leader === 'true' || selectedAthlete?.team_leader === true;

      if (isRepresentative !== wasRepresentative && teamId) {
        if (isRepresentative) {
          // Add as representative
          const { error: memberError } = await supabase
            .from('team_members')
            .upsert({
              team_id: teamId,
              user_id: selectedAthlete?.id,
              role: 'representative'
            }, { onConflict: 'team_id,user_id' });
          
          if (memberError) {
            console.error('Error updating team_members:', memberError);
            if (memberError.message.includes('one_representative_per_team')) {
              alert('Erro: Esta equipe já possui um representante oficial na tabela team_members.');
            } else {
              alert(`Erro ao vincular representante: ${memberError.message}`);
            }
          }
        } else {
          // Remove as representative
          await supabase
            .from('team_members')
            .delete()
            .eq('team_id', teamId)
            .eq('user_id', selectedAthlete?.id)
            .eq('role', 'representative');
        }
      }
      
      setAthletes(prev => prev.map(a => a.id === selectedAthlete?.id ? { ...a, ...standardizedData } : a));
      setIsEditModalOpen(false);
      alert('Perfil atualizado com sucesso.');
    } catch (error) {
      console.error('Error updating athlete:', error);
      alert('Erro ao atualizar perfil.');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedAthlete?.id) return;
    if (newPassword.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('As senhas não coincidem.');
      return;
    }

    setPasswordLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Admin não autenticado.');
      
      const token = await user.getIdToken();
      
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          uid: selectedAthlete.id,
          password: newPassword
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Senha atualizada com sucesso.');
        setIsPasswordModalOpen(false);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        throw new Error(result.error || 'Erro ao atualizar senha.');
      }
    } catch (error: any) {
      console.error('Error resetting password:', error);
      alert(error.message || 'Erro ao atualizar senha.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-3xl p-6">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="text"
                  placeholder="Buscar por nome ou username..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm outline-none focus:border-blue-500 transition-all"
                />
              </div>
          <div className="flex gap-4">
            <select
              value={filters.graduation}
              onChange={(e) => setFilters({ ...filters, graduation: e.target.value })}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="">Todas as Faixas</option>
              {BELTS.map(belt => (
                <option key={belt} value={belt}>{belt}</option>
              ))}
            </select>
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-blue-700 transition-all"
            >
              Filtrar
            </button>
          </div>
        </form>
      </div>

      {/* Athletes Table */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Atleta</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Email</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Equipe</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Graduação</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : athletes.length > 0 ? (
                athletes.map((athlete) => (
                  <tr key={athlete.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 overflow-hidden">
                          {athlete.avatar_url || athlete.profile_photo ? (
                            <img src={athlete.avatar_url || athlete.profile_photo} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                              {athlete.full_name?.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-tight">{athlete.full_name}</p>
                          <p className="text-[10px] font-bold text-gray-500 tracking-widest">@{athlete.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-400">
                      {/* @ts-ignore - email might not exist in profiles table */}
                      {athlete.email || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">{athlete.team || 'Sem Equipe'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest">
                        {athlete.graduation || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Ativo</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setSelectedAthlete(athlete);
                            setEditData({ ...athlete });
                            setIsEditModalOpen(true);
                            if (athlete.country_id) fetchStates(athlete.country_id);
                            if (athlete.state_id) fetchCities(athlete.state_id);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedAthlete(athlete);
                            setIsPasswordModalOpen(true);
                            setNewPassword('');
                            setConfirmPassword('');
                          }}
                          className="p-2 text-gray-400 hover:text-emerald-500 transition-colors"
                          title="Alterar Senha"
                        >
                          <Key size={16} />
                        </button>
                        <button 
                          onClick={() => handleBlockUser(athlete.id, true)}
                          className="p-2 text-gray-400 hover:text-amber-500 transition-colors"
                        >
                          <Lock size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(athlete.id)}
                          className="p-2 text-gray-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-gray-500 font-bold italic">Nenhum atleta encontrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            Mostrando {Math.min(pageSize, athletes.length)} de {totalCount} atletas
          </p>
          <div className="flex items-center space-x-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 disabled:opacity-30 hover:text-white transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-xs font-black px-4">{page}</span>
            <button
              disabled={page * pageSize >= totalCount}
              onClick={() => setPage(page + 1)}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 disabled:opacity-30 hover:text-white transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black uppercase italic tracking-tight">Editar Atleta</h3>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">ID: {selectedAthlete?.id}</p>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-gray-400 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Nome Completo</label>
                    <input
                      type="text"
                      value={editData.full_name}
                      onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Email (Visualização)</label>
                    <input
                      type="email"
                      /* @ts-ignore */
                      value={editData.email || ''}
                      disabled
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none opacity-50 cursor-not-allowed"
                    />
                    <p className="text-[9px] text-gray-600 italic">O email é gerenciado pelo sistema de autenticação.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Equipe</label>
                    <select
                      value={editData.team_id || ''}
                      onChange={(e) => {
                        const team = teams.find(t => t.id === e.target.value);
                        setEditData({ ...editData, team_id: e.target.value, team: team?.name || '' });
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="">Sem Equipe</option>
                      {teams.map(team => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Localização */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">País</label>
                    <select
                      value={editData.country_id || ''}
                      onChange={(e) => {
                        const country = countries.find(c => c.id === e.target.value);
                        setEditData({ ...editData, country_id: e.target.value, country: country?.name || '' });
                        fetchStates(e.target.value);
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="">Selecione o País</option>
                      {countries.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Estado</label>
                    <select
                      value={editData.state_id || ''}
                      onChange={(e) => {
                        const state = states.find(s => s.id === e.target.value);
                        setEditData({ ...editData, state_id: e.target.value, state: state?.name || '' });
                        fetchCities(e.target.value);
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="">Selecione o Estado</option>
                      {states.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Cidade</label>
                    <select
                      value={editData.city_id || ''}
                      onChange={(e) => {
                        const city = cities.find(c => c.id === e.target.value);
                        setEditData({ ...editData, city_id: e.target.value, city: city?.name || '' });
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="">Selecione a Cidade</option>
                      {cities.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Graduação</label>
                    <select
                      value={editData.graduation}
                      onChange={(e) => setEditData({ ...editData, graduation: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-blue-500"
                    >
                      {BELTS.map(belt => (
                        <option key={belt} value={belt}>{belt}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2 flex items-center pt-6">
                    <label className="flex items-center space-x-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={editData.team_leader === 'true' || editData.team_leader === true}
                          onChange={(e) => setEditData({ ...editData, team_leader: e.target.checked })}
                          className="sr-only"
                        />
                        <div className={`w-10 h-5 rounded-full transition-colors ${(editData.team_leader === 'true' || editData.team_leader === true) ? 'bg-emerald-500' : 'bg-white/10'}`} />
                        <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform ${(editData.team_leader === 'true' || editData.team_leader === true) ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-white transition-colors">Representante de Equipe</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-white/10 bg-white/5 flex items-center justify-end space-x-4">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-3 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="bg-blue-600 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
                >
                  Salvar Alterações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Password Reset Modal */}
      <AnimatePresence>
        {isPasswordModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPasswordModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black uppercase italic tracking-tight flex items-center gap-2">
                    <Lock size={20} className="text-emerald-500" />
                    Alterar Senha
                  </h3>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Atleta: {selectedAthlete?.full_name}</p>
                </div>
                <button onClick={() => setIsPasswordModalOpen(false)} className="p-2 text-gray-400 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Nova Senha</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Confirmar Nova Senha</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4">
                  <div className="flex gap-3">
                    <Shield size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] font-medium text-gray-400 leading-relaxed">
                      Esta ação atualizará a senha do atleta diretamente no <span className="text-emerald-500 font-bold uppercase tracking-widest">Firebase Authentication</span>. 
                      O atleta deverá usar a nova senha no próximo login.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-white/10 bg-white/5 flex items-center justify-end space-x-4">
                <button
                  onClick={() => setIsPasswordModalOpen(false)}
                  disabled={passwordLoading}
                  className="px-6 py-3 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={passwordLoading}
                  className="bg-emerald-600 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 flex items-center space-x-2"
                >
                  {passwordLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  <span>{passwordLoading ? 'Atualizando...' : 'Confirmar Alteração'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
