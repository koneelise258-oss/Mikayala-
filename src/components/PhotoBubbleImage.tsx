import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { obtenirSignedUrl } from '../services/messageService';

export interface PhotoBubbleImageProps {
  storagePath?: string | null;
  mediaUrl?: string | null;
  isHD?: boolean;
  alt?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const PhotoBubbleImage: React.FC<PhotoBubbleImageProps> = ({
  storagePath,
  mediaUrl,
  isHD,
  alt = 'Photo',
  onClick
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(storagePath));
  const [hasError, setHasError] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);

  const loadMedia = useCallback(async () => {
    // 1. Si on a un chemin Storage, chaque utilisateur génère sa propre URL signée
    if (storagePath) {
      setIsLoading(true);
      setHasError(false);

      try {
        const signedUrl = await obtenirSignedUrl(storagePath);
        if (signedUrl) {
          setImageUrl(signedUrl);
          setHasError(false);
        } else {
          console.error('[SecureChatMessageImage] Impossible de charger cette photo:', {
            storagePath,
            code: 'STORAGE_SIGNED_URL_FAILED',
            message: 'supabase.storage.from("messages-media").createSignedUrl returned null or error'
          });
          setHasError(true);
          setImageUrl(null);
        }
      } catch (err: any) {
        console.error('[SecureChatMessageImage] Erreur de chargement:', {
          storagePath,
          code: err?.code || 'FETCH_EXCEPTION',
          message: err?.message || 'Failed to fetch signed URL'
        });
        setHasError(true);
        setImageUrl(null);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // 2. Si pas de storagePath mais qu'on a une URL valide locale (blob: ou data:)
    if (mediaUrl && (mediaUrl.startsWith('blob:') || mediaUrl.startsWith('data:'))) {
      setImageUrl(mediaUrl);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    // 3. Aucune source valide
    setIsLoading(false);
    setHasError(true);
    setImageUrl(null);
  }, [storagePath, mediaUrl]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia, retryCount]);

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRetryCount(c => c + 1);
  };

  if (isLoading) {
    return (
      <div 
        id="photo-loading-container"
        className="w-full h-48 sm:h-56 bg-black/40 rounded-xl flex flex-col items-center justify-center gap-2 border border-[#2d2254]"
      >
        <Loader2 size={24} className="animate-spin text-[#00b894]" />
        <span className="text-[11px] text-[#a29bfe] font-medium">Chargement sécurisé...</span>
      </div>
    );
  }

  if (hasError || !imageUrl) {
    return (
      <div 
        id="photo-error-container"
        onClick={handleRetry}
        className="w-full h-40 bg-black/40 rounded-xl flex flex-col items-center justify-center gap-2 border border-[#ff7675]/30 cursor-pointer p-3 text-center hover:bg-black/50 transition-colors"
        title="Cliquer pour réessayer"
      >
        <ImageIcon size={28} className="text-[#ff7675]" />
        <span className="text-xs text-[#ff7675] font-medium">Impossible de charger cette photo</span>
        <button 
          type="button" 
          onClick={handleRetry}
          className="text-[11px] text-[#a29bfe] flex items-center gap-1 hover:text-white underline cursor-pointer"
        >
          <RefreshCw size={12} />
          Réessayer le chargement
        </button>
      </div>
    );
  }

  return (
    <div
      id="photo-bubble-wrapper"
      onClick={onClick}
      className="rounded-xl overflow-hidden cursor-pointer relative group/img bg-black/20"
    >
      <img
        src={imageUrl}
        alt={alt}
        loading="lazy"
        className="max-h-72 w-full object-cover rounded-xl transition-transform duration-200 group-hover/img:scale-[1.01]"
        onError={() => {
          console.error('[SecureChatMessageImage] Erreur rendu balise <img>:', {
            storagePath,
            code: 'IMG_RENDER_ERROR',
            message: 'Image element failed to load resource'
          });
          setHasError(true);
        }}
      />
      {isHD && (
        <span className="absolute top-2 left-2 text-[10px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded backdrop-blur-xs">
          HD
        </span>
      )}
    </div>
  );
};

// Export alias demanded by specifications
export const SecureChatMessageImage = PhotoBubbleImage;
