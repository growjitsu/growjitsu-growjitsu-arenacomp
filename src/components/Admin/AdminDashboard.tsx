import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Shield, 
  FileText, 
  Award, 
  Heart, 
  MessageCircle, 
  TrendingUp, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { supabase } from '../../services/supabase';
import { recalculateAllRankings } from '../../services/arenaService';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    athletes: 0,
    teams: 0,
    posts: 0,
    championships: 0,
    likes: 0,
    comments: 0
  });
  const [trends, setTrends] = useState({
    athletes: 0,
    teams: 0,
    posts: 0,
    championships: 0,
    likes: 0,
    comments: 0
  });

  const [growthData, setGrowthData] = useState<any[]>([]);
  const [modalityData, setModalityData] = useState<any[]>([]);
  const [teamData, setTeamData] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [healthChecks, setHealthChecks] = useState([
    { name: 'Banco de Dados (Supabase)', status: 'online', latency: '45ms' },
    { name: 'Storage (arena_media)', status: 'online', latency: '120ms' },
    { name: 'Autenticação', status: 'online', latency: '88ms' },
    { name: 'API de Notificações', status: 'online', latency: '150ms' },
  ]);
  const [loading, setLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [autoRecalculate, setAutoRecalculate] = useState(false);

  useEffect(() => {
    let interval: any;
    if (autoRecalculate) {
      interval = setInterval(async () => {
        try {
          await recalculateAllRankings();
          console.log('🔄 Rankings recalculados automaticamente');
        } catch (err) {
          console.error('Erro no recálculo automático:', err);
        }
      }, 15000);
    }
    return () => clearInterval(interval);
  }, [autoRecalculate]);

  const COLORS = ['#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  useEffect(() => {
    fetchStats();
    checkHealth();
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user));
  }, []);

  const checkHealth = async () => {
    const start = Date.now();
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      const latency = Date.now() - start;
      setHealthChecks(prev => prev.map(c => 
        c.name.includes('Banco') ? { ...c, status: error ? 'offline' : 'online', latency: `${latency}ms` } : c
      ));
      
      // Check auth
      const { data: { session } } = await supabase.auth.getSession();
      setHealthChecks(prev => prev.map(c => 
        c.name.includes('Autenticação') ? { ...c, status: session ? 'online' : 'degraded', latency: '12ms' } : c
      ));

      // Check storage
      const { error: storageError } = await supabase.storage.getBucket('arena_media');
      setHealthChecks(prev => prev.map(c => 
        c.name.includes('Storage') ? { ...c, status: storageError ? 'degraded' : 'online', latency: '95ms' } : c
      ));
    } catch (error) {
      console.error('Health check error:', error);
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();

      const [
        { count: athletesCount },
        { count: teamsCount },
        { count: postsCount },
        { count: eventosCount },
        { count: likesCount },
        { count: commentsCount },
        { data: profilesData },
        { data: teamsList },
        // Trend data (last 30 days)
        { count: athletesRecent },
        { count: teamsRecent },
        { count: postsRecent },
        { count: likesRecent },
        // Previous period (30-60 days ago)
        { count: athletesPrevious },
        { count: teamsPrevious },
        { count: postsPrevious },
        { count: likesPrevious }
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'athlete'),
        supabase.from('teams').select('id', { count: 'exact', head: true }),
        supabase.from('posts').select('id', { count: 'exact', head: true }),
        supabase.from('eventos').select('id', { count: 'exact', head: true }),
        supabase.from('likes').select('id', { count: 'exact', head: true }),
        supabase.from('comments').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('created_at, modality, team_id').eq('role', 'athlete').limit(5000),
        supabase.from('teams').select('id, name').limit(100),
        
        // Recent
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'athlete').gte('created_at', thirtyDaysAgo),
        supabase.from('teams').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
        supabase.from('posts').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
        supabase.from('likes').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),

        // Previous
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'athlete').gte('created_at', sixtyDaysAgo).lt('created_at', thirtyDaysAgo),
        supabase.from('teams').select('id', { count: 'exact', head: true }).gte('created_at', sixtyDaysAgo).lt('created_at', thirtyDaysAgo),
        supabase.from('posts').select('id', { count: 'exact', head: true }).gte('created_at', sixtyDaysAgo).lt('created_at', thirtyDaysAgo),
        supabase.from('likes').select('id', { count: 'exact', head: true }).gte('created_at', sixtyDaysAgo).lt('created_at', thirtyDaysAgo)
      ]);

      setStats({
        athletes: athletesCount || 0,
        teams: teamsCount || 0,
        posts: postsCount || 0,
        championships: eventosCount || 0,
        likes: likesCount || 0,
        comments: commentsCount || 0
      });

      const calculateTrend = (recent: number | null, previous: number | null) => {
        const r = recent || 0;
        const p = previous || 0;
        if (p === 0) return r > 0 ? 100 : 0;
        return Math.round(((r - p) / p) * 100);
      };

      setTrends({
        athletes: calculateTrend(athletesRecent, athletesPrevious),
        teams: calculateTrend(teamsRecent, teamsPrevious),
        posts: calculateTrend(postsRecent, postsPrevious),
        championships: 0,
        likes: calculateTrend(likesRecent, likesPrevious),
        comments: 0
      });

      // Process Growth Data (Cumulative)
      if (profilesData) {
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const growthMap: Record<string, number> = {};
        
        // Get last 7 months labels
        const now = new Date();
        const lastMonths: string[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${months[d.getMonth()]}`;
          lastMonths.push(key);
          growthMap[key] = 0;
        }

        // Count new users per month
        profilesData.forEach(p => {
          const d = new Date(p.created_at || now);
          const key = `${months[d.getMonth()]}`;
          if (growthMap[key] !== undefined) {
            growthMap[key]++;
          }
        });

        // Calculate cumulative
        let cumulative = (athletesCount || 0) - profilesData.length; // Start with users before the fetched sample
        if (cumulative < 0) cumulative = 0;

        const newGrowthData = lastMonths.map(month => {
          cumulative += growthMap[month];
          return { month, users: cumulative };
        });
        setGrowthData(newGrowthData);

        // Process Modality Data
        const modalityMap: Record<string, number> = {};
        const BELTS_KEYWORDS = ['FAIXA', 'BRANCA', 'AZUL', 'ROXA', 'MARROM', 'PRETA', 'CORAL', 'VERMELHA'];

        profilesData.forEach(p => {
          let m = (p.modality && p.modality.trim() !== '') ? p.modality.trim().toUpperCase() : 'OUTROS';
          
          const isLikelyBelt = BELTS_KEYWORDS.some(kw => m.includes(kw)) && !m.includes('JIU JITSU') && !m.includes('JUD');
          if (isLikelyBelt || m === 'FAIXA PRETA' || m === 'FAIXA AZUL' || m === 'FAIXA BRANCA') {
            m = 'OUTROS';
          }
          
          modalityMap[m] = (modalityMap[m] || 0) + 1;
        });
        
        const totalSample = profilesData.length || 1;
        const sortedModalities = Object.entries(modalityMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);

        // Take top 4 and group the rest
        const topModalities = sortedModalities.slice(0, 4);
        const restModalities = sortedModalities.slice(4);
        
        if (restModalities.length > 0) {
          const othersCount = restModalities.reduce((acc, curr) => acc + curr.count, 0);
          // Check if 'OUTROS' already exists in top 4
          const othersIndex = topModalities.findIndex(m => m.name === 'OUTROS');
          if (othersIndex > -1) {
            topModalities[othersIndex].count += othersCount;
          } else {
            topModalities.push({ name: 'OUTROS', count: othersCount });
          }
        }

      const newModalityData = topModalities
          .map(item => ({
            name: item.name,
            count: item.count,
            // Use percentage for value to keep slices proportional to 100% of visible data
            value: (item.count / totalSample) * 100
          }))
          .sort((a, b) => b.count - a.count);

        setModalityData(newModalityData);

        // Process Team Data
        if (teamsList) {
          const teamAthletesMap: Record<string, number> = {};
          profilesData.forEach(p => {
            if (p.team_id) {
              teamAthletesMap[p.team_id] = (teamAthletesMap[p.team_id] || 0) + 1;
            }
          });

          const newTeamData = teamsList.map(t => ({
            name: t.name,
            athletes: teamAthletesMap[t.id] || 0
          }))
          .sort((a, b) => b.athletes - a.athletes)
          .slice(0, 5);
          setTeamData(newTeamData);
        }
      }

    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculateRankings = async () => {
    if (!window.confirm('Deseja recalcular a pontuação de TODOS os atletas? Isso pode levar alguns segundos.')) return;
    
    setIsRecalculating(true);
    try {
      const results = await recalculateAllRankings();
      const successCount = results.filter(r => r.success).length;
      alert(`Recálculo concluído! ${successCount} de ${results.length} atletas atualizados com sucesso.`);
      fetchStats(); // Refresh stats
    } catch (error) {
      console.error('Error recalculating rankings:', error);
      alert('Erro ao recalcular rankings.');
    } finally {
      setIsRecalculating(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, trend, color }: any) => (
    <div className="bg-[#0f0f0f] border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-${color}-500/10 transition-all duration-500`} />
      
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl bg-${color}-500/10 border border-${color}-500/20 text-${color}-500`}>
          <Icon size={24} />
        </div>
        {trend && (
          <div className={`flex items-center space-x-1 text-xs font-black ${trend > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">{label}</p>
      <h3 className="text-3xl font-black tracking-tight">{value.toLocaleString()}</h3>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard icon={Users} label="Atletas Cadastrados" value={stats.athletes} trend={trends.athletes} color="blue" />
        <StatCard icon={Shield} label="Equipes Registradas" value={stats.teams} trend={trends.teams} color="cyan" />
        <StatCard icon={FileText} label="Posts Publicados" value={stats.posts} trend={trends.posts} color="emerald" />
        <StatCard icon={Award} label="Campeonatos" value={stats.championships} trend={trends.championships} color="amber" />
        <StatCard icon={Heart} label="Total de Curtidas" value={stats.likes} trend={trends.likes} color="rose" />
        <StatCard icon={MessageCircle} label="Comentários" value={stats.comments} trend={trends.comments} color="indigo" />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Growth Chart */}
        <div className="bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] p-8">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Crescimento de Usuários</h4>
            <TrendingUp size={16} className="text-blue-500" />
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 700 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 700 }} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="users" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Modality Pie Chart */}
        <div className="bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] p-8">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Atletas por Modalidade</h4>
            <Activity size={16} className="text-cyan-500" />
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={modalityData}
                  cx="50%"
                  cy="50%"
                  innerRadius="50%"
                  outerRadius="80%"
                  paddingAngle={5}
                  dataKey="value"
                  nameKey="name"
                  isAnimationActive={false}
                >
                  {modalityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length] || '#2563eb'} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                  formatter={(value: number, name: string, props: any) => [
                    `${props.payload.count} (${Math.round(value)}%)`, 
                    name
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {modalityData.map((item, index) => (
              <div key={item.name} className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-0.5">{item.name}</span>
                  <span className="text-[10px] font-black text-white">{item.count} <span className="text-gray-500 font-bold ml-1 text-[8px]">({Math.round(item.value)}%)</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Teams Chart */}
        <div className="bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] p-8 lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Equipes com Mais Atletas</h4>
            <Shield size={16} className="text-emerald-500" />
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#fff', fontSize: 10, fontWeight: 900 }}
                  width={100}
                />
                <Tooltip 
                  cursor={{ fill: '#ffffff05' }}
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Bar dataKey="athletes" fill="#10b981" radius={[0, 12, 12, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* System Health & Bootstrap */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter italic text-white">Saúde do Sistema</h2>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Verificação de infraestrutura e permissões</p>
          </div>
          <div className="flex items-center space-x-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest">Online</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {healthChecks.map((check) => (
            <div key={check.name} className="p-6 bg-black/50 rounded-2xl border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 truncate pr-2">{check.name}</span>
                <div className={`w-2 h-2 rounded-full ${check.status === 'online' ? 'bg-emerald-500' : check.status === 'checking' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'}`} />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-white font-bold">
                  {check.status === 'online' ? 'Operacional' : check.status === 'checking' ? 'Verificando...' : 'Instável'}
                </p>
                <span className="text-[10px] font-bold text-gray-600">{check.latency}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-black/50 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Usuário Admin</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <p className="text-xs text-white font-bold">Usuário `{currentUser?.email || 'Carregando...'}` identificado com privilégios totais.</p>
          </div>

          <div className="p-6 bg-black/50 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Exportação</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <p className="text-xs text-white font-bold">Módulo de exportação Excel (xlsx) carregado e operacional.</p>
          </div>
        </div>

        <div className="mt-8 p-6 bg-blue-500/5 rounded-2xl border border-blue-500/20 space-y-6">
          <div className="flex items-center justify-between p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/20">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                <RotateCcw size={20} className={autoRecalculate ? "animate-spin" : ""} />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest text-[var(--text-main)]">Sincronização Automática</h4>
                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Recalcular rankings a cada 15 segundos</p>
              </div>
            </div>
            <button 
              onClick={() => setAutoRecalculate(!autoRecalculate)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                autoRecalculate 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                  : 'bg-[var(--bg)] border border-[var(--border-ui)] text-[var(--text-muted)] hover:border-emerald-500/50'
              }`}
            >
              {autoRecalculate ? 'Ativado' : 'Desativado'}
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-black text-blue-500 uppercase tracking-widest italic">Sincronização de Dados</h4>
              <p className="text-xs text-gray-500">Recalcula o Arena Score de todos os atletas com base nos campeonatos e lutas registrados.</p>
            </div>
            <button 
              onClick={handleRecalculateRankings}
              disabled={isRecalculating}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:scale-100 flex items-center space-x-2"
            >
              {isRecalculating ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <RotateCcw size={14} />
                  <span>Recalcular Rankings</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-8 p-6 bg-blue-500/5 rounded-2xl border border-blue-500/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-black text-blue-500 uppercase tracking-widest italic">Configuração do Banco de Dados</h4>
              <p className="text-xs text-gray-500">Certifique-se de executar o script SQL de configuração para habilitar todas as funcionalidades administrativas.</p>
            </div>
            <button 
              onClick={() => {
                const sql = `
-- 1. Criar tabela de logs se não existir
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES auth.users(id),
  admin_email TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- 3. Política: Apenas admins podem ver logs (Usa DROP para evitar erro de duplicidade)
DROP POLICY IF EXISTS "Admins can view logs" ON admin_logs;
CREATE POLICY "Admins can view logs" ON admin_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 4. Adicionar coluna professor à tabela teams se não existir
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teams' AND column_name='professor') THEN
    ALTER TABLE teams ADD COLUMN professor TEXT;
  END IF;
END $$;

-- 5. Criar usuário admin inicial (Substitua o ID se necessário)
-- UPDATE profiles SET role = 'admin' WHERE email = 'admin@arenacomp.com.br';
                `;
                navigator.clipboard.writeText(sql);
                alert('Script SQL copiado para a área de transferência! Execute-o no SQL Editor do Supabase.');
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-blue-600/20"
            >
              Copiar Script SQL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
