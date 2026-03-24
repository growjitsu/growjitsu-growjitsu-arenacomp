import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CardPreview } from '../components/CardPreview';
import { Trophy, ArrowLeft, Share2, Download, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../services/supabase';
import { toast } from 'sonner';

export const SharePage = () => {
  const { type, id } = useParams<{ type?: string; id: string }>();
  const navigate = useNavigate();
  const [cardData, setCardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      setLoading(true);
      try {
        let data: any = null;

        // 1. Tenta decodificar como Base64 (formato antigo/fallback)
        if (id.length > 50) {
          try {
            data = JSON.parse(atob(id));
            console.log('Dados decodificados via Base64:', data);
          } catch (e) {
            console.log('ID longo mas não é Base64 JSON válido');
          }
        }

        // 2. Se não decodificou ou se temos um type explícito, busca via API/Supabase
        if (!data && type) {
          console.log(`Buscando dados via API para type: ${type}, id: ${id}`);
          
          if (type === 'post' || type === 'clip') {
            const { data: post } = await supabase
              .from('posts')
              .select('*')
              .eq('id', id)
              .single();
            
            if (post) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('username, full_name, profile_photo, modality')
                .eq('id', post.author_id)
                .single();

              data = {
                athleteName: profile?.full_name || 'Atleta Arena',
                achievement: post.content || (type === 'clip' ? 'Compartilhou um clip' : 'Compartilhou um post'),
                modality: profile?.modality || 'Feed',
                date: new Date(post.created_at).toLocaleDateString(),
                profileUrl: `https://arenacomp.com.br/@${profile?.username}`,
                mainImageUrl: post.media_url || (post.media_urls && post.media_urls[0]),
                type: type,
                realId: id
              };
            }
          } else if (type === 'profile') {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', id)
              .single();
            
            if (profile) {
              data = {
                athleteName: profile.full_name || 'Atleta Arena',
                achievement: 'Confira meu perfil na ArenaComp!',
                modality: profile.modality || 'Atleta',
                date: new Date().toLocaleDateString(),
                profileUrl: `https://arenacomp.com.br/@${profile.username}`,
                mainImageUrl: profile.profile_photo,
                type: 'profile',
                realId: id
              };
            }
          } else if (type === 'certificate') {
            const { data: cert } = await supabase
              .from('certificates')
              .select('*')
              .eq('id', id)
              .single();
            
            if (cert) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('username, full_name, modality')
                .eq('id', cert.athlete_id)
                .single();

              data = {
                athleteName: profile?.full_name || 'Atleta Arena',
                achievement: `Certificado: ${cert.name}`,
                modality: profile?.modality || 'Atleta',
                date: new Date(cert.created_at).toLocaleDateString(),
                profileUrl: `https://arenacomp.com.br/@${profile?.username}`,
                mainImageUrl: cert.media_url,
                type: 'certificate',
                realId: id
              };
            }
          } else if (type === 'championship') {
             const { data: champ } = await supabase
              .from('championship_results')
              .select('*')
              .eq('id', id)
              .single();
            
            if (champ) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('username, full_name, modality')
                .eq('id', champ.athlete_id)
                .single();

              data = {
                athleteName: profile?.full_name || 'Atleta Arena',
                achievement: `${champ.resultado} no ${champ.evento}`,
                modality: profile?.modality || 'Atleta',
                date: new Date(champ.created_at).toLocaleDateString(),
                profileUrl: `https://arenacomp.com.br/@${profile?.username}`,
                mainImageUrl: champ.media_url,
                type: 'championship',
                realId: id
              };
            }
          } else if (type === 'fight') {
             const { data: fight } = await supabase
              .from('fights')
              .select('*')
              .eq('id', id)
              .single();
            
            if (fight) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('username, full_name, modality')
                .eq('id', fight.athlete_id)
                .single();

              data = {
                athleteName: profile?.full_name || 'Atleta Arena',
                achievement: `Luta no ${fight.evento}`,
                modality: profile?.modality || 'Atleta',
                date: new Date(fight.created_at).toLocaleDateString(),
                profileUrl: `https://arenacomp.com.br/@${profile?.username}`,
                mainImageUrl: fight.media_url,
                type: 'fight',
                realId: id
              };
            }
          }
        }

        if (data) {
          setCardData(data);
        } else {
          setError('Conteúdo não encontrado ou link inválido.');
        }
      } catch (err) {
        console.error('Erro ao carregar dados do card:', err);
        setError('Falha ao carregar informações de compartilhamento.');
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
      // Usando window.location.href conforme solicitado para garantir o redirecionamento exato
      switch (contentType) {
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
        case 'profile':
          window.location.href = `/profile/${realId}`;
          break;
        case 'fight':
          window.location.href = `/fights/${realId}`;
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
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-[#0066FF] to-blue-700 rounded-lg flex items-center justify-center font-black text-white italic border border-white/10">
            <Trophy size={16} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">ArenaComp</span>
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
