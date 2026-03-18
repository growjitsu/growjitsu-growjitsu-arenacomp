import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, Trophy, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '../services/supabase';

interface ArenaAuthProps {
  isAdminLogin?: boolean;
}

export const ArenaAuth: React.FC<ArenaAuthProps> = ({ isAdminLogin = false }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [isTeamLeader, setIsTeamLeader] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamSearch, setTeamSearch] = useState('');
  const [teamResults, setTeamResults] = useState<any[]>([]);
  const [showTeamConflictModal, setShowTeamConflictModal] = useState(false);
  const [conflictingTeamName, setConflictingTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchTeams = async (query: string) => {
    setTeamSearch(query);
    if (query.length < 2) {
      setTeamResults([]);
      return;
    }

    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(5);
    
    if (!error && data) {
      setTeamResults(data);
    }
  };

  const handleSelectTeam = async (team: any) => {
    setLoading(true);
    setError(null);
    try {
      console.log(`[LOG] Selecionando equipe: ${team.name} (ID: ${team.id})`);
      
      // If the user wants to be a leader, we MUST validate
      if (isTeamLeader) {
        // Fetch fresh team data to be sure about the professor field
        const { data: freshTeam, error: teamError } = await supabase
          .from('teams')
          .select('*')
          .eq('id', team.id)
          .single();
        
        if (teamError) {
          console.error('[ERROR] Erro ao buscar dados da equipe:', teamError);
          throw teamError;
        }

        // 1. Check if team already has a professor/leader defined in the teams table
        const hasProfessor = freshTeam.professor && freshTeam.professor.trim() !== '';
        console.log(`[LOG] Professor definido na tabela teams: ${hasProfessor ? freshTeam.professor : 'NÃO'}`);

        // 2. Check if there's already a user with team_leader = 'true' for this team
        const { count, error: checkError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id)
          .or('team_leader.eq.true,team_leader.eq.TRUE');

        if (checkError) {
          console.error('[ERROR] Erro ao verificar representantes:', checkError);
        }

        console.log(`[LOG] Usuários representantes encontrados: ${count || 0}`);

        if (hasProfessor || (count && count > 0)) {
          console.log(`[LOG] Conflito detectado para a equipe ${team.name}`);
          setConflictingTeamName(team.name);
          setSelectedTeamId(team.id); 
          setShowTeamConflictModal(true);
          return; // Stop here, modal will handle the rest
        }
      }

      // If not a leader OR no conflict found
      console.log(`[LOG] Equipe selecionada com sucesso.`);
      setSelectedTeamId(team.id);
      setTeamSearch(team.name);
      setTeamResults([]);
      
    } catch (err: any) {
      console.error('[ERROR] Erro ao selecionar equipe:', err);
      setError('Erro ao validar equipe. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTeamLeader = async (checked: boolean) => {
    if (checked && selectedTeamId) {
      // If user is trying to become a leader for an already selected team, validate now
      setLoading(true);
      try {
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('professor, name')
          .eq('id', selectedTeamId)
          .single();
        
        if (teamError) throw teamError;
        const hasProfessor = teamData.professor && teamData.professor.trim() !== '';

        const { count, error: checkError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', selectedTeamId)
          .or('team_leader.eq.true,team_leader.eq.TRUE');
        
        if (checkError) throw checkError;

        if (hasProfessor || (count && count > 0)) {
          setConflictingTeamName(teamData.name);
          setShowTeamConflictModal(true);
          // We don't set isTeamLeader to true yet, the modal will handle it
          return;
        }
      } catch (err) {
        console.error('Erro ao validar liderança:', err);
      } finally {
        setLoading(false);
      }
    }
    setIsTeamLeader(checked);
  };

  const handleContinueWithoutTeam = () => {
    setIsTeamLeader(false);
    // Keep the selectedTeamId so they can still join as an athlete
    setShowTeamConflictModal(false);
  };

  const handleCancelTeamSelection = () => {
    setSelectedTeamId(null);
    setTeamSearch('');
    setIsTeamLeader(false);
    setShowTeamConflictModal(false);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        // VALIDATION: If registering as team leader, MUST select a team
        if (isTeamLeader && !selectedTeamId) {
          setError('Para se cadastrar como representante, você deve selecionar uma equipe da lista.');
          setLoading(false);
          return;
        }

        // FINAL BACKEND-LIKE CHECK BEFORE SIGNUP
        if (isTeamLeader && selectedTeamId) {
          console.log(`[LOG] Verificação final de representantes da equipe ${selectedTeamId}`);
          
          // 1. Check teams table for professor
          const { data: teamData, error: teamError } = await supabase
            .from('teams')
            .select('professor, name')
            .eq('id', selectedTeamId)
            .single();
          
          if (teamError) throw teamError;
          const hasProfessor = teamData.professor && teamData.professor.trim() !== '';
          
          // 2. Check profiles table for existing representative user
          const { count, error: checkError } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', selectedTeamId)
            .or('team_leader.eq.true,team_leader.eq.TRUE');
          
          if (checkError) throw checkError;
          
          console.log(`[LOG] Resultado final: Professor=${hasProfessor}, Representantes=${count}`);
          
          if (hasProfessor || (count && count > 0)) {
            console.log(`[LOG] Bloqueando inserção automática - Equipe já tem líder ou professor`);
            setError(`A equipe ${teamData.name} já possui um representante oficial.`);
            setConflictingTeamName(teamData.name || teamSearch);
            setShowTeamConflictModal(true);
            setLoading(false);
            return;
          }
          console.log(`[LOG] Permitindo inserção - Vaga disponível`);
        }

        const { data: { user }, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        if (user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              username: username.toLowerCase(),
              full_name: fullName.toUpperCase(),
              role: 'athlete',
              team_leader: isTeamLeader ? 'true' : 'false',
              team_id: selectedTeamId,
              perfil_publico: true,
              permitir_seguidores: true
            });

          if (profileError) {
            // Handle the specific Trigger error
            if (profileError.message.includes('TEAM_HAS_REPRESENTATIVE')) {
              setError('Esta equipe já possui um representante. Por favor, revise sua seleção.');
              setShowTeamConflictModal(true);
            } else {
              throw profileError;
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4 transition-colors duration-300">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 bg-gradient-to-br from-[var(--primary)] to-blue-700 rounded-[2rem] mx-auto flex items-center justify-center shadow-[0_20px_50px_rgba(37,99,235,0.3)] border-4 border-white/10"
          >
            <Trophy size={48} className="text-white" />
          </motion.div>
          <div className="space-y-1">
            <h1 className="text-5xl font-black uppercase tracking-tighter text-[var(--text-main)] italic leading-none">
              Arena <span className="text-[var(--primary)]">Comp</span>
            </h1>
            <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-[0.4em] font-black">Official Platform</p>
          </div>
          <p className="text-[var(--text-muted)] text-xs font-medium max-w-[280px] mx-auto leading-relaxed">A maior rede social de atletas de esportes de combate do Brasil</p>
        </div>

        {/* Form */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-[var(--surface)] border border-[var(--border-ui)] p-8 rounded-3xl space-y-6 shadow-2xl backdrop-blur-xl transition-colors duration-300"
        >
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                  <input
                    type="text"
                    placeholder="Nome Completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[var(--bg)]/50 border border-[var(--border-ui)] rounded-2xl py-3 pl-12 pr-4 text-sm text-[var(--text-main)] focus:border-[var(--primary)] outline-none transition-all"
                    required
                  />
                </div>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[var(--bg)]/50 border border-[var(--border-ui)] rounded-2xl py-3 pl-12 pr-4 text-sm text-[var(--text-main)] focus:border-[var(--primary)] outline-none transition-all"
                    required
                  />
                </div>
                
                <div className="space-y-4 p-4 bg-[var(--bg)]/30 rounded-2xl border border-[var(--border-ui)]">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-[var(--primary)] tracking-widest">Selecione sua Equipe</p>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Buscar equipe..."
                        value={teamSearch}
                        onChange={(e) => searchTeams(e.target.value)}
                        className="w-full bg-[var(--bg)]/50 border border-[var(--border-ui)] rounded-xl py-2 px-4 text-xs text-[var(--text-main)] focus:border-[var(--primary)] outline-none transition-all"
                      />
                      {teamResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-[var(--surface)] border border-[var(--border-ui)] rounded-xl shadow-xl overflow-hidden">
                          {teamResults.map(team => (
                            <button
                              key={team.id}
                              type="button"
                              onClick={() => handleSelectTeam(team)}
                              className="w-full px-4 py-2 text-left text-xs hover:bg-[var(--primary)] hover:text-white transition-colors border-b border-[var(--border-ui)] last:border-0"
                            >
                              {team.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedTeamId && (
                      <div className="flex items-center gap-2 text-[10px] text-emerald-500 font-bold uppercase">
                        <CheckCircle2 size={12} />
                        Equipe selecionada com sucesso
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[var(--border-ui)]">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isTeamLeader ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-[var(--border-ui)] group-hover:border-[var(--primary)]'}`}>
                        {isTeamLeader && <CheckCircle2 size={14} className="text-white" />}
                      </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={isTeamLeader}
                          onChange={(e) => handleToggleTeamLeader(e.target.checked)}
                        />
                      <span className="text-xs font-bold text-[var(--text-main)] uppercase tracking-tight">Sou líder ou responsável por equipe</span>
                    </label>
                  </div>
                </div>
              </>
            )}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[var(--bg)]/50 border border-[var(--border-ui)] rounded-2xl py-3 pl-12 pr-4 text-sm text-[var(--text-main)] focus:border-[var(--primary)] outline-none transition-all"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[var(--bg)]/50 border border-[var(--border-ui)] rounded-2xl py-3 pl-12 pr-4 text-sm text-[var(--text-main)] focus:border-[var(--primary)] outline-none transition-all"
                required
              />
            </div>

            {error && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--primary)] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center space-x-2 hover:bg-[var(--primary-highlight)] transition-all disabled:opacity-50"
            >
              <span>{loading ? 'Processando...' : isLogin ? 'Entrar' : 'Criar Conta'}</span>
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          {!isAdminLogin && (
            <div className="text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-[10px] font-black uppercase tracking-widest transition-colors"
              >
                {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre'}
              </button>
            </div>
          )}
        </motion.div>

        {/* Team Conflict Modal */}
        <AnimatePresence>
          {showTeamConflictModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[var(--surface)] border border-[var(--border-ui)] p-8 rounded-3xl max-w-sm w-full space-y-6 shadow-2xl"
              >
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-rose-500/10 rounded-2xl mx-auto flex items-center justify-center text-rose-500">
                    <Trophy size={32} />
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-[var(--text-main)] italic">Equipe já representada</h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    A equipe <span className="text-[var(--primary)] font-bold">{conflictingTeamName}</span> já tem um representante. 
                    Caso você também seja representante dessa mesma equipe, encaminhe um e-mail solicitando a adição do seu nome como representante também dessa equipe.
                  </p>
                  <div className="pt-4 border-t border-[var(--border-ui)]">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-main)] mb-4">Deseja continuar o cadastro sem representar uma equipe?</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={handleContinueWithoutTeam}
                        className="bg-[var(--primary)] text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[var(--primary-highlight)] transition-all"
                      >
                        Continuar
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelTeamSelection}
                        className="bg-[var(--bg)] text-[var(--text-main)] border border-[var(--border-ui)] py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[var(--surface)] transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
