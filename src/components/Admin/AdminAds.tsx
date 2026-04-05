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
  const [feedAdFile, setFeedAdFile] = useState<File | null>(null);
  const [feedAdPreview, setFeedAdPreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [fbUser, setFbUser] = useState<any>(null);
  const [isFirebaseAuthReady, setIsFirebaseAuthReady] = useState(false);

  const [feedFormData, setFeedFormData] = useState({
    title: '',
    content: '',
    media_url: '',
    media_url_feed_top: '',
    media_url_feed_between: '',
    media_url_sidebar: '',
    media_url_profile: '',
    link_url: '',
    placement: 'feed_between' as ArenaAd['placement'],
    active: true,
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

  const [feedFiles, setFeedFiles] = useState<{ [key: string]: File | null }>({
    main: null,
    feed_top: null,
    feed_between: null,
    sidebar: null,
    profile: null
  });

  const [feedPreviews, setFeedPreviews] = useState<{ [key: string]: string }>({
    main: '',
    feed_top: '',
    feed_between: '',
    sidebar: '',
    profile: ''
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
      console.log(`[DEBUG] Calling analytics API: ${url}`);
      const response = await fetch(url);
      
      const contentType = response.headers.get("content-type");
      console.log(`[DEBUG] Response status: ${response.status}, content-type: ${contentType}`);
      
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error('Non-JSON response received:', text.substring(0, 200));
        throw new Error(`O servidor retornou um formato inesperado (HTML). Verifique se a rota da API está correta.`);
      }

      const data = await response.json();
      if (response.ok) {
        setReportData(data);
      } else {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast.error(`Erro ao carregar relatórios: ${error.message}`);
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

  const toggleStatus = async (banner: Banner) => {
    try {
      await updateDoc(doc(db, 'featured_banners', banner.id), {
        is_active: !banner.is_active
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'featured_banners');
    }
  };

  const handleFeedFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFeedFiles(prev => ({ ...prev, [type]: file }));
      setFeedPreviews(prev => ({ ...prev, [type]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleOpenFeedModal = (ad?: ArenaAd) => {
    setFeedFiles({
      main: null,
      feed_top: null,
      feed_between: null,
      sidebar: null,
      profile: null
    });
    
    if (ad) {
      setEditingFeedAd(ad);
      setFeedPreviews({
        main: ad.media_url || '',
        feed_top: ad.media_url_feed_top || '',
        feed_between: ad.media_url_feed_between || '',
        sidebar: ad.media_url_sidebar || '',
        profile: ad.media_url_profile || ''
      });
      setFeedFormData({
        title: ad.title,
        content: ad.content,
        media_url: ad.media_url || '',
        media_url_feed_top: ad.media_url_feed_top || '',
        media_url_feed_between: ad.media_url_feed_between || '',
        media_url_sidebar: ad.media_url_sidebar || '',
        media_url_profile: ad.media_url_profile || '',
        link_url: ad.link_url || '',
        placement: ad.placement,
        active: ad.active,
        order: ad.order || 0,
        start_date: formatDateForInput(ad.start_date),
        end_date: formatDateForInput(ad.end_date),
        country: ad.country || '',
        state: ad.state || '',
        city: ad.city || '',
        country_id: ad.country_id || '',
        state_id: ad.state_id || '',
        city_id: ad.city_id || ''
      });
      if (ad.country_id) fetchStates(ad.country_id);
      if (ad.state_id) fetchCities(ad.state_id);
    } else {
      setEditingFeedAd(null);
      setFeedPreviews({
        main: '',
        feed_top: '',
        feed_between: '',
        sidebar: '',
        profile: ''
      });
      setFeedFormData({
        title: '',
        content: '',
        media_url: '',
        media_url_feed_top: '',
        media_url_feed_between: '',
        media_url_sidebar: '',
        media_url_profile: '',
        link_url: '',
        placement: 'feed_between',
        active: true,
        order: feedAds.length,
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
    setIsFeedModalOpen(true);
  };

  const handleSaveFeedAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) return;
    const toastId = toast.loading('Salvando anúncio...');
    setIsUploading(true);
    try {
      let finalMediaUrl = feedFormData.media_url;
      let finalMediaUrlFeedTop = feedFormData.media_url_feed_top;
      let finalMediaUrlFeedBetween = feedFormData.media_url_feed_between;
      let finalMediaUrlSidebar = feedFormData.media_url_sidebar;
      let finalMediaUrlProfile = feedFormData.media_url_profile;

      // Upload main media if exists
      if (feedFiles.main) {
        finalMediaUrl = await uploadImage(feedFiles.main, 'feed_ads');
      }

      // Upload specific media per placement
      if (feedFiles.feed_top) {
        finalMediaUrlFeedTop = await uploadImage(feedFiles.feed_top, 'feed_ads/feed_top');
      }
      if (feedFiles.feed_between) {
        finalMediaUrlFeedBetween = await uploadImage(feedFiles.feed_between, 'feed_ads/feed_between');
      }
      if (feedFiles.sidebar) {
        finalMediaUrlSidebar = await uploadImage(feedFiles.sidebar, 'feed_ads/sidebar');
      }
      if (feedFiles.profile) {
        finalMediaUrlProfile = await uploadImage(feedFiles.profile, 'feed_ads/profile');
      }

      const dataToSave = {
        ...feedFormData,
        media_url: finalMediaUrl,
        media_url_feed_top: finalMediaUrlFeedTop,
        media_url_feed_between: finalMediaUrlFeedBetween,
        media_url_sidebar: finalMediaUrlSidebar,
        media_url_profile: finalMediaUrlProfile,
        start_date: feedFormData.start_date ? new Date(feedFormData.start_date).toISOString() : null,
        end_date: feedFormData.end_date ? new Date(feedFormData.end_date).toISOString() : null,
      };

      if (editingFeedAd) {
        const { error } = await supabase
          .from('arena_ads')
          .update(dataToSave)
          .eq('id', editingFeedAd.id);
        if (error) throw error;
        toast.success('Anúncio atualizado!', { id: toastId });
      } else {
        const { error } = await supabase
          .from('arena_ads')
          .insert([dataToSave]);
        if (error) throw error;
        toast.success('Anúncio criado!', { id: toastId });
      }
      setIsFeedModalOpen(false);
      fetchFeedAds();
    } catch (error: any) {
      console.error('Error saving feed ad:', error);
      toast.error('Erro ao salvar anúncio: ' + error.message, { id: toastId });
    } finally {
      setIsUploading(false);
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
                <optgroup label="Feed Ads">
                  {feedAds.map(ad => (
                    <option key={ad.id} value={ad.id}>{ad.title}</option>
                  ))}
                </optgroup>
                <optgroup label="Landing Page Banners">
                  {banners.map(banner => (
                    <option key={banner.id} value={banner.id}>{banner.title || `Banner ${banner.id.slice(0, 8)}`}</option>
                  ))}
                </optgroup>
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
              className="bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 md:p-8 border-b border-white/10 flex justify-between items-center shrink-0">
                <div className="space-y-1">
                  <h3 className="text-xl font-black uppercase italic tracking-tight">
                    {editingFeedAd ? 'Editar Anúncio' : 'Novo Anúncio de Feed'}
                  </h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Configure os detalhes do anúncio no feed</p>
                </div>
                <button onClick={() => setIsFeedModalOpen(false)} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveFeedAd} className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Título do Anúncio</label>
                    <input 
                      type="text"
                      required
                      value={feedFormData.title}
                      onChange={(e) => setFeedFormData({ ...feedFormData, title: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-all"
                      placeholder="Ex: Patrocinador Oficial"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Link de Destino</label>
                    <div className="relative">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500">
                        <LinkIcon size={14} />
                      </div>
                      <input 
                        type="url"
                        value={feedFormData.link_url}
                        onChange={(e) => setFeedFormData({ ...feedFormData, link_url: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-all"
                        placeholder="https://exemplo.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Data de Início (Opcional)</label>
                    <div className="relative">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500">
                        <Calendar size={14} />
                      </div>
                      <input 
                        type="datetime-local"
                        value={feedFormData.start_date}
                        onChange={(e) => setFeedFormData({ ...feedFormData, start_date: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Data de Término (Opcional)</label>
                    <div className="relative">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500">
                        <Calendar size={14} />
                      </div>
                      <input 
                        type="datetime-local"
                        value={feedFormData.end_date}
                        onChange={(e) => setFeedFormData({ ...feedFormData, end_date: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Segmentação Geográfica (Opcional)</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <select
                        value={feedFormData.country_id}
                        onChange={(e) => {
                          const country = countries.find(c => c.id === e.target.value);
                          setFeedFormData({ 
                            ...feedFormData, 
                            country_id: e.target.value, 
                            country: country?.name || '',
                            state_id: '',
                            state: '',
                            city_id: '',
                            city: ''
                          });
                          if (e.target.value) fetchStates(e.target.value);
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-all appearance-none"
                      >
                        <option value="">Todos os Países</option>
                        {countries.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <select
                        value={feedFormData.state_id}
                        disabled={!feedFormData.country_id}
                        onChange={(e) => {
                          const state = states.find(s => s.id === e.target.value);
                          setFeedFormData({ 
                            ...feedFormData, 
                            state_id: e.target.value, 
                            state: state?.name || '',
                            city_id: '',
                            city: ''
                          });
                          if (e.target.value) fetchCities(e.target.value);
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-all appearance-none disabled:opacity-50"
                      >
                        <option value="">Todos os Estados</option>
                        {states.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <select
                        value={feedFormData.city_id}
                        disabled={!feedFormData.state_id}
                        onChange={(e) => {
                          const city = cities.find(c => c.id === e.target.value);
                          setFeedFormData({ 
                            ...feedFormData, 
                            city_id: e.target.value, 
                            city: city?.name || ''
                          });
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-all appearance-none disabled:opacity-50"
                      >
                        <option value="">Todas as Cidades</option>
                        {cities.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Posicionamentos</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'all', label: 'Todos os Posicionamentos' },
                      { id: 'feed_top', label: 'Topo do Feed' },
                      { id: 'feed_between', label: 'Entre Posts' },
                      { id: 'sidebar', label: 'Barra Lateral' },
                      { id: 'profile', label: 'Perfil' }
                    ].map((pos) => {
                      const isAll = pos.id === 'all';
                      const isSelected = isAll 
                        ? feedFormData.placement === 'feed_top,feed_between,sidebar,profile'
                        : feedFormData.placement.includes(pos.id);
                      const isDisabled = !isAll && feedFormData.placement === 'feed_top,feed_between,sidebar,profile';

                      return (
                        <button
                          key={pos.id}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => {
                            if (isAll) {
                              setFeedFormData({
                                ...feedFormData,
                                placement: isSelected ? 'feed_between' : 'feed_top,feed_between,sidebar,profile'
                              });
                            } else {
                              const currentPlacements = feedFormData.placement.split(',').filter(p => p);
                              let newPlacements;
                              if (isSelected) {
                                newPlacements = currentPlacements.filter(p => p !== pos.id);
                                if (newPlacements.length === 0) newPlacements = ['feed_between'];
                              } else {
                                newPlacements = [...currentPlacements, pos.id];
                              }
                              setFeedFormData({
                                ...feedFormData,
                                placement: newPlacements.join(',')
                              });
                            }
                          }}
                          className={`flex items-center space-x-3 p-4 rounded-2xl border transition-all text-left ${
                            isSelected 
                              ? 'bg-blue-600/10 border-blue-600/30 text-blue-500' 
                              : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'
                          } ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                        >
                          <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                            isSelected ? 'bg-blue-600 border-blue-600' : 'border-white/20'
                          }`}>
                            {isSelected && <Check size={12} className="text-white" />}
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest">{pos.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Conteúdo / Descrição</label>
                  <textarea 
                    required
                    value={feedFormData.content}
                    onChange={(e) => setFeedFormData({ ...feedFormData, content: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-all h-32 resize-none"
                    placeholder="Descreva o anúncio de forma atrativa..."
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Mídias por Posicionamento</label>
                  <div className="space-y-6">
                    {/* Main Media (Fallback) */}
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 ml-2">Mídia Principal (Fallback)</label>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <input 
                            type="text"
                            value={feedFormData.media_url}
                            onChange={(e) => setFeedFormData({ ...feedFormData, media_url: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500 transition-all"
                            placeholder="URL da imagem ou vídeo"
                          />
                        </div>
                        <div className="relative">
                          <input 
                            type="file"
                            id="feed-media-main"
                            className="hidden"
                            accept="image/*,video/*"
                            onChange={(e) => handleFeedFileChange(e, 'main')}
                          />
                          <label 
                            htmlFor="feed-media-main"
                            className="flex items-center justify-center w-14 h-14 bg-blue-600/20 border border-blue-600/30 rounded-2xl text-blue-500 cursor-pointer hover:bg-blue-600/30 transition-all"
                          >
                            <Upload size={20} />
                          </label>
                        </div>
                      </div>
                      {feedPreviews.main && (
                        <div className="mt-2 relative w-32 h-20 rounded-xl overflow-hidden border border-white/10">
                          {feedPreviews.main.includes('video') || feedPreviews.main.startsWith('data:video') ? (
                            <video src={feedPreviews.main} className="w-full h-full object-cover" />
                          ) : (
                            <img src={feedPreviews.main} className="w-full h-full object-cover" />
                          )}
                          <button 
                            type="button"
                            onClick={() => {
                              setFeedPreviews(prev => ({ ...prev, main: '' }));
                              setFeedFiles(prev => ({ ...prev, main: null }));
                              setFeedFormData(prev => ({ ...prev, media_url: '' }));
                            }}
                            className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-rose-500 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Specific Placements */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[
                        { id: 'feed_top', label: 'Topo do Feed', dim: '1200x300' },
                        { id: 'feed_between', label: 'Entre Posts', dim: '1200x630' },
                        { id: 'sidebar', label: 'Barra Lateral', dim: '600x800' },
                        { id: 'profile', label: 'Perfil', dim: '1200x400' }
                      ].map((pos) => {
                        const isSelected = feedFormData.placement.includes(pos.id);
                        if (!isSelected) return null;

                        const fieldName = `media_url_${pos.id}` as keyof typeof feedFormData;
                        const preview = feedPreviews[pos.id];

                        return (
                          <div key={pos.id} className="space-y-2 p-4 bg-white/5 border border-white/10 rounded-2xl">
                            <div className="flex justify-between items-center mb-2">
                              <label className="text-[9px] font-bold uppercase tracking-widest text-blue-400">{pos.label}</label>
                              <span className="text-[8px] font-medium text-gray-500">Recomendado: {pos.dim}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <input 
                                  type="text"
                                  value={feedFormData[fieldName] as string}
                                  onChange={(e) => setFeedFormData({ ...feedFormData, [fieldName]: e.target.value })}
                                  className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500 transition-all"
                                  placeholder="URL específica"
                                />
                              </div>
                              <div className="relative">
                                <input 
                                  type="file"
                                  id={`feed-media-${pos.id}`}
                                  className="hidden"
                                  accept="image/*,video/*"
                                  onChange={(e) => handleFeedFileChange(e, pos.id)}
                                />
                                <label 
                                  htmlFor={`feed-media-${pos.id}`}
                                  className="flex items-center justify-center w-10 h-10 bg-white/5 border border-white/10 rounded-xl text-gray-400 cursor-pointer hover:bg-white/10 transition-all"
                                >
                                  <Upload size={16} />
                                </label>
                              </div>
                            </div>
                            {preview && (
                              <div className="mt-2 relative w-full h-24 rounded-xl overflow-hidden border border-white/10">
                                {preview.includes('video') || preview.startsWith('data:video') ? (
                                  <video src={preview} className="w-full h-full object-cover" />
                                ) : (
                                  <img src={preview} className="w-full h-full object-cover" />
                                )}
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setFeedPreviews(prev => ({ ...prev, [pos.id]: '' }));
                                    setFeedFiles(prev => ({ ...prev, [pos.id]: null }));
                                    setFeedFormData(prev => ({ ...prev, [fieldName]: '' }));
                                  }}
                                  className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-rose-500 transition-colors"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/10 gap-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${feedFormData.active ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-gray-500'}`} />
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-black uppercase tracking-widest block">Status do Anúncio</span>
                      <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">{feedFormData.active ? 'Visível no Feed' : 'Oculto'}</span>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setFeedFormData({ ...feedFormData, active: !feedFormData.active })}
                    className={`w-14 h-7 rounded-full transition-all relative ${feedFormData.active ? 'bg-blue-600' : 'bg-gray-700'}`}
                  >
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg transition-all ${feedFormData.active ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-4 shrink-0">
                  <button 
                    type="button"
                    onClick={() => setIsFeedModalOpen(false)}
                    className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isUploading}
                    className="w-full sm:w-auto px-12 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Processando...</span>
                      </>
                    ) : (
                      <>
                        <Save size={14} />
                        <span>Salvar Anúncio</span>
                      </>
                    )}
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
