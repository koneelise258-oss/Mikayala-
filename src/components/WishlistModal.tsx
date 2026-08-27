import React, { useState } from 'react';
import { 
  Sparkles, 
  Heart, 
  Plus, 
  Flame, 
  CheckCircle2, 
  X, 
  Send, 
  Gift, 
  Lock, 
  MessageCircleHeart, 
  Trash2, 
  Edit3, 
  Filter,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { WishlistItem, User } from '../types';
import { triggerHaptic } from '../utils/security';
import { soundEffects } from '../utils/audio';

interface WishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  wishlist: WishlistItem[];
  currentUser: User;
  partnerUser: User;
  onAddWish: (wish: Omit<WishlistItem, 'id' | 'isMatched' | 'likedBy'>) => void;
  onToggleLikeWish: (id: string) => void;
  onToggleCompleteWish: (id: string) => void;
  onEditWish?: (id: string, updates: Partial<WishlistItem>) => void;
  onDeleteWish?: (id: string) => void;
  onShareToChat: (text: string) => void;
}

export const WishlistModal: React.FC<WishlistModalProps> = ({
  isOpen,
  onClose,
  wishlist = [],
  currentUser,
  partnerUser,
  onAddWish,
  onToggleLikeWish,
  onToggleCompleteWish,
  onEditWish,
  onDeleteWish,
  onShareToChat
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'matches' | 'date_night' | 'fantasme' | 'attention' | 'voyage' | 'surprise'>('all');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Form states
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<'date_night' | 'attention' | 'fantasme' | 'voyage' | 'surprise'>('date_night');
  const [newDescription, setNewDescription] = useState<string>('');
  
  // Edit Form states
  const [editTitle, setEditTitle] = useState<string>('');
  const [editCategory, setEditCategory] = useState<'date_night' | 'attention' | 'fantasme' | 'voyage' | 'surprise'>('date_night');
  const [editDescription, setEditDescription] = useState<string>('');

  // Celebration state
  const [matchedCelebrationItem, setMatchedCelebrationItem] = useState<WishlistItem | null>(null);

  if (!isOpen) return null;

  // Filter items
  const filteredItems = wishlist.filter(item => {
    const isLikedByMe = (item.likedBy || []).includes(currentUser.id) || item.userWished;
    const isLikedByPartner = (item.likedBy || []).includes(partnerUser.id) || item.partnerWished;
    const isMatched = item.isMatched || item.isMatch || (isLikedByMe && isLikedByPartner);

    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'matches') return isMatched;
    return item.category === selectedCategory;
  });

  const totalMatchesCount = wishlist.filter(item => {
    const isLikedByMe = (item.likedBy || []).includes(currentUser.id) || item.userWished;
    const isLikedByPartner = (item.likedBy || []).includes(partnerUser.id) || item.partnerWished;
    return item.isMatched || item.isMatch || (isLikedByMe && isLikedByPartner);
  }).length;

  const handleLike = (item: WishlistItem) => {
    const currentLiked = item.likedBy || [];
    const isCurrentlyLikedByMe = currentLiked.includes(currentUser.id) || (currentUser.id === item.addedBy && item.userWished);
    const isLikedByPartner = currentLiked.includes(partnerUser.id) || item.partnerWished;
    
    // Check if this vote will trigger a brand new match
    const willBecomeMatched = !isCurrentlyLikedByMe && isLikedByPartner;

    onToggleLikeWish(item.id);
    triggerHaptic([60, 40, 100]);

    if (willBecomeMatched) {
      // Trigger Match Celebration!
      soundEffects.playMatchSound();
      triggerHaptic([100, 50, 150, 50, 200]);
      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#00b894', '#6c5ce7', '#fd79a8', '#ffeaa7', '#ff7675']
        });
      } catch {
        // Confetti fallback
      }

      setMatchedCelebrationItem({
        ...item,
        likedBy: [...currentLiked, currentUser.id],
        isMatched: true,
        isMatch: true
      });
    } else {
      soundEffects.playReaction();
    }
  };

  const handleSaveWish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddWish({
      title: newTitle.trim(),
      category: newCategory,
      description: newDescription.trim(),
      addedBy: currentUser.id,
      isCompleted: false
    });

    triggerHaptic([40, 40, 80]);
    soundEffects.playSent();
    setNewTitle('');
    setNewDescription('');
    setShowAddForm(false);
  };

  const startEditItem = (item: WishlistItem) => {
    setEditingItemId(item.id);
    setEditTitle(item.title);
    setEditCategory(item.category);
    setEditDescription(item.description || '');
  };

  const handleSaveEdit = (id: string) => {
    if (!editTitle.trim()) return;
    if (onEditWish) {
      onEditWish(id, {
        title: editTitle.trim(),
        category: editCategory,
        description: editDescription.trim()
      });
    }
    setEditingItemId(null);
    triggerHaptic(40);
    soundEffects.playReaction();
  };

  const handleDeleteItem = (id: string) => {
    if (onDeleteWish) {
      onDeleteWish(id);
      triggerHaptic([50, 50]);
      soundEffects.playReaction();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0e0b1c]/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in">
      {/* Match Celebration Pop-up */}
      {matchedCelebrationItem && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-lg flex items-center justify-center p-4 animate-in zoom-in-95">
          <div className="w-full max-w-sm bg-gradient-to-b from-[#2d1b4e] via-[#1f163d] to-[#130f26] border-2 border-[#00b894] rounded-3xl p-6 shadow-[0_0_60px_rgba(0,184,148,0.45)] text-center flex flex-col items-center relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#fd79a8]/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#00b894]/20 rounded-full blur-2xl pointer-events-none" />

            <div className="w-20 h-20 rounded-full bg-[#00b894]/20 border-2 border-[#00b894] flex items-center justify-center mb-3 shadow-[0_0_25px_#00b894] animate-bounce">
              <Flame size={42} className="text-[#00b894]" />
            </div>

            <span className="text-[11px] uppercase tracking-widest text-[#55efc4] font-extrabold bg-[#00b894]/15 px-3 py-1 rounded-full border border-[#00b894]/30 mb-1">
              Alchimie Confirmée
            </span>
            
            <h3 className="text-2xl font-black text-white mt-1 mb-2">
              C'est un Match ! ❤️🔥
            </h3>
            
            <div className="text-sm text-[#f1f2f6] font-bold bg-[#130f26]/90 px-4 py-3 rounded-2xl border border-[#372863] my-3 w-full shadow-inner">
              "{matchedCelebrationItem.title}"
            </div>

            <p className="text-xs text-[#a29bfe] mb-5 leading-relaxed">
              Vous avez tous les deux validé ce désir secret. C'est l'occasion rêvée d'organiser ce moment intime à deux !
            </p>

            <div className="w-full space-y-2.5">
              <button
                onClick={() => {
                  onShareToChat(`✨ *C'est un MATCH Mikayala !* \nNous avons tous les deux validé notre souhait : "${matchedCelebrationItem.title}" ❤️🔥 Organisons ce moment inoubliable !`);
                  setMatchedCelebrationItem(null);
                  onClose();
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#00b894] hover:bg-[#00a884] text-[#130f26] font-extrabold text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,184,148,0.4)] transition-transform active:scale-95 cursor-pointer"
              >
                <Send size={16} />
                <span>Partager dans notre discussion</span>
              </button>

              <button
                onClick={() => setMatchedCelebrationItem(null)}
                className="w-full py-2 px-4 rounded-xl text-xs text-[#a29bfe] hover:text-white transition-colors cursor-pointer"
              >
                Continuer à explorer les vœux
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Wishlist Box */}
      <div className="w-full max-w-2xl bg-[#171230] border border-[#2d2254] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="h-[64px] bg-[#1f1742] px-5 flex items-center justify-between border-b border-[#2d2254] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#fd79a8] via-[#e84393] to-[#6c5ce7] flex items-center justify-center shadow-[0_0_15px_rgba(253,121,168,0.3)]">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#f1f2f6] flex items-center gap-2">
                <span>Wishlist & Fantasmes</span>
                <span className="text-[10px] bg-[#fd79a8]/20 text-[#fd79a8] border border-[#fd79a8]/40 px-2 py-0.5 rounded-full font-bold">
                  {totalMatchesCount} {totalMatchesCount > 1 ? 'Matchs' : 'Match'} 🔥
                </span>
              </h2>
              <p className="text-xs text-[#a29bfe]">Désirs secrets, idées de dates et fantasmes complices</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setEditingItemId(null);
              }}
              className="flex items-center gap-1.5 bg-[#00b894] hover:bg-[#00a884] text-[#130f26] font-bold text-xs px-3 py-2 rounded-xl transition-all active:scale-95 shadow-md cursor-pointer"
            >
              <Plus size={16} />
              <span>{showAddForm ? 'Fermer' : 'Ajouter un vœu'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#a29bfe] hover:text-white rounded-full hover:bg-[#281e4b] transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 px-5 py-3 bg-[#130f26] border-b border-[#2d2254] overflow-x-auto text-xs scrollbar-none">
          {[
            { id: 'all', label: 'Tout voir' },
            { id: 'matches', label: `🔥 Matchs (${totalMatchesCount})` },
            { id: 'fantasme', label: '🌶️ Fantasmes' },
            { id: 'date_night', label: '🍷 Rendez-vous' },
            { id: 'attention', label: '🍓 Attentions' },
            { id: 'voyage', label: '✈️ Voyages' },
            { id: 'surprise', label: '🎁 Surprises' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-[#6c5ce7] text-white shadow-md'
                  : 'bg-[#1e173e] text-[#a29bfe] hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Add New Wish Form */}
          {showAddForm && (
            <form onSubmit={handleSaveWish} className="bg-[#1e173e] border border-[#00b894]/40 rounded-2xl p-4 animate-in slide-in-from-top-2 shadow-lg">
              <h3 className="text-sm font-bold text-[#f1f2f6] mb-3 flex items-center gap-2">
                <Gift size={16} className="text-[#00b894]" />
                Ajouter une envie intime ou un vœu pour le couple
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[#a29bfe] mb-1 font-semibold">Titre du désir *</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="Ex: Soirée massage aux huiles chaudes et bougies..."
                    className="w-full bg-[#130f26] border border-[#2d2254] rounded-xl px-3 py-2.5 text-[#f1f2f6] placeholder:text-[#a29bfe]/40 focus:outline-none focus:border-[#00b894]"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[#a29bfe] mb-1 font-semibold">Catégorie</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as any)}
                    className="w-full bg-[#130f26] border border-[#2d2254] rounded-xl px-3 py-2.5 text-[#f1f2f6] focus:outline-none focus:border-[#00b894] cursor-pointer"
                  >
                    <option value="date_night">🍷 Rendez-vous & Soirée</option>
                    <option value="fantasme">🌶️ Fantasme & Jeu intime</option>
                    <option value="attention">🍓 Douce Attention / Soin</option>
                    <option value="voyage">✈️ Voyage & Escapade</option>
                    <option value="surprise">🎁 Surprise Secrète</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#a29bfe] mb-1 font-semibold">Détails & Ambiance (optionnel)</label>
                  <textarea
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    placeholder="Décris l'ambiance, la musique, le lieu ou les détails qui te feraient plaisir..."
                    rows={2}
                    className="w-full bg-[#130f26] border border-[#2d2254] rounded-xl px-3 py-2 text-[#f1f2f6] placeholder:text-[#a29bfe]/40 focus:outline-none focus:border-[#00b894] resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 rounded-xl text-[#a29bfe] hover:bg-[#281e4b] cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={!newTitle.trim()}
                    className="px-4 py-2 rounded-xl bg-[#00b894] hover:bg-[#00a884] disabled:opacity-50 text-[#130f26] font-bold shadow-md transition-transform active:scale-95 cursor-pointer"
                  >
                    Ajouter à la Wishlist ✨
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Empty State */}
          {filteredItems.length === 0 && (
            <div className="text-center py-12 px-4 bg-[#1e173e]/50 border border-dashed border-[#2d2254] rounded-2xl">
              <Sparkles size={36} className="text-[#a29bfe]/40 mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#f1f2f6]">Aucun vœu dans cette catégorie</p>
              <p className="text-xs text-[#a29bfe] mt-1 mb-4">Ajoutez votre première envie pour tester votre alchimie !</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 rounded-xl bg-[#6c5ce7] hover:bg-[#5b4bc4] text-white font-bold text-xs transition-colors cursor-pointer"
              >
                + Ajouter une idée
              </button>
            </div>
          )}

          {/* List of Wishes */}
          <div className="space-y-3">
            {filteredItems.map(item => {
              const currentLiked = item.likedBy || [];
              const isLikedByMe = currentLiked.includes(currentUser.id) || (currentUser.id === item.addedBy && item.userWished);
              const isLikedByPartner = currentLiked.includes(partnerUser.id) || item.partnerWished;
              const isMatched = item.isMatched || item.isMatch || (isLikedByMe && isLikedByPartner);
              const isEditing = editingItemId === item.id;

              if (isEditing) {
                return (
                  <div key={item.id} className="p-4 rounded-2xl bg-[#1e173e] border border-[#6c5ce7] shadow-lg space-y-3 text-xs animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#55efc4]">Modifier ce désir</span>
                      <button onClick={() => setEditingItemId(null)} className="text-[#a29bfe] hover:text-white">
                        <X size={16} />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className="w-full bg-[#130f26] border border-[#2d2254] rounded-xl px-3 py-2 text-[#f1f2f6] focus:outline-none focus:border-[#6c5ce7]"
                    />

                    <select
                      value={editCategory}
                      onChange={e => setEditCategory(e.target.value as any)}
                      className="w-full bg-[#130f26] border border-[#2d2254] rounded-xl px-3 py-2 text-[#f1f2f6] focus:outline-none focus:border-[#6c5ce7]"
                    >
                      <option value="date_night">🍷 Rendez-vous & Soirée</option>
                      <option value="fantasme">🌶️ Fantasme & Jeu intime</option>
                      <option value="attention">🍓 Douce Attention / Soin</option>
                      <option value="voyage">✈️ Voyage & Escapade</option>
                      <option value="surprise">🎁 Surprise</option>
                    </select>

                    <textarea
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                      rows={2}
                      className="w-full bg-[#130f26] border border-[#2d2254] rounded-xl px-3 py-2 text-[#f1f2f6] focus:outline-none focus:border-[#6c5ce7] resize-none"
                    />

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingItemId(null)}
                        className="px-3 py-1.5 rounded-lg text-[#a29bfe] hover:bg-[#281e4b]"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={() => handleSaveEdit(item.id)}
                        className="px-4 py-1.5 rounded-lg bg-[#6c5ce7] text-white font-bold shadow-md hover:bg-[#5b4bc4]"
                      >
                        Enregistrer
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all duration-200 ${
                    isMatched
                      ? 'bg-gradient-to-r from-[#20183e] via-[#1c1c3c] to-[#152332] border-[#00b894]/60 shadow-[0_0_20px_rgba(0,184,148,0.15)]'
                      : 'bg-[#1e173e] border-[#2d2254] hover:border-[#6c5ce7]/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#130f26] text-[#a29bfe] border border-[#2d2254]">
                          {item.category === 'fantasme' ? '🌶️ Fantasme' : item.category === 'date_night' ? '🍷 Date' : item.category === 'attention' ? '🍓 Attention' : item.category === 'voyage' ? '✈️ Voyage' : '🎁 Surprise'}
                        </span>
                        
                        {isMatched && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#00b894]/20 text-[#55efc4] border border-[#00b894]/40 flex items-center gap-1 animate-pulse">
                            <Flame size={11} className="text-[#00b894]" />
                            C'est un Match !
                          </span>
                        )}

                        {item.isCompleted && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#6c5ce7]/20 text-[#a29bfe] border border-[#6c5ce7]/40 flex items-center gap-1">
                            <CheckCircle2 size={11} className="text-[#00b894]" />
                            Réalisé
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-[#f1f2f6] leading-snug">
                        {item.title}
                      </h4>
                      
                      {item.description && (
                        <p className="text-xs text-[#a29bfe] mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-[#a29bfe]/70">
                        <span>Ajouté par {item.addedBy === currentUser.id ? 'Vous' : partnerUser.name}</span>
                        
                        {isMatched && (
                          <button
                            onClick={() => onShareToChat(`✨ Parlons de notre désir validé ensemble : "${item.title}" ❤️🔥`)}
                            className="text-[#55efc4] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                          >
                            <MessageCircleHeart size={13} />
                            En discuter dans le chat
                          </button>
                        )}

                        <div className="flex items-center gap-2 ml-auto">
                          <button
                            onClick={() => startEditItem(item)}
                            className="text-[#a29bfe] hover:text-white transition-colors p-1"
                            title="Modifier ce souhait"
                          >
                            <Edit3 size={13} />
                          </button>
                          {onDeleteWish && (
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-[#a29bfe] hover:text-[#ff7675] transition-colors p-1"
                              title="Supprimer ce souhait"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-2 shrink-0">
                      {/* Heart Button */}
                      <button
                        onClick={() => handleLike(item)}
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
                          isLikedByMe
                            ? 'bg-[#fd79a8] text-white shadow-[0_0_18px_rgba(253,121,168,0.55)] scale-105'
                            : 'bg-[#130f26] text-[#a29bfe] hover:text-[#fd79a8] border border-[#2d2254] hover:border-[#fd79a8]/50'
                        }`}
                        title={isLikedByMe ? 'Vous avez validé cette envie' : 'Cliquer pour valider et liker ce désir'}
                      >
                        <Heart size={20} fill={isLikedByMe ? 'currentColor' : 'none'} />
                      </button>

                      {/* Complete Checkbox */}
                      <button
                        onClick={() => onToggleCompleteWish(item.id)}
                        className={`p-1.5 rounded-xl text-xs transition-colors cursor-pointer ${
                          item.isCompleted
                            ? 'text-[#00b894] bg-[#00b894]/20 border border-[#00b894]/40'
                            : 'text-[#a29bfe]/40 hover:text-[#a29bfe] bg-[#130f26]'
                        }`}
                        title={item.isCompleted ? 'Marquer comme non-réalisé' : 'Marquer comme moment réalisé !'}
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#130f26] border-t border-[#2d2254] flex items-center justify-between text-xs text-[#a29bfe]">
          <div className="flex items-center gap-1.5">
            <Lock size={13} className="text-[#00b894]" />
            <span>Chaque like est partagé et vérifié en temps réel</span>
          </div>
          <span className="font-bold text-[#55efc4]">
            {totalMatchesCount} envies matchées 🔥
          </span>
        </div>
      </div>
    </div>
  );
};
