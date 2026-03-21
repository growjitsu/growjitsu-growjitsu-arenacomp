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

  const compressImage = (file: File, targetRatio: '4:5' | '1:1' | '1.91:1' | 'original' = 'original'): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (targetRatio === '4:5') {
            width = 1080;
            height = 1350;
          } else if (targetRatio === '1:1') {
            width = 1080;
            height = 1080;
          } else if (targetRatio === '1.91:1') {
            width = 1080;
            height = 566;
          } else if (width > 1080) {
            height *= 1080 / width;
            width = 1080;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            if (targetRatio !== 'original') {
              const imgRatio = img.width / img.height;
              const targetRatioNum = width / height;
              let drawWidth = width;
              let drawHeight = height;
              let offsetX = 0;
              let offsetY = 0;

              if (imgRatio > targetRatioNum) {
                drawWidth = height * imgRatio;
                offsetX = (width - drawWidth) / 2;
              } else {
                drawHeight = width / imgRatio;
                offsetY = (height - drawHeight) / 2;
              }
              ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
            } else {
              ctx.drawImage(img, 0, 0, width, height);
            }
          }

          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Falha na compressão'));
            },
            'image/jpeg',
            0.85
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

    previewUrls.forEach(url => window.URL.revokeObjectURL(url));

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

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
          if (video.duration > 180) {
            alert(`Vídeo muito longo: ${file.name}. Máximo 3 minutos.`);
          } else {
            validFiles.push(file);
            newPreviews.push(URL.createObjectURL(file));
            setSelectedFiles(prev => [...prev, file]);
            setPreviewUrls(prev => [...prev, URL.createObjectURL(file)]);
          }
          window.URL.revokeObjectURL(video.src);
        };
        video.src = URL.createObjectURL(file);
      } else {
        validFiles.push(file);
        const url = URL.createObjectURL(file);
        newPreviews.push(url);
        setSelectedFiles(prev => [...prev, file]);
        setPreviewUrls(prev => [...prev, url]);
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

      for (const file of selectedFiles) {
        let fileToUpload: File | Blob = file;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        if (file.type.startsWith('image/')) {
          try {
            fileToUpload = await compressImage(file, '4:5');
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
          content: newPostContent,
          type: mediaType,
          media_url: mediaUrls.length > 1 ? JSON.stringify(mediaUrls) : (mediaUrls[0] || null)
        });

      if (error) throw error;

      setNewPostContent('');
      setSelectedFiles([]);
      setPreviewUrls([]);
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--surface)] w-full max-w-2xl rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl border border-[var(--border-ui)] p-4 sm:p-8 relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 sm:p-3 bg-white/10 text-white rounded-xl hover:bg-rose-500 transition-all z-10"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[var(--surface)] to-[var(--bg)] flex-shrink-0 overflow-hidden border border-[var(--border-ui)] shadow-2xl mx-auto sm:mx-0">
            {userProfile?.profile_photo || userProfile?.avatar_url ? (
              <img src={userProfile.profile_photo || userProfile.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                <User size={28} />
              </div>
            )}
          </div>
          <div className="flex-1 space-y-4 sm:space-y-6">
            <h2 className="text-lg sm:text-xl font-black uppercase tracking-widest text-[var(--text-main)] italic text-center sm:text-left">Novo Relatório</h2>
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="O que aconteceu na Arena hoje?"
              className="w-full bg-transparent border-none focus:ring-0 text-base sm:text-lg text-[var(--text-main)] placeholder-[var(--text-muted)]/50 resize-none h-24 sm:h-32 font-semibold tracking-tight"
            />
            
            {previewUrls.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-2">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-[var(--border-ui)] bg-black/40 aspect-[4/5] group shadow-2xl">
                    {selectedFiles[index]?.type.startsWith('image/') ? (
                      <img src={url} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <video src={url} className="w-full h-full object-cover" />
                    )}
                    <button 
                      onClick={() => {
                        const newFiles = [...selectedFiles];
                        const newUrls = [...previewUrls];
                        newFiles.splice(index, 1);
                        newUrls.splice(index, 1);
                        setSelectedFiles(newFiles);
                        setPreviewUrls(newUrls);
                        window.URL.revokeObjectURL(url);
                      }}
                      className="absolute top-2 right-2 sm:top-4 sm:right-4 p-2 bg-black/80 text-white rounded-xl sm:rounded-2xl hover:bg-rose-500 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 sm:pt-6 border-t border-[var(--border-ui)]/20 gap-4">
              <div className="flex space-x-3 w-full sm:w-auto justify-center sm:justify-start">
                <label className="p-3 sm:p-4 rounded-2xl bg-[var(--bg)]/50 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-all cursor-pointer border border-[var(--border-ui)] flex items-center justify-center flex-1 sm:flex-none">
                  <input type="file" className="hidden" accept="image/jpeg,image/png" multiple onChange={handleFileChange} />
                  <ImageIcon size={20} className="sm:w-6 sm:h-6" />
                  <span className="ml-2 text-[10px] font-bold uppercase tracking-wider sm:hidden">Imagem</span>
                </label>
                <label className="p-3 sm:p-4 rounded-2xl bg-[var(--bg)]/50 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-all cursor-pointer border border-[var(--border-ui)] flex items-center justify-center flex-1 sm:flex-none">
                  <input type="file" className="hidden" accept="video/mp4,video/quicktime" onChange={handleFileChange} />
                  <Video size={20} className="sm:w-6 sm:h-6" />
                  <span className="ml-2 text-[10px] font-bold uppercase tracking-wider sm:hidden">Vídeo</span>
                </label>
              </div>
              <button
                onClick={handleCreatePost}
                disabled={(!newPostContent.trim() && selectedFiles.length === 0) || uploading}
                className="w-full sm:w-auto bg-[var(--primary)] text-white px-8 sm:px-12 py-3 sm:py-4 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] disabled:opacity-50 hover:bg-[var(--primary-highlight)] transition-all shadow-2xl shadow-[var(--primary)]/30"
              >
                {uploading ? 'Processando...' : 'Publicar'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
