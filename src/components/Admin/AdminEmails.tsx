import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Send, Users, CheckSquare, Square, Search, Filter, Loader2, AlertCircle, CheckCircle2, ChevronRight, Layout, Type, Palette } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { toast } from 'sonner';

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

      const response = await fetch('/api/admin/send-email', {
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

      let result;
      const contentType = response.headers.get("content-type");
      
      console.log('[DEBUG] Response status:', response.status);
      console.log('[DEBUG] Response content-type:', contentType);

      if (contentType && contentType.toLowerCase().includes("application/json")) {
        result = await response.json();
      } else {
        const text = await response.text();
        console.error('[DEBUG] Non-JSON response text:', text);
        throw new Error(`O servidor retornou um formato inesperado (${response.status}). Verifique se as credenciais SMTP estão configuradas.`);
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
            </div>

            <div className="p-6 space-y-6">
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

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 block">Corpo do E-mail (HTML)</label>
                <textarea
                  value={htmlBody}
                  onChange={(e) => setHtmlBody(e.target.value)}
                  placeholder="<h1>Olá!</h1><p>Confira as novidades...</p>"
                  className="w-full h-[400px] bg-white/5 border border-white/10 rounded-2xl p-6 text-xs text-white font-mono focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>
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
    </div>
  );
};
