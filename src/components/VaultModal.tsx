import React, { useState, useMemo } from 'react';
import { 
  Lock, 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Flame, 
  X, 
  Upload, 
  FolderHeart, 
  ShieldCheck,
  Tag,
  User as UserIcon,
  Send,
  Download,
  Search,
  Grid,
  Filter,
  Layers,
  Heart,
  Calendar,
  MessageSquare,
  Play,
  Video as VideoIcon,
  RefreshCw
} from 'lucide-react';
import { VaultItem, User, Message, GalleryMediaItem } from '../types';
import { triggerHaptic } from '../utils/security';
import { soundEffects } from '../utils/audio';
import { formatVideoDuration, extractVideoMetadata, compressImageFile } from '../utils/mediaProcessor';
import { MediaGalleryPickerModal } from './media/MediaGalleryPickerModal';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface VaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultItems: VaultItem[];
  currentUser: User;
  partnerUser?: User;
  coupleId?: string;
  messages?: Message[];
  onAddVaultItem?: (item: Omit<VaultItem, 'id' | 'dateAdded'>) => void;
  onAddItem?: (item: Omit<VaultItem, 'id' | 'dateAdded'>) => void;
  onDeleteVaultItem?: (id: string) => void;
  onDeleteItem?: (id: string) => void;
  onViewOnceBurned?: (id: string) => void;
  onShareToChat?: (text: string, mediaUrl?: string) => void;
  onLock?: () => void;
}

