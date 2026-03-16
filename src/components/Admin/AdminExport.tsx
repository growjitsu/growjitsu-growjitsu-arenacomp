import React, { useState } from 'react';
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Users, 
  Shield, 
  FileStack, 
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import * as XLSX from 'xlsx';

export const AdminExport: React.FC = () => {
  const [exporting, setExporting] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const exportToExcel = (data: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");
    XLSX.writeFile(workbook, `${fileName}_${new Date().getTime()}.xlsx`);
  };

  const handleExport = async (type: 'athletes' | 'teams' | 'posts') => {
    setExporting(type);
    setStatus(null);
    try {
      let data: any[] = [];
      let error: any = null;

      if (type === 'athletes') {
        const result = await supabase.from('profiles').select('*');
        data = (result.data || []).map(p => ({
          ID: p.id,
          Nome: p.full_name,
          Username: p.username,
          Email: p.email,
          Função: p.role,
          Modalidade: p.modality,
          Equipe: p.team,
          Cidade: p.city,
          Estado: p.state,
          País: p.country,
          Vitórias: p.wins,
          Derrotas: p.losses,
          Empates: p.draws,
          'Total de Lutas': p.total_fights,
          'Pontuação Arena': p.arena_score,
          'Data de Cadastro': p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : ''
        }));
        error = result.error;
      } else if (type === 'teams') {
        const result = await supabase.from('teams').select('*');
        data = (result.data || []).map(t => ({
          ID: t.id,
          Nome: t.name,
          Professor: t.professor,
          Cidade: t.city,
          Estado: t.state,
          País: t.country,
          'Data de Registro': t.created_at ? new Date(t.created_at).toLocaleDateString('pt-BR') : ''
        }));
        error = result.error;
      } else if (type === 'posts') {
        const result = await supabase.from('posts').select('*, profiles(username, full_name)');
        data = (result.data || []).map(p => {
          const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
          return {
            ID: p.id,
            Autor: profile?.full_name || 'Desconhecido',
            Username: profile?.username || 'desconhecido',
            Conteúdo: p.content,
            Tipo: p.type,
            Curtidas: p.likes_count,
            Comentários: p.comments_count,
            'Data de Publicação': p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : ''
          };
        });
        error = result.error;
      }

      if (error) throw error;

      if (data.length === 0) {
        setStatus({ type: 'error', message: 'Nenhum dado encontrado para exportar.' });
        return;
      }

      exportToExcel(data, `arenacomp_${type}`);
      setStatus({ type: 'success', message: `Exportação de ${type} concluída com sucesso!` });
    } catch (error) {
      console.error(`Error exporting ${type}:`, error);
      setStatus({ type: 'error', message: `Erro ao exportar ${type}. Tente novamente.` });
    } finally {
      setExporting(null);
    }
  };

  const ExportCard = ({ icon: Icon, title, description, type, color }: any) => (
    <div className="bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] p-8 flex flex-col items-center text-center group hover:border-blue-500/30 transition-all">
      <div className={`p-5 rounded-3xl bg-${color}-500/10 border border-${color}-500/20 text-${color}-500 mb-6 group-hover:scale-110 transition-transform duration-500`}>
        <Icon size={32} />
      </div>
      <h3 className="text-lg font-black uppercase italic tracking-tight mb-2">{title}</h3>
      <p className="text-xs text-gray-500 font-medium mb-8 max-w-[200px]">
        {description}
      </p>
      
      <button
        disabled={exporting !== null}
        onClick={() => handleExport(type)}
        className={`w-full flex items-center justify-center space-x-3 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
          exporting === type 
            ? 'bg-white/5 text-gray-500 cursor-not-allowed' 
            : `bg-${color}-600 text-white hover:bg-${color}-700 shadow-lg shadow-${color}-600/20`
        }`}
      >
        {exporting === type ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Download size={18} />
        )}
        <span>{exporting === type ? 'Exportando...' : 'Baixar Excel'}</span>
      </button>
    </div>
  );

  return (
    <div className="space-y-8">
      {status && (
        <div className={`p-4 rounded-2xl flex items-center space-x-3 border ${
          status.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
            : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
        }`}>
          {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="text-xs font-bold uppercase tracking-widest">{status.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <ExportCard 
          icon={Users} 
          title="Atletas" 
          description="Exportar lista completa de atletas cadastrados com dados de perfil."
          type="athletes"
          color="blue"
        />
        <ExportCard 
          icon={Shield} 
          title="Equipes" 
          description="Exportar todas as equipes registradas, localizações e descrições."
          type="teams"
          color="cyan"
        />
        <ExportCard 
          icon={FileStack} 
          title="Postagens" 
          description="Exportar histórico de postagens, métricas de engajamento e autores."
          type="posts"
          color="emerald"
        />
      </div>

      <div className="bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <FileText size={20} />
            </div>
            <h4 className="text-sm font-black uppercase tracking-widest">Relatório Completo do Sistema</h4>
          </div>
          <p className="text-xs text-gray-500 font-medium leading-relaxed max-w-xl">
            Gere um arquivo Excel consolidado contendo múltiplas abas com todos os dados da plataforma, 
            incluindo métricas de crescimento, logs de atividade e estatísticas de engajamento.
          </p>
        </div>
        <button className="w-full md:w-auto px-10 py-5 rounded-2xl bg-white/5 border border-white/10 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center space-x-3">
          <FileSpreadsheet size={20} />
          <span>Gerar Relatório Full</span>
        </button>
      </div>
    </div>
  );
};
