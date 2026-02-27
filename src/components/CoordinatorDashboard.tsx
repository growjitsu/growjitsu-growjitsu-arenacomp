import { useState, useEffect } from 'react';
import { Trophy, Users, Plus, Filter, Search, ChevronRight, Download, Calendar, MapPin, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../services/supabase';

export default function CoordinatorDashboard() {
  const [stats, setStats] = useState({
    totalAthletes: 0,
    activeChamps: 0,
    pendingRegs: 0
  });
  const [recentRegs, setRecentRegs] = useState<any[]>([]);
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch Stats
      const { count: athletesCount } = await supabase.from('atletas').select('*', { count: 'exact', head: true });
      const { count: champsCount } = await supabase.from('championships').select('*', { count: 'exact', head: true }).eq('organizer_id', user.id);
      const { count: pendingCount } = await supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('status', 'Pendente');

      setStats({
        totalAthletes: athletesCount || 0,
        activeChamps: champsCount || 0,
        pendingRegs: pendingCount || 0
      });

      // Fetch Recent Registrations
      const { data: regs } = await supabase
        .from('registrations')
        .select('*, atletas(usuarios(nome), faixa)')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (regs) setRecentRegs(regs);

      // Fetch My Events
      const { data: events } = await supabase
        .from('championships')
        .select('*')
        .eq('organizer_id', user.id)
        .limit(3);
      
      if (events) setMyEvents(events);

      setLoading(false);
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-bjj-purple" size={40} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black font-display tracking-tight text-[var(--text-main)]">Painel do Organizador</h2>
          <p className="text-[var(--text-muted)]">Gestão de eventos, atletas e categorias automáticas.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-outline">
            <Download size={18} />
            Exportar Dados
          </button>
          <button className="btn-primary bg-bjj-purple hover:bg-bjj-purple/90 border-none">
            <Plus size={18} />
            Novo Campeonato
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-surface p-6 bg-bjj-purple text-white">
          <p className="text-xs font-bold uppercase opacity-70">Total de Atletas</p>
          <h3 className="text-4xl font-black mt-1">{stats.totalAthletes.toLocaleString()}</h3>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold">
            <span className="bg-white/20 px-2 py-1 rounded">Base de dados real</span>
          </div>
        </div>
        <div className="card-surface p-6">
          <p className="text-xs font-bold uppercase text-[var(--text-muted)]">Meus Campeonatos</p>
          <h3 className="text-4xl font-black mt-1 text-[var(--text-main)]">{stats.activeChamps.toString().padStart(2, '0')}</h3>
          <p className="text-xs text-emerald-500 font-bold mt-4">Eventos sob sua gestão</p>
        </div>
        <div className="card-surface p-6">
          <p className="text-xs font-bold uppercase text-[var(--text-muted)]">Inscrições Pendentes</p>
          <h3 className="text-4xl font-black mt-1 text-[var(--text-main)]">{stats.pendingRegs}</h3>
          <p className="text-xs text-amber-500 font-bold mt-4">Aguardando confirmação</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Athletes Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold font-display text-[var(--text-main)]">Inscritos Recentes</h3>
          </div>

          <div className="card-surface overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-[var(--border-ui)] text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                <tr>
                  <th className="px-6 py-4">Atleta</th>
                  <th className="px-6 py-4">Faixa</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-ui)]">
                {recentRegs.length > 0 ? recentRegs.map((reg) => (
                  <AthleteRow 
                    key={reg.id}
                    name={reg.atletas?.usuarios?.nome || 'Atleta'} 
                    belt={reg.atletas?.faixa || 'Branca'} 
                    category={reg.category} 
                    status={reg.status} 
                  />
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-[var(--text-muted)] italic">
                      Nenhuma inscrição recente encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Active Championships */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold font-display text-[var(--text-main)]">Meus Eventos</h3>
          <div className="space-y-4">
            {myEvents.length > 0 ? myEvents.map((event) => (
              <MiniEventCard 
                key={event.id}
                name={event.name} 
                date={new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} 
                athletes={0} // Precisaria de um count separado
              />
            )) : (
              <p className="text-sm text-[var(--text-muted)] italic">Você ainda não criou eventos.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AthleteRow({ name, belt, category, status }: any) {
  return (
    <tr className="hover:bg-[var(--border-ui)]/30 transition-colors group">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--border-ui)]" />
          <span className="font-bold text-sm text-[var(--text-main)]">{name}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
          belt === 'Azul' ? 'bg-blue-600 text-white' : 
          belt === 'Roxa' ? 'bg-purple-600 text-white' : 
          belt === 'Preta' ? 'bg-zinc-900 text-white' : 'bg-white text-black border border-zinc-200'
        }`}>
          {belt}
        </span>
      </td>
      <td className="px-6 py-4 text-xs font-bold text-[var(--text-muted)]">{category}</td>
      <td className="px-6 py-4">
        <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
          status === 'Confirmado' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
        }`}>
          {status}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <button className="p-1 text-[var(--text-muted)] hover:text-bjj-blue transition-colors">
          <ChevronRight size={18} />
        </button>
      </td>
    </tr>
  );
}

function MiniEventCard({ name, date, athletes }: any) {
  return (
    <div className="card-surface p-4 flex items-center justify-between hover:border-bjj-blue/30 transition-colors cursor-pointer">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--border-ui)] flex items-center justify-center text-bjj-blue">
          <Trophy size={20} />
        </div>
        <div>
          <h5 className="text-sm font-bold text-[var(--text-main)]">{name}</h5>
          <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase">{date} • {athletes} Inscritos</p>
        </div>
      </div>
      <ChevronRight size={16} className="text-[var(--text-muted)]" />
    </div>
  );
}
