import { useState, useEffect } from 'react';
import { Trophy, Users, Plus, Filter, Search, ChevronRight, Download, Calendar, MapPin, Loader2, Clock, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../services/supabase';
import { Evento } from '../types';
import EventRequestWizard from './EventRequestWizard';

interface CoordinatorDashboardProps {
  onEventClick?: (eventId: string) => void;
}

export default function CoordinatorDashboard({ onEventClick }: CoordinatorDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [stats, setStats] = useState({
    totalAthletes: 0,
    activeChamps: 0,
    pendingRegs: 0
  });
  const [recentRegistrations, setRecentRegistrations] = useState<any[]>([]);
  const [myEvents, setMyEvents] = useState<Evento[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Fetch Stats
      const { data: myChamps } = await supabase.from('eventos').select('id').eq('coordenador_id', session.user.id);
      const champIds = myChamps?.map(c => c.id) || [];

      let athletesCount = 0;
      let pendingRegsCount = 0;

      if (champIds.length > 0) {
        const { data: uniqueAthletes } = await supabase
          .from('inscricoes')
          .select('atleta_id')
          .in('evento_id', champIds);
        
        const uniqueIds = new Set(uniqueAthletes?.map(a => a.atleta_id));
        athletesCount = uniqueIds.size;

        const { count: pendingCount } = await supabase
          .from('inscricoes')
          .select('*', { count: 'exact', head: true })
          .in('evento_id', champIds)
          .eq('status_pagamento', 'pendente');
        
        pendingRegsCount = pendingCount || 0;
      }

      const { count: activeChampsCount } = await supabase
        .from('eventos')
        .select('*', { count: 'exact', head: true })
        .eq('coordenador_id', session.user.id)
        .eq('status', 'aberto');

      setStats({
        totalAthletes: athletesCount,
        activeChamps: activeChampsCount || 0,
        pendingRegs: pendingRegsCount
      });

      // 2. Fetch Recent Registrations
      const { data: regs } = await supabase
        .from('inscricoes')
        .select('*, atletas(*, usuarios(nome, foto_url)), eventos(nome)')
        .in('evento_id', champIds)
        .order('created_at', { ascending: false })
        .limit(5);
      
      setRecentRegistrations(regs || []);

      // 3. Fetch My Events
      const { data: events } = await supabase
        .from('eventos')
        .select('*')
        .eq('coordenador_id', session.user.id)
        .order('data', { ascending: true });
      
      setMyEvents(events || []);

    } catch (err) {
      console.error('Erro ao carregar dados do coordenador:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = () => {
    if (myEvents.length === 0) {
      alert('Nenhum campeonato para exportar.');
      return;
    }

    const headers = ['ID', 'Nome', 'Data', 'Localização', 'Status'];
    const csvRows = [
      headers.join(','),
      ...myEvents.map(event => [
        event.id,
        `"${event.name}"`,
        event.date,
        `"${event.location}"`,
        event.status
      ].join(','))
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `campeonatos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-bjj-purple" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black font-display tracking-tight text-[var(--text-main)]">Painel do Coordenador</h2>
          <p className="text-[var(--text-muted)]">Gestão de eventos, atletas e categorias automáticas.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleExportData}
            className="btn-outline flex items-center gap-2"
          >
            <Download size={18} />
            Exportar Dados
          </button>
          <button 
            onClick={() => setIsWizardOpen(true)}
            className="btn-primary bg-bjj-purple hover:bg-bjj-purple/90 border-bjj-purple flex items-center gap-2"
          >
            <Plus size={18} />
            Novo Campeonato
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-surface p-6 bg-bjj-purple text-white">
          <p className="text-xs font-bold uppercase opacity-70">Total de Atletas</p>
          <h3 className="text-4xl font-black mt-1">{stats.totalAthletes}</h3>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold">
            <span className="bg-white/20 px-2 py-1 rounded">Base de dados real</span>
          </div>
        </div>
        <div className="card-surface p-6">
          <p className="text-xs font-bold uppercase text-[var(--text-muted)]">Campeonatos Ativos</p>
          <h3 className="text-4xl font-black mt-1 text-[var(--text-main)]">{stats.activeChamps.toString().padStart(2, '0')}</h3>
          <p className="text-xs text-emerald-500 font-bold mt-4">Eventos com inscrições abertas</p>
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
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                <input 
                  placeholder="Buscar atleta..." 
                  className="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-lg py-2 pl-10 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-bjj-purple text-[var(--text-main)] dark:text-white dark:placeholder-zinc-400"
                />
              </div>
              <button className="p-2 border border-[var(--border-ui)] rounded-lg hover:bg-[var(--border-ui)] transition-colors dark:bg-zinc-800 dark:border-zinc-700 dark:text-white hover:dark:bg-zinc-700">
                <Filter size={18} />
              </button>
            </div>
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
                {recentRegistrations.length > 0 ? (
                  recentRegistrations.map(reg => (
                    <AthleteRow 
                      key={reg.id}
                      name={reg.atletas?.usuarios?.nome} 
                      photo={reg.atletas?.usuarios?.foto_url}
                      belt={reg.atletas?.faixa} 
                      category={reg.faixa} 
                      status={reg.status_pagamento === 'pago' ? 'Confirmado' : 'Pendente'} 
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-[var(--text-muted)] italic text-sm">
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
            {myEvents.length > 0 ? (
              myEvents.map(event => (
                <MiniEventCard 
                  key={event.id}
                  name={event.nome} 
                  date={new Date(event.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} 
                  athletes={0} // This would need another count query per event for full accuracy
                  onClick={() => onEventClick?.(event.id)}
                />
              ))
            ) : (
              <div className="card-surface p-6 text-center text-[var(--text-muted)] text-sm italic">
                Você ainda não criou nenhum evento.
              </div>
            )}
          </div>
          
          <div className="card-surface p-6 bg-gradient-to-br from-bjj-purple/10 to-transparent border-bjj-purple/20">
            <h4 className="font-bold text-bjj-purple mb-2">Regra de Categorização</h4>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              O sistema calcula automaticamente a idade competitiva baseada no ano de nascimento ({new Date().getFullYear()} - Ano Nasc).
            </p>
            <button className="mt-4 text-xs font-bold text-bjj-purple hover:underline">Ver Tabela de Pesos →</button>
          </div>
        </div>
      </div>

      {/* Multi-step Wizard */}
      {isWizardOpen && (
        <EventRequestWizard 
          onClose={() => setIsWizardOpen(false)} 
          onSuccess={() => {
            setIsWizardOpen(false);
            setShowSuccess(true);
            fetchData();
          }} 
        />
      )}

      {/* Success Message */}
      <AnimatePresence>
        {showSuccess && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-3xl p-10 max-w-sm w-full text-center space-y-6 shadow-2xl"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mx-auto">
                <CheckCircle2 size={48} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black font-display text-[var(--text-main)]">Pedido Enviado!</h3>
                <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                  Sua solicitação de evento foi recebida com sucesso. Nossa equipe comercial entrará em contato em breve.
                </p>
              </div>
              <button 
                onClick={() => setShowSuccess(false)}
                className="w-full btn-primary bg-emerald-500 hover:bg-emerald-600 border-emerald-500 py-3 font-black"
              >
                Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AthleteRow({ name, photo, belt, category, status }: any) {
  return (
    <tr className="hover:bg-[var(--border-ui)]/30 transition-colors group">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--border-ui)] overflow-hidden">
            <img 
              src={photo || `https://picsum.photos/seed/${name}/100/100`} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
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
        <button className="p-1 text-[var(--text-muted)] hover:text-bjj-purple transition-colors">
          <ChevronRight size={18} />
        </button>
      </td>
    </tr>
  );
}

function MiniEventCard({ name, date, athletes, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className="card-surface p-4 flex items-center justify-between hover:border-bjj-purple/30 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--border-ui)] flex items-center justify-center text-bjj-purple">
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
