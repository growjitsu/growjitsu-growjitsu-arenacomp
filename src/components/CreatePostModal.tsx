import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Image as ImageIcon, Video, User, Send } from 'lucide-react';
import { supabase } from '../services/supabase';
import { ArenaProfile, PostType } from '../types';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: ArenaProfile | null;
  onPostCreated: () => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose, userProfile, onPostCreated }) => {
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [fileConfigs, setFileConfigs] = useState<{ x: number, y: number, scale: number }[]>([]);

  const compressImage = (
    file: File, 
    targetRatio: '4:5' | '1:1' | '1.91:1' | 'original' = '1:1',
    cropConfig = { x: 0, y: 0, scale: 1 }
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = 1024;
          let height = 1024;

          if (targetRatio === '4:5') {
            width = 1080;
            height = 1350;
          } else if (targetRatio === '1.91:1') {
            width = 1080;
            height = 566;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Fill background
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height);

            const imgRatio = img.width / img.height;
            const canvasRatio = width / height;
            
            let drawWidth, drawHeight;
            
            // Base cover calculation
            if (imgRatio > canvasRatio) {
              drawHeight = height;
              drawWidth = height * imgRatio;
            } else {
              drawWidth = width;
              drawHeight = width / imgRatio;
            }

            // Apply user adjustments
            drawWidth *= cropConfig.scale;
            drawHeight *= cropConfig.scale;

            // Center + user offset
            const offsetX = (width - drawWidth) / 2 + (cropConfig.x * width / 100);
            const offsetY = (height - drawHeight) / 2 + (cropConfig.y * height / 100);

            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
          }

          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Falha na compressão'));
            },
            'image/jpeg',
            0.9
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    files.forEach((file: File) => {
      const isImage = file.type.startsWith('image/') && ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type);
      const isVideo = file.type.startsWith('video/') && ['video/mp4', 'video/quicktime'].includes(file.type);

      if (!isImage && !isVideo) {
        alert(`Formato não suportado: ${file.name}. Use JPG, PNG, MP4 ou MOV.`);
        return;
      }

      if (isVideo && file.size > 4 * 1024 * 1024 * 1024) {
        alert(`Vídeo muito grande: ${file.name}. Máximo 4GB.`);
        return;
      }

      if (isVideo) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          if (video.duration > 300) {
            alert(`Vídeo muito longo: ${file.name}. Máximo 5 minutos.`);
          } else {
            setSelectedFiles(prev => [...prev, file]);
            setPreviewUrls(prev => [...prev, URL.createObjectURL(file)]);
            setFileConfigs(prev => [...prev, { x: 0, y: 0, scale: 1 }]);
          }
          window.URL.revokeObjectURL(video.src);
        };
        video.src = URL.createObjectURL(file);
      } else {
        const url = URL.createObjectURL(file);
        setSelectedFiles(prev => [...prev, file]);
        setPreviewUrls(prev => [...prev, url]);
        setFileConfigs(prev => [...prev, { x: 0, y: 0, scale: 1 }]);
      }
    });
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim() && selectedFiles.length === 0) return;
    
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Você precisa estar logado para postar');
        return;
      }

      const mediaUrls: string[] = [];
      let mediaType: PostType = 'text';

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const config = fileConfigs[i];
        let fileToUpload: File | Blob = file;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        if (file.type.startsWith('image/')) {
          try {
            fileToUpload = await compressImage(file, '1:1', config);
          } catch (err) {
            console.error('Compression error:', err);
          }
        }

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(filePath, fileToUpload, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(filePath);
        
        mediaUrls.push(publicUrl);
        if (mediaType === 'text') {
          mediaType = file.type.startsWith('image/') ? 'image' : 'video';
        }
      }

      const { error } = await supabase
        .from('posts')
        .insert({
          author_id: user.id,
          content: newPostContent.trim().toUpperCase(),
          type: mediaType,
          media_url: mediaUrls.length > 1 ? JSON.stringify(mediaUrls) : (mediaUrls[0] || null)
        });

      if (error) throw error;

      setNewPostContent('');
      setSelectedFiles([]);
      setPreviewUrls([]);
      setFileConfigs([]);
      onPostCreated();
      onClose();
    } catch (error: any) {
      console.error('Error creating post:', error);
      alert(error.message || 'Erro ao criar postagem');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--surface)] w-full max-w-4xl h-full sm:h-auto sm:max-h-[90vh] sm:rounded-[3rem] overflow-hidden shadow-2xl border-0 sm:border border-[var(--border-ui)] flex flex-col relative"
      >
        {/* Header Profissional */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-ui)]/20">
          <button 
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-white transition-all"
          >
            <X size={24} />
          </button>
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[var(--primary)] italic">Novo Relatório</h2>
          <button
            onClick={handleCreatePost}
            disabled={(!newPostContent.trim() && selectedFiles.length === 0) || uploading}
            className="text-[var(--primary)] font-black text-xs uppercase tracking-widest disabled:opacity-30"
          >
            {uploading ? '...' : 'Publicar'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
          {/* Lado Esquerdo: Preview e Ajustes */}
          <div className="w-full md:w-[500px] bg-black/30 border-r border-[var(--border-ui)]/10">
            {previewUrls.length > 0 ? (
              <div className="p-4 space-y-4">
                {previewUrls.map((url, index) => (
                  <div key={index} className="space-y-4">
                    <div className="relative aspect-square rounded-[2rem] overflow-hidden border border-white/10 bg-black group shadow-2xl">
                    {selectedFiles[index]?.type.startsWith('image/') ? (
                      <motion.div 
                        className="w-full h-full cursor-move"
                        drag
                        dragConstraints={{ left: -200, right: 200, top: -200, bottom: 200 }}
                        onDrag={(e, info) => {
                          const newConfigs = [...fileConfigs];
                          newConfigs[index] = {
                            ...newConfigs[index],
                            x: newConfigs[index].x + info.delta.x / 5,
                            y: newConfigs[index].y + info.delta.y / 5
                          };
                          setFileConfigs(newConfigs);
                        }}
                      >
                        <img 
                          src={url} 
                          alt="Preview" 
                          className="w-full h-full object-cover pointer-events-none select-none" 
                          style={{
                            transform: `scale(${fileConfigs[index]?.scale || 1}) translate(${fileConfigs[index]?.x || 0}%, ${fileConfigs[index]?.y || 0}%)`
                          }}
                        />
                      </motion.div>
                    ) : (
                      <video 
                        src={url} 
                        className="w-full h-full object-cover" 
                        controls={false}
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="metadata"
                      />
                    )}
                    
                    {/* Controles de Overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {selectedFiles[index]?.type.startsWith('image/') && (
                          <div className="flex items-center bg-black/60 rounded-full px-3 py-1 border border-white/10">
                            <span className="text-[10px] font-bold text-white/60 mr-2 uppercase">Zoom</span>
                            <input 
                              type="range" 
                              min="1" 
                              max="3" 
                              step="0.1" 
                              value={fileConfigs[index]?.scale || 1}
                              onChange={(e) => {
                                const newConfigs = [...fileConfigs];
                                newConfigs[index] = { ...newConfigs[index], scale: parseFloat(e.target.value) };
                                setFileConfigs(newConfigs);
                              }}
                              className="w-20 accent-[var(--primary)]"
                            />
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => {
                          const newFiles = [...selectedFiles];
                          const newUrls = [...previewUrls];
                          const newConfigs = [...fileConfigs];
                          newFiles.splice(index, 1);
                          newUrls.splice(index, 1);
                          newConfigs.splice(index, 1);
                          setSelectedFiles(newFiles);
                          setPreviewUrls(newUrls);
                          setFileConfigs(newConfigs);
                          window.URL.revokeObjectURL(url);
                        }}
                        className="p-2 bg-rose-500 text-white rounded-full hover:scale-110 transition-all shadow-lg"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  {selectedFiles[index]?.type.startsWith('image/') && (
                    <p className="text-[8px] font-black uppercase tracking-widest text-center text-[var(--text-muted)] flex items-center justify-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
                      Arraste a imagem e use o zoom para enquadrar
                    </p>
                  )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-6">
                <div className="w-24 h-24 rounded-[2.5rem] bg-[var(--bg)] flex items-center justify-center text-[var(--text-muted)]/20 border-2 border-dashed border-[var(--border-ui)]">
                  <ImageIcon size={40} />
                </div>
                <div>
                  <h3 className="text-[var(--text-main)] font-black text-xs uppercase tracking-[0.2em]">Sua Mídia</h3>
                  <p className="text-[var(--text-muted)] text-[10px] font-semibold mt-2">Formatos 1:1 quadrados são ideais para o feed profissional.</p>
                </div>
              </div>
            )}
          </div>

          {/* Lado Direito: Texto e Perfil */}
          <div className="flex-1 p-6 sm:p-10 flex flex-col">
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--surface)] to-[var(--bg)] flex-shrink-0 overflow-hidden border border-[var(--border-ui)] shadow-xl">
                {userProfile?.profile_photo || userProfile?.avatar_url ? (
                  <img src={userProfile.profile_photo || userProfile.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                    <User size={24} />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-black text-[var(--text-main)] uppercase tracking-wider">{userProfile?.full_name}</h4>
                <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-tighter">@{userProfile?.username}</p>
              </div>
            </div>

            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="Descreva o que aconteceu na Arena hoje..."
              className="flex-1 w-full bg-transparent border-none focus:ring-0 text-base sm:text-lg text-[var(--text-main)] placeholder-[var(--text-muted)]/30 resize-none font-semibold tracking-tight min-h-[150px]"
            />
            
            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-3">
                <label className="flex-1 h-16 rounded-[1.2rem] bg-[var(--bg)] border border-[var(--border-ui)] flex items-center justify-center gap-3 text-[var(--text-muted)] hover:text-white hover:border-[var(--primary)]/50 transition-all cursor-pointer group">
                  <input type="file" className="hidden" accept="image/jpeg,image/png" multiple onChange={handleFileChange} />
                  <div className="p-2 bg-[var(--surface)] rounded-xl group-hover:bg-[var(--primary)]/10 transition-colors">
                    <ImageIcon size={20} className="group-hover:text-[var(--primary)]" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Fotos</span>
                </label>
                <label className="flex-1 h-16 rounded-[1.2rem] bg-[var(--bg)] border border-[var(--border-ui)] flex items-center justify-center gap-3 text-[var(--text-muted)] hover:text-white hover:border-[var(--primary)]/50 transition-all cursor-pointer group">
                  <input type="file" className="hidden" accept="video/mp4,video/quicktime" onChange={handleFileChange} />
                  <div className="p-2 bg-[var(--surface)] rounded-xl group-hover:bg-[var(--secondary)]/10 transition-colors">
                    <Video size={20} className="group-hover:text-amber-500" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Vídeo</span>
                </label>
              </div>

              <div className="flex items-center gap-2 p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                <div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                <p className="text-[9px] font-bold text-amber-500 uppercase tracking-tight">Postagens em alta geram 3x mais seguidores na Arena</p>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Action Button for Mobile Context - Compartilhar mais claro */}
        {selectedFiles.length > 0 && !uploading && (
           <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-xs sm:hidden z-[110]">
             <button
               onClick={handleCreatePost}
               className="w-full h-14 bg-[var(--primary)] text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl flex items-center justify-center gap-3 group active:scale-95 transition-all"
             >
               <Send size={16} className="group-hover:translate-x-1 transition-transform" />
               Publicar Post
             </button>
           </div>
        )}
      </motion.div>
    </motion.div>
  );
};
