import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Calendar,
  Shield,
  Trophy,
  Target,
  User
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { challengeService } from '../../services/challengeService';
import { ArenaChallenge, ChallengeType, ChallengeStatus, ArenaProfile } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export const AdminChallenges: React.FC = () => {
  const [challenges, setChallenges] = useState<ArenaChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 15;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPointsModalOpen, setIsPointsModalOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<ArenaChallenge | null>(null);
  const [editData, setEditData] = useState<any>(null);
  
  // For points adjustment
  const [selectedAthleteId, setSelectedAthleteId] = useState('');
  const [adjustmentValue, setAdjustmentValue] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [currentPoints, setCurrentPoints] = useState<number>(0);

  // For creation
  const [athletes, setAthletes] = useState<ArenaProfile[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [createData, setCreateData] = useState({
    challenger_id: '',
    challenged_id: '',
    event_id: '',
    event_name: '',
    challenge_type: 'category' as ChallengeType
  });

  useEffect(() => {
    fetchChallenges();
    setSelectedIds(new Set());
  }, [page, statusFilter]);

  useEffect(() => {
    if (isCreateModalOpen || isPointsModalOpen) {
      fetchAthletes();
      fetchEvents();
    }
  }, [isCreateModalOpen, isPointsModalOpen]);

  useEffect(() => {
    if (selectedAthleteId) {
      const athlete = athletes.find(a => a.id === selectedAthleteId);
      setCurrentPoints(athlete?.challenge_score || 0);
    }
  }, [selectedAthleteId, athletes]);

  const fetchAthletes = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, username, challenge_score')
      .order('full_name');
    if (data) setAthletes(data);
  };

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('eventos')
      .select('id, nome, status')
      .in('status', ['aberto', 'em_andamento'])
      .order('nome');
    if (data) setEvents(data);
  };

  const fetchChallenges = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('challenges')
        .select(`
          *,
          challenger:profiles!challenges_challenger_id_fkey(id, full_name, username),
          challenged:profiles!challenges_challenged_id_fkey(id, full_name, username)
        `, { count: 'exact' })
        .is('deleted_at', null);

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;
      setChallenges(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching challenges:', error);
      toast.error('Erro ao carregar desafios');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === challenges.length && challenges.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(challenges.map(c => c.id)));
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    
    if (!window.confirm(`AVISO CRÍTICO: Você está prestes a EXCLUIR DEFINITIVAMENTE ${count} desafios. Esta ação é irreversível e irá recalcular os pontos de todos os atletas envolvidos. Continuar?`)) return;

    setLoading(true);
    try {
      await challengeService.adminBulkHardDelete(Array.from(selectedIds));
      toast.success(`${count} desafios excluídos com sucesso`);
      
      // Update local state immediately for "vanishing" effect
      setChallenges(prev => prev.filter(c => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
      
      // Refresh to ensure database sync and correct pagination
      fetchChallenges();
    } catch (err: any) {
      toast.error(err.message || 'Erro na exclusão em massa');
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (challengeId: string, status: ChallengeStatus) => {
    try {
      await challengeService.adminUpdateChallenge(challengeId, { status });
      toast.success('Status atualizado com sucesso');
      fetchChallenges();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar status');
    }
  };

  const handleHardDelete = async (challengeId: string) => {
    if (!window.confirm('CUIDADO: Tem certeza que deseja EXCLUIR DEFINITIVAMENTE este desafio? Todos os pontos relacionados serão removidos e as estatísticas recalculadas.')) return;
    try {
      await challengeService.adminHardDeleteChallenge(challengeId);
      toast.success('Desafio excluído com sucesso');
      
      // Update local state immediately
      setChallenges(prev => prev.filter(c => c.id !== challengeId));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(challengeId);
        return next;
      });

      fetchChallenges();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir desafio');
    }
  };

  const handleApplyAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAthleteId) return;

    try {
      await challengeService.addPointAdjustment(selectedAthleteId, adjustmentValue, adjustmentReason);
      toast.success('Ajuste aplicado com sucesso');
      setAdjustmentValue(0);
      setAdjustmentReason('');
      // Refresh athletes to get updated points
      fetchAthletes();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao aplicar ajuste');
    }
  };

  const handleResetPoints = async () => {
    if (!selectedAthleteId) return;
    if (!window.confirm('Tem certeza que deseja ZERAR os pontos de desafios deste atleta?')) return;

    try {
      await challengeService.resetChallengePoints(selectedAthleteId);
      toast.success('Pontuação zerada com sucesso');
      fetchAthletes();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao zerar pontos');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChallenge) return;

    try {
      await challengeService.adminUpdateChallenge(selectedChallenge.id, editData);
      toast.success('Desafio atualizado com sucesso');
      setIsEditModalOpen(false);
      fetchChallenges();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar desafio');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createData.challenger_id === createData.challenged_id) {
      toast.error('Um atleta não pode desafiar a si mesmo');
      return;
    }

    try {
      await challengeService.adminCreateChallenge(createData);
      toast.success('Desafio criado com sucesso');
      setIsCreateModalOpen(false);
      setCreateData({
        challenger_id: '',
        challenged_id: '',
        event_id: '',
        event_name: '',
        challenge_type: 'category'
      });
      fetchChallenges();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar desafio');
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase italic italic tracking-tighter text-white">Gestão de Desafios</h2>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Controle Administrativo de Confrontos 1x1</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsPointsModalOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-amber-600/20"
          >
            <Shield size={18} />
            Ajuste de Pontos
          </button>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
          >
            <Plus size={18} />
            Criar Desafio
          </button>
        </div>
      </div>

      {/* Tool bar for bulk actions */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-xs font-black italic">
                {selectedIds.size}
              </div>
              <span className="text-xs font-bold uppercase tracking-tight text-white">Desafios Selecionados</span>
            </div>
            <button 
              onClick={handleBulkDelete}
              className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-rose-600/20"
            >
              <Trash2 size={14} />
              Excluir Selecionados
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-white/5 rounded-3xl border border-white/10">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text"
            placeholder="Buscar por atleta ou evento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:border-primary/50 outline-none transition-all"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:border-primary/50 outline-none transition-all appearance-none"
          >
            <option value="">Todos os Status</option>
            <option value="pending">Pendente</option>
            <option value="accepted">Aceito</option>
            <option value="declined">Recusado</option>
            <option value="cancelled">Cancelado</option>
            <option value="finished">Finalizado</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10">
                <th className="pl-6 py-4 w-10">
                  <input 
                    type="checkbox"
                    checked={challenges.length > 0 && selectedIds.size === challenges.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary/50 transition-all cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Data</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Participantes</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Evento</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Tipo</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    Carregando desafios...
                  </td>
                </tr>
              ) : challenges.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">
                    Nenhum desafio encontrado
                  </td>
                </tr>
              ) : (
                challenges.map((challenge) => (
                  <tr key={challenge.id} className={`hover:bg-white/5 transition-colors ${challenge.deleted_at ? 'opacity-50 grayscale' : ''} ${selectedIds.has(challenge.id) ? 'bg-primary/5' : ''}`}>
                    <td className="pl-6 py-4">
                      <input 
                        type="checkbox"
                        checked={selectedIds.has(challenge.id)}
                        onChange={() => toggleSelection(challenge.id)}
                        className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary/50 transition-all cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm text-white font-medium">{new Date(challenge.created_at).toLocaleDateString()}</span>
                        <span className="text-[10px] text-gray-500 font-bold">{new Date(challenge.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded">VS</span>
                          <span className="text-xs text-white font-bold">{challenge.challenger?.full_name || 'Atleta não encontrado'}</span>
                        </div>
                        <div className="flex items-center gap-2 opacity-70">
                          <span className="text-[9px] font-black uppercase bg-gray-500/10 text-gray-500 px-1.5 py-0.5 rounded">VS</span>
                          <span className="text-xs text-white">{challenge.challenged?.full_name || 'Atleta não encontrado'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-300 font-medium">{challenge.event_name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                        {challenge.challenge_type === 'category_absolute' ? 'Categoria + Absoluto' : 'Categoria'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        challenge.status === 'finished' ? 'bg-emerald-500/10 text-emerald-500' :
                        challenge.status === 'accepted' ? 'bg-indigo-500/10 text-indigo-500' :
                        challenge.status === 'declined' ? 'bg-rose-500/10 text-rose-500' :
                        challenge.status === 'cancelled' ? 'bg-gray-500/10 text-gray-500' :
                        'bg-amber-500/10 text-amber-500'
                      }`}>
                        {challenge.status}
                      </span>
                      {challenge.deleted_at && (
                        <span className="ml-2 text-[9px] font-black uppercase text-rose-500 italic">Desativado</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setSelectedChallenge(challenge);
                            setEditData({
                              event_name: challenge.event_name,
                              challenge_type: challenge.challenge_type,
                              status: challenge.status
                            });
                            setIsEditModalOpen(true);
                          }}
                          className="p-2 text-gray-400 hover:text-primary transition-colors bg-white/5 rounded-xl border border-white/5"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleHardDelete(challenge.id)}
                          className="p-2 text-gray-400 hover:text-rose-500 transition-colors bg-white/5 rounded-xl border border-white/5"
                          title="Excluir Definitivamente"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-gray-500 uppercase font-bold tracking-widest">
              Mostrando {(page - 1) * pageSize + 1} a {Math.min(page * pageSize, totalCount)} de {totalCount} desafios
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-20 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-xs font-black text-white px-4 py-2 bg-white/5 rounded-xl border border-white/10">{page}</span>
              <button 
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-20 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Points Adjustment Modal */}
      <AnimatePresence>
        {isPointsModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121212] w-full max-w-lg rounded-[2.5rem] border border-white/10 overflow-hidden"
            >
              <div className="p-8 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black uppercase italic italic tracking-tighter text-white">Ajuste de Pontos</h3>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Controle Manual de Pontuação de Desafios</p>
                </div>
                <button onClick={() => setIsPointsModalOpen(false)} className="p-2 text-gray-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleApplyAdjustment} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-4">Selecionar Atleta</label>
                    <select 
                      value={selectedAthleteId}
                      onChange={(e) => setSelectedAthleteId(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white focus:border-primary/50 outline-none transition-all"
                      required
                    >
                      <option value="">Escolha um Atleta</option>
                      {athletes.map(a => (
                        <option key={a.id} value={a.id}>{a.full_name} (@{a.username})</option>
                      ))}
                    </select>
                  </div>

                  {selectedAthleteId && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-gray-500">Pontuação Atual</span>
                        <span className="text-2xl font-black italic text-primary underline decoration-primary/30 underline-offset-4">{currentPoints} Pts</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-gray-500 block mb-1">Ajuste (Numérico)</label>
                          <input 
                            type="number"
                            value={adjustmentValue}
                            onChange={(e) => setAdjustmentValue(Number(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:border-primary/50 outline-none"
                            placeholder="Ex: 50 ou -50"
                            required
                          />
                        </div>
                        <div className="flex items-end">
                           <button 
                            type="button"
                            onClick={handleResetPoints}
                            className="w-full py-3 bg-rose-500/10 text-rose-500 hover:bg-rose-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-rose-500/20 hover:text-white"
                          >
                            Zerar Pontos
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 block mb-1">Motivo do Ajuste</label>
                        <input 
                          type="text"
                          value={adjustmentReason}
                          onChange={(e) => setAdjustmentReason(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:border-primary/50 outline-none"
                          placeholder="Ex: Correção de pódio, bônus..."
                        />
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsPointsModalOpen(false)}
                    className="flex-1 py-4 bg-white/5 text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all border border-white/5"
                  >
                    Fechar
                  </button>
                  <button 
                    type="submit"
                    disabled={!selectedAthleteId || adjustmentValue === 0}
                    className="flex-1 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                  >
                    Aplicar Ajuste
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && selectedChallenge && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121212] w-full max-w-lg rounded-[2.5rem] border border-white/10 overflow-hidden"
            >
              <div className="p-8 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black uppercase italic italic tracking-tighter text-white">Editar Desafio</h3>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Modificando parâmetros do confronto</p>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-gray-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <span className="text-[10px] font-black uppercase text-gray-500 block mb-1">Desafiante</span>
                      <p className="text-xs text-white font-bold">{selectedChallenge.challenger?.full_name}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <span className="text-[10px] font-black uppercase text-gray-500 block mb-1">Desafiado</span>
                      <p className="text-xs text-white font-bold">{selectedChallenge.challenged?.full_name}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-4">Nome do Evento</label>
                    <input 
                      type="text"
                      value={editData.event_name}
                      onChange={(e) => setEditData({...editData, event_name: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white focus:border-primary/50 outline-none transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-4">Tipo de Desafio</label>
                    <select 
                      value={editData.challenge_type}
                      onChange={(e) => setEditData({...editData, challenge_type: e.target.value as ChallengeType})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white focus:border-primary/50 outline-none transition-all"
                    >
                      <option value="category">Somente Categoria</option>
                      <option value="category_absolute">Categoria + Absoluto</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-4">Status</label>
                    <select 
                      value={editData.status}
                      onChange={(e) => setEditData({...editData, status: e.target.value as ChallengeStatus})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white focus:border-primary/50 outline-none transition-all"
                    >
                      <option value="pending">Pendente</option>
                      <option value="accepted">Aceito</option>
                      <option value="declined">Recusado</option>
                      <option value="cancelled">Cancelado</option>
                      <option value="finished">Finalizado</option>
                    </select>
                    <p className="text-[8px] text-gray-500 px-4 font-bold uppercase italic">Aviso: Alterar o status pode disparar notificações e posts automáticos.</p>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 py-4 bg-white/5 text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all border border-white/5"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121212] w-full max-w-xl rounded-[2.5rem] border border-white/10 overflow-hidden"
            >
              <div className="p-8 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black uppercase italic italic tracking-tighter text-white">Novo Desafio Admin</h3>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Criação manual de confrontos</p>
                </div>
                <button onClick={() => setIsCreateModalOpen(false)} className="p-2 text-gray-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-6">
                  {/* Athletes Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-4">Desafiante</label>
                      <select 
                        value={createData.challenger_id}
                        onChange={(e) => setCreateData({...createData, challenger_id: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white focus:border-primary/50 outline-none transition-all"
                        required
                      >
                        <option value="">Selecione o Atleta</option>
                        {athletes.map(a => (
                          <option key={a.id} value={a.id}>{a.full_name} (@{a.username})</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-4">Desafiado</label>
                      <select 
                        value={createData.challenged_id}
                        onChange={(e) => setCreateData({...createData, challenged_id: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white focus:border-primary/50 outline-none transition-all"
                        required
                      >
                        <option value="">Selecione o Atleta</option>
                        {athletes.map(a => (
                          <option key={a.id} value={a.id}>{a.full_name} (@{a.username})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Event Selection */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-4">Selecionar Evento Ativo</label>
                      <select 
                        value={createData.event_id}
                        onChange={(e) => {
                          const event = events.find(ev => ev.id === e.target.value);
                          setCreateData({
                            ...createData, 
                            event_id: e.target.value,
                            event_name: event ? event.nome : ''
                          });
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white focus:border-primary/50 outline-none transition-all"
                      >
                        <option value="">-- Escolha um evento anunciado --</option>
                        {events.map(e => (
                          <option key={e.id} value={e.id}>{e.nome}</option>
                        ))}
                      </select>
                    </div>

                    {!createData.event_id && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-4">Ou digite o nome do evento</label>
                        <input 
                          type="text"
                          placeholder="Ex: Treino Interno, Copa Local..."
                          value={createData.event_name}
                          onChange={(e) => setCreateData({...createData, event_name: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white focus:border-primary/50 outline-none transition-all"
                          required
                        />
                      </div>
                    )}

                    {createData.event_id && (
                      <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl flex items-center justify-between">
                        <div>
                          <span className="text-[8px] font-black uppercase text-primary block">Evento Vinculado</span>
                          <p className="text-xs text-white font-bold">{createData.event_name}</p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setCreateData({...createData, event_id: '', event_name: ''})}
                          className="text-primary hover:text-white transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-4">Tipo de Desafio</label>
                    <select 
                      value={createData.challenge_type}
                      onChange={(e) => setCreateData({...createData, challenge_type: e.target.value as ChallengeType})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white focus:border-primary/50 outline-none transition-all"
                    >
                      <option value="category">Somente Categoria</option>
                      <option value="category_absolute">Categoria + Absoluto</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-white/10">
                  <button 
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-1 py-4 bg-white/5 text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all border border-white/5"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
                  >
                    Lançar Desafio
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
