import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Users, ChevronRight, ChevronLeft, Star, TrendingUp, Shield, Zap, Search, ArrowRight, User } from 'lucide-react';
import { supabase } from '../services/supabase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { trackAdEvent } from '../services/adService';
import { PublicHeader } from '../components/PublicHeader';
import { PublicFooter } from '../components/PublicFooter';
import { ArenaProfile } from '../types';

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
  country?: string;
  state?: string;
  city?: string;
  country_id?: string;
  state_id?: string;
  city_id?: string;
}

export const LandingPage: React.FC<{ userProfile?: ArenaProfile | null }> = ({ userProfile }) => {
  const navigate = useNavigate();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [topAthletes, setTopAthletes] = useState<ArenaProfile[]>([]);
  const [featuredProfiles, setFeaturedProfiles] = useState<ArenaProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch Banners from Firebase
    const q = query(collection(db, 'featured_banners'), where('is_active', '==', true), orderBy('order', 'asc'));
    const unsubscribeBanners = onSnapshot(q, (snapshot) => {
      const now = new Date();
      const bannersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Banner[];

      // Filter by date and geographic location
      const filteredBanners = bannersData.filter(banner => {
        const start = banner.start_date ? new Date(banner.start_date.seconds * 1000) : null;
        const end = banner.end_date ? new Date(banner.end_date.seconds * 1000) : null;

        if (start && start > now) return false;
        if (end && end < now) return false;

        // Geographic segmentation
        if (userProfile) {
          // Priority 1: Match by ID if both have it
          // Priority 2: Fallback to name if ID is missing on either side
          
          if (banner.country_id && userProfile.country_id) {
            if (banner.country_id !== userProfile.country_id) return false;
          } else if (banner.country && banner.country !== userProfile.country) {
            return false;
          }

          if (banner.state_id && userProfile.state_id) {
            if (banner.state_id !== userProfile.state_id) return false;
          } else if (banner.state && banner.state !== userProfile.state) {
            return false;
          }

          if (banner.city_id && userProfile.city_id) {
            if (banner.city_id !== userProfile.city_id) return false;
          } else if (banner.city && banner.city !== userProfile.city) {
            return false;
          }
        } else {
          // If not logged in, hide banners that have specific location constraints
          if (banner.country || banner.state || banner.city || banner.country_id || banner.state_id || banner.city_id) return false;
        }

        return true;
      });

      setBanners(filteredBanners);
    });

    // Fetch Rankings from Supabase
    const fetchRankings = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .neq('role', 'admin')
          .eq('perfil_publico', true)
          .gt('arena_score', 0)
          .order('arena_score', { ascending: false, nullsFirst: false })
          .limit(5);
        
        if (error) throw error;
        setTopAthletes(data || []);
      } catch (err) {
        console.error('Error fetching top athletes:', err);
      }
    };

    // Fetch Featured Profiles from Supabase
    const fetchFeatured = async () => {
      try {
        const isMobile = window.innerWidth < 768;
        const limit = isMobile ? 10 : 30;

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .neq('role', 'admin')
          .neq('role', 'developer')
          .eq('perfil_publico', true)
          .gt('arena_score', 0)
          .limit(100);
        
        if (error) throw error;
        
        // Shuffle for variety and take the limit based on device
        const shuffled = (data || [])
          .sort(() => 0.5 - Math.random())
          .slice(0, limit);
          
        setFeaturedProfiles(shuffled);
      } catch (err) {
        console.error('Error fetching featured profiles:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
    fetchFeatured();

    return () => unsubscribeBanners();
  }, []);

  // Reset currentBannerIndex if it's out of bounds when banners change
  useEffect(() => {
    if (banners.length > 0 && currentBannerIndex >= banners.length) {
      setCurrentBannerIndex(0);
    }
  }, [banners, currentBannerIndex]);

  // Banner Carousel Auto-play
  useEffect(() => {
    if (banners.length === 0) return;

    const currentBanner = banners[currentBannerIndex];
    if (!currentBanner) return; // Safety check

    const timer = setTimeout(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, (currentBanner?.display_time || 15) * 1000);

    // Track impression for current banner
    if (currentBanner?.id) {
      trackAdEvent(currentBanner.id, 'impression', userProfile?.id);
    }

    return () => clearTimeout(timer);
  }, [banners, currentBannerIndex, userProfile?.id]);

  const nextBanner = () => setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
  const prevBanner = () => setCurrentBannerIndex((prev) => (prev - 1 + banners.length) % banners.length);

  return (
    <div className="min-h-screen bg-[#000] text-white selection:bg-blue-500/30 overflow-x-hidden">
      <PublicHeader />

      <main className="pt-20">
        {/* Hero / Banners Section */}
        <section className="relative h-[400px] md:h-[600px] overflow-hidden">
          <AnimatePresence mode="wait">
            {banners.length > 0 && banners[currentBannerIndex] ? (
              <motion.a
                key={banners[currentBannerIndex].id}
                href={banners[currentBannerIndex].link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackAdEvent(banners[currentBannerIndex].id, 'click', userProfile?.id)}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute inset-0 block"
              >
                <picture>
                  {banners[currentBannerIndex].mobile_image_url && (
                    <source media="(max-width: 768px)" srcSet={banners[currentBannerIndex].mobile_image_url} />
                  )}
                  <img 
                    src={banners[currentBannerIndex].image_url} 
                    alt={banners[currentBannerIndex].title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </picture>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                
                {banners[currentBannerIndex].title && (
                  <div className="absolute bottom-12 left-6 md:left-12 max-w-2xl">
                    <motion.h2 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-3xl md:text-6xl font-black uppercase italic tracking-tighter leading-none mb-4"
                    >
                      {banners[currentBannerIndex].title}
                    </motion.h2>
                  </div>
                )}
              </motion.a>
            ) : banners.length === 0 ? (
              <div className="absolute inset-0 bg-gradient-to-br from-[#0A1F44] to-black flex flex-col items-center justify-center text-center p-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <h1 className="text-5xl md:text-8xl font-black uppercase italic tracking-tighter leading-none">
                    Arena <span className="text-blue-600">Protocol</span>
                  </h1>
                  <p className="text-gray-400 max-w-xl mx-auto text-sm md:text-lg font-medium uppercase tracking-widest">
                    A elite do esporte de combate reunida em um só lugar.
                  </p>
                  <button 
                    onClick={() => navigate('/login')}
                    className="px-12 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-blue-600/40 hover:scale-105 transition-all"
                  >
                    Começar Agora
                  </button>
                </motion.div>
              </div>
            ) : null}
          </AnimatePresence>

          {banners.length > 1 && (
            <>
              <button 
                onClick={(e) => { e.preventDefault(); prevBanner(); }}
                className="absolute left-6 top-1/2 -translate-y-1/2 p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-full hover:bg-white/10 transition-all z-10"
              >
                <ChevronLeft size={24} />
              </button>
              <button 
                onClick={(e) => { e.preventDefault(); nextBanner(); }}
                className="absolute right-6 top-1/2 -translate-y-1/2 p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-full hover:bg-white/10 transition-all z-10"
              >
                <ChevronRight size={24} />
              </button>
              
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
                {banners.map((_, i) => (
                  <button 
                    key={i}
                    onClick={(e) => { e.preventDefault(); setCurrentBannerIndex(i); }}
                    className={`h-1 rounded-full transition-all ${i === currentBannerIndex ? 'w-8 bg-blue-600' : 'w-2 bg-white/20'}`}
                  />
                ))}
              </div>
            </>
          )}
        </section>

        {/* Arena Elite (Ranking) Section */}
        <section className="py-24 px-6 md:px-12 bg-gradient-to-b from-black to-[#0A1F44]/20">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500">Arena Elite</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">Ranking <span className="text-blue-600">Global</span></h2>
              </div>
              <button 
                onClick={() => navigate('/rankings')}
                className="flex items-center space-x-3 px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all group"
              >
                <span>Ver Ranking Completo</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {topAthletes.map((athlete, index) => (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  key={athlete.id}
                  className="bg-white/5 border border-white/10 rounded-3xl p-4 md:p-6 flex items-center gap-6 group hover:bg-white/10 transition-all cursor-pointer"
                  onClick={() => navigate(`/user/@${athlete.username}`)}
                >
                  <div className="w-12 text-center">
                    <span className={`text-2xl font-black italic ${index === 0 ? 'text-[#FFD700]' : index === 1 ? 'text-zinc-400' : index === 2 ? 'text-amber-700' : 'text-gray-600'}`}>
                      #{index + 1}
                    </span>
                  </div>
                  
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-black border border-white/10 overflow-hidden flex-shrink-0">
                    {athlete.profile_photo || athlete.avatar_url ? (
                      <img src={athlete.profile_photo || athlete.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl font-black text-blue-600">
                        {athlete.full_name?.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg md:text-2xl font-black uppercase italic truncate">{athlete.full_name}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{athlete.modality}</span>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{athlete.team || 'Independente'}</span>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{athlete.city}, {athlete.state}</span>
                    </div>
                  </div>

                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Arena Score</p>
                    <p className="text-2xl md:text-4xl font-black italic text-blue-600">{Math.round(athlete.arena_score)}</p>
                  </div>

                  <div className="p-3 bg-white/5 rounded-xl text-gray-500 group-hover:text-white transition-colors">
                    <ChevronRight size={20} />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Profiles Section */}
        <section className="py-24 px-6 md:px-12 bg-black">
          <div className="max-w-7xl mx-auto">
            <div className="text-center space-y-4 mb-16">
              <div className="flex items-center justify-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500">Comunidade</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">Perfis em <span className="text-blue-600">Destaque</span></h2>
              <p className="text-gray-500 max-w-2xl mx-auto text-sm font-medium uppercase tracking-widest">
                Conecte-se com os atletas mais ativos da nossa arena.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {featuredProfiles.map((profile, index) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: (index % 10) * 0.05 }}
                  key={profile.id}
                  className="group relative w-full bg-white/5 border border-white/10 rounded-2xl md:rounded-[32px] overflow-hidden hover:border-blue-500/50 transition-all cursor-pointer"
                  onClick={() => navigate(`/user/@${profile.username}`)}
                >
                  <div className="aspect-[4/5] relative overflow-hidden">
                    {profile.profile_photo || profile.avatar_url ? (
                      <img 
                        src={profile.profile_photo || profile.avatar_url} 
                        alt="" 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-900/20 to-black flex items-center justify-center">
                        <User size={48} className="text-blue-600/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                    
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-sm font-black uppercase italic truncate text-white">{profile.full_name}</h3>
                      <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest truncate">{profile.modality}</p>
                    </div>
                  </div>
                  
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Zap size={10} className="text-blue-500" />
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{Math.round(profile.arena_score)}</span>
                    </div>
                    <button className="p-2 bg-white/5 rounded-xl text-gray-500 group-hover:text-blue-500 group-hover:bg-blue-500/10 transition-all">
                      <Star size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-16 text-center">
              <button 
                onClick={() => navigate('/search')}
                className="px-12 py-5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Explorar Todos os Perfis
              </button>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6 md:px-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-blue-600 opacity-10 blur-[120px] -z-10" />
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-5xl md:text-8xl font-black uppercase italic tracking-tighter leading-none">
              Pronto para o <span className="text-blue-600">Combate?</span>
            </h2>
            <p className="text-gray-400 text-sm md:text-lg font-medium uppercase tracking-widest max-w-xl mx-auto">
              Junte-se a milhares de atletas e comece sua jornada rumo ao topo do ranking global.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button 
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-12 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-blue-600/40 hover:scale-105 transition-all"
              >
                Criar Perfil Grátis
              </button>
              <button 
                onClick={() => navigate('/rankings')}
                className="w-full sm:w-auto px-12 py-5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Ver Rankings
              </button>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
};
