import { BookOpen, PlayCircle, Shield, Award, ChevronRight, Search, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export default function TechniqueLibrary() {
  const [techniques, setTechniques] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTechniques = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.from('tecnicas').select('*');
        setTechniques(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTechniques();
  }, []);

  const BELTS = [
    { name: "FAIXA BRANCA", color: "bg-white text-black" },
    { name: "FAIXA AZUL", color: "bg-blue-600 text-white" },
    { name: "FAIXA ROXA", color: "bg-purple-600 text-white" },
    { name: "FAIXA MARROM", color: "bg-amber-900 text-white" },
    { name: "FAIXA PRETA", color: "bg-zinc-900 text-white border border-zinc-700" },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-black font-display tracking-tight text-[var(--text-main)]">Biblioteca Técnica</h1>
        <p className="text-[var(--text-muted)] mt-1">Aprenda com os melhores professores e organize seu estudo.</p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
          <input 
            placeholder="Buscar técnica, posição ou professor..." 
            className="w-full bg-[var(--bg-card)] border border-[var(--border-ui)] text-[var(--text-main)] rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-bjj-blue/50 transition-all"
          />
        </div>
      </div>

      {/* Belts Horizontal Scroll */}
      <div className="flex gap-3 overflow-x-auto pb-4 mb-8 no-scrollbar">
        {BELTS.map(belt => (
          <button 
            key={belt.name}
            className={`px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-transform active:scale-95 ${belt.color} shadow-md`}
          >
            {belt.name}
          </button>
        ))}
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {['Finalizações', 'Raspagens', 'Passagens', 'Quedas'].map(cat => (
          <div key={cat} className="card-surface p-4 flex flex-col items-center justify-center gap-2 hover:bg-bjj-blue/5 cursor-pointer transition-colors group">
            <div className="w-10 h-10 rounded-full bg-[var(--border-ui)] flex items-center justify-center group-hover:bg-bjj-blue/20 transition-colors">
              <Award size={20} className="text-bjj-blue" />
            </div>
            <span className="font-bold text-sm text-[var(--text-main)]">{cat}</span>
          </div>
        ))}
      </div>

      {/* Techniques List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold font-display mb-4 text-[var(--text-main)]">Técnicas Recomendadas</h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-bjj-blue" />
          </div>
        ) : techniques.length > 0 ? (
          techniques.map((tech, idx) => (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={tech.id}
              className="card-surface p-4 flex items-center justify-between hover:bg-[var(--border-ui)]/50 cursor-pointer group"
            >
              {/* Render tech details */}
            </motion.div>
          ))
        ) : (
          <div className="card-surface p-12 text-center text-[var(--text-muted)] italic">
            Nenhuma técnica cadastrada no momento.
          </div>
        )}
      </div>
    </div>
  );
}
