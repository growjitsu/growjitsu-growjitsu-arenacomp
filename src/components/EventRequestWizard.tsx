import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, CheckCircle2, MessageSquare, Loader2, Upload, ShieldCheck, Info, Users, Trophy, MapPin } from 'lucide-react';
import { supabase } from '../services/supabase';
import { maskCPF, maskCNPJ, maskCEP, maskPhone, validateCPF, validateCNPJ } from '../utils/masks';

const ESTADOS_BR = [
  { uf: 'AC', nome: 'Acre' }, { uf: 'AL', nome: 'Alagoas' }, { uf: 'AP', nome: 'Amapá' },
  { uf: 'AM', nome: 'Amazonas' }, { uf: 'BA', nome: 'Bahia' }, { uf: 'CE', nome: 'Ceará' },
  { uf: 'DF', nome: 'Distrito Federal' }, { uf: 'ES', nome: 'Espírito Santo' }, { uf: 'GO', nome: 'Goiás' },
  { uf: 'MA', nome: 'Maranhão' }, { uf: 'MT', nome: 'Mato Grosso' }, { uf: 'MS', nome: 'Mato Grosso do Sul' },
  { uf: 'MG', nome: 'Minas Gerais' }, { uf: 'PA', nome: 'Pará' }, { uf: 'PB', nome: 'Paraíba' },
  { uf: 'PR', nome: 'Paraná' }, { uf: 'PE', nome: 'Pernambuco' }, { uf: 'PI', nome: 'Piauí' },
  { uf: 'RJ', nome: 'Rio de Janeiro' }, { uf: 'RN', nome: 'Rio Grande do Norte' }, { uf: 'RS', nome: 'Rio Grande do Sul' },
  { uf: 'RO', nome: 'Rondônia' }, { uf: 'RR', nome: 'Roraima' }, { uf: 'SC', nome: 'Santa Catarina' },
  { uf: 'SP', nome: 'São Paulo' }, { uf: 'SE', nome: 'Sergipe' }, { uf: 'TO', nome: 'Tocantins' }
];