export const VaultModal: React.FC<VaultModalProps> = ({
  isOpen,
  onClose,
  vaultItems,
  currentUser,
  partnerUser,
  coupleId,
  messages = [],
  onAddVaultItem,
  onAddItem,
  onDeleteVaultItem,
  onDeleteItem,
  onViewOnceBurned,
  onShareToChat,
  onLock
}) => {
  const handleAddItemCallback = onAddVaultItem || onAddItem;
  const handleDeleteItemCallback = onDeleteVaultItem || onDeleteItem;
  
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'intime' | 'souvenirs' | 'voyages' | 'capsule'>('all');
  const [authorFilter, setAuthorFilter] = useState<'all' | 'me' | 'partner'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [showChatImportModal, setShowChatImportModal] = useState<boolean>(false);
  
  // New item form state
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<'intime' | 'souvenirs' | 'voyages' | 'capsule'>('intime');
  const [newMediaUrl, setNewMediaUrl] = useState<string>('');
  const [newMediaType, setNewMediaType] = useState<'photo' | 'video'>('photo');
  const [newThumbnailUrl, setNewThumbnailUrl] = useState<string>('');
  const [newDuration, setNewDuration] = useState<number>(0);
  const [newCaption, setNewCaption] = useState<string>('');
  const [isViewOnceOption, setIsViewOnceOption] = useState<boolean>(false);
  const [activeViewingItem, setActiveViewingItem] = useState<VaultItem | null>(null);
  const [isGalleryPickerOpen, setIsGalleryPickerOpen] = useState<boolean>(false);
  const [selectedFileForVault, setSelectedFileForVault] = useState<File | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState<boolean>(false);

  // Extract all chat images/media available for import
  const chatMediaMessages = useMemo(() => {
    return messages.filter(m => 
      (m.type === 'image' || m.type === 'video' || m.type === 'view_once') && 
      (m.mediaUrl || m.storagePath) && 
      !m.isDeletedForEveryone
    );
  }, [messages]);

  // Helper to ensure media is permanent across sessions & devices
  const persistMedia = async (file: File): Promise<{ mediaUrl: string; thumbnailUrl?: string }> => {
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv|avi|flv|wmv|3gp|ts)$/i.test(file.name);
    const fileExt = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
    const itemId = `vault_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // If Supabase Storage is configured and online
    if (isSupabaseConfigured() && coupleId) {
      try {
        const storagePath = `${coupleId}/vault/${itemId}.${fileExt}`;
        const { data, error } = await supabase.storage
          .from('messages-media')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: true,
            contentType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg')
          });

        if (!error && data?.path) {
          const { data: pubData } = supabase.storage
            .from('messages-media')
            .getPublicUrl(data.path);
          if (pubData?.publicUrl) {
            return { mediaUrl: pubData.publicUrl };
          }
        }
      } catch (uploadErr) {
        console.warn('[VaultModal] Supabase upload fallback to local data URL:', uploadErr);
      }
    }

    // For photos: compress to lightweight, permanent Data URL
    if (!isVideo) {
      try {
        const compressed = await compressImageFile(file);
        if (compressed) {
          return { mediaUrl: compressed, thumbnailUrl: compressed };
        }
      } catch (_) {}
    }

    // Base64 Data URL fallback for guaranteed offline and local persistence
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve({ mediaUrl: reader.result });
        } else {
          resolve({ mediaUrl: URL.createObjectURL(file) });
        }
      };
      reader.onerror = () => {
        resolve({ mediaUrl: URL.createObjectURL(file) });
      };
      reader.readAsDataURL(file);
    });
  };

  if (!isOpen) return null;

  const filteredItems = vaultItems.filter(item => {
    // 1. Category Filter
    if (selectedCategory !== 'all' && item.category !== selectedCategory) {
      return false;
    }
    // 2. Author Filter
    if (authorFilter === 'me' && item.addedBy !== currentUser.id) {
      return false;
    }
    if (authorFilter === 'partner' && item.addedBy === currentUser.id) {
      return false;
    }
    // 3. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title?.toLowerCase().includes(q);
      const matchCaption = item.caption?.toLowerCase().includes(q);
      const matchAuthor = item.addedByName?.toLowerCase().includes(q);
      if (!matchTitle && !matchCaption && !matchAuthor) return false;
    }
    return true;
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileForVault(file);
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv|avi|flv|wmv|3gp|ts)$/i.test(file.name);
    
    if (!newTitle) {
      setNewTitle(file.name.replace(/\.[^/.]+$/, ""));
    }

    if (isVideo) {
      setNewMediaType('video');
      const objectUrl = URL.createObjectURL(file);
      setNewMediaUrl(objectUrl);
      try {
        const meta = await extractVideoMetadata(file);
        if (meta.thumbnailUrl) {
          setNewThumbnailUrl(meta.thumbnailUrl);
        }
        setNewDuration(meta.duration || 0);
      } catch (err) {
        console.warn('[VaultModal] Video metadata extraction fallback:', err);
      }
    } else {
      setNewMediaType('photo');
      try {
        const compressed = await compressImageFile(file);
        setNewMediaUrl(compressed || URL.createObjectURL(file));
        setNewThumbnailUrl(compressed || '');
      } catch {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            setNewMediaUrl(reader.result);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleConfirmGalleryForVault = async (selectedMedia: GalleryMediaItem[]) => {
    if (!selectedMedia || selectedMedia.length === 0) return;

    setIsProcessingUpload(true);
    try {
      for (const item of selectedMedia) {
        const isVideo = item.type === 'video';
        let persistentUrl = item.previewUrl;
        let persistentThumbnail = item.thumbnailUrl;

        if (item.file) {
          if (isVideo) {
            if (!persistentThumbnail) {
              try {
                const meta = await extractVideoMetadata(item.file);
                persistentThumbnail = meta.thumbnailUrl;
              } catch (_) {}
            }
            const res = await persistMedia(item.file);
            persistentUrl = res.mediaUrl;
          } else {
            const compressed = await compressImageFile(item.file);
            persistentUrl = compressed || item.previewUrl;
            persistentThumbnail = compressed || item.thumbnailUrl;
            if (isSupabaseConfigured() && coupleId) {
              try {
                const res = await persistMedia(item.file);
                if (res.mediaUrl && !res.mediaUrl.startsWith('blob:')) {
                  persistentUrl = res.mediaUrl;
                }
              } catch (_) {}
            }
          }
        }

        handleAddItemCallback?.({
          title: item.name.replace(/\.[^/.]+$/, "") || (isVideo ? 'Vidéo intime 🎥' : 'Photo secrète 💜'),
          type: isVideo ? 'video' : 'photo',
          mediaType: isVideo ? 'video' : 'photo',
          mediaUrl: persistentUrl,
          thumbnailUrl: persistentThumbnail || undefined,
          duration: item.duration,
          category: newCategory,
          addedBy: currentUser.id,
          addedByName: currentUser.name,
          addedByAvatar: currentUser.avatar,
          caption: '',
          isViewOnce: false,
          isViewed: false,
          source: 'upload',
          tags: [newCategory, item.type]
        });
      }

      triggerHaptic([50, 50, 100]);
      soundEffects.playSent();
      setShowAddForm(false);
      setIsGalleryPickerOpen(false);
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMediaUrl && !selectedFileForVault) return;

    setIsProcessingUpload(true);
    try {
      let finalMediaUrl = newMediaUrl;
      let finalThumbnail = newThumbnailUrl;

      if (selectedFileForVault) {
        const isVideo = selectedFileForVault.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv|avi|flv|wmv|3gp|ts)$/i.test(selectedFileForVault.name);
        if (isVideo) {
          if (!finalThumbnail) {
            try {
              const meta = await extractVideoMetadata(selectedFileForVault);
              finalThumbnail = meta.thumbnailUrl;
            } catch (_) {}
          }
          const res = await persistMedia(selectedFileForVault);
          finalMediaUrl = res.mediaUrl;
        } else {
          const compressed = await compressImageFile(selectedFileForVault);
          finalMediaUrl = compressed || finalMediaUrl;
          finalThumbnail = compressed || finalThumbnail;
          if (isSupabaseConfigured() && coupleId) {
            try {
              const res = await persistMedia(selectedFileForVault);
              if (res.mediaUrl && !res.mediaUrl.startsWith('blob:')) {
                finalMediaUrl = res.mediaUrl;
              }
            } catch (_) {}
          }
        }
      }

      handleAddItemCallback?.({
        title: newTitle.trim() || (newMediaType === 'video' ? 'Vidéo intime 🎥' : 'Souvenir intime 💜'),
        type: newMediaType,
        mediaType: newMediaType,
        mediaUrl: finalMediaUrl,
        thumbnailUrl: finalThumbnail || undefined,
        duration: newDuration || undefined,
        category: newCategory,
        addedBy: currentUser.id,
        addedByName: currentUser.name,
        addedByAvatar: currentUser.avatar,
        caption: newCaption.trim(),
        isViewOnce: isViewOnceOption,
        isViewed: false,
        source: 'upload',
        tags: [newCategory, newMediaType]
      });

      triggerHaptic([50, 50, 100]);
      soundEffects.playSent();
      setNewTitle('');
      setNewMediaUrl('');
      setNewThumbnailUrl('');
      setNewDuration(0);
      setNewMediaType('photo');
      setNewCaption('');
      setIsViewOnceOption(false);
      setSelectedFileForVault(null);
      setShowAddForm(false);
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const handleImportFromChat = (msg: Message) => {
    const mediaSrc = msg.mediaUrl || '';
    if (!mediaSrc) return;

    handleAddItemCallback?.({
      title: msg.fileName || `Photo du chat (${new Date(msg.timestamp).toLocaleDateString('fr-FR')})`,
      type: msg.type === 'video' ? 'video' : 'photo',
      mediaUrl: mediaSrc,
      category: newCategory,
      addedBy: currentUser.id,
      addedByName: currentUser.name,
      addedByAvatar: currentUser.avatar,
      caption: msg.content || 'Importé depuis notre discussion',
      isViewOnce: false,
      isViewed: false,
      source: 'chat',
      tags: ['chat', newCategory]
    });

    triggerHaptic([60, 40, 100]);
    soundEffects.playSent();
    setShowChatImportModal(false);
  };

  const handleOpenItem = (item: VaultItem) => {
    if (item.isViewOnce && item.isViewed) {
      return; // Already burned
    }
    setActiveViewingItem(item);
    triggerHaptic(40);
  };

  const handleCloseViewer = () => {
    if (activeViewingItem?.isViewOnce && onViewOnceBurned) {
      onViewOnceBurned(activeViewingItem.id);
      triggerHaptic([100, 100]);
    }
    setActiveViewingItem(null);
  };

  const handleShareItemToChat = (item: VaultItem) => {
    if (onShareToChat) {
      const shareText = `🔒 *Média partagé depuis notre Coffre-Fort* : "${item.title}" ${item.caption ? `\n💬 "${item.caption}"` : ''}`;
      onShareToChat(shareText, item.mediaUrl);
      triggerHaptic(50);
      soundEffects.playSent();
      onClose();
    }
  };

  const partnerName = partnerUser?.name || 'Votre partenaire';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0e0b1c]/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in select-none">
      {/* Full-screen View Once / HD Lightbox */}
      {activeViewingItem && (
        <div className="fixed inset-0 z-60 bg-black/98 flex flex-col justify-between p-3 sm:p-5 animate-in fade-in">
          {/* Viewer Top Header */}
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              {activeViewingItem.isViewOnce ? (
                <span className="flex items-center gap-1.5 bg-[#ff7675]/20 text-[#ff7675] border border-[#ff7675]/40 text-xs font-semibold px-3 py-1 rounded-full">
                  <Flame size={14} className="animate-pulse" />
                  Vue Unique HD (S'autodétruit à la fermeture)
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 bg-[#00b894]/20 text-[#00b894] border border-[#00b894]/40 text-xs font-semibold px-3 py-1 rounded-full">
                    <ShieldCheck size={14} />
                    Coffre-Fort Partagé
                  </span>
                  <span className="text-xs text-[#a29bfe] bg-[#1b1435] px-2.5 py-1 rounded-full border border-[#2d2254]">
                    {activeViewingItem.addedBy === currentUser.id 
                      ? 'Ajouté par Vous' 
                      : `Ajouté par ${activeViewingItem.addedByName || partnerName}`}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {onShareToChat && !activeViewingItem.isViewOnce && (
                <button
                  onClick={() => handleShareItemToChat(activeViewingItem)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6c5ce7] hover:bg-[#5b4bc4] text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                  title="Partager dans le chat"
                >
                  <Send size={13} />
                  <span className="hidden sm:inline">Partager dans le chat</span>
                </button>
              )}
              <button
                onClick={handleCloseViewer}
                className="p-2 bg-[#2d2254]/80 hover:bg-[#ff7675]/80 text-white rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Viewer Media */}
          <div className="flex-1 flex flex-col items-center justify-center relative p-2 my-auto">
            {(() => {
              const isVideo = activeViewingItem.type === 'video' || activeViewingItem.mediaType === 'video' || /\.(mp4|webm|mov|m4v|mkv|avi|flv|wmv|3gp|ts|ogv)$/i.test(activeViewingItem.mediaUrl || '') || (activeViewingItem.mediaUrl || '').startsWith('data:video');
              if (isVideo) {
                return (
                  <video
                    src={activeViewingItem.mediaUrl}
                    controls
                    autoPlay
                    playsInline
                    className="max-h-[72vh] max-w-full rounded-2xl shadow-2xl border border-[#6c5ce7]/30 bg-black"
                    onContextMenu={e => e.preventDefault()}
                  >
                    <source src={activeViewingItem.mediaUrl} type="video/mp4" />
                    Votre navigateur ne supporte pas ce format vidéo.
                  </video>
                );
              }
              return (
                <img
                  src={activeViewingItem.mediaUrl}
                  alt={activeViewingItem.title}
                  className="max-h-[72vh] max-w-full rounded-2xl object-contain shadow-2xl border border-[#6c5ce7]/30 select-none bg-black/30"
                  onContextMenu={e => e.preventDefault()}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&auto=format&fit=crop&q=80';
                  }}
                />
              );
            })()}
            {activeViewingItem.caption && (
              <p className="mt-3 text-center text-xs sm:text-sm font-medium text-[#f1f2f6] max-w-lg bg-[#1b1435]/90 px-4 py-2.5 rounded-xl border border-[#372863] shadow-lg">
                {activeViewingItem.caption}
              </p>
            )}
            <div className="mt-2 text-[11px] text-[#a29bfe]/80 flex items-center gap-2">
              <span>{activeViewingItem.title}</span>
              <span>•</span>
              <span>
                {new Date(activeViewingItem.dateAdded || activeViewingItem.createdAt || Date.now()).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>

          <div className="text-center text-xs text-[#a29bfe]/70 pb-2">
            Protégé par Mikayla Biometrics • Vue privée partagée entre partenaires
          </div>
        </div>
      )}

      {/* Chat Media Import Modal */}
      {showChatImportModal && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-in zoom-in-95">
          <div className="bg-[#171230] border border-[#2d2254] rounded-3xl w-full max-w-md p-5 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-[#2d2254] mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-[#00b894]" />
                <h4 className="font-bold text-sm text-white">Importer une photo du Chat</h4>
              </div>
              <button
                onClick={() => setShowChatImportModal(false)}
                className="p-1.5 text-[#a29bfe] hover:text-white rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[#a29bfe] mb-3">
              Sélectionnez une photo échangée dans votre discussion pour l'ajouter instantanément au coffre-fort partagé.
            </p>

            <div className="flex-1 overflow-y-auto pr-1">
              {chatMediaMessages.length === 0 ? (
                <div className="text-center py-10">
                  <ImageIcon size={36} className="mx-auto text-[#6c5ce7]/40 mb-2" />
                  <p className="text-xs text-[#a29bfe]">Aucune photo disponible dans la discussion actuelle.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {chatMediaMessages.map(msg => (
                    <div
                      key={msg.id}
                      onClick={() => handleImportFromChat(msg)}
                      className="aspect-square rounded-xl overflow-hidden border border-[#2d2254] hover:border-[#00b894] relative group cursor-pointer transition-all hover:scale-105"
                    >
                      <img
                        src={msg.mediaUrl || ''}
                        alt="Chat media"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="p-1 rounded-full bg-[#00b894] text-[#130f26]">
                          <Plus size={16} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Vault Modal Box */}
      <div className="w-full max-w-2xl bg-[#171230] border border-[#2d2254] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#1f1742] flex items-center justify-between border-b border-[#2d2254] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6c5ce7] to-[#00b894] flex items-center justify-center shadow-[0_0_15px_rgba(0,184,148,0.3)] shrink-0">
              <Lock size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#f1f2f6] flex items-center gap-2">
                <span>Coffre-Fort Partagé</span>
                <span className="text-[10px] bg-[#00b894]/20 text-[#00b894] border border-[#00b894]/40 px-2 py-0.5 rounded-full font-semibold">
                  Synchro Complice 🔒
                </span>
              </h2>
              <p className="text-xs text-[#a29bfe]">Vos photos secrètes et souvenirs exclusifs à deux</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowChatImportModal(true)}
              className="hidden sm:flex items-center gap-1.5 bg-[#281e4b] hover:bg-[#342861] text-[#55efc4] border border-[#372863] font-bold text-xs px-3 py-2 rounded-xl transition-all cursor-pointer"
              title="Importer depuis le Chat"
            >
              <MessageSquare size={14} />
              <span>Depuis le Chat</span>
            </button>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 bg-[#00b894] hover:bg-[#00a884] text-[#130f26] font-bold text-xs px-3 py-2 rounded-xl transition-all active:scale-95 shadow-md cursor-pointer"
            >
              <Plus size={16} />
              <span>{showAddForm ? 'Fermer' : 'Ajouter'}</span>
            </button>

            {onLock && (
              <button
                onClick={() => {
                  onLock();
                  onClose();
                }}
                className="flex items-center gap-1 bg-[#281e4b] hover:bg-[#ff7675]/20 text-[#a29bfe] hover:text-[#ff7675] border border-[#372863] hover:border-[#ff7675]/40 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                title="Verrouiller le coffre"
              >
                <Lock size={14} />
                <span className="hidden sm:inline">Verrouiller</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-[#a29bfe] hover:text-white rounded-full hover:bg-[#281e4b] transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Search & Author Filters */}
        <div className="px-5 py-2.5 bg-[#130f26] border-b border-[#2d2254] flex flex-col sm:flex-row items-center justify-between gap-2.5">
          {/* Author segmented pills */}
          <div className="flex items-center gap-1.5 bg-[#1b1435] p-1 rounded-xl border border-[#2d2254] w-full sm:w-auto text-xs">
            <button
              onClick={() => setAuthorFilter('all')}
              className={`flex-1 sm:flex-initial px-3 py-1 rounded-lg font-medium transition-all ${
                authorFilter === 'all'
                  ? 'bg-[#6c5ce7] text-white shadow-sm'
                  : 'text-[#a29bfe] hover:text-white'
              }`}
            >
              Tous ({vaultItems.length})
            </button>
            <button
              onClick={() => setAuthorFilter('me')}
              className={`flex-1 sm:flex-initial px-3 py-1 rounded-lg font-medium transition-all ${
                authorFilter === 'me'
                  ? 'bg-[#6c5ce7] text-white shadow-sm'
                  : 'text-[#a29bfe] hover:text-white'
              }`}
            >
              Par Vous ({vaultItems.filter(i => i.addedBy === currentUser.id).length})
            </button>
            <button
              onClick={() => setAuthorFilter('partner')}
              className={`flex-1 sm:flex-initial px-3 py-1 rounded-lg font-medium transition-all ${
                authorFilter === 'partner'
                  ? 'bg-[#6c5ce7] text-white shadow-sm'
                  : 'text-[#a29bfe] hover:text-white'
              }`}
            >
              Par {partnerName} ({vaultItems.filter(i => i.addedBy !== currentUser.id).length})
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-48">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#a29bfe]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="w-full bg-[#1b1435] border border-[#2d2254] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#f1f2f6] placeholder-[#a29bfe]/60 focus:outline-none focus:border-[#00b894]"
            />
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-[#171230] border-b border-[#2d2254] overflow-x-auto text-xs scrollbar-none">
          {[
            { id: 'all', label: 'Toutes Catégories' },
            { id: 'intime', label: '🔥 Intime & Privé' },
            { id: 'souvenirs', label: '💜 Souvenirs d\'amour' },
            { id: 'voyages', label: '✨ Escapades' },
            { id: 'capsule', label: '⏳ Capsule' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-[#00b894] text-[#130f26] font-bold shadow-md'
                  : 'bg-[#1b1435] text-[#a29bfe] hover:text-white border border-[#2d2254]'
              }`}
            >
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {/* Add New Item Form */}
          {showAddForm && (
            <form onSubmit={handleSaveItem} className="bg-[#1e173e] border border-[#372863] rounded-2xl p-4 mb-5 animate-in slide-in-from-top-2 shadow-xl">
              <h3 className="text-sm font-bold text-[#f1f2f6] mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FolderHeart size={16} className="text-[#00b894]" />
                  Ajouter un média secret partagé
                </span>
                <button
                  type="button"
                  onClick={() => setShowChatImportModal(true)}
                  className="text-xs text-[#55efc4] hover:underline flex items-center gap-1"
                >
                  <MessageSquare size={12} />
                  <span>Importer du chat</span>
                </button>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[#a29bfe] mb-1 font-medium">Titre / Intitulé</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="Ex: Coucher de soleil au chalet... 🌙"
                    className="w-full bg-[#130f26] border border-[#2d2254] rounded-xl px-3 py-2 text-[#f1f2f6] focus:outline-none focus:border-[#00b894]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#a29bfe] mb-1 font-medium">Catégorie</label>
                    <select
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value as any)}
                      className="w-full bg-[#130f26] border border-[#2d2254] rounded-xl px-3 py-2 text-[#f1f2f6] focus:outline-none focus:border-[#00b894]"
                    >
                      <option value="intime">🔥 Intime & Privé</option>
                      <option value="souvenirs">💜 Souvenirs d'amour</option>
                      <option value="voyages">✨ Escapades</option>
                      <option value="capsule">⏳ Capsule temporelle</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#a29bfe] mb-1 font-medium">Option Vue Unique HD</label>
                    <button
                      type="button"
                      onClick={() => setIsViewOnceOption(!isViewOnceOption)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-colors ${
                        isViewOnceOption
                          ? 'bg-[#ff7675]/20 border-[#ff7675] text-[#ff7675]'
                          : 'bg-[#130f26] border-[#2d2254] text-[#a29bfe]'
                      }`}
                    >
                      <span>Brûler après lecture</span>
                      <Flame size={14} className={isViewOnceOption ? 'text-[#ff7675]' : 'opacity-40'} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[#a29bfe] mb-1 font-medium">Photo ou Vidéo</label>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setIsGalleryPickerOpen(true)}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] hover:brightness-110 text-white text-xs font-bold py-2.5 px-3 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <ImageIcon size={16} />
                      <span>Ouvrir la Galerie (Photos & Vidéos)</span>
                    </button>

                    <label className="flex items-center justify-center gap-2 border border-dashed border-[#6c5ce7]/60 hover:border-[#00b894] bg-[#130f26] hover:bg-[#1a1435] rounded-xl p-3 cursor-pointer transition-colors text-[#55efc4]">
                      <Upload size={16} />
                      <span className="font-semibold text-xs">Ou Parcourir un fichier vidéo (MP4, MKV, MOV...) ou photo</span>
                      <input
                        type="file"
                        accept="image/*,video/*,.mp4,.mov,.webm,.mkv,.avi,.m4v,.3gp,.ts,.flv,.wmv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {newMediaUrl && (
                    <div className="mt-2 flex items-center gap-3 bg-[#130f26] p-2 rounded-xl border border-[#2d2254]">
                      {newMediaType === 'video' ? (
                        <div className="relative w-12 h-12 rounded-lg bg-black overflow-hidden flex items-center justify-center">
                          <img src={newThumbnailUrl || newMediaUrl} alt="Preview" className="w-full h-full object-cover opacity-80" />
                          <Play size={14} fill="white" className="absolute text-white" />
                        </div>
                      ) : (
                        <img src={newMediaUrl} alt="Preview" className="w-12 h-12 rounded-lg object-cover" />
                      )}
                      <div className="flex flex-col">
                        <span className="text-xs text-[#00b894] font-medium">
                          {newMediaType === 'video' ? 'Vidéo prête à être chiffrée' : 'Image prête à être chiffrée'}
                        </span>
                        {newMediaType === 'video' && newDuration > 0 && (
                          <span className="text-[10px] text-[#a29bfe]">Durée : {formatVideoDuration(newDuration)}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[#a29bfe] mb-1 font-medium">Légende secrète (optionnel)</label>
                  <textarea
                    value={newCaption}
                    onChange={e => setNewCaption(e.target.value)}
                    placeholder="Un mot doux pour accompagner cette photo..."
                    rows={2}
                    className="w-full bg-[#130f26] border border-[#2d2254] rounded-xl px-3 py-2 text-[#f1f2f6] focus:outline-none focus:border-[#00b894] resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    disabled={isProcessingUpload}
                    className="px-4 py-2 rounded-xl text-[#a29bfe] hover:bg-[#281e4b] disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingUpload || (!newMediaUrl && !selectedFileForVault)}
                    className="px-4 py-2 rounded-xl bg-[#00b894] hover:bg-[#00a884] disabled:opacity-50 text-[#130f26] font-bold shadow-md transition-transform active:scale-95 cursor-pointer flex items-center gap-2"
                  >
                    {isProcessingUpload ? (
                      <>
                        <RefreshCw size={14} className="animate-spin text-[#130f26]" />
                        <span>Chiffrement & Sauvegarde...</span>
                      </>
                    ) : (
                      <span>Enregistrer au coffre 🔒</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Grid of Vault items */}
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <FolderHeart size={48} className="mx-auto text-[#6c5ce7]/40 mb-3" />
              <p className="text-sm font-semibold text-[#f1f2f6]">Aucun média dans cette sélection</p>
              <p className="text-xs text-[#a29bfe] mt-1">Ajoutez votre première photo ou importez-en depuis votre discussion.</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-[#6c5ce7] hover:bg-[#5b4bc4] text-white text-xs font-bold transition-all shadow-md"
              >
                Ajouter une photo maintenant
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredItems.map(item => {
                const isBurned = item.isViewOnce && item.isViewed;
                const isMe = item.addedBy === currentUser.id;
                const adderDisplayName = isMe ? 'Vous' : (item.addedByName || partnerName);

                return (
                  <div
                    key={item.id}
                    onClick={() => !isBurned && handleOpenItem(item)}
                    className={`group relative rounded-2xl overflow-hidden border border-[#2d2254] bg-[#1e173e] aspect-square flex flex-col justify-end p-3 transition-all duration-200 ${
                      isBurned 
                        ? 'opacity-40 cursor-not-allowed border-dashed' 
                        : 'cursor-pointer hover:border-[#00b894] hover:shadow-[0_0_20px_rgba(0,184,148,0.2)] hover:scale-[1.02]'
                    }`}
                  >
                    {isBurned ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#130f26] p-2 text-center">
                        <Flame size={24} className="text-[#ff7675] mb-1" />
                        <span className="text-[11px] font-semibold text-[#ff7675]">Vue unique consumée</span>
                      </div>
                    ) : (
                      <>
                        {(() => {
                          const isVideo = item.type === 'video' || item.mediaType === 'video' || /\.(mp4|webm|mov|m4v|mkv|avi|flv|wmv|3gp|ts)$/i.test(item.mediaUrl || '') || (item.mediaUrl || '').startsWith('data:video');
                          if (isVideo) {
                            if (item.thumbnailUrl) {
                              return (
                                <img
                                  src={item.thumbnailUrl}
                                  alt={item.title}
                                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              );
                            }
                            return (
                              <video
                                src={item.mediaUrl}
                                muted
                                playsInline
                                preload="metadata"
                                className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-85"
                              />
                            );
                          }
                          return (
                            <img
                              src={item.mediaUrl}
                              alt={item.title}
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=500&auto=format&fit=crop&q=80';
                              }}
                            />
                          );
                        })()}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#130f26] via-[#130f26]/30 to-transparent pointer-events-none" />

                        {/* Video Play Overlay */}
                        {(item.type === 'video' || item.mediaType === 'video' || /\.(mp4|webm|mov|m4v|mkv|avi|flv|wmv|3gp|ts)$/i.test(item.mediaUrl || '')) && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                            <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-white/40 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                              <Play size={16} fill="white" className="ml-0.5" />
                            </div>
                          </div>
                        )}

                        {/* Top Badges */}
                        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
                          {item.isViewOnce ? (
                            <span className="bg-[#ff7675] text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                              <Flame size={10} /> 1x HD
                            </span>
                          ) : item.type === 'video' ? (
                            <span className="bg-[#130f26]/85 backdrop-blur-md text-[#55efc4] text-[9px] font-bold px-2 py-0.5 rounded-full border border-[#00b894]/40 flex items-center gap-1 shadow">
                              <VideoIcon size={10} /> VIDÉO
                            </span>
                          ) : (
                            <span className="bg-[#130f26]/80 backdrop-blur-md text-[#55efc4] text-[9px] font-semibold px-2 py-0.5 rounded-full border border-[#00b894]/30">
                              HD
                            </span>
                          )}

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {onShareToChat && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShareItemToChat(item);
                                }}
                                className="p-1 rounded-lg bg-black/60 hover:bg-[#6c5ce7] text-white transition-all cursor-pointer"
                                title="Partager au chat"
                              >
                                <Send size={12} />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Supprimer cet élément du coffre partagé ?')) {
                                  handleDeleteItemCallback?.(item.id);
                                }
                              }}
                              className="p-1 rounded-lg bg-black/60 hover:bg-[#ff7675] text-white transition-all cursor-pointer"
                              title="Supprimer"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Bottom Title & Author Attribution */}
                        <div className="relative z-10">
                          <p className="text-xs font-semibold text-white truncate drop-shadow-md">
                            {item.title}
                          </p>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className={`text-[10px] font-medium flex items-center gap-1 ${
                              isMe ? 'text-[#55efc4]' : 'text-[#fd79a8]'
                            }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              <span>{isMe ? 'Ajouté par Vous' : `Ajouté par ${adderDisplayName}`}</span>
                            </span>
                            <div className="flex items-center gap-1">
                              {item.type === 'video' && item.duration ? (
                                <span className="text-[9px] text-[#55efc4] bg-black/60 px-1.5 py-0.5 rounded font-mono">
                                  {formatVideoDuration(item.duration)}
                                </span>
                              ) : null}
                              {item.source === 'chat' && (
                                <span className="text-[9px] text-[#a29bfe] bg-black/40 px-1.5 py-0.2 rounded">
                                  Chat
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#130f26] border-t border-[#2d2254] flex items-center justify-between text-xs text-[#a29bfe]">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-[#00b894]" />
              <span>Coffre Chiffré Partagé</span>
            </div>
            {onLock && (
              <button
                onClick={() => {
                  onLock();
                  onClose();
                }}
                className="flex items-center gap-1 bg-[#281e4b] hover:bg-[#ff7675]/20 text-[#a29bfe] hover:text-[#ff7675] border border-[#372863] hover:border-[#ff7675]/40 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                title="Verrouiller immédiatement"
              >
                <Lock size={12} />
                <span>Verrouiller</span>
              </button>
            )}
          </div>
          <span className="font-semibold text-[#55efc4]">
            {vaultItems.length} souvenir{vaultItems.length > 1 ? 's' : ''} partagé{vaultItems.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Galerie Photos & Vidéos pour le Coffre-Fort */}
      {isGalleryPickerOpen && (
        <MediaGalleryPickerModal
          isOpen={isGalleryPickerOpen}
          onClose={() => setIsGalleryPickerOpen(false)}
          onConfirm={handleConfirmGalleryForVault}
          title="Sélectionner des médias pour le Coffre-Fort"
          maxSelection={10}
        />
      )}
    </div>
  );
};
