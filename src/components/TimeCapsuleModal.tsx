import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Lock, Unlock, Clock, Sparkles, AlertCircle, 
  Calendar, Check, Trash2, Heart, Camera
} from 'lucide-react';
import { User, TimeCapsule } from '../types';
import { triggerHaptic, coupleVibrations } from '../utils/security';
import { soundEffects } from '../utils/audio';
import { compressImage } from '../utils/mediaProcessor';

interface TimeCapsuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  partnerUser: User;
  coupleId?: string;
}

export const TimeCapsuleModal: React.FC<TimeCapsuleModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  partnerUser,
  coupleId = 'default_couple'
}) => {
  const storageKey = `mikayla_capsules_${coupleId}`;

  const [capsules, setCapsules] = useState<TimeCapsule[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) return JSON.parse(stored);
    } catch {}

    // Default sample capsule
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    return [
      {
        id: 'cap-1',
        title: 'À ouvrir pour nos prochains 6 mois ✨',
        secretMessage: 'Mon amour, si tu lis ceci, c’est que le temps a filé et mon amour pour toi n’a fait que grandir de jour en jour. Je t’aime infiniment ! ❤️',
        unlockDate: futureDate.toISOString(),
        isUnlocked: false,
        themeColor: '#fd79a8',
        createdAt: new Date().toISOString(),
        createdBy: currentUser.id
      }
    ];
  });

  const [now, setNow] = useState(Date.now());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCapsuleToView, setSelectedCapsuleToView] = useState<TimeCapsule | null>(null);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newSecretMessage, setNewSecretMessage] = useState('');
  const [newUnlockDate, setNewUnlockDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 16);
  });
  const [newImageBase64, setNewImageBase64] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);

  // Timer Tick
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync to storage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(capsules));
    } catch {}
  }, [capsules, storageKey]);

  if (!isOpen) return null;

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const blob = await compressImage(file, 1600, 0.85);
      const reader = new FileReader();
      reader.onload = () => {
        setNewImageBase64(typeof reader.result === 'string' ? reader.result : '');
        setIsCompressing(false);
      };
      reader.readAsDataURL(blob);
    } catch {
      setIsCompressing(false);
    }
  };

  const handleCreateCapsule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSecretMessage.trim() || !newUnlockDate) return;

    triggerHaptic(50);
    coupleVibrations.lovePulse();
    soundEffects.playMatchSound();

    const created: TimeCapsule = {
      id: `cap-${Date.now()}`,
      title: newTitle.trim(),
      secretMessage: newSecretMessage.trim(),
      mediaUrl: newImageBase64 || undefined,
      mediaType: newImageBase64 ? 'photo' : undefined,
      unlockDate: new Date(newUnlockDate).toISOString(),
      isUnlocked: false,
      themeColor: '#fd79a8',
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id
    };

    setCapsules(prev => [created, ...prev]);
    setIsCreateOpen(false);
    setNewTitle('');
    setNewSecretMessage('');
    setNewImageBase64('');
  };

  const handleOpenCapsule = (capsule: TimeCapsule) => {
    const unlockTime = new Date(capsule.unlockDate).getTime();
    const canUnlock = now >= unlockTime || capsule.isUnlocked;

    if (!canUnlock) {
      triggerHaptic([40, 40, 40]);
      return;
    }

    triggerHaptic(50);
    coupleVibrations.celebration();
    soundEffects.playMatchSound();

    if (!capsule.isUnlocked) {
      setCapsules(prev => prev.map(c => c.id === capsule.id ? { ...c, isUnlocked: true, unlockedAt: new Date().toISOString() } : c));
    }

    setSelectedCapsuleToView({ ...capsule, isUnlocked: true });
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(25);
    setCapsules(prev => prev.filter(c => c.id !== id));
  };

  const getCountdownString = (unlockDateStr: string) => {
    const diff = new Date(unlockDateStr).getTime() - now;
    if (diff <= 0) return 'Prêt à être ouvert ! 🎉';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    const secs = Math.floor((diff / 1000) % 60);

    if (days > 0) {
      return `${days}j ${hours}h ${mins}m ${secs}s`;
    }
    return `${hours}h ${mins}m ${secs}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-xl bg-[#17112d] border border-[#2d2254] rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#2d2254] flex items-center justify-between bg-[#1b1435]/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#ffeaa7] to-[#fd79a8] flex items-center justify-center text-[#130f26] shadow-lg">
              <Clock size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Capsule Temporelle</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#ffeaa7]/20 text-[#ffeaa7] font-semibold border border-[#ffeaa7]/30">
                  Secret Verrouillé
                </span>
              </h2>
              <p className="text-xs text-[#a29bfe]">Scellez un message ou une photo pour une date future</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                triggerHaptic(20);
                setIsCreateOpen(true);
              }}
              className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-[#ffeaa7] to-[#fd79a8] text-[#130f26] font-bold text-xs shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={15} />
              <span>Sceller</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#a29bfe] hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* List of Capsules */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {capsules.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 rounded-3xl bg-[#281e4b] flex items-center justify-center mx-auto mb-3 text-[#a29bfe]">
                <Lock size={28} />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Aucune capsule scellée</h3>
              <p className="text-xs text-[#a29bfe] max-w-sm mx-auto mb-4">
                Envoyez un mot d’amour dans le futur. Il restera scellé et secret jusqu’à la date que vous aurez choisie !
              </p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2 rounded-2xl bg-[#fd79a8] text-white font-semibold text-xs shadow-md hover:brightness-110 cursor-pointer"
              >
                Créer une capsule
              </button>
            </div>
          ) : (
            capsules.map((cap) => {
              const unlockTime = new Date(cap.unlockDate).getTime();
              const isReady = now >= unlockTime || cap.isUnlocked;
              const unlockFormatted = new Date(cap.unlockDate).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={cap.id}
                  onClick={() => handleOpenCapsule(cap)}
                  className={`p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden group shadow-xl ${
                    cap.isUnlocked
                      ? 'bg-[#1b1435] border-[#00b894]/40 hover:border-[#00b894]'
                      : isReady
                      ? 'bg-gradient-to-r from-[#2c1d4d] to-[#1f153a] border-[#fd79a8] shadow-[0_0_15px_rgba(253,121,168,0.2)] animate-pulse'
                      : 'bg-[#1b1435]/90 border-[#2d2254] hover:border-[#6c5ce7]/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                        cap.isUnlocked
                          ? 'bg-[#00b894]/20 text-[#55efc4] border border-[#00b894]/40'
                          : isReady
                          ? 'bg-[#fd79a8] text-white shadow-lg'
                          : 'bg-[#281e4b] text-[#a29bfe] border border-[#372863]'
                      }`}>
                        {cap.isUnlocked ? <Unlock size={22} /> : <Lock size={22} />}
                      </div>

                      <div>
                        <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                          <span>{cap.title}</span>
                          {cap.isUnlocked && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00b894]/20 text-[#55efc4] font-semibold">
                              Déverrouillée
                            </span>
                          )}
                        </h4>
                        
                        <p className="text-xs text-[#a29bfe] mt-0.5">
                          {cap.isUnlocked
                            ? 'Cliquez pour relire le trésor secret'
                            : `Déverrouillage prévu : ${unlockFormatted}`}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={e => handleDelete(cap.id, e)}
                      className="p-1.5 text-gray-400 hover:text-[#ff7675] rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Countdown Bar */}
                  {!cap.isUnlocked && (
                    <div className="mt-4 pt-3 border-t border-[#2d2254] flex items-center justify-between text-xs">
                      <span className="text-[#a29bfe] font-medium flex items-center gap-1.5">
                        <Clock size={13} className="text-[#ffeaa7]" />
                        <span>Temps restant :</span>
                      </span>
                      <span className={`font-mono font-bold ${
                        isReady ? 'text-[#55efc4]' : 'text-[#fd79a8]'
                      }`}>
                        {getCountdownString(cap.unlockDate)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal: View Unlocked Capsule */}
        {selectedCapsuleToView && (
          <div 
            onClick={() => setSelectedCapsuleToView(null)}
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-4 animate-in fade-in"
          >
            <div 
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-[#1b1435] border border-[#00b894]/40 rounded-3xl p-5 sm:p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#2d2254]">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-[#ffeaa7]" />
                  <h3 className="text-base font-bold text-white">{selectedCapsuleToView.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedCapsuleToView(null)}
                  className="p-1 text-[#a29bfe] hover:text-white rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {selectedCapsuleToView.mediaUrl && (
                <div className="rounded-2xl overflow-hidden border border-[#2d2254] max-h-60 bg-black/40">
                  <img
                    src={selectedCapsuleToView.mediaUrl}
                    alt="Photo de capsule"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-4 rounded-2xl bg-[#130f26] border border-[#2d2254] space-y-2">
                <p className="text-xs text-[#a29bfe] font-semibold uppercase tracking-wider">Message secret :</p>
                <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">
                  {selectedCapsuleToView.secretMessage}
                </p>
              </div>

              <div className="text-center pt-2">
                <button
                  onClick={() => setSelectedCapsuleToView(null)}
                  className="px-6 py-2.5 rounded-2xl bg-[#00b894] text-[#130f26] font-bold text-xs shadow-md hover:brightness-110 cursor-pointer"
                >
                  Refermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Create Capsule */}
        {isCreateOpen && (
          <div 
            onClick={() => setIsCreateOpen(false)}
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-4 animate-in fade-in"
          >
            <div 
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-[#1b1435] border border-[#2d2254] rounded-3xl p-5 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#2d2254]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Lock size={16} className="text-[#ffeaa7]" />
                  <span>Sceller une Capsule Temporelle</span>
                </h3>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1 text-[#a29bfe] hover:text-white rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateCapsule} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#a29bfe] mb-1">
                    Titre de la capsule *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Pour notre prochain anniversaire..."
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#130f26] border border-[#2d2254] text-white text-xs placeholder:text-[#a29bfe]/40 focus:outline-none focus:border-[#fd79a8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a29bfe] mb-1">
                    Date & Heure d'ouverture *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={newUnlockDate}
                    onChange={e => setNewUnlockDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-2xl bg-[#130f26] border border-[#2d2254] text-white text-xs focus:outline-none focus:border-[#fd79a8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a29bfe] mb-1">
                    Message Secret * (Invisible jusqu'à l'heure dite)
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Écrivez votre message secret pour le futur..."
                    value={newSecretMessage}
                    onChange={e => setNewSecretMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#130f26] border border-[#2d2254] text-white text-xs placeholder:text-[#a29bfe]/40 focus:outline-none focus:border-[#fd79a8] resize-none"
                  />
                </div>

                {/* Optional Photo */}
                <div>
                  <label className="block text-xs font-semibold text-[#a29bfe] mb-1">
                    Photo Secrète (optionnelle)
                  </label>
                  {newImageBase64 ? (
                    <div className="relative rounded-2xl overflow-hidden border border-[#2d2254] h-28 bg-black/40">
                      <img src={newImageBase64} alt="Aperçu" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setNewImageBase64('')}
                        className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-[#2d2254] hover:border-[#fd79a8] rounded-2xl p-3 flex flex-col items-center justify-center gap-1 text-center cursor-pointer transition-colors bg-[#130f26]/50">
                      <Camera size={18} className="text-[#a29bfe]" />
                      <span className="text-xs text-[#a29bfe]">
                        {isCompressing ? 'Optimisation...' : 'Ajouter une photo secrète'}
                      </span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
                    </label>
                  )}
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#ffeaa7] to-[#fd79a8] text-[#130f26] font-bold text-xs shadow-lg hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Lock size={15} />
                    <span>Sceller pour le futur</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
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
