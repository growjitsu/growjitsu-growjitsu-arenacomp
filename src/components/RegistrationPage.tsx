import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, Calendar, MapPin, Loader2, X, CheckCircle2, ArrowLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../services/supabase';
import { Evento, CategoriaEvento, EventLote, EventDocumento } from '../types';

export default function RegistrationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Evento | null>(null);
  const [activeLote, setActiveLote] = useState<EventLote | null>(null);
  const [documento, setDocumento] = useState<EventDocumento | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  const [athleteProfile, setAthleteProfile] = useState<any>(null);
  const [determinedCategory, setDeterminedCategory] = useState<CategoriaEvento | null>(null);
  const [confirmationStep, setConfirmationStep] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        console.error('[Registration] ID do evento não encontrado nos parâmetros da URL');
        return;
      }
      
      console.log(`[Registration] Buscando dados para o evento ID: ${id}`);
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Usuário não autenticado');

        // 1. Fetch Event
        const { data: eventData, error: eventError } = await supabase
          .from('eventos')
          .select('*')
          .eq('id', id)
          .single();
        
        if (eventError) throw eventError;
        setEvent(eventData);

        // 1.1. Fetch Active Lote
        const today = new Date().toISOString().split('T')[0];
        const { data: lotesData } = await supabase
          .from('event_lotes')
          .select('*')
          .eq('evento_id', id)
          .gte('data_limite', today)
          .order('data_limite', { ascending: true });
        
        if (lotesData && lotesData.length > 0) {
          setActiveLote(lotesData[0]);
        }

        // 1.2. Fetch Rules Document
        const { data: docData } = await supabase
          .from('event_documentos')
          .select('*')
          .eq('evento_id', id)
          .single();
        
        if (docData) setDocumento(docData);

        // 2. Fetch Athlete Profile for Auto-Categorization
        const { data: profileData, error: profileError } = await supabase
          .from('atletas')
          .select('*')
          .eq('usuario_id', session.user.id)
          .single();
        
        if (profileError) throw profileError;
        setAthleteProfile(profileData);

        // 3. Determine Category automatically via RPC
        const birthYear = new Date(profileData.data_nascimento).getFullYear();
        const { data: catId, error: rpcError } = await supabase.rpc('fn_determinar_categoria_jiujitsu', {
          p_ano_nascimento: birthYear,
          p_peso: profileData.peso_kg,
          p_faixa: profileData.graduacao,
          p_sexo: profileData.genero === 'Masculino' ? 'M' : 'F',
          p_evento_id: id
        });

        if (rpcError) throw rpcError;
        
        if (!catId) {
          const diagnostic = `Nenhuma categoria compatível encontrada para:
          • Idade: ${birthYear} (${new Date().getFullYear() - birthYear} anos)
          • Faixa: ${profileData.graduacao}
          • Peso: ${profileData.peso_kg}kg
          • Sexo: ${profileData.genero}
          
          Verifique se o organizador criou categorias para o seu perfil.`;
          throw new Error(diagnostic);
        }

        // 4. Fetch the specific category details
        const { data: catData, error: catError } = await supabase
          .from('categorias_evento')
          .select('*')
          .eq('id', catId)
          .single();
        
        if (catError) throw catError;
        setDeterminedCategory(catData);

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
    if (!confirmationStep) {
      setConfirmationStep(true);
      return;
    }

    console.log('[Registration] Iniciando processo de inscrição...');
    if (!event || !determinedCategory || !athleteProfile) return;

    setIsRegistering(true);
    try {
      const registrationData = {
        evento_id: event.id,
        atleta_id: athleteProfile.usuario_id,
        categoria_id: determinedCategory.id,
        nome_atleta: athleteProfile.nome_completo,
        equipe: athleteProfile.equipe,
        faixa: athleteProfile.graduacao,
        peso_atual: athleteProfile.peso_kg,
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
      alert('Inscrição realizada com sucesso! Sua categoria foi definida automaticamente.');
      navigate('/dashboard');
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
              <span className="flex items-center gap-2"><MapPin size={18} /> {event.cidade} / {event.uf}</span>
            </div>
          </div>

          {documento && (
            <div className="px-8 py-4 bg-zinc-900/50 border-b border-[var(--border-ui)]">
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <span className="text-[10px] font-black uppercase tracking-widest text-bjj-blue">Ver Edital e Regras do Evento</span>
                  <ChevronRight size={14} className="group-open:rotate-90 transition-transform text-bjj-blue" />
                </summary>
                <div className="mt-4 text-xs text-[var(--text-muted)] leading-relaxed space-y-4 max-h-60 overflow-y-auto pr-2">
                  {documento.regras_entrada && (
                    <div>
                      <p className="font-bold text-[var(--text-main)] uppercase mb-1">Entrada</p>
                      <p>{documento.regras_entrada}</p>
                    </div>
                  )}
                  {documento.regras_vestimenta && (
                    <div>
                      <p className="font-bold text-[var(--text-main)] uppercase mb-1">Vestimenta</p>
                      <p>{documento.regras_vestimenta}</p>
                    </div>
                  )}
                  {documento.regras_pesagem && (
                    <div>
                      <p className="font-bold text-[var(--text-main)] uppercase mb-1">Pesagem</p>
                      <p>{documento.regras_pesagem}</p>
                    </div>
                  )}
                </div>
              </details>
            </div>
          )}

          <form onSubmit={handleRegister} className="p-8 space-y-6">
            {!confirmationStep ? (
              <div className="space-y-6">
                <div className="p-6 bg-bjj-blue/5 border border-bjj-blue/20 rounded-2xl space-y-4">
                  <h3 className="text-sm font-black uppercase text-bjj-blue tracking-widest">Confirme seus Dados Cadastrais</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Nome</p>
                      <p className="font-bold text-[var(--text-main)]">{athleteProfile?.nome_completo}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Equipe</p>
                      <p className="font-bold text-[var(--text-main)]">{athleteProfile?.equipe}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Peso</p>
                      <p className="font-bold text-[var(--text-main)]">{athleteProfile?.peso_kg} kg</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Faixa</p>
                      <p className="font-bold text-[var(--text-main)]">{athleteProfile?.graduacao}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-sm font-black uppercase text-emerald-500 tracking-widest">Categoria Identificada</h3>
                    {activeLote && (
                      <div className="text-right">
                        <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Valor Inscrição</p>
                        <p className="text-lg font-black text-emerald-500">R$ {activeLote.valor_peso.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xl font-black text-[var(--text-main)]">{determinedCategory?.nome}</p>
                      <p className="text-xs text-[var(--text-muted)] font-bold uppercase">
                        {determinedCategory?.faixa} | {determinedCategory?.sexo} | {determinedCategory?.peso_max ? `Até ${determinedCategory?.peso_max}kg` : 'Absoluto'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Tempo de Luta</p>
                      <p className="text-lg font-black text-emerald-500">{(determinedCategory as any)?.tempo_luta_minutos || 5}:00 min</p>
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full btn-primary py-5 font-black text-lg uppercase tracking-widest flex items-center justify-center gap-3"
                >
                  <CheckCircle2 size={24} />
                  Confirmar e Prosseguir
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                  <p className="text-xs text-amber-500 font-black uppercase mb-2 tracking-widest">Aviso Final</p>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Você está se inscrevendo na categoria <strong>{determinedCategory?.nome}</strong>. 
                    Certifique-se de que seu peso ({athleteProfile?.peso_kg}kg) está dentro do limite permitido para evitar desclassificação na pesagem oficial.
                  </p>
                </div>

                <button 
                  disabled={isRegistering}
                  type="submit" 
                  className="w-full btn-primary py-5 font-black text-lg uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 transition-all"
                >
                  {isRegistering ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle2 size={24} />}
                  {isRegistering ? 'Processando Inscrição...' : 'Finalizar Inscrição Oficial'}
                </button>
                
                <button 
                  type="button"
                  onClick={() => setConfirmationStep(false)}
                  className="w-full text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] uppercase tracking-widest"
                >
                  Voltar e Revisar
                </button>
              </div>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  );
}
