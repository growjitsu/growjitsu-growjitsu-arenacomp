import React, { useState, useEffect } from 'react';
import { Trophy, Users, Calendar, MapPin, ChevronRight, Plus, Loader2, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../services/supabase';
import { useRouter } from '../hooks/useRouter';
import { Evento, CategoriaEvento } from '../types';

export default function ChampionshipModule() {
  const [championships, setChampionships] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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

  useEffect(() => {
    fetchChampionships();
  }, []);

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
                      <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(event.data + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                      <span className="flex items-center gap-1"><MapPin size={14} /> {event.local}</span>
                      <span className="flex items-center gap-1"><Users size={14} /> Inscrições Abertas</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => {
                      console.log(`[Championships] Navegando para inscrição do evento: ${event.id}`);
                      router.push(`/eventos/${event.id}/inscricao`);
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
    </div>
  );
}
