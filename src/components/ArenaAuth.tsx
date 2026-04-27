import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, Trophy, ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../services/supabase';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Logo } from './Logo';

interface ArenaAuthProps {
  isAdminLogin?: boolean;
}

export const ArenaAuth: React.FC<ArenaAuthProps> = ({ isAdminLogin = false }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [isTeamLeader, setIsTeamLeader] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamSearch, setTeamSearch] = useState('');
  const [teamResults, setTeamResults] = useState<any[]>([]);
  const [showTeamConflictModal, setShowTeamConflictModal] = useState(false);
  const [conflictingTeamName, setConflictingTeamName] = useState('');
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [newTeamData, setNewTeamData] = useState({ 
    name: '', 
    professor: '',
    country_id: '', 
    state_id: '', 
    city_id: '', 
    logo_url: '' 
  });
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  React.useEffect(() => {
    if (isCreatingTeam) {
      fetchCountries();
    }
  }, [isCreatingTeam]);

  const fetchCountries = async () => {
    const { data } = await supabase.from('countries').select('*').order('name');
    if (data) setCountries(data);
  };

  const fetchStates = async (countryId: string) => {
    const { data } = await supabase.from('states').select('*').eq('country_id', countryId).order('name');
    if (data) setStates(data);
    setCities([]);
    setNewTeamData(prev => ({ ...prev, country_id: countryId, state_id: '', city_id: '' }));
  };

  const fetchCities = async (stateId: string) => {
    const { data } = await supabase.from('cities').select('*').eq('state_id', stateId).order('name');
    if (data) setCities(data);
    setNewTeamData(prev => ({ ...prev, state_id: stateId, city_id: '' }));
  };

  const searchTeams = async (query: string) => {
    setTeamSearch(query);
    if (query.length < 2) {
      setTeamResults([]);
      return;
    }

    console.log("[LOG] Buscando equipes com query:", query);
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        countries(name),
        states(name),
        cities(name)
      `)
      .ilike('name', `%${query}%`)
      .limit(5);
    
    if (error) {
      console.error("[ERROR] Erro ao buscar equipes:", error);
    }

    console.log("[LOG] Resultado da busca de equipes:", data);
    
    if (!error && data) {
      // Fetch location names separately or assume they are not needed for the list
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
        // 1. Check if there's already a representative for this team in team_members table
        const { count, error: checkError } = await supabase
          .from('team_members')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id)
          .eq('role', 'representative');

        if (checkError) {
          console.error('[ERROR] Erro ao verificar representantes:', checkError);
        }

        const representativesCount = Number(count || 0);
        console.log("Team ID:", team.id);
        console.log("Representatives count:", representativesCount);

        if (representativesCount > 0) {
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
      setIsCreatingTeam(false);
      
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
        const { count, error: checkError } = await supabase
          .from('team_members')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', selectedTeamId)
          .eq('role', 'representative');
        
        if (checkError) throw checkError;

        const representativesCount = Number(count || 0);
        console.log("Team ID:", selectedTeamId);
        console.log("Representatives count:", representativesCount);

        if (representativesCount > 0) {
          const { data: teamData } = await supabase.from('teams').select('name').eq('id', selectedTeamId).single();
          setConflictingTeamName(teamData?.name || 'Equipe');
          setShowTeamConflictModal(true);
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
      console.log("[LOG] Submit iniciado");
      
      if (!isLogin) {
        if (email.toLowerCase() !== confirmEmail.toLowerCase()) {
          setError('Os e-mails não coincidem');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('As senhas não coincidem');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('A senha deve ter pelo menos 6 caracteres');
          setLoading(false);
          return;
        }
      }

      console.log("[LOG] isLogin:", isLogin);
      console.log("[LOG] isTeamLeader:", isTeamLeader);
      console.log("[LOG] selectedTeamId:", selectedTeamId);
      console.log("[LOG] isCreatingTeam:", isCreatingTeam);

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        // VALIDATION: If registering as team leader, MUST select or create a team
        if (isTeamLeader && !selectedTeamId && !isCreatingTeam) {
          console.log("[LOG] Validação falhou: Líder sem equipe selecionada");
          setError('Para se cadastrar como representante, você deve selecionar uma equipe ou cadastrar uma nova.');
          setLoading(false);
          return;
        }

        // FINAL BACKEND-LIKE CHECK BEFORE SIGNUP
        if (isTeamLeader && selectedTeamId && !isCreatingTeam) {
          console.log(`[LOG] Verificação final de representantes da equipe ${selectedTeamId}`);
          
          const { count, error: checkError } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', selectedTeamId)
            .eq('role', 'representative');
          
          if (checkError) {
            console.error('[ERROR] Erro na verificação final:', checkError);
            throw checkError;
          }
          
          const representativesCount = Number(count || 0);
          console.log("[LOG] Representantes encontrados:", representativesCount);
          
          if (representativesCount > 0) {
            const { data: teamData } = await supabase.from('teams').select('name').eq('id', selectedTeamId).single();
            console.log(`[LOG] Bloqueando inserção - Equipe já tem representante: ${teamData?.name}`);
            setError(`A equipe ${teamData?.name || ''} já possui um representante oficial.`);
            setConflictingTeamName(teamData?.name || teamSearch);
            setShowTeamConflictModal(true);
            setLoading(false);
            return;
          }
          console.log(`[LOG] Permitindo inserção - Vaga disponível`);
        }

        console.log('[LOG] Chamando supabase.auth.signUp');
        const { data, error: signUpError } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: fullName,
              username: username.toLowerCase()
            }
          }
        });
        
        if (signUpError) {
          console.error('[ERROR] Erro no signUp:', signUpError);
          throw signUpError;
        }
        
        const user = data.user;
        console.log('[LOG] Resultado do signUp:', { user: !!user, identities: user?.identities?.length });

        if (!user) {
          throw new Error('Erro ao criar usuário. Verifique se o email já está cadastrado.');
        }

        // Se o usuário foi criado mas não tem identidades, pode ser um usuário duplicado (com confirmação de email ativa)
        if (user && (!user.identities || user.identities.length === 0)) {
          throw new Error('Este email já está cadastrado ou aguardando confirmação.');
        }
        
        if (user) {
          let finalTeamId = selectedTeamId;

          // Part 4: Create new team if requested
          if (isCreatingTeam && newTeamData.name) {
            console.log('[LOG] Criando nova equipe:', newTeamData.name);
            
            // Validate required fields for new team
            if (!newTeamData.country_id || !newTeamData.state_id || !newTeamData.city_id) {
              throw new Error('Por favor, preencha todos os campos da equipe (País, Estado e Cidade).');
            }

            const { data: team, error: teamError } = await supabase
              .from('teams')
              .insert([{
                name: newTeamData.name.toUpperCase(),
                professor: newTeamData.professor.toUpperCase(),
                country_id: newTeamData.country_id,
                state_id: newTeamData.state_id,
                city_id: newTeamData.city_id,
                logo_url: newTeamData.logo_url
              }])
              .select()
              .single();
            
            if (teamError) {
              console.error('[ERROR] Erro ao criar equipe:', teamError);
              throw teamError;
            }
            finalTeamId = team.id;
            console.log('[LOG] Equipe criada com sucesso:', finalTeamId);
          }

          // Insert Profile
          console.log('[LOG] Inserindo perfil para o usuário:', user.id);
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              username: username.toLowerCase(),
              full_name: fullName.toUpperCase(),
              email: email.toLowerCase(),
              role: 'athlete',
              team_leader: isTeamLeader ? 'true' : 'false',
              team_id: finalTeamId,
              perfil_publico: true,
              permitir_seguidores: true,
              arena_score: 0,
              wins: 0,
              losses: 0,
              total_fights: 0,
              win_rate: 0
            });

          if (profileError) {
            console.error('[ERROR] Erro ao inserir perfil:', profileError);
            if (profileError.message.includes('TEAM_HAS_REPRESENTATIVE')) {
              setError('Esta equipe já possui um representante. Por favor, revise sua seleção.');
              setShowTeamConflictModal(true);
              setLoading(false);
              return;
            } else {
              throw profileError;
            }
          }
          console.log('[LOG] Perfil inserido com sucesso');

          // Synchronize with Firestore for validation
          try {
            const { data: teamData } = finalTeamId ? 
              await supabase.from('teams').select('name').eq('id', finalTeamId).single() : 
              { data: null };

            await setDoc(doc(db, "users", user.id), {
              uid: user.id,
              full_name: fullName.toUpperCase(),
              nickname: username.toLowerCase(),
              equipe: teamData?.name?.toUpperCase() || null,
              role: 'athlete',
              updated_at: new Date().toISOString()
            }, { merge: true });
            console.log('[FIREBASE] Perfil inicial sincronizado com Firestore');
          } catch (fsError) {
            console.error('[FIREBASE] Erro ao sincronizar perfil inicial:', fsError);
          }

          // Insert Team Member relationship
          if (finalTeamId) {
            console.log('[LOG] Vinculando usuário à equipe:', finalTeamId);
            const { error: memberError } = await supabase
              .from('team_members')
              .insert({
                team_id: finalTeamId,
                user_id: user.id,
                role: isTeamLeader ? 'representative' : 'member'
              });
            
            if (memberError) {
              console.error('[ERROR] Erro ao vincular equipe:', memberError);
              if (isTeamLeader) {
                throw new Error(`Usuário criado, mas houve um erro ao vincular como representante: ${memberError.message}`);
              }
            } else {
              console.log('[LOG] Vínculo de equipe criado com sucesso');
              
              // Se for líder, atualiza o professor da equipe para o nome do usuário
              if (isTeamLeader) {
                console.log('[LOG] Atualizando professor da equipe:', finalTeamId);
                const { error: teamUpdateError } = await supabase
                  .from('teams')
                  .update({ 
                    professor: fullName.toUpperCase() 
                  })
                  .eq('id', finalTeamId);
                
                if (teamUpdateError) {
                  console.error('[ERROR] Erro ao atualizar professor da equipe:', teamUpdateError);
                } else {
                  console.log('[LOG] Professor da equipe atualizado com sucesso');
                }
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error('[ERROR] Erro geral no handleAuth:', err);
      setError(err.message || 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // In some preview environments, window.location.origin might be localhost even if accessed via a public URL.
      // We try to ensure we use the most reliable path.
      const currentOrigin = window.location.origin;
      const redirectTo = `${currentOrigin}/reset-password`;
      
      console.log('[AUTH] Requesting password reset redirecting to:', redirectTo);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo,
      });
      if (error) throw error;
      setResetEmailSent(true);
    } catch (err: any) {
      console.error('[ERROR] Erro ao solicitar reset de senha:', err);
      setError(err.message || 'Ocorreu um erro ao enviar o e-mail de recuperação.');
    } finally {
      setLoading(false);
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

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    // Preview and fallback
    const reader = new FileReader();
    reader.onloadend = () => {
      // We can use this as a fallback if upload fails
    };
    reader.readAsDataURL(file);

    try {
      console.log("[LOG] Iniciando upload do logo:", filePath);
      const { error: uploadError } = await supabase.storage
        .from('team-logos')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        // Fallback to base64 if storage fails (e.g. bucket not found)
        setNewTeamData(prev => ({ ...prev, logo_url: reader.result as string }));
        console.log("[LOG] Usando fallback base64 devido a erro no storage");
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('team-logos')
          .getPublicUrl(filePath);

        console.log("[LOG] Upload realizado:", publicUrl);
        setNewTeamData(prev => ({ ...prev, logo_url: publicUrl }));
      }
    } catch (error) {
      console.error('[ERROR] Erro ao fazer upload do logo:', error);
      // Final fallback
      setNewTeamData(prev => ({ ...prev, logo_url: reader.result as string }));
      alert('Erro ao processar upload do logo. Usando versão local temporária.');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4 transition-colors duration-300">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center space-y-4">
          <Logo size={96} showText={true} className="flex-col !gap-4" />
          <p className="text-[var(--text-main)] opacity-60 text-xs font-medium max-w-[280px] mx-auto leading-relaxed">A maior rede social de atletas de esportes de combate do Brasil</p>
        </div>

        {/* Form */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-[var(--surface)] border border-[var(--border-ui)] p-8 rounded-3xl space-y-6 shadow-2xl backdrop-blur-xl transition-colors duration-300"
        >
          {isForgotPassword ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-black uppercase italic tracking-tight text-[var(--text-main)]">Recuperar Senha</h2>
                <p className="text-xs text-[var(--text-muted)] font-medium">Informe seu e-mail para receber as instruções de recuperação.</p>
              </div>

              {resetEmailSent ? (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl space-y-3"
                >
                  <div className="flex items-center space-x-2 text-emerald-500">
                    <CheckCircle2 size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">E-mail Enviado!</span>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] leading-relaxed font-medium">
                    Se o e-mail <span className="text-[var(--text-main)] font-bold">{email}</span> estiver cadastrado, você receberá um link para redefinir sua senha em instantes.
                  </p>
                  <button
                    onClick={() => {
                      setIsForgotPassword(false);
                      setResetEmailSent(false);
                    }}
                    className="w-full py-2 text-[var(--primary)] text-[9px] font-black uppercase tracking-widest hover:underline"
                  >
                    Voltar para o Login
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                    <input
                      type="email"
                      placeholder="Seu E-mail"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                    <span>{loading ? 'Processando...' : 'Enviar Link de Recuperação'}</span>
                    {!loading && <ArrowRight size={16} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(false)}
                    className="w-full py-2 text-[var(--text-main)] opacity-60 hover:opacity-100 text-[9px] font-black uppercase tracking-widest transition-colors"
                  >
                    Voltar para o Login
                  </button>
                </form>
              )}
            </div>
          ) : (
            <>
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
                
                {isTeamLeader && (
                  <div className="space-y-4 p-4 bg-[var(--bg)]/30 rounded-2xl border border-[var(--border-ui)]">
                  {!isCreatingTeam ? (
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
                                <div className="flex flex-col">
                                  <span className="font-bold">{team.name}</span>
                                  <span className="text-[9px] opacity-70">
                                    {team.cities?.name ? `${team.cities.name}, ${team.states?.name}` : 'Sem Localização'}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingTeam(true);
                          setSelectedTeamId(null);
                          setTeamSearch('');
                        }}
                        className="text-[9px] font-bold text-[var(--text-muted)] hover:text-[var(--primary)] uppercase tracking-widest transition-colors"
                      >
                        Não encontrou sua equipe? Cadastre uma nova
                      </button>
                      {selectedTeamId && (
                        <div className="flex items-center gap-2 text-[10px] text-emerald-500 font-bold uppercase">
                          <CheckCircle2 size={12} />
                          Equipe selecionada com sucesso
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase text-[var(--primary)] tracking-widest">Cadastrar Nova Equipe</p>
                        <button
                          type="button"
                          onClick={() => setIsCreatingTeam(false)}
                          className="text-[9px] font-bold text-rose-500 uppercase"
                        >
                          Cancelar
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Nome da Equipe"
                        value={newTeamData.name}
                        onChange={(e) => setNewTeamData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-[var(--bg)]/50 border border-[var(--border-ui)] rounded-xl py-2 px-4 text-xs text-[var(--text-main)] outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Professor Responsável"
                        value={newTeamData.professor}
                        onChange={(e) => setNewTeamData(prev => ({ ...prev, professor: e.target.value }))}
                        className="w-full bg-[var(--bg)]/50 border border-[var(--border-ui)] rounded-xl py-2 px-4 text-xs text-[var(--text-main)] outline-none"
                      />
                      
                      <div className="space-y-2">
                        <select
                          value={newTeamData.country_id}
                          onChange={(e) => fetchStates(e.target.value)}
                          className="w-full bg-[var(--bg)]/50 border border-[var(--border-ui)] rounded-xl py-2 px-4 text-xs text-[var(--text-main)] outline-none"
                        >
                          <option value="">Selecionar País</option>
                          {countries.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>

                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={newTeamData.state_id}
                            onChange={(e) => fetchCities(e.target.value)}
                            disabled={!newTeamData.country_id}
                            className="w-full bg-[var(--bg)]/50 border border-[var(--border-ui)] rounded-xl py-2 px-4 text-xs text-[var(--text-main)] outline-none disabled:opacity-50"
                          >
                            <option value="">{newTeamData.country_id ? (states.length === 0 ? 'Carregando...' : 'Estado') : 'Selecione o País'}</option>
                            {states.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>

                          <select
                            value={newTeamData.city_id}
                            onChange={(e) => setNewTeamData(prev => ({ ...prev, city_id: e.target.value }))}
                            disabled={!newTeamData.state_id}
                            className="w-full bg-[var(--bg)]/50 border border-[var(--border-ui)] rounded-xl py-2 px-4 text-xs text-[var(--text-main)] outline-none disabled:opacity-50"
                          >
                            <option value="">{newTeamData.state_id ? (cities.length === 0 ? 'Nenhuma cidade' : 'Cidade') : 'Selecione o Estado'}</option>
                            {cities.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[var(--bg)] border border-[var(--border-ui)] flex items-center justify-center overflow-hidden">
                          {newTeamData.logo_url ? (
                            <img src={newTeamData.logo_url} alt="Logo" className="w-full h-full object-contain" />
                          ) : (
                            <Logo size={24} variant="icon" />
                          )}
                        </div>
                        <label className="flex-1 cursor-pointer">
                          <div className="bg-[var(--bg)] border border-[var(--border-ui)] rounded-lg py-2 px-3 text-[9px] font-black uppercase text-center hover:bg-[var(--surface)] transition-all">
                            Upload Logo
                          </div>
                          <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

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
              </>
            )}
            <div className="space-y-4">
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

              {!isLogin && (
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                  <input
                    type="email"
                    placeholder="Confirmar e-mail"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    className={`w-full bg-[var(--bg)]/50 border ${confirmEmail && email.toLowerCase() !== confirmEmail.toLowerCase() ? 'border-rose-500' : 'border-[var(--border-ui)]'} rounded-2xl py-3 pl-12 pr-4 text-sm text-[var(--text-main)] focus:border-[var(--primary)] outline-none transition-all`}
                    required
                  />
                  {confirmEmail && email.toLowerCase() !== confirmEmail.toLowerCase() && (
                    <p className="text-[10px] text-rose-500 mt-1 ml-4 font-bold uppercase tracking-widest">Os e-mails não coincidem</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[var(--bg)]/50 border border-[var(--border-ui)] rounded-2xl py-3 pl-12 pr-12 text-sm text-[var(--text-main)] focus:border-[var(--primary)] outline-none transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {isLogin && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setError(null);
                    }}
                    className="text-[var(--text-main)] opacity-60 hover:opacity-100 text-[10px] font-bold uppercase tracking-tight transition-colors"
                  >
                    Esqueci minha senha?
                  </button>
                </div>
              )}

              {!isLogin && (
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirmar senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full bg-[var(--bg)]/50 border ${confirmPassword && password !== confirmPassword ? 'border-rose-500' : 'border-[var(--border-ui)]'} rounded-2xl py-3 pl-12 pr-12 text-sm text-[var(--text-main)] focus:border-[var(--primary)] outline-none transition-all`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-[10px] text-rose-500 mt-1 ml-4 font-bold uppercase tracking-widest">As senhas não coincidem</p>
                  )}
                </div>
              )}
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
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                  setIsForgotPassword(false);
                }}
                className="text-[var(--text-main)] opacity-60 hover:opacity-100 text-[10px] font-black uppercase tracking-widest transition-colors"
              >
                {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre'}
              </button>
            </div>
          )}
        </>
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
                  <div className="w-16 h-16 bg-rose-500/10 rounded-2xl mx-auto flex items-center justify-center text-rose-500 overflow-hidden">
                    <Logo size={40} variant="icon" />
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
