import React, { useState, useEffect } from 'react';
import { X, Send, Loader2, AlertCircle, Image as ImageIcon, Sparkles } from 'lucide-react';

interface PhotoPreviewModalProps {
  isOpen: boolean;
  file: File | null;
  onClose: () => void;
  onSend: (file: File, caption: string) => Promise<void>;
  isSending: boolean;
  errorMessage?: string | null;
}

export const PhotoPreviewModal: React.FC<PhotoPreviewModalProps> = ({
  isOpen,
  file,
  onClose,
  onSend,
  isSending,
  errorMessage
}) => {
  const [caption, setCaption] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      setCaption('');
      setValidationError(null);
      return;
    }

    // Client-side quick validation of file type & size
    const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!acceptedTypes.includes(file.type.toLowerCase())) {
      setValidationError(
        `Format "${file.type || 'inconnu'}" non pris en charge. Veuillez sélectionner une photo JPEG, PNG ou WebP.`
      );
    } else if (file.size > 15 * 1024 * 1024) {
      setValidationError(
        `La taille du fichier (${(file.size / (1024 * 1024)).toFixed(1)} Mo) dépasse la limite maximale autorisée de 15 Mo.`
      );
    } else {
      setValidationError(null);
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  if (!isOpen || !file || !previewUrl) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSending || validationError) return;
    try {
      await onSend(file, caption.trim());
    } catch (err: any) {
      console.error('[PhotoPreviewModal] Échec envoi:', err);
    }
  };

  const currentError = validationError || errorMessage;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in duration-150">
      {/* Top Bar */}
      <div className="h-16 px-4 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 to-transparent">
        <button
          type="button"
          onClick={onClose}
          disabled={isSending}
          className="p-2 rounded-full hover:bg-white/10 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          title="Annuler"
        >
          <X size={24} />
        </button>

        <div className="text-center">
          <h3 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
            <ImageIcon size={16} className="text-[#00b894]" />
            Aperçu de la photo
          </h3>
          <p className="text-[11px] text-[#a29bfe]">
            {file.name} ({(file.size / 1024).toFixed(0)} Ko)
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={isSending}
          className="text-xs text-[#a29bfe] hover:text-white px-3 py-1.5 rounded-full border border-[#2d2254] hover:border-[#6c5ce7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          Annuler
        </button>
      </div>

      {/* Main Image Preview Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="relative max-h-[60vh] sm:max-h-[68vh] max-w-full rounded-2xl overflow-hidden shadow-2xl border border-[#2d2254]/50 bg-black/40 flex items-center justify-center">
          <img
            src={previewUrl}
            alt="Aperçu photo"
            className="max-h-[60vh] sm:max-h-[68vh] max-w-full object-contain select-none"
          />

          {/* Sending overlay spinner */}
          {isSending && (
            <div className="absolute inset-0 bg-[#0e0b1c]/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 text-white p-4 text-center">
              <Loader2 size={36} className="animate-spin text-[#00b894]" />
              <div className="space-y-1">
                <p className="font-bold text-sm text-white">Optimisation et envoi de la photo…</p>
                <p className="text-xs text-[#a29bfe]">Compression WebP sécurisée & transfert privé en cours</p>
              </div>
            </div>
          )}
        </div>

        {/* Error message banner */}
        {currentError && (
          <div className="mt-3 max-w-md w-full bg-[#ff7675]/15 border border-[#ff7675]/40 rounded-xl p-3 flex items-start gap-2.5 text-xs text-[#ff7675]">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">Attention : </span>
              <span>{currentError}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Bar: Caption input & Send button */}
      <div className="p-4 bg-gradient-to-t from-black via-black/80 to-transparent z-20">
        <form
          onSubmit={handleSubmit}
          className="max-w-2xl mx-auto flex items-center gap-2 bg-[#1b1435] border border-[#2d2254] rounded-2xl p-2 shadow-xl focus-within:border-[#00b894] transition-colors"
        >
          <input
            type="text"
            placeholder="Ajouter une légende…"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            disabled={isSending || !!validationError}
            autoFocus
            className="flex-1 bg-transparent border-none px-3 py-2 text-sm text-white placeholder-[#a29bfe]/60 focus:outline-none disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={isSending || !!validationError}
            className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-[#130f26] shadow-lg transition-transform active:scale-95 cursor-pointer ${
              isSending || !!validationError
                ? 'bg-[#2d2254] text-[#a29bfe] cursor-not-allowed opacity-50'
                : 'bg-[#00b894] hover:bg-[#00a884] hover:scale-105'
            }`}
            title="Envoyer la photo"
          >
            {isSending ? (
              <Loader2 size={20} className="animate-spin text-white" />
            ) : (
              <Send size={18} className="ml-0.5 stroke-[2.5]" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