interface EventRequestWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function EventRequestWizard({ onClose, onSuccess }: EventRequestWizardProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingCEP, setIsSearchingCEP] = useState(false);
  
  const [formData, setFormData] = useState({
    modalidade: '',
    modalidadeOutros: '',
    responsavelNome: '',
    responsavelEmail: '',
    responsavelCPF: '',
    responsavelRG: '',
    responsavelCelular: '',
    responsavelProfissao: '',
    tipoNota: 'PF' as 'PF' | 'PJ',
    fiscalRazaoSocial: '',
    fiscalDocumento: '',
    fiscalCEP: '',
    fiscalEndereco: '',
    fiscalNumero: '',
    fiscalBairro: '',
    fiscalCidade: '',
    fiscalEstado: '',
    fiscalComplemento: '',
    documentacaoUrl: '',
    // Event Data (Step 4)
    eventoNome: '',
    eventoData: '',
    eventoHorario: '',
    eventoLocal: ''
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleCEPBlur = async () => {
    const cep = formData.fiscalCEP.replace(/\D/g, '');
    if (cep.length !== 8) return;

    setIsSearchingCEP(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          fiscalEndereco: data.logradouro,
          fiscalBairro: data.bairro,
          fiscalCidade: data.localidade,
          fiscalEstado: data.uf
        }));
      }
    } catch (err) {
      console.error('Erro ao buscar CEP:', err);
    } finally {
      setIsSearchingCEP(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) return;

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão não encontrada');

      let logoUrl = '';
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;
        const filePath = `logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('eventos-logos')
          .upload(filePath, logoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('eventos-logos')
          .getPublicUrl(filePath);
        
        logoUrl = publicUrl;
      }

      // 1. Create Event Request (pedidos_evento)
      const { data: pedido, error: pedidoError } = await supabase.from('pedidos_evento').insert({
        coordenador_id: session.user.id,
        modalidade: formData.modalidade === 'Outros' ? formData.modalidadeOutros : formData.modalidade,
        modalidade_outros: formData.modalidade === 'Outros' ? formData.modalidadeOutros : null,
        responsavel_nome: formData.responsavelNome,
        responsavel_email: formData.responsavelEmail,
        responsavel_cpf: formData.responsavelCPF,
        responsavel_rg: formData.responsavelRG,
        responsavel_celular: formData.responsavelCelular,
        responsavel_profissao: formData.responsavelProfissao,
        tipo_nota: formData.tipoNota,
        fiscal_razao_social: formData.fiscalRazaoSocial,
        fiscal_documento: formData.fiscalDocumento,
        fiscal_cep: formData.fiscalCEP,
        fiscal_endereco: formData.fiscalEndereco,
        fiscal_numero: formData.fiscalNumero,
        fiscal_bairro: formData.fiscalBairro,
        fiscal_cidade: formData.fiscalCidade,
        fiscal_estado: formData.fiscalEstado,
        fiscal_complemento: formData.fiscalComplemento,
        status: 'analise'
      }).select().single();

      if (pedidoError) throw pedidoError;

      // 2. Create the Event itself (eventos)
      const { error: eventoError } = await supabase.from('eventos').insert({
        coordenador_id: session.user.id,
        nome: formData.eventoNome,
        data: formData.eventoData,
        horario_inicio: formData.eventoHorario,
        local: formData.eventoLocal,
        logo_url: logoUrl,
        status: 'rascunho'
      });

      if (eventoError) throw eventoError;

      onSuccess();
    } catch (err: any) {
      alert(`Erro ao enviar pedido: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.modalidade) return;
      if (formData.modalidade === 'Outros' && !formData.modalidadeOutros) return;
    }
    setStep(prev => prev + 1);
  };

  const prevStep = () => setStep(prev => prev - 1);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-0 md:p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[var(--bg-app)] w-full max-w-4xl min-h-screen md:min-h-0 md:rounded-3xl shadow-2xl relative overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-[var(--border-ui)] flex justify-between items-center bg-[var(--bg-card)] sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-bjj-purple/10 flex items-center justify-center text-bjj-purple font-black">
              {step}
            </div>
            <div>
              <h2 className="text-lg font-black font-display text-[var(--text-main)]">
                {step === 1 ? 'Modalidade do Evento' : step === 2 ? 'Informações e Regras' : step === 3 ? 'Dados do Responsável' : 'Dados do Evento'}
              </h2>
              <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Etapa {step} de 4</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[var(--border-ui)] rounded-full transition-colors text-[var(--text-muted)]"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 md:p-10 overflow-y-auto max-h-[calc(100vh-160px)]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <h3 className="text-3xl font-black font-display text-[var(--text-main)]">Selecione a Modalidade do Evento</h3>
                  <p className="text-[var(--text-muted)]">Escolha o tipo de competição que você deseja organizar.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {['Jiu Jitsu', 'Judô', 'NoGi', 'Outros'].map(mod => (
                    <button
                      key={mod}
                      onClick={() => setFormData(prev => ({ ...prev, modalidade: mod }))}
                      className={`p-6 rounded-2xl border-2 transition-all text-left flex items-center justify-between group ${
                        formData.modalidade === mod 
                          ? 'border-bjj-purple bg-bjj-purple/5' 
                          : 'border-[var(--border-ui)] hover:border-bjj-purple/30 bg-[var(--bg-card)]'
                      }`}
                    >
                      <span className={`text-lg font-black ${formData.modalidade === mod ? 'text-bjj-purple' : 'text-[var(--text-main)]'}`}>
                        {mod}
                      </span>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        formData.modalidade === mod ? 'border-bjj-purple bg-bjj-purple text-white' : 'border-[var(--border-ui)]'
                      }`}>
                        {formData.modalidade === mod && <CheckCircle2 size={14} />}
                      </div>
                    </button>
                  ))}
                </div>

                {formData.modalidade === 'Outros' && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    <label className="text-xs font-bold uppercase text-[var(--text-muted)]">Qual a modalidade?</label>
                    <input 
                      required
                      value={formData.modalidadeOutros}
                      onChange={e => setFormData(prev => ({ ...prev, modalidadeOutros: e.target.value }))}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl py-4 px-6 text-[var(--text-main)] focus:ring-2 focus:ring-bjj-purple/50 outline-none transition-all"
                      placeholder="Digite o nome da modalidade..."
                    />
                  </motion.div>
                )}

                <div className="pt-6">
                  <button 
                    onClick={nextStep}
                    disabled={!formData.modalidade || (formData.modalidade === 'Outros' && !formData.modalidadeOutros)}
                    className="w-full btn-primary bg-bjj-purple hover:bg-bjj-purple/90 border-bjj-purple py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Avançar <ChevronRight size={20} />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  <button 
                    onClick={nextStep}
                    className="flex-1 btn-primary bg-bjj-purple hover:bg-bjj-purple/90 border-bjj-purple py-4 text-lg"
                  >
                    Continuar criando evento
                  </button>
                  <a 
                    href="https://wa.me/5511961440548?text=Preciso%20tirar%20duvidas%20sobre%20a%20criacao%20de%20eventos."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 btn-outline py-4 text-lg flex items-center justify-center gap-2"
                  >
                    <MessageSquare size={20} /> Tirar dúvidas
                  </a>
                </div>

                <div className="card-surface p-8 space-y-6 bg-gradient-to-br from-bjj-purple/5 to-transparent">
                  <div className="flex items-center gap-3 text-bjj-purple">
                    <Info size={24} />
                    <h4 className="text-xl font-black font-display">Informações Importantes</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-[var(--text-muted)]">Comissão da Plataforma</p>
                      <p className="text-2xl font-black text-[var(--text-main)]">11% <span className="text-sm font-medium opacity-60">sobre valor bruto</span></p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-[var(--text-muted)]">Inscrição Mínima</p>
                      <p className="text-2xl font-black text-[var(--text-main)]">R$ 12,00 <span className="text-sm font-medium opacity-60">por atleta</span></p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-[var(--text-muted)]">Valor Cortesia</p>
                      <p className="text-2xl font-black text-[var(--text-main)]">R$ 12,00 <span className="text-sm font-medium opacity-60">por vaga</span></p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-[var(--text-muted)]">Faturamento Mínimo</p>
                      <p className="text-2xl font-black text-[var(--text-main)]">R$ 1.300,00 <span className="text-sm font-medium opacity-60">por evento</span></p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-6">
                  <button onClick={prevStep} className="btn-outline px-8">Voltar</button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div className="space-y-2">
                  <h3 className="text-2xl font-black font-display text-[var(--text-main)]">Preencha o formulário abaixo para enviar o seu Pedido de Evento</h3>
                  <p className="text-sm text-[var(--text-muted)]">Em seguida nossa Equipe Comercial irá analisar suas informações e entrará em contato.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-12">
                  {/* Seção 1: Responsável Legal */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 pb-2 border-b border-[var(--border-ui)]">
                      <Users className="text-bjj-purple" size={20} />
                      <h4 className="font-black uppercase text-xs tracking-widest text-bjj-purple">Dados do Responsável Legal</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Nome Completo</label>
                        <input 
                          required
                          value={formData.responsavelNome}
                          onChange={e => setFormData(prev => ({ ...prev, responsavelNome: e.target.value }))}
                          className="w-full bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl py-3 px-4 text-sm text-[var(--text-main)] focus:ring-2 focus:ring-bjj-purple/50 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Email</label>
                        <input 
                          required
                          type="email"
                          value={formData.responsavelEmail}
                          onChange={e => setFormData(prev => ({ ...prev, responsavelEmail: e.target.value }))}
                          className="w-full bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl py-3 px-4 text-sm text-[var(--text-main)] focus:ring-2 focus:ring-bjj-purple/50 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">CPF</label>
                        <input 
                          required
                          value={formData.responsavelCPF}
                          onChange={e => setFormData(prev => ({ ...prev, responsavelCPF: maskCPF(e.target.value) }))}
                          className="w-full bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl py-3 px-4 text-sm text-[var(--text-main)] focus:ring-2 focus:ring-bjj-purple/50 outline-none"
                          placeholder="000.000.000-00"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">RG</label>
                        <input 
                          required
                          value={formData.responsavelRG}
                          onChange={e => setFormData(prev => ({ ...prev, responsavelRG: e.target.value }))}
                          className="w-full bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl py-3 px-4 text-sm text-[var(--text-main)] focus:ring-2 focus:ring-bjj-purple/50 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Celular</label>
                        <input 
                          required
                          value={formData.responsavelCelular}
                          onChange={e => setFormData(prev => ({ ...prev, responsavelCelular: maskPhone(e.target.value) }))}
                          className="w-full bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl py-3 px-4 text-sm text-[var(--text-main)] focus:ring-2 focus:ring-bjj-purple/50 outline-none"
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Profissão</label>
                        <input 
                          required
                          value={formData.responsavelProfissao}
                          onChange={e => setFormData(prev => ({ ...prev, responsavelProfissao: e.target.value }))}
                          className="w-full bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl py-3 px-4 text-sm text-[var(--text-main)] focus:ring-2 focus:ring-bjj-purple/50 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seção 2: Emissão de Nota Fiscal */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 pb-2 border-b border-[var(--border-ui)]">
                      <Trophy className="text-bjj-purple" size={20} />
                      <h4 className="font-black uppercase text-xs tracking-widest text-bjj-purple">Emissão de Nota Fiscal</h4>
                    </div>
                    
                    <div className="flex gap-4">
                      {['PF', 'PJ'].map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, tipoNota: type as 'PF' | 'PJ' }))}
                          className={`flex-1 py-4 rounded-xl border-2 font-black transition-all ${
                            formData.tipoNota === type 
                              ? 'border-bjj-purple bg-bjj-purple text-white' 
                              : 'border-[var(--border-ui)] bg-[var(--bg-card)] text-[var(--text-muted)]'
                          }`}
                        >
                          Pessoa {type === 'PF' ? 'Física' : 'Jurídica'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Seção 3: Dados Fiscais */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 pb-2 border-b border-[var(--border-ui)]">
                      <MapPin className="text-bjj-purple" size={20} />
                      <h4 className="font-black uppercase text-xs tracking-widest text-bjj-purple">Dados Fiscais</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Razão Social / Nome</label>
                        <input 
                          required
                          value={formData.fiscalRazaoSocial}
                          onChange={e => setFormData(prev => ({ ...prev, fiscalRazaoSocial: e.target.value }))}
                          className="w-full bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl py-3 px-4 text-sm text-[var(--text-main)] focus:ring-2 focus:ring-bjj-purple/50 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">{formData.tipoNota === 'PF' ? 'CPF' : 'CNPJ'}</label>
                        <input 
                          required
                          value={formData.fiscalDocumento}
                          onChange={e => setFormData(prev => ({ ...prev, fiscalDocumento: formData.tipoNota === 'PF' ? maskCPF(e.target.value) : maskCNPJ(e.target.value) }))}
                          className="w-full bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl py-3 px-4 text-sm text-[var(--text-main)] focus:ring-2 focus:ring-bjj-purple/50 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">CEP</label>
                        <div className="relative">
                          <input 
                            required
                            value={formData.fiscalCEP}
                            onChange={e => setFormData(prev => ({ ...prev, fiscalCEP: maskCEP(e.target.value) }))}
                            onBlur={handleCEPBlur}
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl py-3 px-4 text-sm text-[var(--text-main)] focus:ring-2 focus:ring-bjj-purple/50 outline-none"
                            placeholder="00000-000"
                          />
                          {isSearchingCEP && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-bjj-purple" size={16} />}
                        </div>
                      </div>
                      <div className="md:col-span-2 grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-1">
                          <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Endereço</label>
                          <input 
                            required
                            value={formData.fiscalEndereco}
                            onChange={e => setFormData(prev => ({ ...prev, fiscalEndereco: e.target.value }))}
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl py-3 px-4 text-sm text-[var(--text-main)] focus:ring-2 focus:ring-bjj-purple/50 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Número</label>
                          <input 
                            required
                            value={formData.fiscalNumero}
                            onChange={e => setFormData(prev => ({ ...prev, fiscalNumero: e.target.value }))}
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl py-3 px-4 text-sm text-[var(--text-main)] focus:ring-2 focus:ring-bjj-purple/50 outline-none"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Bairro</label>
                        <input 
                          required
                          value={formData.fiscalBairro}
                          onChange={e => setFormData(prev => ({ ...prev, fiscalBairro: e.target.value }))}
                          className="w-full bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl py-3 px-4 text-sm text-[var(--text-main)] focus:ring-2 focus:ring-bjj-purple/50 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Cidade</label>
                        <input 
                          required
                          value={formData.fiscalCidade}
                          onChange={e => setFormData(prev => ({ ...prev, fiscalCidade: e.target.value }))}
                          className="w-full bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl py-3 px-4 text-sm text-[var(--text-main)] focus:ring-2 focus:ring-bjj-purple/50 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Estado</label>
                        <select 
                          required
                          value={formData.fiscalEstado}
                          onChange={e => setFormData(prev => ({ ...prev, fiscalEstado: e.target.value }))}
                          className="w-full bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl py-3 px-4 text-sm text-[var(--text-main)] focus:ring-2 focus:ring-bjj-purple/50 outline-none appearance-none"
                        >
                          <option value="">Selecione...</option>
                          {ESTADOS_BR.map(uf => (
                            <option key={uf.uf} value={uf.uf}>{uf.nome}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Complemento</label>
                        <input 
                          value={formData.fiscalComplemento}
                          onChange={e => setFormData(prev => ({ ...prev, fiscalComplemento: e.target.value }))}
                          className="w-full bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl py-3 px-4 text-sm text-[var(--text-main)] focus:ring-2 focus:ring-bjj-purple/50 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seção 4: Documentação */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 pb-2 border-b border-[var(--border-ui)]">
                      <Upload className="text-bjj-purple" size={20} />
                      <h4 className="font-black uppercase text-xs tracking-widest text-bjj-purple">Documentação</h4>
                    </div>
                    
                    <div className="border-2 border-dashed border-[var(--border-ui)] rounded-2xl p-10 text-center space-y-4 hover:border-bjj-purple/50 transition-colors cursor-pointer group">
                      <div className="w-16 h-16 rounded-full bg-bjj-purple/10 flex items-center justify-center text-bjj-purple mx-auto group-hover:scale-110 transition-transform">
                        <Upload size={32} />
                      </div>
                      <div className="space-y-1">
                        <p className="font-black text-[var(--text-main)]">Clique para fazer upload</p>
                        <p className="text-xs text-[var(--text-muted)]">PDF, JPG ou PNG (Max 10MB)</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 p-4 rounded-xl">
                      <ShieldCheck size={20} />
                      <p className="text-xs font-bold">Seus dados serão preservados nos mais rigorosos sistemas de segurança.</p>
                    </div>
                  </div>

                  <div className="pt-10 flex gap-4">
                    <button type="button" onClick={prevStep} className="btn-outline px-10">Voltar</button>
                    <button 
                      type="button"
                      onClick={nextStep}
                      className="flex-1 btn-primary bg-bjj-purple hover:bg-bjj-purple/90 border-bjj-purple py-4 text-lg font-black flex items-center justify-center gap-2"
                    >
                      Próximo: Dados do Evento <ChevronRight size={20} />
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div className="space-y-2">
                  <h3 className="text-2xl font-black font-display text-[var(--text-main)]">Configuração do Evento</h3>
                  <p className="text-sm text-[var(--text-muted)]">Agora defina os detalhes básicos do seu campeonato.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Nome do Evento</label>
                      <input 
                        required
                        value={formData.eventoNome}
                        onChange={e => setFormData(prev => ({ ...prev, eventoNome: e.target.value }))}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl py-4 px-6 text-[var(--text-main)] focus:ring-2 focus:ring-bjj-purple/50 outline-none transition-all"
                        placeholder="Ex: Copa Arena Comp de Jiu Jitsu"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Data do Evento</label>
                      <input 
                        required
                        type="date"
                        value={formData.eventoData}
                        onChange={e => setFormData(prev => ({ ...prev, eventoData: e.target.value }))}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl py-4 px-6 text-[var(--text-main)] focus:ring-2 focus:ring-bjj-purple/50 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Horário de Início</label>
                      <input 
                        required
                        type="time"
                        value={formData.eventoHorario}
                        onChange={e => setFormData(prev => ({ ...prev, eventoHorario: e.target.value }))}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl py-4 px-6 text-[var(--text-main)] focus:ring-2 focus:ring-bjj-purple/50 outline-none transition-all"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Local (Opcional)</label>
                      <input 
                        value={formData.eventoLocal}
                        onChange={e => setFormData(prev => ({ ...prev, eventoLocal: e.target.value }))}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl py-4 px-6 text-[var(--text-main)] focus:ring-2 focus:ring-bjj-purple/50 outline-none transition-all"
                        placeholder="Ex: Ginásio Municipal de Esportes"
                      />
                    </div>

                    {/* Logo Upload */}
                    <div className="md:col-span-2 space-y-3">
                      <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Logo do Evento (Opcional)</label>
                      <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-2xl bg-[var(--bg-card)] border-2 border-dashed border-[var(--border-ui)] flex items-center justify-center overflow-hidden relative group">
                          {logoPreview ? (
                            <img src={logoPreview} className="w-full h-full object-cover" />
                          ) : (
                            <Trophy className="text-[var(--text-muted)] opacity-20" size={32} />
                          )}
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setLogoFile(file);
                                setLogoPreview(URL.createObjectURL(file));
                              }
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-bold text-[var(--text-main)]">Identidade Visual</p>
                          <p className="text-xs text-[var(--text-muted)]">Envie a logo oficial do seu campeonato para aparecer nos placares e certificados.</p>
                          <button 
                            type="button"
                            onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                            className="text-xs font-black text-bjj-purple uppercase tracking-widest hover:underline"
                          >
                            Selecionar Imagem
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-10 flex gap-4">
                    <button type="button" onClick={prevStep} className="btn-outline px-10">Voltar</button>
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="flex-1 btn-primary bg-bjj-purple hover:bg-bjj-purple/90 border-bjj-purple py-4 text-lg font-black flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : 'Finalizar e Criar Evento'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
