import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ChevronRight, ChevronLeft, Save, Loader2, 
  Trophy, MapPin, CreditCard, ShieldCheck, FileText, 
  Plus, Trash2, Calendar, Clock, Mail, Globe, Hash
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { Belt } from '../types';

interface CreateEventWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

const DEFAULT_CATEGORIES = [
  { nome: 'PRÉ MIRIM', idades: '4 e 5 anos', faixas: ['FAIXA BRANCA', 'FAIXA CINZA'] },
  { nome: 'MIRIM', idades: '6 e 7 anos', faixas: ['FAIXA BRANCA', 'FAIXA CINZA'] },
  { nome: 'INFANTIL A', idades: '8 e 9 anos', faixas: ['FAIXA BRANCA', 'FAIXA CINZA', 'FAIXA AMARELA', 'FAIXA LARANJA', 'FAIXA VERDE'] },
  { nome: 'INFANTIL B', idades: '10 e 11 anos', faixas: ['FAIXA BRANCA', 'FAIXA CINZA', 'FAIXA AMARELA', 'FAIXA LARANJA', 'FAIXA VERDE'] },
  { nome: 'INFANTO A', idades: '12 e 13 anos', faixas: ['FAIXA BRANCA', 'FAIXA CINZA', 'FAIXA AMARELA', 'FAIXA LARANJA', 'FAIXA VERDE'] },
  { nome: 'INFANTO B', idades: '14 e 15 anos', faixas: ['FAIXA BRANCA', 'FAIXA CINZA', 'FAIXA AMARELA', 'FAIXA LARANJA', 'FAIXA VERDE'] },
  { nome: 'JUVENIL', idades: '16 e 17 anos', faixas: ['FAIXA BRANCA', 'FAIXA AZUL', 'FAIXA ROXA'] },
  { nome: 'ADULTO', idades: '18 a 29 anos', faixas: ['FAIXA BRANCA', 'FAIXA AZUL', 'FAIXA ROXA', 'FAIXA MARROM', 'FAIXA PRETA'] },
  { nome: 'MASTER 1', idades: '30 a 35 anos', faixas: ['FAIXA BRANCA', 'FAIXA AZUL', 'FAIXA ROXA', 'FAIXA MARROM', 'FAIXA PRETA'] },
  { nome: 'MASTER 2', idades: '36 a 40 anos', faixas: ['FAIXA BRANCA', 'FAIXA AZUL', 'FAIXA ROXA', 'FAIXA MARROM', 'FAIXA PRETA'] },
  { nome: 'MASTER 3', idades: '41 a 45 anos', faixas: ['FAIXA BRANCA', 'FAIXA AZUL', 'FAIXA ROXA', 'FAIXA MARROM', 'FAIXA PRETA'] },
  { nome: 'MASTER 4', idades: '46 a 50 anos', faixas: ['FAIXA BRANCA', 'FAIXA AZUL', 'FAIXA ROXA', 'FAIXA MARROM', 'FAIXA PRETA'] },
  { nome: 'MASTER 5', idades: '51 a 55 anos', faixas: ['FAIXA BRANCA', 'FAIXA AZUL', 'FAIXA ROXA', 'FAIXA MARROM', 'FAIXA PRETA'] },
  { nome: 'MASTER 6', idades: '56+ anos', faixas: ['FAIXA BRANCA', 'FAIXA AZUL', 'FAIXA ROXA', 'FAIXA MARROM', 'FAIXA PRETA'] },
];

