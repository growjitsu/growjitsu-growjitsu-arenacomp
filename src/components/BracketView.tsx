import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Users, Loader2, ChevronLeft } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Luta } from '../types';

interface BracketViewProps {
  categoryId: string;
  onBack: () => void;
}

export default function BracketView({ categoryId, onBack }: BracketViewProps) {
  const [lutas, setLutas] = useState<Luta[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLutas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lutas')
        .select(`
          *,
          atleta_a:atleta_a_id(nome, equipe),
          atleta_b:atleta_b_id(nome, equipe)
        `)
        .eq('categoria_id', categoryId)
        .order('rodada', { ascending: true })
        .order('posicao_chave', { ascending: true });

      if (error) throw error;
      setLutas(data || []);
    } catch (err) {
      console.error('Erro ao buscar lutas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLutas();
  }, [categoryId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-bjj-purple" size={32} />
      </div>
    );
  }

  const rodadas = [1, 2, 3, 4]; // Oitavas, Quartas, Semi, Final

  return (
    <div className="flex flex-col h-full bg-[var(--bg-app)]">
      <header className="p-6 border-b border-[var(--border-ui)] bg-[var(--bg-card)] flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-[var(--border-ui)] rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-xl font-black font-display text-[var(--text-main)]">Chave de Competição</h2>
      </header>

      <div className="flex-1 overflow-x-auto p-8">
        <div className="flex gap-12 min-w-max h-full items-center">
          {rodadas.map((rodada) => (
            <div key={rodada} className="flex flex-col gap-8">
              <h3 className="text-center text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4">
                {rodada === 1 ? 'Oitavas' : rodada === 2 ? 'Quartas' : rodada === 3 ? 'Semifinal' : 'Final'}
              </h3>
              <div className="flex flex-col justify-around h-full gap-4">
                {lutas.filter(l => l.rodada === rodada).map((luta) => (
                  <div key={luta.id} className="relative">
                    <div className="w-48 bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-lg overflow-hidden shadow-sm">
                      <div className={`p-2 border-b border-[var(--border-ui)] flex justify-between items-center ${luta.vencedor_id === luta.atleta_a_id && luta.vencedor_id ? 'bg-emerald-500/10' : ''}`}>
                        <div className="truncate">
                          <p className="text-xs font-bold text-[var(--text-main)] truncate">{luta.atleta_a?.nome || 'Aguardando...'}</p>
                          <p className="text-[8px] text-[var(--text-muted)] truncate">{luta.atleta_a?.equipe || '-'}</p>
                        </div>
                        {luta.vencedor_id === luta.atleta_a_id && <Trophy size={10} className="text-emerald-500" />}
                      </div>
                      <div className={`p-2 flex justify-between items-center ${luta.vencedor_id === luta.atleta_b_id && luta.vencedor_id ? 'bg-emerald-500/10' : ''}`}>
                        <div className="truncate">
                          <p className="text-xs font-bold text-[var(--text-main)] truncate">{luta.atleta_b?.nome || 'Aguardando...'}</p>
                          <p className="text-[8px] text-[var(--text-muted)] truncate">{luta.atleta_b?.equipe || '-'}</p>
                        </div>
                        {luta.vencedor_id === luta.atleta_b_id && <Trophy size={10} className="text-emerald-500" />}
                      </div>
                    </div>
                    {/* Connector Lines (Simplified) */}
                    {rodada < 4 && (
                      <div className="absolute top-1/2 -right-6 w-6 h-[1px] bg-[var(--border-ui)]" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
