import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Edit2, Save, X, Image as ImageIcon, Link as LinkIcon, Clock, Check, AlertCircle, ChevronUp, ChevronDown, Upload, Calendar, Lock, BarChart2, Zap, Layout, Eye, MousePointer2, TrendingUp, Download, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../services/supabase';
import { ArenaAd } from '../../types';

interface Banner {
  id: string;
  image_url: string;
  mobile_image_url?: string;
  link: string;
  title?: string;
  display_time: number;
  is_active: boolean;
  order: number;
  start_date?: any;
  end_date?: any;
  created_at: any;
  country?: string;
  state?: string;
  city?: string;
  country_id?: string;
  state_id?: string;
  city_id?: string;
}

export const AdminAds: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'landing' | 'feed' | 'analytics'>('landing');
  const [banners, setBanners] = useState<Banner[]>([]);
  const [feedAds, setFeedAds] = useState<ArenaAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFeedModalOpen, setIsFeedModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [editingFeedAd, setEditingFeedAd] = useState<ArenaAd | null>(null);
  
  // Analytics state
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [selectedAdId, setSelectedAdId] = useState<string>('all');

  const [formData, setFormData] = useState({
    image_url: '',
    mobile_image_url: '',
    link: '',
    title: '',
    display_time: 15,
    is_active: true,
    order: 0,
    start_date: '',
    end_date: '',
    country: '',
    state: '',
    city: '',
    country_id: '',
    state_id: '',
    city_id: ''
  });

  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);

  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [desktopPreview, setDesktopPreview] = useState<string>('');
  const [mobilePreview, setMobilePreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [fbUser, setFbUser] = useState<any>(null);
  const [isFirebaseAuthReady, setIsFirebaseAuthReady] = useState(false);

  const [feedFormData, setFeedFormData] = useState({
    title: '',
    content: '',
    media_url: '',
    link_url: '',
    placement: 'feed_between' as ArenaAd['placement'],
    active: true,
    order: 0
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setFbUser(user);
      setIsFirebaseAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const handleFirebaseLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success('Autenticado no Firebase com sucesso!');
    } catch (error: any) {
      console.error('Erro no login Firebase:', error);
      
      if (error.code === 'auth/unauthorized-domain') {
        const currentDomain = window.location.hostname;
        toast.error(
          `Domínio não autorizado: "${currentDomain}". Adicione este domínio no Firebase Console (Authentication > Settings > Authorized Domains).`,
          { duration: 10000 }
        );
      } else {
        toast.error('Erro ao autenticar no Firebase: ' + error.message);
      }
    }
  };

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

    fetchCountries();
    fetchFeedAds();

    return () => unsubscribe();
  }, []);

  const fetchFeedAds = async () => {
    try {
      const { data, error } = await supabase
        .from('arena_ads')
        .select('*')
        .order('order', { ascending: true });
      
      if (error) throw error;
      setFeedAds(data || []);
    } catch (error) {
      console.error('Error fetching feed ads:', error);
      toast.error('Erro ao carregar anúncios do feed.');
    }
  };

  const fetchAnalytics = async (adId: string = 'all') => {
    setLoadingReport(true);
    try {
      const url = adId === 'all' ? '/api/getAdReports' : `/api/getAdReports?adId=${adId}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Erro ao carregar relatórios.');
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics(selectedAdId);
    }
  }, [activeTab, selectedAdId]);

  const fetchCountries = async () => {
    const { data } = await supabase.from('countries').select('*').order('name');
    if (data) setCountries(data);
  };

  const fetchStates = async (countryId: string) => {
    const { data } = await supabase.from('states').select('*').eq('country_id', countryId).order('name');
    if (data) setStates(data);
    setCities([]);
  };

  const fetchCities = async (stateId: string) => {
    const { data } = await supabase.from('cities').select('*').eq('state_id', stateId).order('name');
    if (data) setCities(data);
  };

  const formatDateForInput = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      // Handle Firestore Timestamp
      const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
      if (isNaN(date.getTime())) return '';
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (e) {
      return '';
    }
  };

  const handleOpenModal = (banner?: Banner) => {
    setDesktopFile(null);
    setMobileFile(null);
    if (banner) {
      setEditingBanner(banner);
      setDesktopPreview(banner.image_url);
      setMobilePreview(banner.mobile_image_url || '');
      setFormData({
        image_url: banner.image_url,
        mobile_image_url: banner.mobile_image_url || '',
        link: banner.link,
        title: banner.title || '',
        display_time: banner.display_time,
        is_active: banner.is_active,
        order: banner.order,
        start_date: formatDateForInput(banner.start_date),
        end_date: formatDateForInput(banner.end_date),
        country: banner.country || '',
        state: banner.state || '',
        city: banner.city || '',
        country_id: banner.country_id || '',
        state_id: banner.state_id || '',
        city_id: banner.city_id || ''
      });
      if (banner.country_id) fetchStates(banner.country_id);
      if (banner.state_id) fetchCities(banner.state_id);
    } else {
      setEditingBanner(null);
      setDesktopPreview('');
      setMobilePreview('');
      setFormData({
        image_url: '',
        mobile_image_url: '',
        link: '',
        title: '',
        display_time: 15,
        is_active: true,
        order: banners.length > 0 ? Math.max(...banners.map(b => b.order)) + 1 : 0,
        start_date: '',
        end_date: '',
        country: '',
        state: '',
        city: '',
        country_id: '',
        state_id: '',
        city_id: ''
      });
      setStates([]);
      setCities([]);
    }
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'desktop' | 'mobile') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'desktop') {
        setDesktopFile(file);
        setDesktopPreview(reader.result as string);
      } else {
        setMobileFile(file);
        setMobilePreview(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const uploadImage = async (file: File, path: string) => {
    console.log(`Iniciando upload de ${file.name} para ${path}...`);
    
    const uploadPromise = (async () => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${path}/${fileName}`;

      // Try to upload
      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Erro no upload inicial:', uploadError);
        // If bucket not found, try to create it (requires appropriate permissions)
        if (uploadError.message?.toLowerCase().includes('not found')) {
          console.log('Bucket "banners" não encontrado, tentando criar...');
          try {
            const { error: createError } = await supabase.storage.createBucket('banners', {
              public: true,
              allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
              fileSizeLimit: 2 * 1024 * 1024
            });
            
            if (!createError || createError.message?.includes('already exists')) {
              console.log('Bucket criado ou já existente, tentando upload novamente...');
              // Retry upload if bucket was created or already exists
              const { error: retryError } = await supabase.storage
                .from('banners')
                .upload(filePath, file);
              if (retryError) throw retryError;
            } else {
              throw createError;
            }
          } catch (err: any) {
            console.error('Falha na criação do bucket:', err);
            throw new Error(err.message || 'O bucket "banners" não existe no Supabase e não pôde ser criado automaticamente.');
          }
        } else if (uploadError.message?.toLowerCase().includes('row-level security')) {
          throw new Error('Erro de permissão (RLS) no Supabase. Certifique-se de que o bucket "banners" tem políticas de acesso público configuradas.');
        } else {
          throw uploadError;
        }
      }

      const { data: { publicUrl } } = supabase.storage
        .from('banners')
        .getPublicUrl(filePath);

      console.log('Upload concluído com sucesso:', publicUrl);
      return publicUrl;
    })();

    // Timeout de 30 segundos para o upload
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Tempo limite de upload excedido (30s). Verifique sua conexão.')), 30000)
    );

    return Promise.race([uploadPromise, timeoutPromise]) as Promise<string>;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) return;
    
    if (!auth.currentUser) {
      toast.error('Você precisa estar autenticado no Firestore para salvar banners. Clique no botão "Login Firebase" no topo da página.');
      return;
    }
    
    console.log('Iniciando submissão do banner...');
    console.log('Usuário atual:', auth.currentUser?.email);
    
    const toastId = toast.loading('Salvando banner...');
    setIsUploading(true);
    
    try {
      let finalImageUrl = formData.image_url;
      let finalMobileImageUrl = formData.mobile_image_url;

      // Validação básica se for novo banner
      if (!editingBanner && !desktopFile && !formData.image_url) {
        throw new Error('Por favor, selecione uma imagem para o banner.');
      }

      if (desktopFile) {
        console.log('Iniciando upload da imagem desktop...');
        finalImageUrl = await uploadImage(desktopFile, 'desktop');
      }

      if (mobileFile) {
        console.log('Iniciando upload da imagem mobile...');
        finalMobileImageUrl = await uploadImage(mobileFile, 'mobile');
      }

      console.log('Preparando dados para o Firestore...');
      const dataToSave = {
        ...formData,
        image_url: finalImageUrl,
        mobile_image_url: finalMobileImageUrl,
        start_date: formData.start_date ? new Date(formData.start_date) : null,
        end_date: formData.end_date ? new Date(formData.end_date) : null,
      };

      if (editingBanner) {
        console.log('Atualizando documento existente:', editingBanner.id);
        const path = `featured_banners/${editingBanner.id}`;
        try {
          await updateDoc(doc(db, 'featured_banners', editingBanner.id), {
            ...dataToSave,
            updated_at: serverTimestamp()
          });
          
          // Log action
          await addDoc(collection(db, 'admin_logs'), {
            admin_id: auth.currentUser.uid,
            admin_email: auth.currentUser.email,
            action: 'editar_banner',
            target_type: 'banner',
            target_id: editingBanner.id,
            details: { title: dataToSave.title, link: dataToSave.link },
            created_at: serverTimestamp()
          });

          toast.success('Banner atualizado com sucesso!', { id: toastId });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, path);
        }
      } else {
        console.log('Criando novo documento...');
        const path = 'featured_banners';
        try {
          const docRef = await addDoc(collection(db, 'featured_banners'), {
            ...dataToSave,
            created_at: serverTimestamp()
          });

          // Log action
          await addDoc(collection(db, 'admin_logs'), {
            admin_id: auth.currentUser.uid,
            admin_email: auth.currentUser.email,
            action: 'criar_banner',
            target_type: 'banner',
            target_id: docRef.id,
            details: { title: dataToSave.title, link: dataToSave.link },
            created_at: serverTimestamp()
          });

          toast.success('Banner criado com sucesso!', { id: toastId });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
        }
      }
      
      console.log('Processo finalizado com sucesso.');
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Erro fatal no handleSubmit:', error);
      let message = 'Erro inesperado ao salvar banner.';
      
      try {
        // Tenta parsear se for um erro do handleFirestoreError (JSON)
        const parsed = JSON.parse(error.message);
        const userEmail = auth.currentUser?.email || 'não identificado';
        message = `Erro de permissão (${parsed.operationType} em ${parsed.path}): ${parsed.error}. Usuário: ${userEmail}`;
      } catch {
        message = error.message || message;
      }
      
      toast.error(message, { id: toastId });
    } finally {
      console.log('Limpando estado de upload.');
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este banner?')) return;
    try {
      await deleteDoc(doc(db, 'featured_banners', id));
      
      // Log action
      if (auth.currentUser) {
        await addDoc(collection(db, 'admin_logs'), {
          admin_id: auth.currentUser.uid,
          admin_email: auth.currentUser.email,
          action: 'excluir_banner',
          target_type: 'banner',
          target_id: id,
          details: { id },
          created_at: serverTimestamp()
        });
      }

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

  const handleOpenFeedModal = (ad?: ArenaAd) => {
    if (ad) {
      setEditingFeedAd(ad);
      setFeedFormData({
        title: ad.title,
        content: ad.content,
        media_url: ad.media_url || '',
        link_url: ad.link_url || '',
        placement: ad.placement,
        active: ad.active,
        order: ad.order || 0
      });
    } else {
      setEditingFeedAd(null);
      setFeedFormData({
        title: '',
        content: '',
        media_url: '',
        link_url: '',
        placement: 'feed_between',
        active: true,
        order: feedAds.length
      });
    }
    setIsFeedModalOpen(true);
  };

  const handleSaveFeedAd = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading('Salvando anúncio...');
    try {
      if (editingFeedAd) {
        const { error } = await supabase
          .from('arena_ads')
          .update(feedFormData)
          .eq('id', editingFeedAd.id);
        if (error) throw error;
        toast.success('Anúncio atualizado!', { id: toastId });
      } else {
        const { error } = await supabase
          .from('arena_ads')
          .insert([feedFormData]);
        if (error) throw error;
        toast.success('Anúncio criado!', { id: toastId });
      }
      setIsFeedModalOpen(false);
      fetchFeedAds();
    } catch (error: any) {
      console.error('Error saving feed ad:', error);
      toast.error('Erro ao salvar anúncio: ' + error.message, { id: toastId });
    }
  };

  const handleDeleteFeedAd = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este anúncio?')) return;
    try {
      const { error } = await supabase
        .from('arena_ads')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Anúncio excluído!');
      fetchFeedAds();
    } catch (error: any) {
      console.error('Error deleting feed ad:', error);
      toast.error('Erro ao excluir anúncio.');
    }
  };

  const exportToCSV = (data: any[]) => {
    if (!data || data.length === 0) return;
    
    const headers = ['Data', 'Evento', 'Dispositivo', 'OS', 'Navegador', 'País'];
    const rows = data.map(e => [
      new Date(e.created_at).toLocaleString(),
      e.event_type,
      e.device_type,
      e.os,
      e.browser,
      e.country
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_anuncios_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h2 className="text-xl font-black uppercase italic tracking-tight">Arena Ads & Analytics</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Gestão de Patrocínios e Performance</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
            <button 
              onClick={() => setActiveTab('landing')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'landing' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
            >
              <Layout size={14} />
              <span>Landing</span>
            </button>
            <button 
              onClick={() => setActiveTab('feed')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'feed' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
            >
              <Zap size={14} />
              <span>Feed</span>
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'analytics' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
            >
              <BarChart2 size={14} />
              <span>Analytics</span>
            </button>
          </div>

          {activeTab === 'landing' && (
            <button
              onClick={handleFirebaseLogin}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                fbUser 
                  ? 'bg-green-600/10 text-green-500 border-green-600/20 hover:bg-green-600 hover:text-white' 
                  : 'bg-rose-600/10 text-rose-500 border-rose-600/20 hover:bg-rose-600 hover:text-white'
              }`}
            >
              <Lock size={14} />
              <span>{fbUser ? `Firebase OK` : 'Login Firebase'}</span>
            </button>
          )}
          
          {activeTab !== 'analytics' && (
            <button 
              onClick={() => activeTab === 'landing' ? handleOpenModal() : handleOpenFeedModal()}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20"
            >
              <Plus size={16} />
              <span>{activeTab === 'landing' ? 'Novo Banner' : 'Novo Anúncio'}</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'landing' && (
        <div className="space-y-6">
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
        </div>
      )}

      {activeTab === 'feed' && (
        <div className="space-y-6">
          {feedAds.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-20 text-center space-y-4">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto text-gray-500">
                <Zap size={32} />
              </div>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Nenhum anúncio de feed configurado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {feedAds.map((ad) => (
                <div 
                  key={ad.id}
                  className={`bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 transition-all ${!ad.active ? 'opacity-50 grayscale' : ''}`}
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-black uppercase italic text-lg text-white">{ad.title}</h3>
                      <span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-[8px] font-black uppercase tracking-widest border border-blue-500/20">
                        {ad.placement}
                      </span>
                      {!ad.active && (
                        <span className="px-3 py-1 bg-rose-500/10 text-rose-500 rounded-full text-[8px] font-black uppercase tracking-widest border border-rose-500/20">
                          Inativo
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-2">{ad.content}</p>
                    <div className="flex items-center space-x-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      <div className="flex items-center space-x-1">
                        <LinkIcon size={12} />
                        <span className="truncate max-w-[200px]">{ad.link_url || 'Sem link'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={() => {
                        setSelectedAdId(ad.id);
                        setActiveTab('analytics');
                      }}
                      className="p-4 bg-emerald-600/10 text-emerald-500 border border-emerald-600/20 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all flex items-center space-x-2"
                    >
                      <BarChart2 size={18} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Stats</span>
                    </button>
                    <button 
                      onClick={() => handleOpenFeedModal(ad)}
                      className="p-4 bg-blue-600/10 text-blue-500 border border-blue-600/20 rounded-2xl hover:bg-blue-600 hover:text-white transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteFeedAd(ad.id)}
                      className="p-4 bg-rose-600/10 text-rose-500 border border-rose-600/20 rounded-2xl hover:bg-rose-600 hover:text-white transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-8">
          {/* Filters */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/5 p-6 rounded-[2rem] border border-white/10">
            <div className="flex items-center space-x-4 w-full md:w-auto">
              <select 
                value={selectedAdId}
                onChange={(e) => setSelectedAdId(e.target.value)}
                className="bg-black border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500 w-full"
              >
                <option value="all">Todos os Anúncios</option>
                {feedAds.map(ad => (
                  <option key={ad.id} value={ad.id}>{ad.title}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => fetchAnalytics(selectedAdId)}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-gray-400"
              >
                <RotateCcw size={18} />
              </button>
              <button 
                onClick={() => exportToCSV(reportData?.events)}
                className="flex items-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20"
              >
                <Download size={16} />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>

          {loadingReport ? (
            <div className="flex justify-center py-20">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : reportData ? (
            <div className="space-y-8">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-[#0f0f0f] border border-white/10 rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500">
                      <Eye size={24} />
                    </div>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Impressões Totais</p>
                  <h3 className="text-3xl font-black tracking-tight">{reportData.stats.totalImpressions.toLocaleString()}</h3>
                </div>

                <div className="bg-[#0f0f0f] border border-white/10 rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                      <MousePointer2 size={24} />
                    </div>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Cliques Totais</p>
                  <h3 className="text-3xl font-black tracking-tight">{reportData.stats.totalClicks.toLocaleString()}</h3>
                </div>

                <div className="bg-[#0f0f0f] border border-white/10 rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                      <TrendingUp size={24} />
                    </div>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">CTR Médio</p>
                  <h3 className="text-3xl font-black tracking-tight">{reportData.stats.ctr.toFixed(2)}%</h3>
                </div>

                <div className="bg-[#0f0f0f] border border-white/10 rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
                      <Zap size={24} />
                    </div>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Eventos Recentes</p>
                  <h3 className="text-3xl font-black tracking-tight">{reportData.events.length.toLocaleString()}</h3>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] p-8">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-8">Performance por Dispositivo</h4>
                  <div className="space-y-4">
                    {Object.entries(reportData.stats.deviceStats).map(([device, count]: any) => (
                      <div key={device} className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-white">{device}</span>
                          <span className="text-gray-500">{count} eventos</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-600 rounded-full" 
                            style={{ width: `${(count / reportData.events.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] p-8">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-8">Performance por Navegador</h4>
                  <div className="space-y-4">
                    {Object.entries(reportData.stats.browserStats).map(([browser, count]: any) => (
                      <div key={browser} className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-white">{browser}</span>
                          <span className="text-gray-500">{count} eventos</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-600 rounded-full" 
                            style={{ width: `${(count / reportData.events.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-20 text-center">
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Nenhum dado de analytics disponível</p>
            </div>
          )}
        </div>
      )}

      {/* Feed Ad Modal */}
      <AnimatePresence>
        {isFeedModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] w-full max-w-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-xl font-black uppercase italic tracking-tight">
                  {editingFeedAd ? 'Editar Anúncio' : 'Novo Anúncio de Feed'}
                </h3>
                <button onClick={() => setIsFeedModalOpen(false)} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveFeedAd} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Título</label>
                    <input 
                      type="text"
                      required
                      value={feedFormData.title}
                      onChange={(e) => setFeedFormData({ ...feedFormData, title: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-all"
                      placeholder="Título do anúncio"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Posicionamento</label>
                    <select 
                      value={feedFormData.placement}
                      onChange={(e) => setFeedFormData({ ...feedFormData, placement: e.target.value as any })}
                      className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-all"
                    >
                      <option value="feed_top">Topo do Feed</option>
                      <option value="feed_between">Entre Posts</option>
                      <option value="sidebar">Barra Lateral</option>
                      <option value="profile">Perfil</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Conteúdo / Descrição</label>
                  <textarea 
                    required
                    value={feedFormData.content}
                    onChange={(e) => setFeedFormData({ ...feedFormData, content: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-all h-32 resize-none"
                    placeholder="Texto do anúncio..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">URL da Imagem</label>
                    <input 
                      type="url"
                      value={feedFormData.media_url}
                      onChange={(e) => setFeedFormData({ ...feedFormData, media_url: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-all"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Link de Destino</label>
                    <input 
                      type="url"
                      value={feedFormData.link_url}
                      onChange={(e) => setFeedFormData({ ...feedFormData, link_url: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-all"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${feedFormData.active ? 'bg-green-500' : 'bg-gray-500'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Anúncio Ativo</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setFeedFormData({ ...feedFormData, active: !feedFormData.active })}
                    className={`w-12 h-6 rounded-full transition-all relative ${feedFormData.active ? 'bg-blue-600' : 'bg-gray-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${feedFormData.active ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsFeedModalOpen(false)}
                    className="px-8 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-12 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20"
                  >
                    Salvar Anúncio
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

              {/* Preview Section */}
              {(desktopPreview || mobilePreview) && (
                <div className="px-8 pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {desktopPreview && (
                      <div className="space-y-2">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-500">Preview Desktop</p>
                        <div className="aspect-[3/1] bg-black rounded-xl overflow-hidden border border-white/10">
                          <img src={desktopPreview} alt="Preview Desktop" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    )}
                    {mobilePreview && (
                      <div className="space-y-2">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-500">Preview Mobile</p>
                        <div className="aspect-[9/16] h-32 mx-auto bg-black rounded-xl overflow-hidden border border-white/10">
                          <img src={mobilePreview} alt="Preview Mobile" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
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

                  {/* Upload Desktop */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Imagem Desktop (1200x400)</label>
                    <div className="relative group">
                      <input 
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'desktop')}
                        className="hidden"
                        id="desktop-upload"
                      />
                      <label 
                        htmlFor="desktop-upload"
                        className="flex flex-col items-center justify-center w-full h-32 bg-white/5 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:bg-white/10 hover:border-blue-500/50 transition-all"
                      >
                        <Upload size={24} className="text-gray-500 mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          {desktopFile ? desktopFile.name : 'Clique ou arraste para upload'}
                        </span>
                        <span className="text-[8px] text-gray-600 mt-1 uppercase tracking-widest">JPG, PNG, WebP (Máx 2MB)</span>
                      </label>
                    </div>
                  </div>

                  {/* Upload Mobile */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Imagem Mobile (Opcional)</label>
                    <div className="relative group">
                      <input 
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'mobile')}
                        className="hidden"
                        id="mobile-upload"
                      />
                      <label 
                        htmlFor="mobile-upload"
                        className="flex flex-col items-center justify-center w-full h-24 bg-white/5 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:bg-white/10 hover:border-blue-500/50 transition-all"
                      >
                        <Upload size={20} className="text-gray-500 mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          {mobileFile ? mobileFile.name : 'Upload Mobile (Opcional)'}
                        </span>
                      </label>
                    </div>
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

                  {/* Scheduling */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2 flex items-center gap-1">
                        <Calendar size={10} /> Início (Opcional)
                      </label>
                      <input 
                        type="datetime-local"
                        value={formData.start_date}
                        onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2 flex items-center gap-1">
                        <Calendar size={10} /> Fim (Opcional)
                      </label>
                      <input 
                        type="datetime-local"
                        value={formData.end_date}
                        onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
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

                  {/* Segmentation */}
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 italic">Segmentação Geográfica (Opcional)</h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">País</label>
                        <select
                          value={formData.country_id}
                          onChange={(e) => {
                            const country = countries.find(c => c.id === e.target.value);
                            setFormData({ 
                              ...formData, 
                              country_id: e.target.value, 
                              country: country?.name || '',
                              state_id: '',
                              state: '',
                              city_id: '',
                              city: ''
                            });
                            if (e.target.value) fetchStates(e.target.value);
                            else {
                              setStates([]);
                              setCities([]);
                            }
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-all"
                        >
                          <option value="">Todos os Países</option>
                          {countries.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Estado</label>
                          <select
                            value={formData.state_id}
                            disabled={!formData.country_id}
                            onChange={(e) => {
                              const state = states.find(s => s.id === e.target.value);
                              setFormData({ 
                                ...formData, 
                                state_id: e.target.value, 
                                state: state?.name || '',
                                city_id: '',
                                city: ''
                              });
                              if (e.target.value) fetchCities(e.target.value);
                              else setCities([]);
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="">Todos os Estados</option>
                            {states.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Cidade</label>
                          <select
                            value={formData.city_id}
                            disabled={!formData.state_id}
                            onChange={(e) => {
                              const city = cities.find(c => c.id === e.target.value);
                              setFormData({ 
                                ...formData, 
                                city_id: e.target.value, 
                                city: city?.name || ''
                              });
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="">Todas as Cidades</option>
                            {cities.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
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
                    disabled={isUploading}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? 'Enviando...' : 'Salvar Banner'}
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
