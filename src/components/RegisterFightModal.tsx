import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Target, MapPin, Calendar, User, Save, Award } from 'lucide-react';
import { supabase } from '../services/supabase';
import { modalities } from '../utils/data';
import { calculateAndUpdateStats } from '../services/arenaService';

interface RegisterFightModalProps {
  isOpen: boolean;
  onClose: () => void;
  athleteId: string;
  onFightRegistered: () => void;
}

export const RegisterFightModal: React.FC<RegisterFightModalProps> = ({ isOpen, onClose, athleteId, onFightRegistered }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    opponent_name: '',
    modalidade: 'Jiu-Jitsu',
    resultado: 'win' as 'win' | 'loss',
    tipo_vitoria: 'pontos' as any,
    evento: '',
    cidade: '',
    pais: 'Brasil',
    data_luta: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('fights')
        .insert([{
          athlete_id: athleteId,
          ...formData,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      // Update athlete stats
      await calculateAndUpdateStats(athleteId);
      
      onFightRegistered();
      onClose();
    } catch (error: any) {
      console.error('Error registering fight:', error);
      alert('Erro ao registrar luta: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-[var(--surface)] w-full max-w-2xl rounded-[2.5rem] overflow-hidden border border-[var(--border-ui)] shadow-2xl"
          >
            <div className="p-8 space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center text-[var(--primary)]">
                    <Trophy size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[var(--text-main)]">Registrar Luta</h2>
                    <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest">Adicione um novo combate ao seu currículo</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                  <X size={24} className="text-[var(--text-muted)]" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Oponente */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center space-x-2">
                      <User size={12} />
                      <span>Nome do Oponente</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.opponent_name}
                      onChange={e => setFormData({...formData, opponent_name: e.target.value})}
                      className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-2xl px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-all"
                      placeholder="Ex: John Doe"
                    />
                  </div>

                  {/* Modalidade */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center space-x-2">
                      <Trophy size={12} />
                      <span>Modalidade</span>
                    </label>
                    <select
                      value={formData.modalidade}
                      onChange={e => setFormData({...formData, modalidade: e.target.value})}
                      className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-2xl px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-all"
                    >
                      {modalities.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  {/* Resultado */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center space-x-2">
                      <Target size={12} />
                      <span>Resultado</span>
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, resultado: 'win'})}
                        className={`py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border ${
                          formData.resultado === 'win' 
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' 
                            : 'bg-[var(--bg)] border-[var(--border-ui)] text-[var(--text-muted)]'
                        }`}
                      >
                        Vitória
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, resultado: 'loss'})}
                        className={`py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border ${
                          formData.resultado === 'loss' 
                            ? 'bg-rose-500/10 border-rose-500 text-rose-500' 
                            : 'bg-[var(--bg)] border-[var(--border-ui)] text-[var(--text-muted)]'
                        }`}
                      >
                        Derrota
                      </button>
                    </div>
                  </div>

                  {/* Tipo de Vitória */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center space-x-2">
                      <Award size={12} />
                      <span>Tipo de Vitória/Derrota</span>
                    </label>
                    <select
                      value={formData.tipo_vitoria}
                      onChange={e => setFormData({...formData, tipo_vitoria: e.target.value as any})}
                      className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-2xl px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-all"
                    >
                      <option value="pontos">Pontos</option>
                      <option value="finalização">Finalização</option>
                      <option value="nocaute">Nocaute</option>
                      <option value="decisão">Decisão</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>

                  {/* Evento */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center space-x-2">
                      <Trophy size={12} />
                      <span>Evento / Campeonato</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.evento}
                      onChange={e => setFormData({...formData, evento: e.target.value})}
                      className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-2xl px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-all"
                      placeholder="Ex: Mundial IBJJF"
                    />
                  </div>

                  {/* Data */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center space-x-2">
                      <Calendar size={12} />
                      <span>Data da Luta</span>
                    </label>
                    <input
                      required
                      type="date"
                      value={formData.data_luta}
                      onChange={e => setFormData({...formData, data_luta: e.target.value})}
                      className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-2xl px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-all"
                    />
                  </div>

                  {/* Cidade */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center space-x-2">
                      <MapPin size={12} />
                      <span>Cidade</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.cidade}
                      onChange={e => setFormData({...formData, cidade: e.target.value})}
                      className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-2xl px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-all"
                      placeholder="Ex: São Paulo"
                    />
                  </div>

                  {/* País */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center space-x-2">
                      <MapPin size={12} />
                      <span>País</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.pais}
                      onChange={e => setFormData({...formData, pais: e.target.value})}
                      className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-2xl px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-all"
                      placeholder="Ex: Brasil"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[var(--primary)] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[var(--primary-highlight)] transition-all shadow-xl shadow-[var(--primary)]/20 flex items-center justify-center space-x-3 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save size={18} />
                        <span>Salvar Luta</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