export default function CreateEventWizard({ onClose, onSuccess }: CreateEventWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(DEFAULT_CATEGORIES.map(c => c.nome));

  // Form State
  const [formData, setFormData] = useState({
    nome: '',
    edicao: 1,
    data: '',
    horario_inicio: '09:00',
    modalidade: 'GI',
    tipo_peso: 'com_kimono',
    cep: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    uf: '',
    ponto_referencia: '',
    google_maps_url: '',
    razao_social: '',
    email_contato: '',
    website: '',
    facebook_url: '',
    hashtag: '',
    aceita_cartao: true,
    cancelamento_automatico_dias: 15,
    abertura_checagem_geral: '',
    regra_abertura_checagem: 'IMEDIATO',
  });

  const [lotes, setLotes] = useState([
    { nome: '1º Lote', data_limite: '', valor_peso: 100, valor_peso_absoluto: 150 }
  ]);

  const [absoluto, setAbsoluto] = useState({
    ativo_masculino: false,
    ativo_feminino: false,
    premiacao_texto: '',
    min_50: 5,
    min_100: 10
  });

  const [regras, setRegras] = useState({
    master_no_adulto: false,
    luta_casada_menores: false,
    luta_casada_maiores: false,
    venda_camiseta: false,
    brinde_camiseta: false,
    pontuacao_equipe: true,
    ranking_individual: true,
    exibir_edital: true
  });

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada');

      // 1. Create Event
      const { data: event, error: eventError } = await supabase
        .from('eventos')
        .insert({
          ...formData,
          abertura_checagem_geral: formData.abertura_checagem_geral || null,
          coordenador_id: session.user.id,
          status: 'rascunho'
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // 2. Create Lotes
      const lotesData = lotes.map(l => ({ ...l, evento_id: event.id }));
      const { error: lotesError } = await supabase.from('event_lotes').insert(lotesData);
      if (lotesError) throw lotesError;

      // 3. Update Config Tables (Trigger already created them, we just update)
      await supabase.from('event_config_absoluto').update({
        ativo_masculino: absoluto.ativo_masculino,
        ativo_feminino: absoluto.ativo_feminino,
        premiacao_texto: absoluto.premiacao_texto,
        min_atletas_50_porcento: absoluto.min_50,
        min_atletas_100_porcento: absoluto.min_100
      }).eq('evento_id', event.id);

      await supabase.from('event_regras_especiais').update({
        master_no_adulto_absoluto: regras.master_no_adulto,
        luta_casada_menores: regras.luta_casada_menores,
        luta_casada_maiores: regras.luta_casada_maiores,
        venda_camiseta: regras.venda_camiseta,
        brinde_camiseta: regras.brinde_camiseta,
        pontuacao_equipe: regras.pontuacao_equipe,
        ranking_individual: regras.ranking_individual,
        exibir_edital: regras.exibir_edital
      }).eq('evento_id', event.id);

      // 4. Filter Categories (Trigger created all, we delete unselected)
      const categoriesToDelete = DEFAULT_CATEGORIES
        .filter(c => !selectedCategories.includes(c.nome))
        .map(c => c.nome);
      
      if (categoriesToDelete.length > 0) {
        await supabase
          .from('categorias_evento')
          .delete()
          .eq('evento_id', event.id)
          .in('nome', categoriesToDelete);
      }

      onSuccess();
    } catch (err: any) {
      console.error('Erro ao criar evento:', err);
      alert(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="label-standard">Nome do Evento</label>
                <input 
                  value={formData.nome}
                  onChange={e => setFormData({...formData, nome: e.target.value})}
                  className="input-standard" 
                  placeholder="Ex: COPA ARENA JIU-JITSU"
                />
              </div>
              <div className="space-y-2">
                <label className="label-standard">Nº Edição</label>
                <input 
                  type="number"
                  value={formData.edicao}
                  onChange={e => setFormData({...formData, edicao: parseInt(e.target.value)})}
                  className="input-standard" 
                />
              </div>
              <div className="space-y-2">
                <label className="label-standard">Data do Evento</label>
                <input 
                  type="date"
                  value={formData.data}
                  onChange={e => setFormData({...formData, data: e.target.value})}
                  className="input-standard" 
                />
              </div>
              <div className="space-y-2">
                <label className="label-standard">Horário de Início</label>
                <input 
                  type="time"
                  value={formData.horario_inicio}
                  onChange={e => setFormData({...formData, horario_inicio: e.target.value})}
                  className="input-standard" 
                />
              </div>
              <div className="space-y-2">
                <label className="label-standard">Modalidade</label>
                <select 
                  value={formData.modalidade}
                  onChange={e => setFormData({...formData, modalidade: e.target.value})}
                  className="input-standard"
                >
                  <option value="GI">GI (Com Kimono)</option>
                  <option value="NO-GI">NO-GI (Sem Kimono)</option>
                  <option value="AMBOS">AMBOS</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="label-standard">Tipo de Peso</label>
                <select 
                  value={formData.tipo_peso}
                  onChange={e => setFormData({...formData, tipo_peso: e.target.value as any})}
                  className="input-standard"
                >
                  <option value="com_kimono">Com Kimono</option>
                  <option value="sem_kimono">Sem Kimono</option>
                </select>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-sm font-black uppercase text-bjj-purple tracking-widest">Endereço e Organização</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="label-standard">CEP</label>
                <input 
                  value={formData.cep}
                  onChange={e => setFormData({...formData, cep: e.target.value})}
                  className="input-standard" 
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="label-standard">Endereço Completo</label>
                <input 
                  value={formData.endereco}
                  onChange={e => setFormData({...formData, endereco: e.target.value})}
                  className="input-standard" 
                />
              </div>
              <div className="space-y-2">
                <label className="label-standard">Cidade</label>
                <input 
                  value={formData.cidade}
                  onChange={e => setFormData({...formData, cidade: e.target.value})}
                  className="input-standard" 
                />
              </div>
              <div className="space-y-2">
                <label className="label-standard">UF</label>
                <input 
                  value={formData.uf}
                  onChange={e => setFormData({...formData, uf: e.target.value})}
                  className="input-standard" 
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <label className="label-standard">Razão Social</label>
                <input 
                  value={formData.razao_social}
                  onChange={e => setFormData({...formData, razao_social: e.target.value})}
                  className="input-standard" 
                />
              </div>
              <div className="space-y-2">
                <label className="label-standard">Email de Contato</label>
                <input 
                  value={formData.email_contato}
                  onChange={e => setFormData({...formData, email_contato: e.target.value})}
                  className="input-standard" 
                />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-sm font-black uppercase text-bjj-purple tracking-widest">Configurações Financeiras e Lotes</h3>
            <div className="card-surface p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[var(--text-main)]">Aceitar Cartão de Crédito</span>
                <input 
                  type="checkbox" 
                  checked={formData.aceita_cartao}
                  onChange={e => setFormData({...formData, aceita_cartao: e.target.checked})}
                  className="w-5 h-5 accent-bjj-purple"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[var(--text-main)]">Cancelamento Automático (dias)</span>
                <input 
                  type="number"
                  value={formData.cancelamento_automatico_dias}
                  onChange={e => setFormData({...formData, cancelamento_automatico_dias: parseInt(e.target.value)})}
                  className="w-20 input-standard py-1 px-3 text-center"
                />
              </div>

              <div className="pt-4 border-t border-[var(--border-ui)] space-y-4">
                <h4 className="text-xs font-black uppercase text-bjj-purple tracking-widest">Abertura da Checagem Geral</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, regra_abertura_checagem: 'IMEDIATO'})}
                    className={`p-4 border-2 rounded-2xl text-left transition-all ${formData.regra_abertura_checagem === 'IMEDIATO' ? 'border-bjj-purple bg-bjj-purple/5' : 'border-[var(--border-ui)] hover:border-bjj-purple/30'}`}
                  >
                    <p className="font-bold text-sm text-[var(--text-main)]">Imediato</p>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase">Junto com o início das inscrições</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, regra_abertura_checagem: 'QUARTA_ANTECEDENTE'})}
                    className={`p-4 border-2 rounded-2xl text-left transition-all ${formData.regra_abertura_checagem === 'QUARTA_ANTECEDENTE' ? 'border-bjj-purple bg-bjj-purple/5' : 'border-[var(--border-ui)] hover:border-bjj-purple/30'}`}
                  >
                    <p className="font-bold text-sm text-[var(--text-main)]">Quarta-feira Antecedente</p>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase">Apenas na última quarta antes do evento</p>
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black uppercase text-[var(--text-muted)] tracking-widest">Lotes de Inscrição</h4>
                <button 
                  onClick={() => setLotes([...lotes, { nome: `Lote ${lotes.length + 1}`, data_limite: '', valor_peso: 100, valor_peso_absoluto: 150 }])}
                  className="text-xs font-bold text-bjj-purple flex items-center gap-1"
                >
                  <Plus size={14} /> Adicionar Lote
                </button>
              </div>
              {lotes.map((lote, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-[var(--border-ui)] rounded-2xl bg-[var(--bg-surface)]">
                  <input 
                    value={lote.nome}
                    onChange={e => {
                      const newLotes = [...lotes];
                      newLotes[idx].nome = e.target.value;
                      setLotes(newLotes);
                    }}
                    className="bg-transparent font-bold outline-none text-[var(--text-main)]"
                    placeholder="Nome do Lote"
                  />
                  <input 
                    type="date"
                    value={lote.data_limite}
                    onChange={e => {
                      const newLotes = [...lotes];
                      newLotes[idx].data_limite = e.target.value;
                      setLotes(newLotes);
                    }}
                    className="bg-transparent outline-none text-xs text-[var(--text-main)]"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[var(--text-muted)]">Peso:</span>
                    <input 
                      type="number"
                      value={lote.valor_peso}
                      onChange={e => {
                        const newLotes = [...lotes];
                        newLotes[idx].valor_peso = parseFloat(e.target.value);
                        setLotes(newLotes);
                      }}
                      className="w-full bg-transparent outline-none font-bold text-[var(--text-main)]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[var(--text-muted)]">Abs:</span>
                    <input 
                      type="number"
                      value={lote.valor_peso_absoluto}
                      onChange={e => {
                        const newLotes = [...lotes];
                        newLotes[idx].valor_peso_absoluto = parseFloat(e.target.value);
                        setLotes(newLotes);
                      }}
                      className="w-full bg-transparent outline-none font-bold text-[var(--text-main)]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-sm font-black uppercase text-bjj-purple tracking-widest">Categorias Habilitadas</h3>
            <p className="text-xs text-[var(--text-muted)]">Selecione as categorias que estarão disponíveis para inscrição.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
              {DEFAULT_CATEGORIES.map(cat => (
                <div 
                  key={cat.nome}
                  onClick={() => {
                    if (selectedCategories.includes(cat.nome)) {
                      setSelectedCategories(selectedCategories.filter(c => c !== cat.nome));
                    } else {
                      setSelectedCategories([...selectedCategories, cat.nome]);
                    }
                  }}
                  className={`p-4 border-2 rounded-2xl cursor-pointer transition-all flex items-center justify-between ${selectedCategories.includes(cat.nome) ? 'border-bjj-purple bg-bjj-purple/5' : 'border-[var(--border-ui)] hover:border-bjj-purple/30'}`}
                >
                  <div>
                    <h5 className="font-black text-sm text-[var(--text-main)] uppercase">{cat.nome}</h5>
                    <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase">{cat.idades}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedCategories.includes(cat.nome) ? 'border-bjj-purple bg-bjj-purple text-white' : 'border-[var(--border-ui)]'}`}>
                    {selectedCategories.includes(cat.nome) && <ShieldCheck size={14} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-sm font-black uppercase text-bjj-purple tracking-widest">Absoluto e Regras Especiais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card-surface p-6 space-y-4">
                <h4 className="text-xs font-black uppercase text-bjj-purple tracking-widest">Divisão Absoluto</h4>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">Masculino</span>
                  <input type="checkbox" checked={absoluto.ativo_masculino} onChange={e => setAbsoluto({...absoluto, ativo_masculino: e.target.checked})} className="w-5 h-5 accent-bjj-purple" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">Feminino</span>
                  <input type="checkbox" checked={absoluto.ativo_feminino} onChange={e => setAbsoluto({...absoluto, ativo_feminino: e.target.checked})} className="w-5 h-5 accent-bjj-purple" />
                </div>
                <div className="space-y-2">
                  <label className="label-standard">Premiação</label>
                  <textarea 
                    value={absoluto.premiacao_texto}
                    onChange={e => setAbsoluto({...absoluto, premiacao_texto: e.target.value})}
                    className="input-standard min-h-[100px] text-xs"
                    placeholder="Descreva a premiação..."
                  />
                </div>
              </div>
              <div className="card-surface p-6 space-y-4">
                <h4 className="text-xs font-black uppercase text-bjj-purple tracking-widest">Outras Regras</h4>
                {[
                  { label: 'Master no Adulto Absoluto', key: 'master_no_adulto' },
                  { label: 'Luta Casada Menores', key: 'luta_casada_menores' },
                  { label: 'Luta Casada Maiores', key: 'luta_casada_maiores' },
                  { label: 'Venda de Camiseta', key: 'venda_camiseta' },
                  { label: 'Pontuação por Equipe', key: 'pontuacao_equipe' },
                  { label: 'Ranking Individual', key: 'ranking_individual' },
                ].map(rule => (
                  <div key={rule.key} className="flex items-center justify-between">
                    <span className="text-sm font-bold">{rule.label}</span>
                    <input 
                      type="checkbox" 
                      checked={(regras as any)[rule.key]} 
                      onChange={e => setRegras({...regras, [rule.key]: e.target.checked})} 
                      className="w-5 h-5 accent-bjj-purple" 
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[var(--bg-card)] w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden border border-[var(--border-ui)] flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-8 border-b border-[var(--border-ui)] flex justify-between items-center bg-gradient-to-r from-bjj-purple/5 to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-bjj-purple rounded-2xl flex items-center justify-center text-white shadow-lg shadow-bjj-purple/30">
              <Trophy size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black font-display text-[var(--text-main)] uppercase tracking-tight">Novo Campeonato</h3>
              <div className="flex gap-2 mt-1">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={`h-1 rounded-full transition-all ${i <= step ? 'w-8 bg-bjj-purple' : 'w-4 bg-[var(--border-ui)]'}`} />
                ))}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--border-ui)] rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-[var(--border-ui)] flex justify-between items-center bg-[var(--bg-app)]/50">
          <button 
            onClick={step === 1 ? onClose : handleBack}
            className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
          >
            <ChevronLeft size={20} />
            {step === 1 ? 'Cancelar' : 'Voltar'}
          </button>
          
          <button 
            onClick={step === 5 ? handleSubmit : handleNext}
            disabled={loading}
            className="btn-primary bg-bjj-purple hover:bg-bjj-purple/90 border-bjj-purple py-4 px-10 text-lg font-black uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-bjj-purple/20"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : (step === 5 ? <Save size={24} /> : <ChevronRight size={24} />)}
            {loading ? 'Processando...' : (step === 5 ? 'Finalizar e Criar' : 'Próximo Passo')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
