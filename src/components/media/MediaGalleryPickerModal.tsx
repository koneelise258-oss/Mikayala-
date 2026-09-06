import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Image as ImageIcon, Video as VideoIcon, Play, Upload, AlertCircle, Eye } from 'lucide-react';
import { GalleryMediaItem } from '../../types';
import { extractVideoMetadata, formatVideoDuration, validateMediaFile, compressImageFile } from '../../utils/mediaProcessor';

interface MediaGalleryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedItems: GalleryMediaItem[]) => Promise<void> | void;
  maxSelection?: number;
  title?: string;
  acceptTypes?: 'all' | 'images' | 'videos';
}

export const MediaGalleryPickerModal: React.FC<MediaGalleryPickerModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  maxSelection = 10,
  title = "Galerie Photos & Vidéos",
  acceptTypes = 'all'
}) => {
  const [items, setItems] = useState<GalleryMediaItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'images' | 'videos'>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<GalleryMediaItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Interception du bouton physique retour Android pour fermer la modale sans quitter l'app
  useEffect(() => {
    if (!isOpen) return;

    window.history.pushState({ modal: 'media_gallery_picker' }, '');
    const handlePopState = () => {
      if (previewItem) {
        setPreviewItem(null);
      } else {
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose, previewItem]);

  if (!isOpen) return null;

  const triggerHaptic = (ms = 15) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch (_) {}
    }
  };

  const handleFilesAdded = async (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return;
    setErrorMessage(null);
    setIsProcessing(true);

    const newItems: GalleryMediaItem[] = [];

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      const validation = validateMediaFile(file);

      if (!validation.valid) {
        setErrorMessage(validation.error || `Fichier "${file.name}" non supporté.`);
        continue;
      }

      const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv|avi|flv|wmv|3gp|ts)$/i.test(file.name);

      try {
        if (isVideo) {
          const meta = await extractVideoMetadata(file);
          newItems.push({
            id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            file,
            type: 'video',
            previewUrl: URL.createObjectURL(file),
            thumbnailUrl: meta.thumbnailUrl,
            duration: meta.duration,
            size: file.size,
            name: file.name
          });
        } else {
          const compressedDataUrl = await compressImageFile(file);
          newItems.push({
            id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            file,
            type: 'photo',
            previewUrl: compressedDataUrl || URL.createObjectURL(file),
            thumbnailUrl: compressedDataUrl || undefined,
            size: file.size,
            name: file.name
          });
        }
      } catch (err: any) {
        console.error('[MediaGalleryPicker] Erreur traitement fichier:', file.name, err);
      }
    }

    setItems(prev => [...newItems, ...prev]);

    // Sélection automatique des éléments nouvellement ajoutés dans la limite maxSelection
    setSelectedIds(prev => {
      const combined = [...prev, ...newItems.map(n => n.id)];
      return combined.slice(0, maxSelection);
    });

    triggerHaptic(20);
    setIsProcessing(false);
  };

  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerHaptic(15);

    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        if (prev.length >= maxSelection) {
          setErrorMessage(`Vous pouvez sélectionner au maximum ${maxSelection} éléments.`);
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  const filteredItems = items.filter(item => {
    if (activeTab === 'images') return item.type === 'photo';
    if (activeTab === 'videos') return item.type === 'video';
    return true;
  });

  const selectedCount = selectedIds.length;
  const selectedPhotos = items.filter(i => selectedIds.includes(i.id) && i.type === 'photo').length;
  const selectedVideos = items.filter(i => selectedIds.includes(i.id) && i.type === 'video').length;

  const handleConfirmSelection = async () => {
    const selectedObjects = items.filter(i => selectedIds.includes(i.id));
    if (selectedObjects.length === 0) return;

    setIsSubmitting(true);
    try {
      triggerHaptic(30);
      await onConfirm(selectedObjects);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Erreur lors du traitement des médias sélectionnés");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl h-[92vh] sm:h-[85vh] bg-[#120e24] border border-[#2d2254] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl">
        
        {/* Entête */}
        <div className="px-5 py-4 border-b border-[#2d2254] flex items-center justify-between bg-[#171230]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6c5ce7]/30 to-[#a29bfe]/30 flex items-center justify-center text-[#a29bfe] border border-[#6c5ce7]/40">
              <ImageIcon size={18} />
            </div>
            <div>
              <h3 className="text-white font-bold text-base leading-tight">{title}</h3>
              <p className="text-xs text-[#a29bfe]">
                {items.length} média{items.length > 1 ? 's' : ''} chargé{items.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la galerie"
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#a29bfe] hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Barre d'onglets & bouton Importer */}
        <div className="px-4 sm:px-5 py-2.5 bg-[#130f26] border-b border-[#2d2254]/60 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-[#1c1638] rounded-xl border border-[#2d2254]">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'all' ? 'bg-[#6c5ce7] text-white shadow-sm' : 'text-[#a29bfe] hover:text-white'
              }`}
            >
              Tout ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('images')}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'images' ? 'bg-[#6c5ce7] text-white shadow-sm' : 'text-[#a29bfe] hover:text-white'
              }`}
            >
              <ImageIcon size={12} />
              Photos ({items.filter(i => i.type === 'photo').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('videos')}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'videos' ? 'bg-[#6c5ce7] text-white shadow-sm' : 'text-[#a29bfe] hover:text-white'
              }`}
            >
              <VideoIcon size={12} />
              Vidéos ({items.filter(i => i.type === 'video').length})
            </button>
          </div>

          <button
            type="button"
            disabled={isProcessing}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer ml-auto"
          >
            <Upload size={14} />
            <span>{isProcessing ? 'Analyse...' : 'Parcourir l\'appareil'}</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept={
              acceptTypes === 'images' 
                ? 'image/*' 
                : acceptTypes === 'videos' 
                ? 'video/*' 
                : 'image/*,video/*'
            }
            onChange={(e) => {
              handleFilesAdded(e.target.files);
              e.target.value = '';
            }}
            className="hidden"
          />
        </div>

        {/* Message d'erreur éventuel */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-[#ff7675]/15 border border-[#ff7675]/40 text-[#ff7675] text-xs flex items-center gap-2">
            <AlertCircle size={14} className="flex-shrink-0" />
            <span className="flex-1">{errorMessage}</span>
            <button type="button" onClick={() => setErrorMessage(null)} className="text-[#ff7675] hover:opacity-80">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Grille des médias */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {filteredItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#a29bfe]">
              <div className="w-16 h-16 rounded-2xl bg-[#231a42] border border-[#2d2254] flex items-center justify-center mb-3">
                <Upload size={28} className="text-[#6c5ce7]" />
              </div>
              <p className="font-bold text-white text-sm">Aucun média dans cette catégorie</p>
              <p className="text-xs text-[#a29bfe] mt-1.5 max-w-xs">
                Cliquez sur <strong>"Parcourir l'appareil"</strong> pour sélectionner des photos ou vidéos depuis votre smartphone.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {filteredItems.map(item => {
                const isSelected = selectedIds.includes(item.id);
                const selectionIndex = selectedIds.indexOf(item.id) + 1;

                return (
                  <div
                    key={item.id}
                    onClick={() => toggleSelect(item.id)}
                    className={`group relative aspect-square rounded-2xl overflow-hidden cursor-pointer border-2 transition-all select-none ${
                      isSelected
                        ? 'border-[#00b894] ring-2 ring-[#00b894]/40 scale-[0.98]'
                        : 'border-[#2d2254]/40 hover:border-[#6c5ce7]/60'
                    }`}
                  >
                    {/* Image ou vignette vidéo */}
                    <img
                      src={item.type === 'video' ? (item.thumbnailUrl || item.previewUrl) : item.previewUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

                    {/* Bouton aperçu rapide en plein écran */}
                    <button
                      type="button"
                      aria-label="Aperçu du média"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewItem(item);
                      }}
                      className="absolute bottom-2 left-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Eye size={12} />
                    </button>

                    {/* Badge Vidéo avec icône Play et durée formatée mm:ss */}
                    {item.type === 'video' && (
                      <>
                        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md flex items-center gap-1 text-[10px] font-bold text-white shadow">
                          <VideoIcon size={10} className="text-[#55efc4]" />
                          <span>VID</span>
                        </div>
                        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md flex items-center gap-1 text-[11px] font-semibold text-white shadow">
                          <Play size={10} fill="white" />
                          <span>{formatVideoDuration(item.duration || 0)}</span>
                        </div>
                      </>
                    )}

                    {/* Pastille de sélection numérotée */}
                    <div 
                      className="absolute top-2 right-2"
                      onClick={(e) => toggleSelect(item.id, e)}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-md ${
                          isSelected
                            ? 'bg-[#00b894] text-[#130f26] scale-105'
                            : 'border-2 border-white/70 bg-black/30 text-transparent group-hover:border-white'
                        }`}
                      >
                        {isSelected ? selectionIndex : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Aperçu modal individuel (si tap sur œil) */}
        {previewItem && (
          <div className="absolute inset-0 z-20 bg-black/95 flex flex-col justify-between p-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-white pb-2 border-b border-white/10">
              <span className="text-xs font-semibold truncate max-w-[200px]">{previewItem.name}</span>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-2 overflow-hidden">
              {previewItem.type === 'video' ? (
                <video
                  src={previewItem.previewUrl}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-full max-w-full rounded-xl"
                />
              ) : (
                <img
                  src={previewItem.previewUrl}
                  alt={previewItem.name}
                  className="max-h-full max-w-full object-contain rounded-xl"
                />
              )}
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  if (!selectedIds.includes(previewItem.id)) {
                    toggleSelect(previewItem.id);
                  }
                  setPreviewItem(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#00b894] text-[#130f26] font-bold text-xs flex items-center gap-1.5"
              >
                <Check size={14} />
                <span>{selectedIds.includes(previewItem.id) ? 'Déjà sélectionné' : 'Sélectionner ce média'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Barre d'actions inférieure fixe */}
        <div className="p-4 border-t border-[#2d2254] bg-[#171230]/95 backdrop-blur-md flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white">
              {selectedCount === 0
                ? 'Aucune sélection'
                : `${selectedCount} sélectionné${selectedCount > 1 ? 's' : ''}`}
            </span>
            {selectedCount > 0 && (
              <span className="text-[11px] text-[#a29bfe]">
                {selectedPhotos > 0 ? `${selectedPhotos} photo${selectedPhotos > 1 ? 's' : ''}` : ''}
                {selectedPhotos > 0 && selectedVideos > 0 ? ', ' : ''}
                {selectedVideos > 0 ? `${selectedVideos} vidéo${selectedVideos > 1 ? 's' : ''}` : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-[#a29bfe] font-semibold transition-colors"
              >
                Effacer
              </button>
            )}

            <button
              type="button"
              disabled={selectedCount === 0 || isSubmitting}
              onClick={handleConfirmSelection}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg cursor-pointer ${
                selectedCount > 0 && !isSubmitting
                  ? 'bg-gradient-to-r from-[#00b894] to-[#55efc4] text-[#130f26] hover:brightness-105 active:scale-95'
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <span>Envoi en cours...</span>
              ) : (
                <>
                  <Check size={16} />
                  <span>Valider la sélection ({selectedCount})</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
export default MediaGalleryPickerModal;
