import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Settings, 
  Send, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Search, 
  CheckSquare, 
  Square,
  ShieldCheck,
  ChevronRight,
  Eye,
  Trash2,
  RefreshCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { supabase } from '../../services/supabase';
import { SmtpSettings } from '../../types';

export const AdminEmails: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dispatch' | 'settings'>('dispatch');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [smtpSettings, setSmtpSettings] = useState<SmtpSettings>({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '', // Kept empty unless typing
    smtp_from_email: '',
    smtp_from_name: 'ArenaComp'
  });

  useEffect(() => {
    fetchUsers();
    fetchSmtpSettings();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, profile_photo, gym_name')
        .order('full_name');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast.error('Erro ao buscar usuários');
    }
  };

  const fetchSmtpSettings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const response = await fetch('/api/admin/email-settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success && data.data) {
        setSmtpSettings({
          ...data.data,
          smtp_password: '' // Keep as empty on UI
        });
      }
    } catch (error) {
      console.error('Erro ao buscar settings:', error);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/admin/email-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(smtpSettings)
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Configurações de SMTP salvas com sucesso!');
        fetchSmtpSettings();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error('Erro ao salvar SMTP: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmails = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Selecione pelo menos um usuário');
      return;
    }
    if (!emailSubject || !emailBody) {
      toast.error('Assunto e mensagem são obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const recipients = users
        .filter(u => selectedUsers.includes(u.id))
        .map(u => u.email)
        .filter(Boolean);

      const response = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recipients,
          subject: emailSubject,
          body: emailBody
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`E-mails enviados: ${result.data.sent}. Falhas: ${result.data.failed}.`);
        setSelectedUsers([]);
        setEmailSubject('');
        setEmailBody('');
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error('Erro ao disparar e-mails: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id));
    }
  };

  const toggleSelectUser = (id: string) => {
    if (selectedUsers.includes(id)) {
      setSelectedUsers(selectedUsers.filter(uid => uid !== id));
    } else {
      setSelectedUsers([...selectedUsers, id]);
    }
  };

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.gym_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex space-x-4 mb-8 bg-white/5 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('dispatch')}
          className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all ${
            activeTab === 'dispatch' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Send size={14} />
          <span>Disparo em Massa</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all ${
            activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Settings size={14} />
          <span>Configurações SMTP</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'settings' ? (
          <motion.div
            key="settings"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            <div className="bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] p-8">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase italic italic">SMTP Protocol</h3>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Configuração de Servidor de Saída</p>
                </div>
              </div>

              <form onSubmit={handleSaveSmtp} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Host SMTP</label>
                    <input
                      type="text"
                      value={smtpSettings.smtp_host}
                      onChange={e => setSmtpSettings({...smtpSettings, smtp_host: e.target.value})}
                      placeholder="smtp.exemplo.com"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Porta</label>
                    <input
                      type="number"
                      value={smtpSettings.smtp_port}
                      onChange={e => setSmtpSettings({...smtpSettings, smtp_port: parseInt(e.target.value)})}
                      placeholder="587 ou 465"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Usuário / E-mail</label>
                    <input
                      type="text"
                      value={smtpSettings.smtp_user}
                      onChange={e => setSmtpSettings({...smtpSettings, smtp_user: e.target.value})}
                      placeholder="user@exemplo.com"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Senha SMTP</label>
                    <input
                      type="password"
                      value={smtpSettings.smtp_password}
                      onChange={e => setSmtpSettings({...smtpSettings, smtp_password: e.target.value})}
                      placeholder="••••••••••••"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest ml-4 italic">Deixe em branco para não alterar</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">E-mail de Envio</label>
                    <input
                      type="email"
                      value={smtpSettings.smtp_from_email}
                      onChange={e => setSmtpSettings({...smtpSettings, smtp_from_email: e.target.value})}
                      placeholder="no-reply@arenacomp.com.br"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Nome do Remetente</label>
                    <input
                      type="text"
                      value={smtpSettings.smtp_from_name}
                      onChange={e => setSmtpSettings({...smtpSettings, smtp_from_name: e.target.value})}
                      placeholder="ArenaComp"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Settings size={16} />}
                  <span>Salvar Configurações</span>
                </button>
              </form>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-600/10 border border-blue-500/20 rounded-[2rem] p-8">
                <h4 className="text-sm font-black uppercase tracking-widest flex items-center space-x-2 mb-4 text-blue-500">
                  <AlertCircle size={16} />
                  <span>Segurança Máxima</span>
                </h4>
                <p className="text-gray-400 text-[11px] leading-relaxed">
                  As credenciais SMTP são armazenadas com criptografia militar AES-256 no backend. 
                  A senha nunca é retornada para o frontend, mantendo seu servidor protegido contra ataques de inspeção.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8">
                <h4 className="text-sm font-black uppercase tracking-widest flex items-center space-x-2 mb-4 text-gray-400">
                  <RefreshCcw size={16} />
                  <span>Sistema de Verificação</span>
                </h4>
                <p className="text-gray-400 text-[11px] leading-relaxed">
                  Este servidor será utilizado para disparar links de confirmação de e-mail e notificações automáticas para todos os usuários da plataforma.
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="dispatch"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 xl:grid-cols-3 gap-8"
          >
            {/* User Selection */}
            <div className="xl:col-span-1 bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] flex flex-col h-[700px]">
              <div className="p-8 border-b border-white/10">
                <h3 className="text-lg font-black uppercase italic mb-4">Selecionar Destinatários</h3>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input
                    type="text"
                    placeholder="Buscar usuários..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-xs focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div className="flex items-center justify-between mt-6">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-400 transition-colors"
                  >
                    {selectedUsers.length === filteredUsers.length ? <CheckSquare size={14} /> : <Square size={14} />}
                    <span>{selectedUsers.length === filteredUsers.length ? 'Desmarcar Todos' : 'Selecionar Todos'}</span>
                  </button>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    {selectedUsers.length} Selecionados
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {filteredUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => toggleSelectUser(user.id)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-2xl transition-all ${
                      selectedUsers.includes(user.id) ? 'bg-blue-600/10 border border-blue-500/30' : 'bg-white/5 border border-transparent hover:bg-white/10'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gray-800 overflow-hidden flex-shrink-0">
                      {user.profile_photo ? (
                        <img src={user.profile_photo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 font-black text-xs">
                          {user.full_name?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-[10px] font-black uppercase truncate">{user.full_name}</p>
                      <p className="text-[8px] font-medium text-gray-500 truncate">{user.email}</p>
                    </div>
                    {selectedUsers.includes(user.id) ? (
                      <CheckCircle2 size={16} className="text-blue-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-white/20" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Email Composer */}
            <div className="xl:col-span-2 bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] p-8 flex flex-col h-[700px]">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <Mail size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase italic">Composer</h3>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Redação de E-mail em Massa</p>
                </div>
              </div>

              <div className="space-y-6 flex-1 flex flex-col">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Assunto do E-mail</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={e => setEmailSubject(e.target.value)}
                    placeholder="Ex: Importante: Novidades na ArenaComp!"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                <div className="space-y-2 flex-1 flex flex-col">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Mensagem (HTML permitido)</label>
                  <textarea
                    value={emailBody}
                    onChange={e => setEmailBody(e.target.value)}
                    placeholder="Escreva sua mensagem aqui... Use <br> para quebras de linha ou outras tags HTML se desejar."
                    className="w-full h-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none font-medium"
                    required
                  />
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                  <div className="text-[11px] text-gray-400">
                    <span className="font-bold text-white">{selectedUsers.length}</span> usuários receberão este e-mail.
                  </div>
                  <button
                    onClick={handleSendEmails}
                    disabled={loading || selectedUsers.length === 0}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center space-x-2 shadow-lg shadow-blue-600/20"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    <span>Disparar Agora</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
