import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Target, MapPin, Calendar, User, Save, Camera, Award, Shield } from 'lucide-react';
import { supabase } from '../services/supabase';
import { modalities } from '../utils/data';
import { calculateAndUpdateStats } from '../services/arenaService';
import { ChampionshipPlacement } from '../types';

interface RegisterChampionshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  athleteId: string;
  onChampionshipRegistered: () => void;
}

export const RegisterChampionshipModal: React.FC<RegisterChampionshipModalProps> = ({ isOpen, onClose, athleteId, onChampionshipRegistered }) => {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    championship_name: '',
    modalidade: 'Jiu Jitsu',
    categoria_idade: 'Adulto',
    faixa: '',
    peso: '',
    cidade: '',
    pais: 'Brasil',
    data_evento: new Date().toISOString().split('T')[0],
    resultado: 'Campeão' as ChampionshipPlacement
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 2MB');
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
        alert('Formato não suportado. Use JPG ou PNG.');
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let foto_podio_url = '';

      // 1. Upload photo if exists
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${athleteId}/${Date.now()}.${fileExt}`;
        const filePath = `podiums/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('arena_media')
          .upload(filePath, photoFile);

        if (uploadError) {
          // If bucket doesn't exist, we might need to handle it or use base64 as fallback
          // For now, let's try to use the public URL if upload succeeds
          console.error('Upload error:', uploadError);
          // Fallback to base64 if storage fails (common in dev environments without bucket config)
          foto_podio_url = previewUrl || '';
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('arena_media')
            .getPublicUrl(filePath);
          foto_podio_url = publicUrl;
        }
      }

      // 2. Insert championship result
      const { error: insertError } = await supabase
        .from('championship_results')
        .insert([{
          athlete_id: athleteId,
          ...formData,
          foto_podio_url,
          created_at: new Date().toISOString()
        }]);

      if (insertError) throw insertError;

      // 3. Update athlete stats
      await calculateAndUpdateStats(athleteId);
      
      onChampionshipRegistered();
      onClose();
    } catch (error: any) {
      console.error('Error registering championship:', error);
      alert('Erro ao registrar campeonato: ' + error.message);
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
            className="bg-[var(--surface)] w-full max-w-2xl rounded-[2.5rem] overflow-hidden border border-[var(--border-ui)] shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-[var(--border-ui)] flex items-center justify-between bg-[var(--surface)] sticky top-0 z-10">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-[var(--primary)]/10 rounded-xl flex items-center justify-center text-[var(--primary)]">
                  <Trophy size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase italic tracking-tighter text-[var(--text-main)]">Registrar Campeonato</h2>
                  <p className="text-[var(--text-muted)] text-[8px] font-bold uppercase tracking-widest">Adicione uma conquista ao seu currículo</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                <X size={20} className="text-[var(--text-muted)]" />
              </button>
            </div>

            <div className="overflow-y-auto p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Photo Upload Section */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center space-x-2">
                    <Camera size={12} />
                    <span>Foto do Pódio ou Medalha (Opcional)</span>
                  </label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="relative aspect-video bg-[var(--bg)] border-2 border-dashed border-[var(--border-ui)] rounded-3xl overflow-hidden cursor-pointer group hover:border-[var(--primary)]/50 transition-all flex items-center justify-center"
                  >
                    {previewUrl ? (
                      <>
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <p className="text-white text-xs font-bold uppercase tracking-widest">Trocar Foto</p>
                        </div>
                      </>
                    ) : (
                      <div className="text-center space-y-2">
                        <div className="w-12 h-12 bg-[var(--surface)] rounded-2xl flex items-center justify-center mx-auto text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors">
                          <Camera size={24} />
                        </div>
                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Clique para enviar (JPG/PNG, máx 2MB)</p>
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Nome do Campeonato */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center space-x-2">
                      <Shield size={12} />
                      <span>Nome do Campeonato</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.championship_name}
                      onChange={e => setFormData({...formData, championship_name: e.target.value})}
                      className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-2xl px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-all"
                      placeholder="Ex: Copa São Paulo de Jiu-Jitsu"
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

                  {/* Categoria Idade */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center space-x-2">
                      <User size={12} />
                      <span>Categoria de Idade</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.categoria_idade}
                      onChange={e => setFormData({...formData, categoria_idade: e.target.value})}
                      className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-2xl px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-all"
                      placeholder="Ex: Adulto, Master 1"
                    />
                  </div>

                  {/* Faixa */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center space-x-2">
                      <Award size={12} />
                      <span>Faixa (Opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.faixa}
                      onChange={e => setFormData({...formData, faixa: e.target.value})}
                      className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-2xl px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-all"
                      placeholder="Ex: Faixa Azul"
                    />
                  </div>

                  {/* Peso */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center space-x-2">
                      <Target size={12} />
                      <span>Categoria de Peso</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.peso}
                      onChange={e => setFormData({...formData, peso: e.target.value})}
                      className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-2xl px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-all"
                      placeholder="Ex: Peso Leve (-76kg)"
                    />
                  </div>

                  {/* Resultado */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center space-x-2">
                      <Award size={12} />
                      <span>Resultado Final</span>
                    </label>
                    <select
                      value={formData.resultado}
                      onChange={e => setFormData({...formData, resultado: e.target.value as ChampionshipPlacement})}
                      className="w-full bg-[var(--bg)] border border-[var(--border-ui)] rounded-2xl px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-all"
                    >
                      <option value="Campeão">Campeão</option>
                      <option value="Vice-campeão">Vice-campeão</option>
                      <option value="Terceiro lugar">Terceiro lugar</option>
                      <option value="Participação">Participação</option>
                    </select>
                  </div>

                  {/* Data */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center space-x-2">
                      <Calendar size={12} />
                      <span>Data do Campeonato</span>
                    </label>
                    <input
                      required
                      type="date"
                      value={formData.data_evento}
                      onChange={e => setFormData({...formData, data_evento: e.target.value})}
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
                        <span>Salvar Campeonato</span>
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
