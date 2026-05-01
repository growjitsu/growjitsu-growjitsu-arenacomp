import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Send, Users, CheckSquare, Square, Search, Filter, Loader2, AlertCircle, CheckCircle2, ChevronRight, Layout, Type, Palette, Sparkles, X, ExternalLink, Eye } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { toast } from 'sonner';
import { ArenaAd } from '../../types';

interface UserRecipient {
  id: string;
  email: string;
  full_name: string;
  role: string;
  email_confirmed_at?: string;
  selected: boolean;
}

export const AdminEmails: React.FC = () => {
  const [users, setUsers] = useState<UserRecipient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState<{ current: number; total: number } | null>(null);
  const [activeEditorTab, setActiveEditorTab] = useState<'edit' | 'preview'>('edit');

  // New states for Ad Generation
  const [ads, setAds] = useState<ArenaAd[]>([]);
  const [showAdSelector, setShowAdSelector] = useState(false);
  const [isFetchingAds, setIsFetchingAds] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .order('full_name');

      if (error) throw error;

      setUsers((data || []).map(u => ({ ...u, selected: false })));
    } catch (error: any) {
      toast.error('Erro ao buscar usuários', { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAds = async () => {
    try {
      setIsFetchingAds(true);
      setShowAdSelector(true);
      
      // Fetch from arena_ads
      const { data: adsData, error: adsError } = await supabase
        .from('arena_ads')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (adsError) throw adsError;

      // Fetch from eventos (championships) - mapping to ArenaAd shape
      const { data: eventsData, error: eventsError } = await supabase
        .from('eventos')
        .select('id, nome, data, cidade, uf, modalidade, logo_url, updated_at, status')
        .neq('status', 'rascunho')
        .order('data', { ascending: false })
        .limit(10);

      const mappedEvents: ArenaAd[] = (eventsData || []).map(e => ({
        id: e.id,
        title: `Campeonato: ${e.nome}`,
        content: `${e.modalidade} em ${e.cidade}/${e.uf} - Status: ${e.status?.toUpperCase()} - Data: ${new Date(e.data).toLocaleDateString()}`,
        media_url: e.logo_url,
        link_url: `https://arenacomp.com.br/campeonato/${e.id}`,
        placement: 'external',
        active: true,
        order: 0,
        type: 'landing', 
        total_impressions: 0,
        total_clicks: 0,
        created_at: e.updated_at
      } as ArenaAd));

      setAds([...(adsData || []), ...mappedEvents]);
    } catch (error: any) {
      console.error('Error fetching ads/events:', error);
      toast.error('Erro ao buscar conteúdos', { description: error.message });
    } finally {
      setIsFetchingAds(false);
    }
  };

  const generateEmailFromAd = (ad: ArenaAd) => {
    const title = ad.landing_title || ad.title;
    const description = ad.landing_description || ad.content || '';

    // Normalize image URL
    const getPublicUrl = (url: string | undefined): string => {
      if (!url) return 'https://vfefztzaiqhpsfnvpkba.supabase.co/storage/v1/object/public/assets/logo_email.png';
      
      let finalUrl = url;
      if (!finalUrl.startsWith('http')) {
        // Handle Supabase relative storage paths
        if (finalUrl.startsWith('/storage')) {
          finalUrl = 'https://vfefztzaiqhpsfnvpkba.supabase.co' + finalUrl;
        } else {
          // Absolute path from origin
          const origin = window.location.origin;
          finalUrl = `${origin}${finalUrl.startsWith('/') ? '' : '/'}${finalUrl}`;
        }
      }
      return finalUrl.replace('http://', 'https://');
    };

    const imageUrl = getPublicUrl(ad.landing_image || ad.media_url);

    const ctaText = ad.landing_cta_text || 'Ver Mais';
    const ctaUrl = ad.landing_cta_url || ad.link_url || 'https://arenacomp.com.br';

    // Email Template - Mobile First & Professional
    const template = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050505; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #111111; border-radius: 24px; overflow: hidden; border: 1px solid #222222;">
                    <!-- Logo/Header -->
                    <tr>
                        <td align="center" style="padding: 30px 0;">
                            <img src="https://vfefztzaiqhpsfnvpkba.supabase.co/storage/v1/object/public/assets/logo_email.png" alt="ArenaComp" width="180" style="display: block;">
                        </td>
                    </tr>

                    <!-- Banner Image -->
                    <tr>
                        <td align="center">
                            <a href="${ctaUrl}" target="_blank">
                                <img src="${imageUrl}" alt="${title}" width="600" style="width: 100%; max-width: 600px; display: block;">
                            </a>
                        </td>
                    </tr>

                    <!-- Content Section -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h1 style="color: #ffffff; font-size: 28px; font-weight: 900; text-transform: uppercase; font-style: italic; letter-spacing: -1px; margin: 0 0 20px 0; font-family: Arial, sans-serif;">
                                ${title}
                            </h1>
                            <div style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                                ${description.replace(/\n/g, '<br>')}
                            </div>
                            
                            <!-- CTA Button -->
                            <table border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" bgcolor="#2563eb" style="border-radius: 12px;">
                                        <a href="${ctaUrl}" target="_blank" style="display: inline-block; padding: 16px 32px; font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">
                                            ${ctaText}
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 40px 30px; background-color: #0a0a0a; border-top: 1px solid #222222;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td style="color: #71717a; font-size: 12px; line-height: 1.5;">
                                        <p style="margin: 0 0 10px 0;">© ${new Date().getFullYear()} ArenaComp. Todos os direitos reservados.</p>
                                        <p style="margin: 0;">Você recebeu este e-mail porque está cadastrado na plataforma ArenaComp.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

    setSubject(`ArenaComp | ${title}`);
    setHtmlBody(template);
    setShowAdSelector(false);
    toast.success('Conteúdo gerado com sucesso!', { 
      description: 'Você pode revisar e editar o HTML no campo abaixo.' 
    });
  };

  const toggleSelectAll = () => {
    const allSelected = filteredUsers.every(u => u.selected);
    const newUsers = users.map(u => {
      if (filteredUsers.find(fu => fu.id === u.id)) {
        return { ...u, selected: !allSelected };
      }
      return u;
    });
    setUsers(newUsers);
  };

  const toggleUserSelection = (userId: string) => {
    setUsers(users.map(u => u.id === userId ? { ...u, selected: !u.selected } : u));
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCount = users.filter(u => u.selected).length;

  const handleSendEmails = async () => {
    if (selectedCount === 0) {
      toast.error('Selecione pelo menos um destinatário');
      return;
    }
    if (!subject.trim() || !htmlBody.trim()) {
      toast.error('Assunto e mensagem são obrigatórios');
      return;
    }

    const confirmSend = window.confirm(`Deseja enviar este e-mail para ${selectedCount} usuários?`);
    if (!confirmSend) return;

    setIsSending(true);
    setSendProgress({ current: 0, total: selectedCount });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada');

      const recipients = users.filter(u => u.selected).map(u => u.email);

      console.log('[EMAIL API HIT]', 'POST', '/api/admin/dispatch-email');
      const response = await fetch('/api/admin/dispatch-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          recipients,
          subject,
          htmlBody
        })
      });

      console.log('[EMAIL API] Response Status:', response.status);
      const contentType = response.headers.get("content-type");
      console.log('[EMAIL API] Content-Type:', contentType);

      let result;
      if (contentType && contentType.toLowerCase().includes("application/json")) {
        result = await response.json();
      } else {
        const text = await response.text();
        console.error('[EMAIL API] Body (non-JSON):', text);
        if (response.status === 405) {
          throw new Error('Erro 405: Método não permitido. O servidor redirecionou ou bloqueou o método POST.');
        }
        throw new Error(`Resposta inesperada (${response.status}): ${text.slice(0, 200)}`);
      }

      if (result && result.success) {
        toast.success('Disparo concluído!', { description: result.message });
        setSubject('');
        setHtmlBody('');
        setUsers(users.map(u => ({ ...u, selected: false })));
      } else {
        throw new Error(result.error || 'Erro no servidor');
      }
    } catch (error: any) {
      toast.error('Falha no disparo', { description: error.message });
    } finally {
      setIsSending(false);
      setSendProgress(null);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white mb-2">Disparo de E-mails</h1>
          <p className="text-gray-400 text-sm font-medium">Ferramenta controlada para comunicação com a base de usuários.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-3">
            <Users size={16} className="text-blue-400" />
            <span className="text-xs font-black text-white uppercase tracking-widest">{selectedCount} selecionados</span>
          </div>
          
          <button
            onClick={handleSendEmails}
            disabled={isSending || selectedCount === 0}
            className={`
              flex items-center gap-2 px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all
              ${isSending || selectedCount === 0
                ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/10'
                : 'bg-blue-600 text-white shadow-xl shadow-blue-600/30 hover:bg-blue-500 hover:scale-105 active:scale-95'
              }
            `}
          >
            {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            <span>{isSending ? 'Enviando...' : 'Iniciar Disparo'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* User Selection Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#111] border border-white/5 rounded-3xl overflow-hidden flex flex-col h-[700px]">
            <div className="p-6 border-b border-white/5 space-y-4">
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Buscar usuários..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-xs text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>
              
              <button
                onClick={toggleSelectAll}
                className="w-full flex items-center justify-between px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Selecionar Todos</span>
                {filteredUsers.every(u => u.selected) ? (
                  <CheckSquare size={16} className="text-blue-500" />
                ) : (
                  <Square size={16} className="text-gray-600" />
                )}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-600">
                  <Loader2 size={24} className="animate-spin" />
                  <span className="text-xs font-bold uppercase tracking-widest">Carregando usuários...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-600">
                  <AlertCircle size={24} />
                  <span className="text-xs font-bold uppercase tracking-widest">Nenhum usuário encontrado</span>
                </div>
              ) : (
                filteredUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => toggleUserSelection(user.id)}
                    className={`
                      w-full flex items-center gap-4 p-3 rounded-2xl transition-all text-left
                      ${user.selected 
                        ? 'bg-blue-500/10 border border-blue-500/20 shadow-lg' 
                        : 'hover:bg-white/5'
                      }
                    `}
                  >
                    <div className="relative">
                      {user.selected ? (
                        <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white">
                          <CheckCircle2 size={20} />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500">
                          <Users size={20} />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-white uppercase truncate">{user.full_name || 'Sem Nome'}</p>
                      <p className="text-[9px] text-gray-500 truncate font-mono uppercase">{user.email}</p>
                    </div>
                    
                    <div className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-tighter ${user.role === 'admin' ? 'bg-rose-500/10 text-rose-500' : 'bg-white/5 text-gray-500'}`}>
                      {user.role}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Email Editor */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-[#111] border border-white/5 rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Layout size={20} />
                </div>
                <h2 className="text-lg font-black uppercase italic tracking-tighter text-white">Conteúdo do E-mail</h2>
              </div>

              <button
                onClick={fetchAds}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 border border-blue-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-400 hover:bg-blue-600/20 transition-all hover:scale-105 active:scale-95"
              >
                <Sparkles size={14} />
                <span>Gerar por Anúncio</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl w-fit">
                <button
                  onClick={() => setActiveEditorTab('edit')}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeEditorTab === 'edit' 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <Type size={14} />
                  <span>Editor HTML</span>
                </button>
                <button
                  onClick={() => setActiveEditorTab('preview')}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeEditorTab === 'preview' 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <Eye size={14} />
                  <span>Visualizar Preview</span>
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 block">Assunto do E-mail</label>
                <div className="relative">
                  <Type size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ex: Novidades na ArenaComp!"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <AnimatePresence mode="wait">
                {activeEditorTab === 'edit' ? (
                  <motion.div
                    key="edit"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-2"
                  >
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 block">Corpo do E-mail (HTML)</label>
                    <textarea
                      value={htmlBody}
                      onChange={(e) => setHtmlBody(e.target.value)}
                      placeholder="<h1>Olá!</h1><p>Confira as novidades...</p>"
                      className="w-full h-[450px] bg-white/5 border border-white/10 rounded-2xl p-6 text-xs text-white font-mono focus:outline-none focus:border-blue-500 transition-colors resize-none custom-scrollbar"
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-2"
                  >
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 block">Preview em Tempo Real</label>
                    <div className="w-full h-[450px] bg-white border border-white/10 rounded-2xl overflow-hidden">
                      {htmlBody ? (
                        <iframe 
                          srcDoc={htmlBody} 
                          title="Email Preview"
                          className="w-full h-full border-none"
                          sandbox="allow-popups allow-popups-to-escape-sandbox"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-gray-400 bg-[#0a0a0a]">
                          <AlertCircle size={32} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Nenhum conteúdo para visualizar</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Preview Section */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-blue-400">
              <AlertCircle size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Dicas de Engenharia</span>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <li className="text-[10px] text-gray-500 leading-relaxed">
                • Use estilos inline no HTML para garantir compatibilidade com Outlook e Gmail.
              </li>
              <li className="text-[10px] text-gray-500 leading-relaxed">
                • O sistema processa em lotes de 20 e-mails para evitar bloqueios de SPAM.
              </li>
              <li className="text-[10px] text-gray-500 leading-relaxed">
                • Teste o layout enviando para um e-mail de teste antes do disparo massivo.
              </li>
              <li className="text-[10px] text-gray-500 leading-relaxed">
                • Imagens devem estar hospedadas em URLs públicas estáveis.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Sending Overlay */}
      <AnimatePresence>
        {isSending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#111] border border-blue-500/20 rounded-[2rem] p-10 max-w-md w-full text-center space-y-6 shadow-2xl"
            >
              <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center text-blue-400 mx-auto">
                <Loader2 size={40} className="animate-spin" />
              </div>
              
              <div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">Disparo em Andamento</h3>
                <p className="text-gray-400 text-sm mt-2">Não feche esta página até a conclusão do processo.</p>
              </div>

              {sendProgress && (
                <div className="space-y-2">
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-blue-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${(sendProgress.current / sendProgress.total) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-blue-400">
                    <span>Enviando...</span>
                    <span>{sendProgress.current} / {sendProgress.total}</span>
                  </div>
                </div>
              )}

              <p className="text-[9px] text-gray-600 font-mono uppercase">
                O servidor está processando lotes controlados para máxima entregabilidade.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ad Selection Modal */}
      <AnimatePresence>
        {showAdSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">Selecionar Anúncio</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Gere um e-mail profissional automaticamente</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setShowAdSelector(false)}
                  className="p-3 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                {isFetchingAds ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-500">
                    <Loader2 size={32} className="animate-spin text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Buscando anúncios ativos...</span>
                  </div>
                ) : ads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-500">
                    <AlertCircle size={32} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Nenhum anúncio encontrado</span>
                  </div>
                ) : (
                  ads.map((ad) => (
                    <button
                      key={ad.id}
                      onClick={() => generateEmailFromAd(ad)}
                      className="group w-full flex items-center gap-6 p-4 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/[0.08] hover:border-blue-500/20 transition-all text-left"
                    >
                      <div className="w-24 h-16 rounded-xl overflow-hidden bg-black/40 border border-white/10 flex-shrink-0">
                        {ad.media_url ? (
                          <img src={ad.media_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-700">
                            <Layout size={24} />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-[14px] font-black uppercase italic tracking-tighter text-white truncate group-hover:text-blue-400 transition-colors">
                            {ad.title}
                          </h4>
                          {ad.type && (
                            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-[7px] font-black uppercase text-blue-400 border border-blue-500/30">
                              {ad.type}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 line-clamp-1 mt-1 font-medium">
                          {ad.content}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${ad.active ? 'bg-green-500/10 text-green-500' : 'bg-rose-500/10 text-rose-500'}`}>
                            {ad.active ? 'Ativo' : 'Inativo'}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white/5 text-[8px] font-black uppercase text-gray-500">
                            {ad.placement}
                          </span>
                        </div>
                      </div>
                      
                      <ChevronRight size={20} className="text-gray-700 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                    </button>
                  ))
                )}
              </div>
              
              <div className="p-6 border-t border-white/5 bg-white/[0.02]">
                <p className="text-[9px] text-gray-600 font-medium text-center uppercase tracking-widest leading-relaxed">
                  O sistema usará as informações e imagens do anúncio selecionado <br /> para construir um layout otimizado para e-mail marketing.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
