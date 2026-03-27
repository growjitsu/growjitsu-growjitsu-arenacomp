import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  User, 
  Activity, 
  Database, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock
} from 'lucide-react';
import { collection, query, orderBy, limit, startAfter, getDocs, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const AdminLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 20;

  useEffect(() => {
    const q = query(
      collection(db, 'admin_logs'),
      orderBy('created_at', 'desc'),
      limit(pageSize)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate() || new Date()
      }));
      setLogs(logsData);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === pageSize);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'admin_logs');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loadMore = async () => {
    if (!lastDoc || !hasMore) return;

    const q = query(
      collection(db, 'admin_logs'),
      orderBy('created_at', 'desc'),
      startAfter(lastDoc),
      limit(pageSize)
    );

    try {
      const snapshot = await getDocs(q);
      const newLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate() || new Date()
      }));
      setLogs(prev => [...prev, ...newLogs]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === pageSize);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'admin_logs');
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('delete') || action.includes('excluir')) return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    if (action.includes('update') || action.includes('editar')) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    if (action.includes('create') || action.includes('criar')) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
  };

  return (
    <div className="space-y-6">
      {/* Table */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Admin</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Ação</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Alvo</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Detalhes</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Data/Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <User size={14} className="text-gray-500" />
                        <span className="text-[10px] font-black uppercase tracking-tight">{log.profiles?.full_name || 'Admin System'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md border text-[9px] font-black uppercase tracking-widest ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-white uppercase tracking-tight">{log.target_type}</span>
                        <span className="text-[8px] font-bold text-gray-500 tracking-widest">ID: {log.target_id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[10px] text-gray-400 font-medium max-w-[200px] truncate">
                        {JSON.stringify(log.details)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 text-gray-500">
                        <Clock size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          {format(new Date(log.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <AlertCircle size={40} className="text-gray-700" />
                      <div className="space-y-1">
                        <p className="text-gray-500 font-bold italic">Nenhum log de atividade encontrado</p>
                        <p className="text-[10px] text-gray-600 uppercase tracking-widest font-black">
                          Certifique-se de que a tabela 'admin_logs' foi criada no banco de dados.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Load More */}
        {hasMore && logs.length > 0 && (
          <div className="px-6 py-8 border-t border-white/10 flex justify-center">
            <button
              onClick={loadMore}
              className="px-8 py-3 bg-blue-600/10 border border-blue-600/20 text-blue-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-lg shadow-blue-600/5"
            >
              Carregar Mais Atividades
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
