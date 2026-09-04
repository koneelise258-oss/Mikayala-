import React, { useState, useEffect } from 'react';
import { X, Download, Eye, Loader2, Image as ImageIcon, RefreshCw, Lock, Check } from 'lucide-react';
import { Message } from '../types';
import { obtenirSignedUrl } from '../services/messageService';
import { triggerHaptic } from '../utils/security';
import { soundEffects } from '../utils/audio';

interface MediaLightboxProps {
  message: Message | null;
  onClose: () => void;
  onMarkAsViewed?: (msgId: string) => void;
  onSaveToVault?: (mediaUrl: string, caption?: string) => void;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({ 
  message, 
  onClose, 
  onMarkAsViewed,
  onSaveToVault 
}) => {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(message?.storagePath));
  const [hasError, setHasError] = useState<boolean>(false);
  const [retryKey, setRetryKey] = useState<number>(0);
  const [isSavedToVault, setIsSavedToVault] = useState<boolean>(false);

  useEffect(() => {
    if (!message) {
      setResolvedUrl(null);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    let isMounted = true;

    // 1. Si un storagePath est disponible, obtenir une URL signée dédiée
    if (message.storagePath) {
      setIsLoading(true);
      setHasError(false);

      obtenirSignedUrl(message.storagePath)
        .then(url => {
          if (!isMounted) return;
          if (url) {
            setResolvedUrl(url);
            setHasError(false);
          } else {
            console.error('[MediaLightbox] Échec de récupération de l’URL signée:', {
              storagePath: message.storagePath,
              code: 'SIGNED_URL_EMPTY'
            });
            setHasError(true);
          }
        })
        .catch(err => {
          if (!isMounted) return;
          console.error('[MediaLightbox] Erreur chargement URL signée:', {
            storagePath: message.storagePath,
            code: err?.code || 'FETCH_ERROR',
            message: err?.message || String(err)
          });
          setHasError(true);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
      return;
    }

    // 2. Si pas de storagePath mais qu'on a un mediaUrl local valide
    if (message.mediaUrl && (message.mediaUrl.startsWith('blob:') || message.mediaUrl.startsWith('data:'))) {
      setResolvedUrl(message.mediaUrl);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    // 3. Pas de source valide
    setIsLoading(false);
    setHasError(true);

    return () => {
      isMounted = false;
    };
  }, [message, retryKey]);

  if (!message) return null;

  const handleClose = () => {
    if (message.isViewOnce && onMarkAsViewed) {
      onMarkAsViewed(message.id);
    }
    onClose();
  };

  const handleDownload = () => {
    const urlToDownload = resolvedUrl || (message.mediaUrl?.startsWith('blob:') ? message.mediaUrl : null);
    if (!urlToDownload) return;
    const a = document.createElement('a');
    a.href = urlToDownload;
    a.download = `mikayala-photo-${Date.now()}.webp`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div id="media-lightbox-modal" className="always-dark fixed inset-0 z-50 bg-black/95 flex flex-col justify-between select-none animate-in fade-in duration-150">
      {/* Top bar */}
      <div className="p-4 flex items-center justify-between text-[#e9edef] z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <button
            onClick={handleClose}
            aria-label="Fermer"
            className="p-2 rounded-full hover:bg-[#202c33] text-[#e9edef] transition-colors cursor-pointer"
          >
            <X size={24} />
          </button>
          <div>
            <p className="text-sm font-semibold flex items-center gap-2">
              {message.type === 'video' ? 'Vidéo' : 'Photo'}
              {message.isHD && (
                <span className="text-[10px] bg-[#00a884] text-[#111b21] font-bold px-1 rounded">HD</span>
              )}
              {message.isViewOnce && (
                <span className="text-[10px] bg-[#374248] text-[#53bdeb] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 border border-[#53bdeb]/40">
                  <Eye size={11} /> Vue Unique
                </span>
              )}
            </p>
            <p className="text-xs text-[#8696a0]">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!message.isViewOnce && resolvedUrl && onSaveToVault && (
            <button
              onClick={() => {
                if (resolvedUrl && !isSavedToVault) {
                  onSaveToVault(resolvedUrl, message.content || '');
                  setIsSavedToVault(true);
                  triggerHaptic([60, 40, 100]);
                  soundEffects.playSent();
                }
              }}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold transition-all ${
                isSavedToVault
                  ? 'bg-[#00b894]/20 border border-[#00b894] text-[#55efc4]'
                  : 'bg-[#281e4b] hover:bg-[#382a69] border border-[#6c5ce7]/50 text-white cursor-pointer shadow-md'
              }`}
              title="Enregistrer dans le Coffre-Fort partagé"
            >
              {isSavedToVault ? <Check size={14} /> : <Lock size={14} className="text-[#00b894]" />}
              <span>{isSavedToVault ? 'Dans le Coffre 🔒' : 'Coffre-Fort'}</span>
            </button>
          )}

          {!message.isViewOnce && resolvedUrl && (
            <button
              onClick={handleDownload}
              className="p-2 rounded-full hover:bg-[#202c33] text-[#e9edef] transition-colors cursor-pointer"
              title="Télécharger la photo"
            >
              <Download size={20} />
            </button>
          )}
          <button
            onClick={handleClose}
            className="text-xs bg-[#202c33] hover:bg-[#2a3942] border border-[#374248] px-3 py-1.5 rounded-full font-medium cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* Main Media Container */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 text-[#a29bfe]">
            <Loader2 size={32} className="animate-spin text-[#00b894]" />
            <span className="text-xs font-medium">Chargement sécurisé de la photo...</span>
          </div>
        ) : hasError || !resolvedUrl ? (
          <div className="flex flex-col items-center gap-3 text-center p-6 bg-[#1b1435]/60 border border-[#ff7675]/30 rounded-2xl max-w-sm">
            <ImageIcon size={36} className="text-[#ff7675]" />
            <p className="text-sm font-semibold text-[#ff7675]">Impossible de charger cette photo</p>
            <button
              type="button"
              onClick={() => setRetryKey(k => k + 1)}
              className="flex items-center gap-1.5 text-xs bg-[#2d2254] hover:bg-[#3d2f6f] text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Réessayer</span>
            </button>
          </div>
        ) : message.type === 'video' ? (
          <video
            src={resolvedUrl}
            controls
            autoPlay
            className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
          />
        ) : (
          <img
            src={resolvedUrl}
            alt="Média Mikayla"
            className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl select-none"
            onError={() => {
              console.error('[MediaLightbox] Erreur de rendu de l’image:', {
                storagePath: message.storagePath,
                code: 'IMG_RENDER_FAILED'
              });
              setHasError(true);
            }}
          />
        )}
      </div>

      {/* Caption at bottom */}
      {message.content && (
        <div className="p-4 text-center bg-gradient-to-t from-black/90 via-black/50 to-transparent">
          <p className="text-sm text-[#e9edef] max-w-xl mx-auto font-medium">
            {message.content}
          </p>
        </div>
      )}
    </div>
  );
};
