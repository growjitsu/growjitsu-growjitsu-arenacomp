import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Target, Calendar, Trophy, Send, Search, User, ChevronDown } from 'lucide-react';
import { challengeService } from '../services/challengeService';
import { getActivePromotions, searchAthletes } from '../services/arenaService';
import { ArenaProfile, ArenaAd } from '../types';

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  challengerId: string;
  challengedProfile?: ArenaProfile;
}

export const ChallengeModal: React.FC<ChallengeModalProps> = ({ isOpen, onClose, challengerId, challengedProfile: initialProfile }) => {
  const [loading, setLoading] = useState(false);
  const [eventName, setEventName] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(undefined);
  const [message, setMessage] = useState('');
  
  // Athlete Search State
  const [selectedProfile, setSelectedProfile] = useState<ArenaProfile | undefined>(initialProfile);
  const [athleteSearchQuery, setAthleteSearchQuery] = useState('');
  const [athleteSearchResults, setAthleteSearchResults] = useState<ArenaProfile[]>([]);
  const [searchingAthletes, setSearchingAthletes] = useState(false);
  
  // Event Selection State
  const [activePromotions, setActivePromotions] = useState<ArenaAd[]>([]);
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const eventDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadPromotions();
      setSelectedProfile(initialProfile);
      setAthleteSearchQuery('');
      setAthleteSearchResults([]);
      // Load initial 30 athletes if searching is needed
      if (!initialProfile) {
        handleAthleteSearch('', true);
      }
    }
  }, [isOpen, initialProfile]);

  const searchTimeout = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (eventDropdownRef.current && !eventDropdownRef.current.contains(event.target as Node)) {
        setShowEventDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadPromotions = async () => {
    try {
      const promotions = await getActivePromotions();
      setActivePromotions(promotions);
    } catch (err) {
      console.error('Error loading promotions:', err);
    }
  };

  const handleAthleteSearch = async (query: string, immediate = false) => {
    setAthleteSearchQuery(query);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    const performSearch = async () => {
      setSearchingAthletes(true);
      try {
        const results = await searchAthletes(query);
        // Filter out the challenger themselves
        setAthleteSearchResults(results.filter(p => p.id !== challengerId));
      } catch (err) {
        console.error('Error searching athletes:', err);
      } finally {
        setSearchingAthletes(false);
      }
    };

    if (query.trim().length === 0 || immediate) {
      performSearch();
    } else {
      searchTimeout.current = setTimeout(performSearch, 300);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // VALIDATION BEFORE INSERT
    if (!selectedProfile?.id) {
      alert('Por favor, selecione um atleta válido para desafiar.');
      return;
    }

    // Ensure it's a UUID (basic check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(selectedProfile.id)) {
      alert('Erro: ID do atleta inválido (Não é um UUID válido).');
      return;
    }

    setLoading(true);

    try {
      console.log('[CHALLENGE] Sending challenge application:', {
        challenger: challengerId,
        challenged: selectedProfile.id,
        event: selectedEventId || eventName
      });

      await challengeService.createChallenge(
        challengerId,
        selectedProfile.id, // Ensure we send the .id (UUID)
        selectedEventId,
        eventName.toUpperCase()
      );
      alert('Desafio enviado com sucesso!');
      onClose();
    } catch (err: any) {
      console.error('CRITICAL: Error creating challenge:', err);
      
      // Detailed error for FK violations
      let errorMsg = err.message || 'Erro desconhecido';
      if (err.details) errorMsg += ` - ${err.details}`;
      if (err.hint) errorMsg += ` (${err.hint})`;

      if (errorMsg.includes('foreign key constraint')) {
        alert(`Erro de Integridade: O atleta selecionado (ID: ${selectedProfile.id}) não pode ser desafiado pois não foi encontrado na tabela de referência do banco de dados. \n\nDetalhes técnicos: ${errorMsg}`);
      } else {
        alert('Erro ao enviar desafio: ' + errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-[var(--surface)] w-full max-w-md rounded-[2.5rem] overflow-hidden border border-[var(--border-ui)] shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b border-[var(--border-ui)] flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-[var(--primary)]/10 rounded-xl flex items-center justify-center text-[var(--primary)]">
                  <Target size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase italic tracking-tighter text-[var(--text-main)]">Lançar Desafio</h2>
                  <p className="text-[var(--text-muted)] text-[8px] font-bold uppercase tracking-widest">
                    {selectedProfile ? `@${selectedProfile.username}` : 'Selecione um oponente'}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                <X size={20} className="text-[var(--text-muted)]" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Profile Selection / Search */}
              {!selectedProfile ? (
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center space-x-2">
                    <Search size={12} />
                    <span>Quem você deseja desafiar?</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={athleteSearchQuery}
                      onChange={e => handleAthleteSearch(e.target.value)}
                      className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-2xl px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-all"
                      placeholder="Pesquisar por nome ou equipe..."
                    />
                    {searchingAthletes && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  {athleteSearchResults.length > 0 && (
                    <div className="space-y-2 bg-[var(--bg)]/50 p-2 rounded-2xl border border-[var(--border-ui)]">
                      {athleteSearchResults.map(result => (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => setSelectedProfile(result)}
                          className="w-full flex items-center space-x-3 p-2 hover:bg-[var(--primary)]/10 rounded-xl transition-colors text-left"
                        >
                          <img 
                            src={result.profile_photo || result.avatar_url || 'https://via.placeholder.com/150'} 
                            alt="" 
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <p className="text-xs font-black text-[var(--text-main)] uppercase">{result.full_name}</p>
                            <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest">{result.team || 'Sem Equipe'}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-[var(--bg)]/50 p-4 rounded-2xl border border-[var(--border-ui)] flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <img 
                      src={selectedProfile.profile_photo || selectedProfile.avatar_url || 'https://via.placeholder.com/150'} 
                      alt="" 
                      className="w-12 h-12 rounded-full object-cover border-2 border-[var(--primary)]"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <p className="text-sm font-black text-[var(--text-main)] uppercase">{selectedProfile.full_name}</p>
                      <p className="text-[10px] text-[var(--primary)] font-bold uppercase tracking-widest">{selectedProfile.modality} • {selectedProfile.graduation}</p>
                    </div>
                  </div>
                  {!initialProfile && (
                    <button 
                      type="button"
                      onClick={() => setSelectedProfile(undefined)}
                      className="p-2 hover:bg-white/5 rounded-lg text-rose-500"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-4">
                {/* Event Selection */}
                <div className="space-y-2 relative" ref={eventDropdownRef}>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center space-x-2">
                    <Trophy size={12} />
                    <span>Evento do Desafio</span>
                  </label>
                  
                  <div className="relative">
                    <input
                      type="text"
                      value={eventName}
                      onChange={e => {
                        setEventName(e.target.value);
                        setSelectedEventId(undefined);
                        setShowEventDropdown(true);
                      }}
                      onFocus={() => setShowEventDropdown(true)}
                      className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-2xl px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-all uppercase"
                      placeholder="PESQUISE OU DIGITE O EVENTO..."
                    />
                    <ChevronDown 
                      size={18} 
                      className={`absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-transform ${showEventDropdown ? 'rotate-180' : ''}`} 
                    />
                  </div>

                  <AnimatePresence>
                    {showEventDropdown && activePromotions.filter(p => p.title.toUpperCase().includes(eventName.toUpperCase())).length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-[120] left-0 right-0 mt-2 bg-[var(--surface)] border border-[var(--border-ui)] rounded-2xl shadow-xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar"
                      >
                        {activePromotions
                          .filter(p => p.title.toUpperCase().includes(eventName.toUpperCase()))
                          .map(promo => (
                            <button
                              key={promo.id}
                              type="button"
                              onClick={() => {
                                setEventName(promo.title.toUpperCase());
                                setSelectedEventId(promo.id);
                                setShowEventDropdown(false);
                              }}
                              className="w-full flex items-center space-x-3 p-3 hover:bg-[var(--primary)]/10 transition-colors text-left border-b border-[var(--border-ui)] last:border-0"
                            >
                              <div className="w-8 h-8 bg-[var(--primary)]/10 rounded-lg flex items-center justify-center text-[var(--primary)]">
                                <Trophy size={14} />
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-[var(--text-main)] uppercase">{promo.title}</p>
                                <p className="text-[8px] text-[var(--text-muted)] font-bold uppercase">{promo.city} • {promo.state}</p>
                              </div>
                            </button>
                          ))
                        }
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <p className="text-[9px] text-[var(--text-muted)] italic leading-tight">
                    Selecione um campeonato ativo para automatizar o resultado com base no comparecimento.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center space-x-2">
                    <Send size={12} />
                    <span>Mensagem Particular</span>
                  </label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-2xl px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-all min-h-[80px] resize-none"
                    placeholder="Mande um recado para seu oponente..."
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !selectedProfile}
                className="w-full py-4 bg-[var(--primary)] text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[var(--primary-highlight)] transition-all shadow-lg shadow-[var(--primary)]/20 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Target size={18} />
                    <span>Enviar Desafio 1x1</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
