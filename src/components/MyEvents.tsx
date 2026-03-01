import { useState, useEffect } from 'react';
import { Trophy, Calendar, MapPin, ChevronRight, Users, Scale, Clock, Play, CheckCircle2, Loader2, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../services/supabase';
import Scoreboard from './Scoreboard';

interface Evento {
  id: string;
  nome: string;
  data: string;
  horario_inicio: string;
  local: string;
  logo_url?: string;
  status: 'rascunho' | 'aberto' | 'fechado' | 'em_andamento' | 'finalizado';
}

export default function MyEvents() {
  const [events, setEvents] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Evento | null>(null);
  const [selectedLuta, setSelectedLuta] = useState<{ id: string, a: string, b: string } | null>(null);
  const [view, setView] = useState<'list' | 'operational' | 'scoreboard'>('list');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('eventos')
        .select('*')
        .eq('coordenador_id', session.user.id)
        .order('data', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('Erro ao buscar eventos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-bjj-purple" />
      </div>
    );
  }

  if (view === 'scoreboard' && selectedLuta) {
    return (
      <Scoreboard 
        lutaId={selectedLuta.id} 
        athleteAName={selectedLuta.a} 
        athleteBName={selectedLuta.b} 
        logoUrl={selectedEvent?.logo_url}
        onFinish={() => setView('operational')} 
      />
    );
  }

  if (view === 'operational' && selectedEvent) {
    return (
      <EventOperational 
        event={selectedEvent} 
        onBack={() => setView('list')} 
        onStartLuta={(luta) => {
          setSelectedLuta(luta);
          setView('scoreboard');
        }}
      />
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black font-display tracking-tight text-[var(--text-main)]">Meus Eventos</h2>
          <p className="text-[var(--text-muted)]">Gerencie seus campeonatos e controle a operação em tempo real.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.length > 0 ? (
          events.map(event => (
            <div 
              key={event.id}
              className="card-surface p-6 hover:border-bjj-purple/50 transition-all group cursor-pointer"
              onClick={() => {
                setSelectedEvent(event);
                setView('operational');
              }}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl bg-bjj-purple/10 flex items-center justify-center text-bjj-purple group-hover:bg-bjj-purple group-hover:text-white transition-colors overflow-hidden">
                  {event.logo_url ? (
                    <img src={event.logo_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Trophy size={24} />
                  )}
                </div>
                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                  event.status === 'aberto' ? 'bg-emerald-500/10 text-emerald-500' : 
                  event.status === 'em_andamento' ? 'bg-bjj-blue/10 text-bjj-blue animate-pulse' : 
                  'bg-[var(--border-ui)] text-[var(--text-muted)]'
                }`}>
                  {event.status}
                </span>
              </div>
              <h3 className="text-xl font-black font-display text-[var(--text-main)] mb-2">{event.nome}</h3>
              <div className="space-y-2 text-sm text-[var(--text-muted)]">
                <p className="flex items-center gap-2"><Calendar size={16} /> {new Date(event.data).toLocaleDateString('pt-BR')}</p>
                <p className="flex items-center gap-2"><Clock size={16} /> {event.horario_inicio.slice(0, 5)}</p>
                <p className="flex items-center gap-2"><MapPin size={16} /> {event.local || 'Local não definido'}</p>
              </div>
              <button className="w-full mt-6 btn-outline py-2 text-xs font-bold group-hover:bg-bjj-purple group-hover:text-white group-hover:border-bjj-purple transition-all">
                Gerenciar Operação
              </button>
            </div>
          ))
        ) : (
          <div className="col-span-full card-surface p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-[var(--border-ui)] rounded-full flex items-center justify-center mx-auto text-[var(--text-muted)]">
              <Trophy size={32} />
            </div>
            <p className="text-[var(--text-muted)] italic">Você ainda não criou nenhum evento oficial.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function EventOperational({ event, onBack, onStartLuta }: { 
  event: Evento, 
  onBack: () => void,
  onStartLuta: (luta: { id: string, a: string, b: string }) => void
}) {
  const [activeTab, setActiveTab] = useState<'weight' | 'warmup' | 'marshal'>('weight');
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inscricoes')
        .select('*, atletas(*, usuarios(nome, foto_url))')
        .eq('evento_id', event.id);
      
      if (error) throw error;
      setRegistrations(data || []);
    } catch (err) {
      console.error('Erro ao buscar inscrições:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [event.id]);

  const updateStatus = async (regId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('inscricoes')
        .update({ status_operacional: status })
        .eq('id', regId);
      
      if (error) throw error;
      setRegistrations(prev => prev.map(r => r.id === regId ? { ...r, status_operacional: status } : r));
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  const filteredRegs = registrations.filter(reg => {
    if (activeTab === 'weight') return reg.status_operacional === 'inscrito';
    if (activeTab === 'warmup') return reg.status_operacional === 'peso_ok';
    if (activeTab === 'marshal') return reg.status_operacional === 'aquecimento';
    return false;
  });

  return (
    <div className="flex flex-col h-full bg-[var(--bg-app)]">
      <header className="p-6 border-b border-[var(--border-ui)] bg-[var(--bg-card)] flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-[var(--border-ui)] rounded-full transition-colors">
            <ChevronRight className="rotate-180" size={24} />
          </button>
          <div>
            <h2 className="text-xl font-black font-display text-[var(--text-main)]">{event.nome}</h2>
            <p className="text-xs text-bjj-purple font-bold uppercase tracking-widest">Controle Operacional</p>
          </div>
        </div>
        <div className="flex bg-[var(--border-ui)] p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('weight')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'weight' ? 'bg-white text-bjj-purple shadow-sm' : 'text-[var(--text-muted)]'}`}
          >
            <Scale size={14} /> Pesagem
          </button>
          <button 
            onClick={() => setActiveTab('warmup')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'warmup' ? 'bg-white text-bjj-purple shadow-sm' : 'text-[var(--text-muted)]'}`}
          >
            <Clock size={14} /> Aquecimento
          </button>
          <button 
            onClick={() => setActiveTab('marshal')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'marshal' ? 'bg-white text-bjj-purple shadow-sm' : 'text-[var(--text-muted)]'}`}
          >
            <Users size={14} /> Mesário
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-bjj-purple" size={32} />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black font-display text-[var(--text-main)]">
                {activeTab === 'weight' ? 'Checagem de Peso' : activeTab === 'warmup' ? 'Área de Aquecimento' : 'Mesa de Chamada'}
              </h3>
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase">{filteredRegs.length} Atletas</span>
            </div>

            <div className="space-y-3">
              {filteredRegs.length > 0 ? (
                filteredRegs.map(reg => (
                  <div key={reg.id} className="card-surface p-4 flex items-center justify-between group hover:border-bjj-purple/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[var(--border-ui)] overflow-hidden">
                        <img 
                          src={reg.atletas?.usuarios?.foto_url || `https://picsum.photos/seed/${reg.id}/100/100`} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <h4 className="font-bold text-[var(--text-main)]">{reg.atletas?.usuarios?.nome}</h4>
                        <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase">{reg.final_category}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {activeTab === 'weight' && (
                        <button 
                          onClick={() => updateStatus(reg.id, 'peso_ok')}
                          className="btn-primary bg-emerald-500 hover:bg-emerald-600 border-emerald-500 py-2 px-6 text-xs font-black flex items-center gap-2"
                        >
                          <CheckCircle2 size={16} /> Peso OK
                        </button>
                      )}
                      {activeTab === 'warmup' && (
                        <button 
                          onClick={() => updateStatus(reg.id, 'aquecimento')}
                          className="btn-primary bg-bjj-blue hover:bg-bjj-blue/90 border-bjj-blue py-2 px-6 text-xs font-black flex items-center gap-2"
                        >
                          <Play size={16} /> Chamar Atleta
                        </button>
                      )}
                      {activeTab === 'marshal' && (
                        <button 
                          onClick={() => {
                            onStartLuta({
                              id: reg.id, // Using reg.id as lutaId for demo
                              a: reg.atletas?.usuarios?.nome || 'Atleta A',
                              b: 'Oponente' // In real app, fetch the actual match pair
                            });
                          }}
                          className="btn-primary bg-bjj-purple hover:bg-bjj-purple/90 border-bjj-purple py-2 px-6 text-xs font-black flex items-center gap-2"
                        >
                          <Trophy size={16} /> Iniciar Luta
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="card-surface p-12 text-center text-[var(--text-muted)] italic text-sm">
                  Nenhum atleta nesta etapa no momento.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
