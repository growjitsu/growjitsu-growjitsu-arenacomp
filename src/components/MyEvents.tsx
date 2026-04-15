import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, MapPin, ChevronRight, Users, Scale, Clock, Play, CheckCircle2, Loader2, Search, Filter, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../services/supabase';
import Scoreboard from './Scoreboard';
import BracketView from './BracketView';
import { CategoriaEvento, Evento } from '../types';
import { BELTS } from '../utils/data';

export default function MyEvents({ initialEventId, onClearSelection }: { initialEventId?: string | null, onClearSelection?: () => void }) {
  const [events, setEvents] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Evento | null>(null);
  const [selectedLuta, setSelectedLuta] = useState<{ id: string, a: string, b: string, aId?: string, bId?: string } | null>(null);
  const [view, setView] = useState<'list' | 'operational' | 'scoreboard'>('list');
  const [isEditingEvent, setIsEditingEvent] = useState(false);

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

  useEffect(() => {
    if (initialEventId && events.length > 0) {
      const event = events.find(e => e.id === initialEventId);
      if (event) {
        setSelectedEvent(event);
        setView('operational');
        onClearSelection?.();
      }
    }
  }, [initialEventId, events]);

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
        athleteAId={selectedLuta.aId}
        athleteBId={selectedLuta.bId}
        athleteAName={selectedLuta.a} 
        athleteBName={selectedLuta.b} 
        logoUrl={selectedEvent?.logo_url}
        onFinish={() => setView('operational')} 
      />
    );
  }

  if (view === 'operational' && selectedEvent) {
    return (
      <>
        <EventOperational 
          event={selectedEvent} 
          onBack={() => setView('list')} 
          onEdit={() => setIsEditingEvent(true)}
          onStartLuta={(luta) => {
            setSelectedLuta(luta);
            setView('scoreboard');
          }}
        />
        <AnimatePresence>
          {isEditingEvent && (
            <EditEventModal 
              event={selectedEvent} 
              onClose={() => setIsEditingEvent(false)} 
              onUpdate={(updatedEvent) => {
                setSelectedEvent(updatedEvent);
                setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
                setIsEditingEvent(false);
              }}
            />
          )}
        </AnimatePresence>
      </>
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
                <p className="flex items-center gap-2"><Calendar size={16} /> {new Date(event.data + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                <p className="flex items-center gap-2"><Clock size={16} /> {event.horario_inicio.slice(0, 5)}</p>
                <p className="flex items-center gap-2"><MapPin size={16} /> {event.cidade ? `${event.cidade} / ${event.uf}` : 'Local não definido'}</p>
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

function EditEventModal({ event, onClose, onUpdate }: { event: Evento, onClose: () => void, onUpdate: (e: Evento) => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: event.nome,
    data: event.data,
    horario_inicio: event.horario_inicio,
    cidade: event.cidade || '',
    uf: event.uf || '',
    status: event.status
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('eventos')
        .update(formData)
        .eq('id', event.id)
        .select()
        .single();
      
      if (error) throw error;
      onUpdate(data);
    } catch (err: any) {
      alert(`Erro ao atualizar evento: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[var(--bg-card)] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-[var(--border-ui)] flex justify-between items-center">
          <h3 className="text-xl font-black font-display text-[var(--text-main)]">Editar Evento</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="label-standard">Nome do Evento</label>
            <input 
              required 
              value={formData.nome}
              onChange={e => setFormData(prev => ({ ...prev, nome: e.target.value }))}
              className="input-standard text-sm" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="label-standard">Data</label>
              <input 
                required 
                type="date"
                value={formData.data}
                onChange={e => setFormData(prev => ({ ...prev, data: e.target.value }))}
                className="input-standard text-sm" 
              />
            </div>
            <div className="space-y-1">
              <label className="label-standard">Horário</label>
              <input 
                required 
                type="time"
                value={formData.horario_inicio}
                onChange={e => setFormData(prev => ({ ...prev, horario_inicio: e.target.value }))}
                className="input-standard text-sm" 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="label-standard">Cidade</label>
              <input 
                value={formData.cidade}
                onChange={e => setFormData(prev => ({ ...prev, cidade: e.target.value }))}
                className="input-standard text-sm" 
              />
            </div>
            <div className="space-y-1">
              <label className="label-standard">UF</label>
              <input 
                value={formData.uf}
                onChange={e => setFormData(prev => ({ ...prev, uf: e.target.value }))}
                className="input-standard text-sm" 
                maxLength={2}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="label-standard">Status</label>
            <select 
              value={formData.status}
              onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
              className="input-standard text-sm"
            >
              <option value="rascunho">Rascunho</option>
              <option value="aberto">Aberto (Inscrições)</option>
              <option value="fechado">Fechado</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="finalizado">Finalizado</option>
            </select>
          </div>
          <button 
            disabled={loading || event.status === 'finalizado'}
            type="submit" 
            className="w-full btn-primary py-4 font-black mt-4 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin mx-auto" size={24} /> : 'Salvar Alterações'}
          </button>
          {event.status === 'finalizado' && (
            <p className="text-[10px] text-red-500 text-center font-bold uppercase">Eventos finalizados não podem ser editados.</p>
          )}
        </form>
      </motion.div>
    </div>
  );
}

function EventOperational({ event, onBack, onEdit, onStartLuta }: { 
  event: Evento, 
  onBack: () => void,
  onEdit: () => void,
  onStartLuta: (luta: { id: string, a: string, b: string, aId?: string, bId?: string }) => void
}) {
  const [activeTab, setActiveTab] = useState<'weight' | 'warmup' | 'marshal' | 'brackets'>('weight');
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [categories, setCategories] = useState<CategoriaEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [selectedCategoryForBracket, setSelectedCategoryForBracket] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [regsRes, catsRes] = await Promise.all([
        supabase.from('inscricoes').select('*, atletas(*, usuarios(nome, foto_url))').eq('evento_id', event.id),
        supabase.from('categorias_evento').select('*').eq('evento_id', event.id)
      ]);
      
      if (regsRes.error) throw regsRes.error;
      if (catsRes.error) throw catsRes.error;

      setRegistrations(regsRes.data || []);
      setCategories(catsRes.data || []);
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [event.id]);

  const generateBrackets = async (catId: string) => {
    try {
      const { error } = await supabase.rpc('gerar_chaves_categoria', { p_categoria_id: catId });
      if (error) throw error;
      alert('Chaves geradas com sucesso!');
      fetchData();
    } catch (err: any) {
      alert(`Erro ao gerar chaves: ${err.message}`);
    }
  };

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

  if (selectedCategoryForBracket) {
    return (
      <BracketView 
        categoryId={selectedCategoryForBracket} 
        onBack={() => setSelectedCategoryForBracket(null)} 
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-app)]">
      <header className="p-6 border-b border-[var(--border-ui)] bg-[var(--bg-card)] flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-[var(--border-ui)] rounded-full transition-colors">
            <ChevronRight className="rotate-180" size={24} />
          </button>
          <div>
            <h2 className="text-xl font-black font-display text-[var(--text-main)]">{event.nome}</h2>
            <div className="flex items-center gap-2">
              <p className="text-xs text-bjj-purple font-bold uppercase tracking-widest">Controle Operacional</p>
              <button 
                onClick={onEdit}
                className="text-[10px] font-black text-bjj-purple hover:underline uppercase"
              >
                • Editar Evento
              </button>
            </div>
          </div>
        </div>
        <div className="flex bg-[var(--bg-surface)] p-1 rounded-xl overflow-x-auto max-w-full border border-[var(--border-ui)]">
          <button 
            onClick={() => setActiveTab('weight')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'weight' ? 'bg-[var(--bg-card)] text-bjj-purple shadow-sm' : 'text-[var(--text-muted)]'}`}
          >
            <Scale size={14} /> Pesagem
          </button>
          <button 
            onClick={() => setActiveTab('warmup')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'warmup' ? 'bg-[var(--bg-card)] text-bjj-purple shadow-sm' : 'text-[var(--text-muted)]'}`}
          >
            <Clock size={14} /> Aquecimento
          </button>
          <button 
            onClick={() => setActiveTab('marshal')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'marshal' ? 'bg-[var(--bg-card)] text-bjj-purple shadow-sm' : 'text-[var(--text-muted)]'}`}
          >
            <Users size={14} /> Mesário
          </button>
          <button 
            onClick={() => setActiveTab('brackets')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'brackets' ? 'bg-[var(--bg-card)] text-bjj-purple shadow-sm' : 'text-[var(--text-muted)]'}`}
          >
            <Trophy size={14} /> Chaves
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
            {activeTab === 'brackets' ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-black font-display text-[var(--text-main)]">Gerenciamento de Chaves</h3>
                  <button 
                    onClick={() => setShowAddCategory(true)}
                    className="btn-primary py-2 text-xs"
                  >
                    <Plus size={14} /> Adicionar Categoria
                  </button>
                </div>
                
                <div className="grid gap-4">
                  {categories.length > 0 ? (
                    categories.map(cat => (
                      <div key={cat.id} className="card-surface p-6 flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-[var(--text-main)]">{cat.nome}</h4>
                          <p className="text-xs text-[var(--text-muted)] uppercase font-bold">
                            {cat.faixa} | {cat.sexo} | {cat.peso_max ? `Até ${cat.peso_max}kg` : 'Absoluto'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {cat.status_chave === 'pendente' ? (
                            <button 
                              onClick={() => generateBrackets(cat.id)}
                              className="btn-primary py-2 px-4 text-xs font-black"
                            >
                              Gerar Chave
                            </button>
                          ) : (
                            <button 
                              onClick={() => setSelectedCategoryForBracket(cat.id)}
                              className="btn-outline py-2 px-4 text-xs font-black border-emerald-500 text-emerald-500 hover:bg-emerald-500/10"
                            >
                              Ver Chave
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="card-surface p-12 text-center text-[var(--text-muted)] italic text-sm">
                      Nenhuma categoria cadastrada para este evento.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
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
                              src={reg.atletas?.usuarios?.foto_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(reg.atletas?.usuarios?.nome || 'User')}&background=0D8ABC&color=fff`} 
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
                                  id: reg.id,
                                  a: reg.atletas?.usuarios?.nome || 'Atleta A',
                                  b: 'Oponente',
                                  aId: reg.atleta_id
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
        )}
      </div>

      {/* Add Category Modal */}
      <AnimatePresence>
        {showAddCategory && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-card)] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-[var(--border-ui)] flex justify-between items-center">
                <h3 className="text-xl font-black font-display text-[var(--text-main)]">Nova Categoria</h3>
                <button onClick={() => setShowAddCategory(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                  <X size={24} />
                </button>
              </div>
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const data = {
                    evento_id: event.id,
                    nome: formData.get('nome') as string,
                    faixa: formData.get('faixa') as string,
                    sexo: formData.get('sexo') as 'M' | 'F' | 'Unissex',
                    peso_max: Number(formData.get('peso_max')) || null,
                  };

                  try {
                    const { error } = await supabase.from('categorias_evento').insert(data);
                    if (error) throw error;
                    setShowAddCategory(false);
                    fetchData();
                  } catch (err: any) {
                    alert(`Erro ao criar categoria: ${err.message}`);
                  }
                }}
                className="p-6 space-y-4"
              >
                <div className="space-y-1">
                  <label className="label-standard">Nome da Categoria</label>
                  <input required name="nome" className="input-standard text-sm" placeholder="Ex: Adulto Marrom Meio-Pesado" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="label-standard">Faixa</label>
                    <select name="faixa" className="input-standard text-sm">
                      {BELTS.map(belt => (
                        <option key={belt} value={belt}>{belt}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="label-standard">Sexo</label>
                    <select name="sexo" className="input-standard text-sm">
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                      <option value="Unissex">Unissex</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="label-standard">Peso Máximo (kg)</label>
                  <input type="number" step="0.1" name="peso_max" className="input-standard text-sm" placeholder="Ex: 88.3" />
                </div>
                <button type="submit" className="w-full btn-primary py-4 font-black mt-4">Criar Categoria</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
