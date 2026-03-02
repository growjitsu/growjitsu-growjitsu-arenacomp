import React, { useState, useEffect } from 'react';
import { Trophy, Users, Calendar, MapPin, ChevronRight, Plus, Loader2, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../services/supabase';
import { Evento, CategoriaEvento } from '../types';

export default function ChampionshipModule() {
  const [championships, setChampionships] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Evento | null>(null);
  const [categories, setCategories] = useState<CategoriaEvento[]>([]);
  const [showRegistration, setShowRegistration] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const fetchChampionships = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('eventos')
        .select('*')
        .eq('status', 'aberto')
        .order('data', { ascending: true });
      
      if (error) throw error;
      setChampionships(data || []);
    } catch (err) {
      console.error('Erro ao buscar campeonatos:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async (eventoId: string) => {
    try {
      const { data, error } = await supabase
        .from('categorias_evento')
        .select('*')
        .eq('evento_id', eventoId);
      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Erro ao buscar categorias:', err);
    }
  };

  useEffect(() => {
    fetchChampionships();
  }, []);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEvent) return;

    setIsRegistering(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Usuário não autenticado');

      const formData = new FormData(e.currentTarget);
      const catId = formData.get('categoria_id') as string;
      const category = categories.find(c => c.id === catId);

      const registrationData = {
        evento_id: selectedEvent.id,
        atleta_id: session.user.id,
        categoria_id: catId,
        nome_atleta: formData.get('nome_atleta') as string,
        equipe: formData.get('equipe') as string,
        faixa: category?.faixa || 'Branca',
        peso_atual: Number(formData.get('peso_atual')),
        status_pagamento: 'pendente',
        status_operacional: 'inscrito'
      };

      const { error } = await supabase.from('inscricoes').insert(registrationData);
      
      if (error) {
        if (error.code === '23505') {
          throw new Error('Você já está inscrito nesta categoria para este evento.');
        }
        throw error;
      }

      alert('Inscrição realizada com sucesso!');
      setShowRegistration(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-bjj-blue" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black font-display tracking-tight text-[var(--text-main)]">Campeonatos Disponíveis</h1>
          <p className="text-[var(--text-muted)] mt-1">Encontre seu próximo desafio e inscreva-se agora.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {championships.length > 0 ? (
          championships.map((event, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={event.id}
              className="card-surface p-6 hover:bg-[var(--border-ui)]/50 transition-colors group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-bjj-blue/10 flex items-center justify-center text-bjj-blue overflow-hidden">
                    {event.logo_url ? (
                      <img src={event.logo_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Trophy size={24} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold font-display text-[var(--text-main)]">{event.nome}</h3>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-[var(--text-muted)]">
                      <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(event.data).toLocaleDateString('pt-BR')}</span>
                      <span className="flex items-center gap-1"><MapPin size={14} /> {event.local}</span>
                      <span className="flex items-center gap-1"><Users size={14} /> Inscrições Abertas</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => {
                      setSelectedEvent(event);
                      fetchCategories(event.id);
                      setShowRegistration(true);
                    }}
                    className="btn-primary py-2 px-6 text-xs font-black"
                  >
                    Inscrever-se
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="card-surface p-12 text-center text-[var(--text-muted)]">
            Nenhum campeonato com inscrições abertas no momento.
          </div>
        )}
      </div>

      {/* Registration Modal */}
      <AnimatePresence>
        {showRegistration && selectedEvent && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-card)] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-[var(--border-ui)] flex justify-between items-center bg-bjj-blue/5">
                <div>
                  <h3 className="text-xl font-black font-display text-[var(--text-main)]">Inscrição no Evento</h3>
                  <p className="text-xs text-bjj-blue font-bold uppercase">{selectedEvent.nome}</p>
                </div>
                <button onClick={() => setShowRegistration(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleRegister} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Nome Completo</label>
                  <input required name="nome_atleta" className="w-full bg-[var(--bg-app)] border border-[var(--border-ui)] rounded-xl py-3 px-4 text-sm text-[var(--text-main)]" placeholder="Seu nome oficial de competição" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Equipe</label>
                    <input required name="equipe" className="w-full bg-[var(--bg-app)] border border-[var(--border-ui)] rounded-xl py-3 px-4 text-sm text-[var(--text-main)]" placeholder="Sua academia" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Peso Atual (kg)</label>
                    <input required type="number" step="0.1" name="peso_atual" className="w-full bg-[var(--bg-app)] border border-[var(--border-ui)] rounded-xl py-3 px-4 text-sm text-[var(--text-main)]" placeholder="Ex: 82.5" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Selecione sua Categoria</label>
                  <select required name="categoria_id" className="w-full bg-[var(--bg-app)] border border-[var(--border-ui)] rounded-xl py-3 px-4 text-sm text-[var(--text-main)]">
                    <option value="">Escolha uma categoria...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nome} ({cat.faixa} | {cat.sexo} | {cat.peso_max ? `Até ${cat.peso_max}kg` : 'Absoluto'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                  <p className="text-[10px] text-amber-500 font-bold uppercase mb-1">Aviso Importante</p>
                  <p className="text-[10px] text-[var(--text-muted)]">Ao se inscrever, você confirma que está apto fisicamente para competir e concorda com as regras do evento.</p>
                </div>

                <button 
                  disabled={isRegistering}
                  type="submit" 
                  className="w-full btn-primary py-4 font-black mt-4 flex items-center justify-center gap-2"
                >
                  {isRegistering ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                  {isRegistering ? 'Processando...' : 'Confirmar Inscrição'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
