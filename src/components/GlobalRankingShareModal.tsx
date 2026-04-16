import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Trophy, Users, User, Share2, Loader2, ChevronRight, MessageCircle } from 'lucide-react';
import { supabase } from '../services/supabase';
import { ArenaProfile } from '../types';

interface GlobalRankingShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'athletes' | 'teams';
}

interface SelectionItem {
  id: string;
  name: string;
  image?: string;
  score: number;
  subtitle: string;
}

export const GlobalRankingShareModal: React.FC<GlobalRankingShareModalProps> = ({ 
  isOpen, 
  onClose,
  type
}) => {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<SelectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);

  const fetchItems = useCallback(async (query: string = '') => {
    setLoading(true);
    try {
      if (type === 'athletes') {
        let supabaseQuery = supabase
          .from('profiles')
          .select('id, full_name, username, profile_photo, avatar_url, arena_score, modality, team')
          .neq('role', 'admin')
          .eq('perfil_publico', true)
          .gt('arena_score', 0)
          .order('arena_score', { ascending: false });

        if (query) {
          supabaseQuery = supabaseQuery.ilike('full_name', `%${query}%`);
        } else {
          supabaseQuery = supabaseQuery.limit(10);
        }

        const { data, error } = await supabaseQuery;
        if (error) throw error;

        setItems((data || []).map(p => ({
          id: p.id,
          name: p.full_name || 'Atleta Arena',
          image: p.profile_photo || p.avatar_url,
          score: Math.round(p.arena_score || 0),
          subtitle: `${p.modality || 'Atleta'} • ${p.team || 'Independente'}`
        })));
      } else {
        // For teams, we use the aggregation or RPC
        // If query is present, we filter. If not, we get top 10
        // To be safe and efficient, let's fetch profiles and aggregate if no RPC is reliable for search
        const { data: teamData, error: teamError } = await supabase.rpc('get_team_rankings', {
          p_modality: null,
          p_country_id: null,
          p_city_id: null
        });

        if (!teamError && teamData) {
          let filtered = teamData.map((t: any) => ({
            id: t.team_id || t.team,
            name: t.team_name || t.team,
            image: t.logo_url,
            score: Math.round(t.total_score || 0),
            subtitle: `Equipe • ${t.athlete_count} Atletas`
          }));

          if (query) {
            filtered = filtered.filter((t: any) => 
              t.name.toLowerCase().includes(query.toLowerCase())
            );
          } else {
            filtered = filtered.slice(0, 10);
          }
          setItems(filtered);
        } else {
          // Fallback manually
          const { data: profiles, error: pError } = await supabase
            .from('profiles')
            .select('team, team_id, arena_score')
            .not('team', 'is', null);
          
          if (pError) throw pError;

          const teamsMap = new Map();
          profiles?.forEach(p => {
             const tid = p.team_id || p.team;
             const tname = p.team;
             if (teamsMap.has(tid)) {
               const ext = teamsMap.get(tid);
               ext.score += p.arena_score || 0;
               ext.count += 1;
             } else {
               teamsMap.set(tid, { id: tid, name: tname, score: p.arena_score || 0, count: 1 });
             }
          });

          let result = Array.from(teamsMap.values()).map(t => ({
            id: t.id,
            name: t.name,
            score: Math.round(t.score),
            subtitle: `Equipe • ${t.count} Atletas`
          }));

          if (query) {
             result = result.filter(t => t.name.toLowerCase().includes(query.toLowerCase()));
          } else {
             result = result.sort((a,b) => b.score - a.score).slice(0, 10);
          }
          setItems(result);
        }
      }
    } catch (err) {
      console.error('Error fetching items for share modal:', err);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    if (isOpen) {
      fetchItems();
    } else {
      setSearch('');
      setItems([]);
    }
  }, [isOpen, fetchItems]);

  // Debounce search
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      fetchItems(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search, fetchItems, isOpen]);

  const handleShare = async (item: SelectionItem) => {
    setSharing(item.id);
    const shareType = type === 'athletes' ? 'atleta' : 'equipe';
    
    const text = type === 'athletes' 
      ? `Veja o ranking de ${item.name} na ArenaComp! 🔥`
      : `Veja o ranking da equipe ${item.name} na ArenaComp! 🏆`;

    const description = type === 'athletes'
      ? `Confira a posição de ${item.name} no ranking oficial da ArenaComp.`
      : `Confira a posição da equipe ${item.name} no ranking oficial da ArenaComp.`;

    // Create the standardized share payload
    const payload = {
      title: item.name,
      description: description,
      image: item.image,
      type: shareType,
      athleteName: item.name, // For backwards compatibility
      achievement: description // For backwards compatibility
    };

    try {
      // Encode standard payload to safe Base64
      const jsonString = JSON.stringify(payload);
      const base64Payload = btoa(unescape(encodeURIComponent(jsonString)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Generate the URL in the standardized format
      const shareUrl = `${window.location.origin}/share/${shareType}/${base64Payload}`;
      console.log('[GlobalRankingShareModal] Sharing URL:', shareUrl);

      if (navigator.share) {
        await navigator.share({
          title: 'Ranking ArenaComp',
          text: text,
          url: shareUrl,
        });
      } else {
        // Fallback to WhatsApp
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + " " + shareUrl)}`;
        window.open(whatsappUrl, '_blank');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    } finally {
      setSharing(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-[var(--surface)] border border-[var(--border-ui)] rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-[var(--border-ui)] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-[var(--primary)]/10 rounded-2xl text-[var(--primary)] text-sm">
                <Share2 size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter text-[var(--text-main)]">
                  Compartilhar {type === 'athletes' ? 'Atleta' : 'Equipe'}
                </h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Selecione para gerar o preview</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--border-ui)] rounded-full text-[var(--text-muted)] transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Search */}
          <div className="p-6 bg-black/20">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" size={18} />
              <input
                type="text"
                placeholder={`Buscar ${type === 'athletes' ? 'atleta' : 'equipe'}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-2xl py-4 pl-12 pr-4 text-sm font-bold placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]/50 transition-all"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)] space-y-4">
                <Loader2 className="animate-spin" size={32} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Buscando na Arena...</span>
              </div>
            ) : items.length > 0 ? (
              items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleShare(item)}
                  disabled={sharing !== null}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-[var(--primary)]/5 border border-transparent hover:border-[var(--primary)]/20 transition-all group text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-[var(--bg)] overflow-hidden border border-[var(--border-ui)] flex-shrink-0 flex items-center justify-center">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      type === 'athletes' ? <User size={20} className="text-[var(--text-muted)]" /> : <Users size={20} className="text-[var(--text-muted)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black uppercase italic text-[var(--text-main)] truncate group-hover:text-[var(--primary)] transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest truncate">
                      {item.subtitle}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div className="hidden sm:block">
                      <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Score</p>
                      <p className="text-lg font-black italic text-[var(--primary)] leading-none">{item.score}</p>
                    </div>
                    {sharing === item.id ? (
                      <Loader2 size={18} className="animate-spin text-[var(--primary)]" />
                    ) : (
                      <div className="p-2 bg-[var(--primary)]/10 rounded-xl text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                        <Share2 size={16} />
                      </div>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)] text-center space-y-2">
                <Trophy size={40} className="opacity-20 mb-2" />
                <p className="text-sm font-bold uppercase">Nenhum resultado</p>
                <p className="text-xs">Não encontramos nenhum {type === 'athletes' ? 'atleta' : 'equipe'} com esse nome.</p>
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="p-4 bg-black/40 border-t border-[var(--border-ui)]">
            <div className="flex items-center justify-center space-x-2 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span>Preview de ranking sincronizado com a Arena</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
