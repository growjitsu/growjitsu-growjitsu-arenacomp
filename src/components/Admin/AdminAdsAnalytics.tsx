import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, Users, MousePointer2, Percent, Calendar, 
  Map as MapIcon, Smartphone, Laptop, Globe, Info, 
  Download, Filter, RotateCcw, ChevronRight, PieChart as PieChartIcon,
  BarChart2, Activity, Globe2, User,
  Eye, Zap
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

interface AnalyticsData {
  summary: {
    total_clicks: number;
    unique_clicks: number;
    total_views: number;
  };
  daily: { date: string; count: number }[];
  devices: { device: string; count: number }[];
  os: { os: string; count: number }[];
  gender: { gender: string; count: number }[];
  locations: { city: string; country: string; count: number }[];
  topAds: { ad_id: string; count: number }[];
}

export const AdminAdsAnalytics: React.FC<{ adId?: string }> = ({ adId = 'all' }) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | 'all'>('30d');

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log(`[Analytics] Fetching data for period=${period}, adId=${adId}`);
      const response = await fetch(`/api/admin/ads/dashboard?period=${period}&adId=${adId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Analytics] Server error response:', errorText);
        try {
          const errorJson = JSON.parse(errorText);
          toast.error(`Erro do servidor: ${errorJson.error || response.statusText}`);
        } catch (e) {
          toast.error(`Erro HTTP ${response.status}: ${response.statusText}`);
        }
        return;
      }

      const json = await response.json();
      if (json.success) {
        setData(json);
      } else {
        toast.error('Erro ao carregar dados: ' + json.error);
      }
    } catch (error: any) {
      console.error('[Analytics] Fetch error:', error);
      toast.error(`Erro de conexão: ${error.message || 'Verifique sua internet'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period, adId]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-20 animate-pulse">
        <RotateCcw className="animate-spin text-blue-600 mb-4" />
        <p className="text-gray-500 uppercase tracking-widest text-xs font-bold">Carregando Inteligência...</p>
      </div>
    );
  }

  const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#ca8a04'];

  const ctr = data?.summary.total_views ? (data.summary.total_clicks / data.summary.total_views) * 100 : 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Header com Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 p-6 rounded-[24px] border border-white/10 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
            <Activity className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase italic tracking-tighter">Ads <span className="text-blue-500">Intelligence</span></h2>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Painel de métricas em tempo real</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-black/40 p-1.5 rounded-2xl border border-white/5">
          {(['today', '7d', '30d', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                period === p 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              {p === 'today' ? 'Hoje' : p === '7d' ? '7 Dias' : p === '30d' ? '30 Dias' : 'Tudo'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<MousePointer2 className="text-blue-500" />} 
          label="Total de Cliques" 
          value={data?.summary.total_clicks || 0} 
          trend="+12.5%" 
          color="blue"
        />
        <StatCard 
          icon={<Users className="text-purple-500" />} 
          label="Cliques Únicos" 
          value={data?.summary.unique_clicks || 0} 
          trend="+8.2%" 
          color="purple"
        />
        <StatCard 
          icon={<Eye className="text-amber-500" />} 
          label="Visualizações" 
          value={data?.summary.total_views || 0} 
          trend="+15.3%" 
          color="amber"
        />
        <StatCard 
          icon={<Percent className="text-emerald-500" />} 
          label="CTR Médio" 
          value={`${ctr.toFixed(2)}%`} 
          trend="+0.4%" 
          color="emerald"
        />
      </div>

      {/* Graphs Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-[32px] p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black uppercase italic tracking-widest text-white flex items-center">
              <TrendingUp size={16} className="mr-2 text-blue-500" />
              Desempenho Temporal
            </h3>
            <Download size={16} className="text-gray-600 hover:text-white cursor-pointer" />
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.daily}>
                <defs>
                  <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10 }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '10px', color: '#fff' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorClicks)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-[32px] p-8">
          <h3 className="text-sm font-black uppercase italic tracking-widest text-white mb-8 flex items-center">
            <Smartphone size={16} className="mr-2 text-purple-500" />
            Dispositivos
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.devices}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="device"
                >
                  {data?.devices.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {data?.devices.map((dev, i) => (
              <div key={dev.device} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-[10px] font-bold text-gray-400 capitalize">{dev.device}</span>
                </div>
                <span className="text-[10px] font-black text-white">{dev.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Localização */}
        <div className="bg-white/5 border border-white/10 rounded-[32px] p-8">
          <h3 className="text-sm font-black uppercase italic tracking-widest text-white mb-8 flex items-center">
            <Globe2 size={16} className="mr-2 text-emerald-500" />
            Origem Geográfica
          </h3>
          <div className="space-y-4">
            {data?.locations.map((loc, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                <div className="flex items-center">
                   <div className="p-2 bg-blue-500/10 rounded-xl mr-3">
                     <MapIcon size={14} className="text-blue-500" />
                   </div>
                   <div>
                     <p className="text-[11px] font-black text-white uppercase italic">{loc.city}</p>
                     <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{loc.country}</p>
                   </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-black text-white">{loc.count}</p>
                  <p className="text-[9px] font-bold text-emerald-500 uppercase">Top {i+1}</p>
                </div>
              </div>
            ))}
            {(!data?.locations || data.locations.length === 0) && (
              <p className="text-center text-gray-600 text-[10px] uppercase font-black py-8">Sem dados de localização</p>
            )}
          </div>
        </div>

        {/* Perfil Demográfico */}
        <div className="bg-white/5 border border-white/10 rounded-[32px] p-8">
          <h3 className="text-sm font-black uppercase italic tracking-widest text-white mb-8 flex items-center">
            <Users size={16} className="mr-2 text-pink-500" />
            Perfil Demográfico (Gênero)
          </h3>
          <div className="h-[250px] flex items-center justify-center">
            {data?.gender && data.gender.length > 0 ? (
              <div className="grid grid-cols-2 gap-12 w-full max-w-sm">
                {data.gender.map(g => (
                  <div key={g.gender} className="flex flex-col items-center space-y-4 p-6 bg-white/5 rounded-3xl border border-white/5">
                    <div className={`p-4 rounded-2xl ${g.gender?.toLowerCase() === 'masculino' ? 'bg-blue-500/20 text-blue-500' : 'bg-pink-500/20 text-pink-500'}`}>
                      {g.gender?.toLowerCase() === 'masculino' ? <Laptop size={32} /> : <Zap size={32} />}
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{g.gender}</p>
                      <p className="text-3xl font-black italic text-white">{g.count}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
               <div className="text-center space-y-4">
                 <div className="p-6 bg-white/5 rounded-3xl border border-white/5 inline-block">
                    <Info size={32} className="text-gray-700" />
                 </div>
                 <p className="text-[10px] uppercase font-black text-gray-600 tracking-widest">Inicie o tracking para ver o perfil</p>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, trend, color }: any) => {
  const colorMap: any = {
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20 shadow-blue-500/5',
    purple: 'text-purple-500 bg-purple-500/10 border-purple-500/20 shadow-purple-500/5',
    amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20 shadow-amber-500/5',
    emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/5',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 p-6 rounded-[32px] hover:border-white/20 transition-all group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl ${colorMap[color] || 'bg-white/5 text-white'}`}>
          {React.cloneElement(icon as React.ReactElement, { size: 20 })}
        </div>
        <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
          {trend}
        </span>
      </div>
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{label}</p>
      <h4 className="text-3xl font-black italic tracking-tighter text-white group-hover:text-blue-500 transition-colors">
        {value}
      </h4>
    </motion.div>
  );
};
