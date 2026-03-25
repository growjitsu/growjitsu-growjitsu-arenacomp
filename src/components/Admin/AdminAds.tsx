import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Edit2, Save, X, Image as ImageIcon, Link as LinkIcon, Clock, Check, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface Banner {
  id: string;
  image_url: string;
  mobile_image_url?: string;
  link: string;
  title?: string;
  display_time: number;
  is_active: boolean;
  order: number;
  created_at: any;
}

export const AdminAds: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState({
    image_url: '',
    mobile_image_url: '',
    link: '',
    title: '',
    display_time: 15,
    is_active: true,
    order: 0
  });

  useEffect(() => {
    const q = query(collection(db, 'featured_banners'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bannersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Banner[];
      setBanners(bannersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'featured_banners');
    });

    return () => unsubscribe();
  }, []);

  const handleOpenModal = (banner?: Banner) => {
    if (banner) {
      setEditingBanner(banner);
      setFormData({
        image_url: banner.image_url,
        mobile_image_url: banner.mobile_image_url || '',
        link: banner.link,
        title: banner.title || '',
        display_time: banner.display_time,
        is_active: banner.is_active,
        order: banner.order
      });
    } else {
      setEditingBanner(null);
      setFormData({
        image_url: '',
        mobile_image_url: '',
        link: '',
        title: '',
        display_time: 15,
        is_active: true,
        order: banners.length > 0 ? Math.max(...banners.map(b => b.order)) + 1 : 0
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBanner) {
        await updateDoc(doc(db, 'featured_banners', editingBanner.id), {
          ...formData,
          updated_at: serverTimestamp()
        });
        toast.success('Banner atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'featured_banners'), {
          ...formData,
          created_at: serverTimestamp()
        });
        toast.success('Banner criado com sucesso!');
      }
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'featured_banners');
      toast.error('Erro ao salvar banner.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este banner?')) return;
    try {
      await deleteDoc(doc(db, 'featured_banners', id));
      toast.success('Banner excluído com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'featured_banners');
      toast.error('Erro ao excluir banner.');
    }
  };

  const toggleStatus = async (banner: Banner) => {
    try {
      await updateDoc(doc(db, 'featured_banners', banner.id), {
        is_active: !banner.is_active
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'featured_banners');
    }
  };

  const reorder = async (banner: Banner, direction: 'up' | 'down') => {
    const currentIndex = banners.findIndex(b => b.id === banner.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= banners.length) return;

    const targetBanner = banners[targetIndex];

    try {
      await updateDoc(doc(db, 'featured_banners', banner.id), { order: targetBanner.order });
      await updateDoc(doc(db, 'featured_banners', targetBanner.id), { order: banner.order });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'featured_banners');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-xl font-black uppercase italic tracking-tight">Arena Ads</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Gestão de Patrocínios e Destaques</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus size={16} />
          <span>Novo Banner</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : banners.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-20 text-center space-y-4">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto text-gray-500">
            <ImageIcon size={32} />
          </div>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Nenhum banner configurado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {banners.map((banner, index) => (
            <div 
              key={banner.id}
              className={`bg-white/5 border border-white/10 rounded-3xl p-4 flex flex-col md:flex-row items-center gap-6 transition-all ${!banner.is_active ? 'opacity-50 grayscale' : ''}`}
            >
              {/* Preview */}
              <div className="w-full md:w-48 h-28 bg-black rounded-2xl overflow-hidden border border-white/10 relative group">
                <img src={banner.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-[8px] font-black uppercase tracking-widest text-white">Preview</span>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center space-x-2">
                  <h3 className="font-black uppercase italic text-sm truncate">{banner.title || 'Sem Título'}</h3>
                  {!banner.is_active && (
                    <span className="px-2 py-0.5 bg-rose-500/10 text-rose-500 rounded text-[8px] font-black uppercase tracking-widest">Inativo</span>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 truncate flex items-center space-x-2">
                  <LinkIcon size={10} />
                  <span>{banner.link}</span>
                </p>
                <div className="flex items-center space-x-4 pt-2">
                  <div className="flex items-center space-x-1 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                    <Clock size={10} />
                    <span>{banner.display_time}s</span>
                  </div>
                  <div className="flex items-center space-x-1 text-[9px] font-bold text-blue-500 uppercase tracking-widest">
                    <span>Ordem: {banner.order}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                <div className="flex flex-col space-y-1 mr-4">
                  <button 
                    onClick={() => reorder(banner, 'up')}
                    disabled={index === 0}
                    className="p-1.5 text-gray-500 hover:text-white disabled:opacity-20"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button 
                    onClick={() => reorder(banner, 'down')}
                    disabled={index === banners.length - 1}
                    className="p-1.5 text-gray-500 hover:text-white disabled:opacity-20"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>

                <button 
                  onClick={() => toggleStatus(banner)}
                  className={`p-3 rounded-xl border transition-all ${banner.is_active ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-white/5 border-white/10 text-gray-500'}`}
                >
                  <Check size={18} />
                </button>
                <button 
                  onClick={() => handleOpenModal(banner)}
                  className="p-3 bg-white/5 border border-white/10 text-gray-400 hover:text-white rounded-xl transition-all"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(banner.id)}
                  className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#0f0f0f] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-white/10 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black uppercase italic tracking-tight">
                    {editingBanner ? 'Editar Banner' : 'Novo Banner'}
                  </h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Configure os detalhes do destaque</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-500 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Título (Opcional)</label>
                    <input 
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-all"
                      placeholder="Ex: Promoção de Verão"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">URL da Imagem (Desktop)</label>
                    <input 
                      type="url"
                      required
                      value={formData.image_url}
                      onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-all"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">URL da Imagem (Mobile - Opcional)</label>
                    <input 
                      type="url"
                      value={formData.mobile_image_url}
                      onChange={(e) => setFormData({...formData, mobile_image_url: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-all"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Link de Destino</label>
                    <input 
                      type="url"
                      required
                      value={formData.link}
                      onChange={(e) => setFormData({...formData, link: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-all"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Tempo (Segundos)</label>
                      <input 
                        type="number"
                        required
                        min="1"
                        value={formData.display_time}
                        onChange={(e) => setFormData({...formData, display_time: parseInt(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Ordem</label>
                      <input 
                        type="number"
                        required
                        value={formData.order}
                        onChange={(e) => setFormData({...formData, order: parseInt(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex space-x-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
                  >
                    Salvar Banner
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
