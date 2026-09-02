import React, { useState } from 'react';
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
  Tag
} from 'lucide-react';
import { VaultItem, User } from '../types';
import { triggerHaptic } from '../utils/security';
import { soundEffects } from '../utils/audio';

interface VaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultItems: VaultItem[];
  currentUser: User;
  onAddVaultItem?: (item: Omit<VaultItem, 'id' | 'dateAdded'>) => void;
  onAddItem?: (item: Omit<VaultItem, 'id' | 'dateAdded'>) => void;
  onDeleteVaultItem?: (id: string) => void;
  onDeleteItem?: (id: string) => void;
  onViewOnceBurned: (id: string) => void;
  onLock?: () => void;
}

export const VaultModal: React.FC<VaultModalProps> = ({
  isOpen,
  onClose,
  vaultItems,
  currentUser,
  onAddVaultItem,
  onAddItem,
  onDeleteVaultItem,
  onDeleteItem,
  onViewOnceBurned,
  onLock
}) => {
  const handleAddItemCallback = onAddVaultItem || onAddItem;
  const handleDeleteItemCallback = onDeleteVaultItem || onDeleteItem;
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'intime' | 'souvenirs' | 'voyages' | 'capsule'>('all');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<'intime' | 'souvenirs' | 'voyages' | 'capsule'>('intime');
  const [newMediaUrl, setNewMediaUrl] = useState<string>('');
  const [newCaption, setNewCaption] = useState<string>('');
  const [isViewOnceOption, setIsViewOnceOption] = useState<boolean>(false);
  const [activeViewingItem, setActiveViewingItem] = useState<VaultItem | null>(null);

  if (!isOpen) return null;

  const filteredItems = vaultItems.filter(item => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setNewMediaUrl(reader.result);
          if (!newTitle) {
            setNewTitle(file.name.replace(/\.[^/.]+$/, ""));
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMediaUrl) return;

    handleAddItemCallback?.({
      title: newTitle.trim() || 'Souvenir intime 💜',
      type: 'photo',
      mediaUrl: newMediaUrl,
      category: newCategory,
      addedBy: currentUser.id,
      caption: newCaption.trim(),
      isViewOnce: isViewOnceOption,
      isViewed: false,
      tags: [newCategory]
    });

    triggerHaptic([50, 50, 100]);
    soundEffects.playSent();
    setNewTitle('');
    setNewMediaUrl('');
    setNewCaption('');
    setIsViewOnceOption(false);
    setShowAddForm(false);
  };

  const handleOpenItem = (item: VaultItem) => {
    if (item.isViewOnce && item.isViewed) {
      return; // Already burned
    }
    setActiveViewingItem(item);
    triggerHaptic(40);
  };

  const handleCloseViewer = () => {
    if (activeViewingItem?.isViewOnce) {
      onViewOnceBurned(activeViewingItem.id);
      triggerHaptic([100, 100]);
    }
    setActiveViewingItem(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0e0b1c]/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in">
      {/* Full-screen View Once / HD Lightbox */}
      {activeViewingItem && (
        <div className="fixed inset-0 z-60 bg-black/98 flex flex-col justify-between p-4 animate-in fade-in">
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              {activeViewingItem.isViewOnce ? (
                <span className="flex items-center gap-1.5 bg-[#ff7675]/20 text-[#ff7675] border border-[#ff7675]/40 text-xs font-semibold px-3 py-1 rounded-full">
                  <Flame size={14} className="animate-pulse" />
                  Vue Unique HD (S'autodétruit à la fermeture)
                </span>
              ) : (
                <span className="flex items-center gap-1.5 bg-[#00b894]/20 text-[#00b894] border border-[#00b894]/40 text-xs font-semibold px-3 py-1 rounded-full">
                  <ShieldCheck size={14} />
                  Coffre-Fort Sécurisé
                </span>
              )}
            </div>
            <button
              onClick={handleCloseViewer}
              className="p-2 bg-[#2d2254]/80 hover:bg-[#ff7675]/80 text-white rounded-full transition-colors cursor-pointer"
            >
              <X size={22} />
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center relative p-2 my-auto">
            <img
              src={activeViewingItem.mediaUrl}
              alt={activeViewingItem.title}
              className="max-h-[75vh] max-w-full rounded-2xl object-contain shadow-2xl border border-[#6c5ce7]/30 select-none"
              onContextMenu={e => e.preventDefault()}
            />
            {activeViewingItem.caption && (
              <p className="mt-4 text-center text-sm font-medium text-[#f1f2f6] max-w-md bg-[#1b1435]/90 px-4 py-2 rounded-xl border border-[#372863]">
                {activeViewingItem.caption}
              </p>
            )}
          </div>

          <div className="text-center text-xs text-[#a29bfe]/70 pb-2">
            Protégé par Mikayla Biometrics • Capture d'écran désactivée
          </div>
        </div>
      )}

      {/* Main Vault Modal Box */}
      <div className="w-full max-w-2xl bg-[#171230] border border-[#2d2254] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="h-[64px] bg-[#1f1742] px-5 flex items-center justify-between border-b border-[#2d2254] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6c5ce7] to-[#00b894] flex items-center justify-center shadow-[0_0_15px_rgba(0,184,148,0.3)]">
              <Lock size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#f1f2f6] flex items-center gap-2">
                <span>Coffre-Fort Intime</span>
                <span className="text-[10px] bg-[#00b894]/20 text-[#00b894] border border-[#00b894]/40 px-2 py-0.5 rounded-full font-semibold">
                  Chiffré WebAuthn
                </span>
              </h2>
              <p className="text-xs text-[#a29bfe]">Vos photos, vidéos et secrets exclusifs à deux</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Categories Bar */}
        <div className="flex items-center gap-2 px-5 py-3 bg-[#130f26] border-b border-[#2d2254] overflow-x-auto text-xs">
          {[
            { id: 'all', label: 'Tout voir', count: vaultItems.length },
            { id: 'intime', label: '🔥 Intime & Privé', count: vaultItems.filter(i => i.category === 'intime').length },
            { id: 'souvenirs', label: '💜 Souvenirs d\'amour', count: vaultItems.filter(i => i.category === 'souvenirs').length },
            { id: 'voyages', label: '✨ Escapades', count: vaultItems.filter(i => i.category === 'voyages').length },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-[#6c5ce7] text-white shadow-md'
                  : 'bg-[#1e173e] text-[#a29bfe] hover:text-white'
              }`}
            >
              <span>{cat.label}</span>
              <span className="text-[10px] opacity-75 bg-black/20 px-1.5 py-0.2 rounded-full">
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Add New Item Form */}
          {showAddForm && (
            <form onSubmit={handleSaveItem} className="bg-[#1e173e] border border-[#372863] rounded-2xl p-4 mb-6 animate-in slide-in-from-top-2">
              <h3 className="text-sm font-bold text-[#f1f2f6] mb-3 flex items-center gap-2">
                <FolderHeart size={16} className="text-[#00b894]" />
                Ajouter un média secret dans le coffre
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
                  <label className="block text-[#a29bfe] mb-1 font-medium">Photo ou Média</label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 flex items-center justify-center gap-2 border border-dashed border-[#6c5ce7]/60 hover:border-[#00b894] bg-[#130f26] hover:bg-[#1a1435] rounded-xl p-3 cursor-pointer transition-colors text-[#55efc4]">
                      <Upload size={16} />
                      <span className="font-semibold">Parcourir ou Déposer</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {newMediaUrl && (
                    <div className="mt-2 flex items-center gap-3 bg-[#130f26] p-2 rounded-xl border border-[#2d2254]">
                      <img src={newMediaUrl} alt="Preview" className="w-12 h-12 rounded-lg object-cover" />
                      <span className="text-xs text-[#00b894] font-medium">Image chargée prête à être chiffrée</span>
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
                    className="px-4 py-2 rounded-xl text-[#a29bfe] hover:bg-[#281e4b]"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={!newMediaUrl}
                    className="px-4 py-2 rounded-xl bg-[#00b894] hover:bg-[#00a884] disabled:opacity-50 text-[#130f26] font-bold shadow-md transition-transform active:scale-95"
                  >
                    Enregistrer au coffre 🔒
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Grid of Vault items */}
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <FolderHeart size={48} className="mx-auto text-[#6c5ce7]/40 mb-3" />
              <p className="text-sm font-semibold text-[#f1f2f6]">Aucun média dans cette catégorie</p>
              <p className="text-xs text-[#a29bfe] mt-1">Ajoutez votre première photo ou vidéo intime protégée.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredItems.map(item => {
                const isBurned = item.isViewOnce && item.isViewed;
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
                        <img
                          src={item.mediaUrl}
                          alt={item.title}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#130f26] via-[#130f26]/20 to-transparent" />

                        {/* Top Badges */}
                        <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                          {item.isViewOnce ? (
                            <span className="bg-[#ff7675] text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                              <Flame size={10} /> 1x HD
                            </span>
                          ) : (
                            <span className="bg-[#130f26]/80 backdrop-blur-md text-[#55efc4] text-[9px] font-semibold px-2 py-0.5 rounded-full border border-[#00b894]/30">
                              HD
                            </span>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Supprimer cet élément du coffre ?')) {
                                handleDeleteItemCallback?.(item.id);
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg bg-black/60 hover:bg-[#ff7675] text-white transition-all cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        {/* Bottom Title */}
                        <div className="relative z-10">
                          <p className="text-xs font-semibold text-white truncate drop-shadow-md">
                            {item.title}
                          </p>
                          <span className="text-[10px] text-[#55efc4] font-medium">
                            {item.addedBy === currentUser.id ? 'Ajouté par vous' : 'Partagé avec vous'}
                          </span>
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
              <span>Stockage chiffré</span>
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
            {vaultItems.length} souvenirs protégés
          </span>
        </div>
      </div>
    </div>
  );
};
