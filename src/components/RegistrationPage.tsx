import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, Calendar, MapPin, Loader2, X, CheckCircle2, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../services/supabase';
import { Evento, CategoriaEvento } from '../types';

export default function RegistrationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Evento | null>(null);
  const [categories, setCategories] = useState<CategoriaEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        console.error('[Registration] ID do evento não encontrado nos parâmetros da URL');
        return;
      }
      
      console.log(`[Registration] Buscando dados para o evento ID: ${id}`);
      setLoading(true);
      try {
        // 1. Fetch Event
        const { data: eventData, error: eventError } = await supabase
          .from('eventos')
          .select('*')
          .eq('id', id)
          .single();
        
        if (eventError) {
          console.error('[Registration] Erro ao buscar evento:', eventError);
          throw eventError;
        }
        
        if (!eventData) {
          console.error('[Registration] Nenhum dado retornado para o evento');
          throw new Error('Evento não encontrado');
        }
        
        setEvent(eventData);
        console.log('[Registration] Evento carregado:', eventData.nome);

        // 2. Fetch Categories
        const { data: catData, error: catError } = await supabase
          .from('categorias_evento')
          .select('*')
          .eq('evento_id', id);
        
        if (catError) {
          console.error('[Registration] Erro ao buscar categorias:', catError);
          throw catError;
        }
        
        setCategories(catData || []);
        console.log(`[Registration] ${catData?.length || 0} categorias carregadas`);
      } catch (err: any) {
        console.error('[Registration] Falha crítica no carregamento:', err);
        alert(`Erro: ${err.message || 'Não foi possível carregar os dados do evento.'}`);
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('[Registration] Iniciando processo de inscrição...');
    
    if (!event) return;

    setIsRegistering(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Usuário não autenticado. Por favor, faça login novamente.');

      const formData = new FormData(e.currentTarget);
      const catId = formData.get('categoria_id') as string;
      const category = categories.find(c => c.id === catId);

      if (!catId) throw new Error('Por favor, selecione uma categoria.');

      const registrationData = {
        evento_id: event.id,
        atleta_id: session.user.id,
        categoria_id: catId,
        nome_atleta: formData.get('nome_atleta') as string,
        equipe: formData.get('equipe') as string,
        faixa: category?.faixa || 'Branca',
        peso_atual: Number(formData.get('peso_atual')),
        status_pagamento: 'pendente',
        status_operacional: 'inscrito'
      };

      console.log('[Registration] Enviando dados:', registrationData);

      const { error } = await supabase.from('inscricoes').insert(registrationData);
      
      if (error) {
        if (error.code === '23505') throw new Error('Você já está inscrito nesta categoria para este evento.');
        throw error;
      }

      console.log('[Registration] Sucesso!');
      alert('Inscrição realizada com sucesso!');
      navigate('/dashboard'); // Go back to dashboard or similar
    } catch (err: any) {
      console.error('[Registration] Erro:', err);
      alert(err.message);
    } finally {
      setIsRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[var(--bg-app)]">
        <Loader2 className="w-8 h-8 animate-spin text-bjj-blue" />
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="min-h-screen bg-[var(--bg-app)] p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-main)] mb-8 transition-colors group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold uppercase text-xs tracking-widest">Voltar</span>
        </button>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--bg-card)] rounded-3xl shadow-2xl overflow-hidden border border-[var(--border-ui)]"
        >
          <div className="p-8 border-b border-[var(--border-ui)] bg-bjj-blue/5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl font-black font-display text-[var(--text-main)] tracking-tight uppercase">Inscrição Oficial</h1>
                <div className="flex items-center gap-4 text-sm text-bjj-blue font-bold uppercase">
                  <span className="flex items-center gap-1"><Trophy size={16} /> {event.nome}</span>
                </div>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-bjj-blue/10 flex items-center justify-center text-bjj-blue">
                {event.logo_url ? (
                  <img src={event.logo_url} className="w-full h-full object-cover rounded-2xl" referrerPolicy="no-referrer" />
                ) : (
                  <Trophy size={32} />
                )}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-6 mt-6 text-sm text-[var(--text-muted)]">
              <span className="flex items-center gap-2"><Calendar size={18} /> {new Date(event.data).toLocaleDateString('pt-BR')}</span>
              <span className="flex items-center gap-2"><MapPin size={18} /> {event.local}</span>
            </div>
          </div>

          <form onSubmit={handleRegister} className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-[var(--text-muted)] tracking-widest">Nome Completo do Atleta</label>
              <input 
                required 
                name="nome_atleta" 
                className="w-full bg-[var(--bg-app)] border border-[var(--border-ui)] rounded-2xl py-4 px-6 text-[var(--text-main)] focus:border-bjj-blue transition-colors outline-none" 
                placeholder="Seu nome oficial de competição" 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-[var(--text-muted)] tracking-widest">Equipe / Academia</label>
                <input 
                  required 
                  name="equipe" 
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-ui)] rounded-2xl py-4 px-6 text-[var(--text-main)] focus:border-bjj-blue transition-colors outline-none" 
                  placeholder="Sua academia" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-[var(--text-muted)] tracking-widest">Peso Atual (kg)</label>
                <input 
                  required 
                  type="number" 
                  step="0.1" 
                  name="peso_atual" 
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-ui)] rounded-2xl py-4 px-6 text-[var(--text-main)] focus:border-bjj-blue transition-colors outline-none" 
                  placeholder="Ex: 82.5" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-[var(--text-muted)] tracking-widest">Selecione sua Categoria</label>
              <select 
                required 
                name="categoria_id" 
                className="w-full bg-[var(--bg-app)] border border-[var(--border-ui)] rounded-2xl py-4 px-6 text-[var(--text-main)] focus:border-bjj-blue transition-colors outline-none appearance-none"
              >
                <option value="">Escolha uma categoria disponível...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome} ({cat.faixa} | {cat.sexo} | {cat.peso_max ? `Até ${cat.peso_max}kg` : 'Absoluto'})
                  </option>
                ))}
              </select>
            </div>

            <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
              <p className="text-xs text-amber-500 font-black uppercase mb-2 tracking-widest">Aviso de Responsabilidade</p>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Ao confirmar sua inscrição, você declara estar em perfeitas condições físicas para competir e aceita integralmente o regulamento oficial do evento.
              </p>
            </div>

            <button 
              disabled={isRegistering}
              type="submit" 
              className="w-full btn-primary py-5 font-black text-lg uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 transition-all"
            >
              {isRegistering ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle2 size={24} />}
              {isRegistering ? 'Processando Inscrição...' : 'Confirmar Inscrição Oficial'}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
