import { useState } from 'react';
import { Trophy, Users, Plus, Filter, Search, ChevronRight, Download, Calendar, MapPin } from 'lucide-react';
import { motion } from 'motion/react';

export default function CoordinatorDashboard() {
  const [view, setView] = useState<'overview' | 'championships' | 'athletes'>('overview');

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black font-display tracking-tight text-[var(--text-main)]">Painel do Coordenador</h2>
          <p className="text-[var(--text-muted)]">Gestão de eventos, atletas e categorias automáticas.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-outline">
            <Download size={18} />
            Exportar Dados
          </button>
          <button className="btn-primary">
            <Plus size={18} />
            Novo Campeonato
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-surface p-6 bg-bjj-blue text-white">
          <p className="text-xs font-bold uppercase opacity-70">Total de Atletas</p>
          <h3 className="text-4xl font-black mt-1">1,284</h3>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold">
            <span className="bg-white/20 px-2 py-1 rounded">↑ 14% este mês</span>
          </div>
        </div>
        <div className="card-surface p-6">
          <p className="text-xs font-bold uppercase text-[var(--text-muted)]">Campeonatos Ativos</p>
          <h3 className="text-4xl font-black mt-1 text-[var(--text-main)]">04</h3>
          <p className="text-xs text-emerald-500 font-bold mt-4">Próximo evento em 12 dias</p>
        </div>
        <div className="card-surface p-6">
          <p className="text-xs font-bold uppercase text-[var(--text-muted)]">Inscrições Pendentes</p>
          <h3 className="text-4xl font-black mt-1 text-[var(--text-main)]">56</h3>
          <p className="text-xs text-amber-500 font-bold mt-4">Aguardando confirmação de peso</p>
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
                  className="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-lg py-2 pl-10 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-bjj-blue"
                />
              </div>
              <button className="p-2 border border-[var(--border-ui)] rounded-lg hover:bg-[var(--border-ui)] transition-colors">
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
                  <th className="px-6 py-4">Categoria Automática</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-ui)]">
                <AthleteRow name="João Silva" belt="Azul" category="ADULTO / Médio" status="Confirmado" />
                <AthleteRow name="Maria Santos" belt="Roxa" category="MASTER 1 / Pena" status="Pendente" />
                <AthleteRow name="Pedro Costa" belt="Branca" category="JUVENIL / Leve" status="Confirmado" />
                <AthleteRow name="Lucas Lima" belt="Marrom" category="ADULTO / Pesado" status="Confirmado" />
                <AthleteRow name="Ana Rocha" belt="Preta" category="MASTER 2 / Pluma" status="Confirmado" />
              </tbody>
            </table>
          </div>
        </div>

        {/* Active Championships */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold font-display text-[var(--text-main)]">Meus Eventos</h3>
          <div className="space-y-4">
            <MiniEventCard name="Copa Primavera" date="20 Out" athletes={342} />
            <MiniEventCard name="Open BJJ Pro" date="12 Nov" athletes={156} />
            <MiniEventCard name="Torneio Interno" date="05 Dez" athletes={45} />
          </div>
          
          <div className="card-surface p-6 bg-gradient-to-br from-bjj-purple/10 to-transparent border-bjj-purple/20">
            <h4 className="font-bold text-bjj-purple mb-2">Regra de Categorização</h4>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              O sistema calcula automaticamente a idade competitiva baseada no ano de nascimento (2026 - Ano Nasc).
            </p>
            <button className="mt-4 text-xs font-bold text-bjj-purple hover:underline">Ver Tabela de Pesos →</button>
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
