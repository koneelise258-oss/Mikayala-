import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Plus, Sparkles, Calendar, MapPin, Heart, Image as ImageIcon,
  Compass, Award, Clock, Trash2, Camera, Filter, Check
} from 'lucide-react';
import { User, CoupleMemory } from '../types';
import { triggerHaptic, coupleVibrations } from '../utils/security';
import { soundEffects } from '../utils/audio';
import { compressImage } from '../utils/mediaProcessor';

interface CoupleTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  partnerUser: User;
  coupleId?: string;
}

const CATEGORIES = [
  { id: 'all', label: 'Tout', icon: Sparkles, color: 'text-[#55efc4]' },
  { id: 'first_meet', label: 'Rencontre', icon: Heart, color: 'text-[#fd79a8]' },
  { id: 'first_date', label: '1er Rendez-vous', icon: Award, color: 'text-[#ffeaa7]' },
  { id: 'trip', label: 'Voyages & Escapades', icon: Compass, color: 'text-[#74b9ff]' },
  { id: 'anniversary', label: 'Anniversaires', icon: Clock, color: 'text-[#a29bfe]' },
  { id: 'special_moment', label: 'Moments Précieux', icon: Sparkles, color: 'text-[#00cec9]' }
];

export const CoupleTimelineModal: React.FC<CoupleTimelineModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  partnerUser,
  coupleId = 'default_couple'
}) => {
  const storageKey = `mikayla_memories_${coupleId}`;

  const defaultMemories: CoupleMemory[] = useMemo(() => [
    {
      id: 'mem-1',
      title: 'Notre premier regard',
      date: '2024-01-01',
      description: 'Le début de notre magnifique histoire. Un moment inoubliable gravé dans nos cœurs.',
      category: 'first_meet',
      location: 'Paris, France',
      likesCount: 1,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id
    },
    {
      id: 'mem-2',
      title: 'Premier grand voyage ensemble',
      date: '2024-07-15',
      description: 'Coucher de soleil magique sur la plage, rien que tous les deux.',
      category: 'trip',
      location: 'Biarritz',
      likesCount: 2,
      createdAt: new Date().toISOString(),
      createdBy: partnerUser.id
    }
  ], [currentUser.id, partnerUser.id]);

  const [memories, setMemories] = useState<CoupleMemory[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : defaultMemories;
    } catch {
      return defaultMemories;
    }
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<CoupleMemory['category']>('special_moment');
  const [newLocation, setNewLocation] = useState('');
  const [newImageBase64, setNewImageBase64] = useState<string>('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(memories));
    } catch {}
  }, [memories, storageKey]);

  if (!isOpen) return null;

  const filteredMemories = memories
    .filter(m => selectedCategory === 'all' || m.category === selectedCategory)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    try {
      // Compression haute performance côté client
      const compressedBlob = await compressImage(file, 1600, 0.82);
      const reader = new FileReader();
      reader.onload = () => {
        setNewImageBase64(typeof reader.result === 'string' ? reader.result : '');
        setIsProcessingImage(false);
      };
      reader.readAsDataURL(compressedBlob);
    } catch {
      setIsProcessingImage(false);
    }
  };

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate) return;

    triggerHaptic(40);
    coupleVibrations.celebration();
    soundEffects.playMatchSound();

    const created: CoupleMemory = {
      id: `mem-${Date.now()}`,
      title: newTitle.trim(),
      date: newDate,
      description: newDescription.trim(),
      category: newCategory,
      location: newLocation.trim() || undefined,
      imageUrl: newImageBase64 || undefined,
      likesCount: 1,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id
    };

    setMemories(prev => [created, ...prev]);
    setIsAddOpen(false);
    // Reset Form
    setNewTitle('');
    setNewDescription('');
    setNewLocation('');
    setNewImageBase64('');
  };

  const handleLike = (id: string) => {
    triggerHaptic([60, 40, 100]);
    soundEffects.playHeartbeat();
    setMemories(prev => prev.map(m => m.id === id ? { ...m, likesCount: (m.likesCount || 0) + 1 } : m));
  };

  const handleDelete = (id: string) => {
    triggerHaptic(30);
    setMemories(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#17112d] border border-[#2d2254] rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#2d2254] flex items-center justify-between bg-[#1b1435]/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#fd79a8] to-[#6c5ce7] flex items-center justify-center text-white shadow-lg">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Album & Ligne du Temps</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#fd79a8]/20 text-[#fd79a8] font-semibold border border-[#fd79a8]/30">
                  {memories.length} souvenirs
                </span>
              </h2>
              <p className="text-xs text-[#a29bfe]">Les plus beaux instants de notre histoire à deux</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                triggerHaptic(20);
                setIsAddOpen(true);
              }}
              className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-[#00b894] to-[#00cec9] text-[#130f26] font-bold text-xs shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={15} />
              <span>Nouveau</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#a29bfe] hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="px-4 py-2.5 bg-[#130f26]/60 border-b border-[#2d2254]/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  triggerHaptic(15);
                  setSelectedCategory(cat.id);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#6c5ce7] text-white shadow-md'
                    : 'bg-[#1b1435] text-[#a29bfe] hover:text-white border border-[#2d2254]'
                }`}
              >
                <Icon size={13} className={cat.color} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content: Chronological Timeline */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {filteredMemories.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 rounded-3xl bg-[#281e4b] flex items-center justify-center mx-auto mb-3 text-[#a29bfe]">
                <Calendar size={28} />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Aucun souvenir dans cette catégorie</h3>
              <p className="text-xs text-[#a29bfe] max-w-sm mx-auto mb-4">
                Ajoutez une photo, une date ou une note pour immortaliser un moment précieux ensemble.
              </p>
              <button
                onClick={() => setIsAddOpen(true)}
                className="px-4 py-2 rounded-2xl bg-[#6c5ce7] text-white font-semibold text-xs shadow-md hover:brightness-110 cursor-pointer"
              >
                Créer un souvenir
              </button>
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 border-l-2 border-[#2d2254] space-y-8">
              {filteredMemories.map((mem) => {
                const formattedDate = new Date(mem.date).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                });

                return (
                  <div key={mem.id} className="relative group">
                    {/* Glowing Timeline Bullet */}
                    <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full bg-[#130f26] border-2 border-[#fd79a8] flex items-center justify-center shadow-[0_0_12px_rgba(253,121,168,0.5)]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#fd79a8]" />
                    </div>

                    {/* Card */}
                    <div className="p-4 sm:p-5 rounded-3xl bg-[#1b1435]/90 border border-[#2d2254] hover:border-[#6c5ce7]/50 shadow-xl transition-all space-y-3">
                      
                      {/* Top Meta */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-bold text-[#fd79a8] flex items-center gap-1">
                              <Calendar size={12} />
                              {formattedDate}
                            </span>
                            {mem.location && (
                              <span className="text-[10px] text-[#a29bfe] flex items-center gap-0.5">
                                <MapPin size={11} className="text-[#00cec9]" />
                                {mem.location}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm sm:text-base font-bold text-white">
                            {mem.title}
                          </h4>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleLike(mem.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#fd79a8]/10 hover:bg-[#fd79a8]/20 text-[#fd79a8] border border-[#fd79a8]/20 transition-all cursor-pointer text-xs"
                            title="Ajouter un cœur"
                          >
                            <Heart size={13} className="fill-[#fd79a8]" />
                            <span className="font-bold text-[11px]">{mem.likesCount || 1}</span>
                          </button>
                          
                          <button
                            onClick={() => handleDelete(mem.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-[#ff7675] rounded-lg transition-all cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Photo if present */}
                      {mem.imageUrl && (
                        <div className="rounded-2xl overflow-hidden border border-[#2d2254] max-h-72 bg-black/40">
                          <img
                            src={mem.imageUrl}
                            alt={mem.title}
                            className="w-full h-full object-cover max-h-72 hover:scale-102 transition-transform duration-300"
                          />
                        </div>
                      )}

                      {/* Description */}
                      {mem.description && (
                        <p className="text-xs text-[#a29bfe] leading-relaxed whitespace-pre-wrap">
                          {mem.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Création Souvenir */}
        {isAddOpen && (
          <div 
            onClick={() => setIsAddOpen(false)}
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-4 animate-in fade-in"
          >
            <div 
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-[#1b1435] border border-[#2d2254] rounded-3xl p-5 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#2d2254]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles size={16} className="text-[#ffeaa7]" />
                  <span>Nouveau Souvenir de Couple</span>
                </h3>
                <button
                  onClick={() => setIsAddOpen(false)}
                  className="p-1 text-[#a29bfe] hover:text-white rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddMemory} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#a29bfe] mb-1">
                    Titre du moment *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Notre balade sous les étoiles"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#130f26] border border-[#2d2254] text-white text-xs placeholder:text-[#a29bfe]/40 focus:outline-none focus:border-[#6c5ce7]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#a29bfe] mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={newDate}
                      onChange={e => setNewDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-2xl bg-[#130f26] border border-[#2d2254] text-white text-xs focus:outline-none focus:border-[#6c5ce7]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#a29bfe] mb-1">
                      Catégorie
                    </label>
                    <select
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-2xl bg-[#130f26] border border-[#2d2254] text-white text-xs focus:outline-none focus:border-[#6c5ce7]"
                    >
                      <option value="special_moment">Moment Précieux</option>
                      <option value="first_meet">Rencontre</option>
                      <option value="first_date">1er Rendez-vous</option>
                      <option value="trip">Voyage</option>
                      <option value="anniversary">Anniversaire</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a29bfe] mb-1">
                    Lieu (optionnel)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Marseille, Plage du Prado"
                    value={newLocation}
                    onChange={e => setNewLocation(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-2xl bg-[#130f26] border border-[#2d2254] text-white text-xs placeholder:text-[#a29bfe]/40 focus:outline-none focus:border-[#6c5ce7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a29bfe] mb-1">
                    Récit / Mots doux
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ce que j'ai ressenti à ce moment précis..."
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#130f26] border border-[#2d2254] text-white text-xs placeholder:text-[#a29bfe]/40 focus:outline-none focus:border-[#6c5ce7] resize-none"
                  />
                </div>

                {/* Photo Upload with client compression */}
                <div>
                  <label className="block text-xs font-semibold text-[#a29bfe] mb-1.5">
                    Photo du souvenir
                  </label>
                  {newImageBase64 ? (
                    <div className="relative rounded-2xl overflow-hidden border border-[#2d2254] h-36 bg-black/40">
                      <img src={newImageBase64} alt="Aperçu" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setNewImageBase64('')}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-[#2d2254] hover:border-[#6c5ce7] rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-colors bg-[#130f26]/50">
                      <Camera size={22} className="text-[#a29bfe]" />
                      <span className="text-xs text-[#a29bfe]">
                        {isProcessingImage ? 'Optimisation en cours...' : 'Ajouter une photo (optimisée automatiquement)'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImagePick}
                      />
                    </label>
                  )}
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#fd79a8] to-[#6c5ce7] text-white font-bold text-xs shadow-lg hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check size={16} />
                    <span>Graver ce souvenir</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="px-4 py-3 rounded-2xl bg-[#281e4b] hover:bg-[#34275f] text-white text-xs font-semibold cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
