import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CardPreview } from '../components/CardPreview';
import { Logo } from '../components/Logo';
import { Trophy, ArrowLeft, Share2, Download, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../services/supabase';
import { getApiUrl } from '../lib/api';
import { toast } from 'sonner';

export const SharePage = () => {
  const location = useLocation();
  const { type: paramType, id } = useParams<{ type?: string; id: string }>();
  const navigate = useNavigate();
  const [cardData, setCardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inferred type from URL path if not provided in params
  const type = paramType || (() => {
    const path = location.pathname;
    if (path.startsWith('/post/')) return 'post';
    if (path.startsWith('/clip/')) return 'clip';
    if (path.startsWith('/certificate/')) return 'certificate';
    return undefined;
  })();

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      let data: any = null;

      try {
        console.log(`[SharePage] Carregando conteúdo para ID: ${id} | Inferred Type: ${type || 'auto'}`);
        
        // 1. Tenta buscar via API Unificada (Servidor) - SEMPRE A OPÇÃO MAIS SEGURA (BYPASS RLS)
        const apiUrl = type 
          ? getApiUrl(`/api/share/info/${type}/${id}`)
          : getApiUrl(`/api/share/info/${id}`);
          
        try {
          const apiRes = await fetch(apiUrl);
          if (apiRes.ok) {
            const apiData = await apiRes.json();
            // Aceita se success for true OU se houver data presente
            if (apiData.data) {
              console.log('[SharePage] Dados obtidos via API do servidor:', apiData.data);
              data = apiData.data;
            }
          }
        } catch (apiErr) {
          console.error('[SharePage] Erro ao chamar API do servidor:', apiErr);
        }

        // 2. Fallback Final: Supabase direto no cliente (Resiliente a falhas de relacionamento)
        if (!data) {
          console.log('[SharePage] Iniciando busca direta no Supabase (Client-Side Fallback)');
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

          if (isUUID) {
            // Tenta por POSTS (independente de join com profiles)
            try {
              const { data: post, error: postErr } = await supabase.from('posts').select('*').eq('id', id).maybeSingle();
              if (post) {
                console.log('[SharePage] Post encontrado via busca direta');
                // Busca autor separadamente se o join falhou
                let authorProfile = null;
                const authorId = post.author_id || post.user_id;
                if (authorId) {
                  const { data: ap } = await supabase.from('profiles').select('*').eq('id', authorId).maybeSingle();
                  authorProfile = ap;
                }

                data = {
                  athleteName: authorProfile?.full_name || (post.metadata?.author_name) || 'Atleta Arena',
                  achievement: post.content || 'Veja este Post na ArenaComp',
                  modality: authorProfile?.modality || 'Feed',
                  date: post.created_at ? new Date(post.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
                  mainImageUrl: post.media_url || (post.media_urls && post.media_urls[0]) || post.thumbnail_url,
                  type: post.type || 'post',
                  realId: id,
                  profilePhoto: authorProfile?.profile_photo || authorProfile?.avatar_url
                };
              }
            } catch (e) {
              console.error('[SharePage] Erro na busca direta de posts:', e);
            }

            // Tenta por PROFILES (se ainda não achou)
            if (!data) {
              try {
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
                if (profile) {
                  console.log('[SharePage] Perfil encontrado via busca direta');
                  data = {
                    athleteName: profile.full_name || 'Atleta Arena',
                    achievement: 'Confira meu perfil na ArenaComp!',
                    modality: profile.modality || 'Atleta',
                    date: new Date().toLocaleDateString(),
                    profileUrl: `https://arenacomp.com.br/user/@${profile.username}`,
                    mainImageUrl: profile.profile_photo || profile.avatar_url,
                    type: 'profile',
                    realId: id
                  };
                }
              } catch (e) {}
            }

            // Tenta por CERTIFICATES
            if (!data) {
              try {
                const { data: cert } = await supabase.from('certificates').select('*').eq('id', id).maybeSingle();
                if (cert) {
                  console.log('[SharePage] Certificado encontrado via busca direta');
                  let p = null;
                  if (cert.profile_id) {
                    const { data: ap } = await supabase.from('profiles').select('*').eq('id', cert.profile_id).maybeSingle();
                    p = ap;
                  }
                  data = {
                    athleteName: p?.full_name || 'Atleta Arena',
                    achievement: `Certificado: ${cert.name}`,
                    modality: 'Conquista',
                    mainImageUrl: cert.media_url,
                    profilePhoto: p?.profile_photo,
                    type: 'certificate',
                    realId: id,
                    title: 'Certificado ArenaComp'
                  };
                }
              } catch (e) {}
            }
          }
        }

        // 3. Fallback: Se é um ID longo, tenta decodificação local
        if (!data && id.length > 30 && !id.includes('-')) {
          try {
            const base64 = id.replace(/-/g, '+').replace(/_/g, '/');
            const decodedString = atob(base64);
            const jsonString = decodeURIComponent(escape(decodedString));
            const decoded = JSON.parse(jsonString);
            
            if (decoded && (decoded.title || decoded.athleteName)) {
              data = {
                athleteName: decoded.athleteName || decoded.title,
                achievement: decoded.achievement || decoded.description,
                modality: decoded.modality || 'Arena',
                date: decoded.date || new Date().toLocaleDateString(),
                profileUrl: decoded.profileUrl,
                mainImageUrl: decoded.mainImageUrl || decoded.image,
                type: decoded.type || type || 'post',
                realId: decoded.realId || id,
                title: decoded.title
              };
            }
          } catch (e) {
            console.log('[SharePage] Erro no fallback Base64 local');
          }
        }

        if (data) {
          setCardData(data);
        } else {
          setError('Conteúdo não encontrado ou link inválido.');
        }
      } catch (err) {
        console.error('[SharePage] Erro crítico ao carregar dados:', err);
        setError('Ocorreu um erro ao carregar o conteúdo compartilhado.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, type]);

  const handleRedirect = () => {
    if (!cardData) return;

    const contentType = cardData.type;
    const realId = cardData.realId;

    if (realId && contentType) {
      switch (contentType) {
        case 'atleta':
        case 'profile':
          window.location.href = `/profile/${realId}`;
          break;
        case 'equipe':
          window.location.href = `/rankings`;
          break;
        case 'post':
          window.location.href = `/feed/post/${realId}`;
          break;
        case 'certificate':
          window.location.href = `/certificates/${realId}`;
          break;
        case 'clip':
          window.location.href = `/clips/${realId}`;
          break;
        case 'championship':
          window.location.href = `/championships/${realId}`;
          break;
        case 'fight':
          window.location.href = `/fights/${realId}`;
          break;
        case 'challenge':
          window.location.href = `/profile/${realId}`;
          break;
        default:
          window.location.href = '/feed';
      }
    } else {
      window.location.href = '/feed';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-[#0066FF] animate-spin" />
        <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Carregando Conquista...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-center justify-center text-rose-500 mb-6">
          <Trophy size={40} />
        </div>
        <h1 className="text-2xl font-black uppercase italic mb-4">Ops! Algo deu errado</h1>
        <p className="text-gray-400 mb-8 max-w-xs">{error}</p>
        <button 
          onClick={() => navigate('/')}
          className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all flex items-center space-x-2"
        >
          <ArrowLeft size={16} />
          <span>Voltar para ArenaComp</span>
        </button>
      </div>
    );
  }

  if (!cardData) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#0066FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate('/')}
          className="p-2 bg-white/5 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
          <Logo size={24} showText={true} />
        </div>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Card Preview Container - Virtual Phone Layout */}
      <div className="flex justify-center items-center w-full mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[420px] md:max-w-[380px] aspect-[9/16] bg-[#111] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden"
        >
          <CardPreview data={cardData} />
        </motion.div>
      </div>

      {/* Actions */}
      <div className="w-full max-w-md grid grid-cols-1 gap-4">
        <button 
          onClick={handleRedirect}
          className="w-full py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-white/20 transition-all flex items-center justify-center space-x-3"
        >
          <Trophy size={18} />
          <span>Ver Conteúdo Original</span>
        </button>

        <button 
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: cardData.title || 'Minha conquista no ArenaComp',
                text: `Veja minha conquista na ArenaComp 🔥`,
                url: window.location.href
              });
            } else {
              navigator.clipboard.writeText(window.location.href);
              toast.success('Link copiado para a área de transferência!');
            }
          }}
          className="w-full py-4 bg-[#0066FF] text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-blue-600/20 hover:bg-blue-600 transition-all flex items-center justify-center space-x-3"
        >
          <Share2 size={18} />
          <span>Compartilhar Link</span>
        </button>
        
        <button 
          onClick={() => navigate('/')}
          className="w-full py-4 bg-white/5 text-white border border-white/10 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-white/10 transition-all flex items-center justify-center space-x-3"
        >
          <span>Criar meu próprio Card</span>
        </button>
      </div>

      <p className="mt-12 text-[9px] font-black uppercase tracking-[0.3em] text-gray-600">
        Arena Protocol v3.1 • Share System
      </p>
    </div>
  );
};
