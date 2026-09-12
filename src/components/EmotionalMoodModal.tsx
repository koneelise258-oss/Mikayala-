import React, { useState, useEffect } from 'react';
import { 
  X, Heart, Sparkles, Send, CloudSun, Moon, Sun, 
  Smile, Coffee, Flame, Shield, Check, Bell
} from 'lucide-react';
import { User, EmotionalMood, MoodEmojiType } from '../types';
import { triggerHaptic, coupleVibrations } from '../utils/security';
import { soundEffects } from '../utils/audio';

interface EmotionalMoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  partnerUser: User;
  coupleId?: string;
  onSendInstantHug?: () => void;
}

const MOODS: { id: MoodEmojiType; label: string; emoji: string; icon: any; color: string; bgGradient: string }[] = [
  { id: 'in_love', label: 'Super Amoureux(se)', emoji: '💕', icon: Heart, color: 'text-[#fd79a8]', bgGradient: 'from-[#fd79a8]/20 to-[#e84393]/20' },
  { id: 'cuddle', label: 'En manque de câlins', emoji: '🥰', icon: Smile, color: 'text-[#ffeaa7]', bgGradient: 'from-[#ffeaa7]/20 to-[#fdcb6e]/20' },
  { id: 'miss_you', label: 'Tu me manques', emoji: '💭', icon: CloudSun, color: 'text-[#a29bfe]', bgGradient: 'from-[#a29bfe]/20 to-[#6c5ce7]/20' },
  { id: 'flirty', label: 'Espiègle & Séducteur', emoji: '🔥', icon: Flame, color: 'text-[#ff7675]', bgGradient: 'from-[#ff7675]/20 to-[#d63031]/20' },
  { id: 'energized', label: 'Plein(e) d’énergie', emoji: '⚡', icon: Sun, color: 'text-[#55efc4]', bgGradient: 'from-[#55efc4]/20 to-[#00b894]/20' },
  { id: 'tired', label: 'Fatigué(e) / Épuisé(e)', emoji: '😴', icon: Moon, color: 'text-[#74b9ff]', bgGradient: 'from-[#74b9ff]/20 to-[#0984e3]/20' },
  { id: 'sad_comfort', label: 'Besoin de réconfort', emoji: '🥺', icon: Shield, color: 'text-[#fab1a0]', bgGradient: 'from-[#fab1a0]/20 to-[#e17055]/20' },
  { id: 'peaceful', label: 'Zen & Serein(e)', emoji: '🧘', icon: Coffee, color: 'text-[#00cec9]', bgGradient: 'from-[#00cec9]/20 to-[#81ecec]/20' }
];

export const EmotionalMoodModal: React.FC<EmotionalMoodModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  partnerUser,
  coupleId = 'default_couple',
  onSendInstantHug
}) => {
  const myStorageKey = `mikayla_mood_${currentUser.id}`;
  const partnerStorageKey = `mikayla_mood_${partnerUser.id}`;

  const [myMood, setMyMood] = useState<EmotionalMood>(() => {
    try {
      const stored = localStorage.getItem(myStorageKey);
      if (stored) return JSON.parse(stored);
    } catch {}
    return {
      userId: currentUser.id,
      mood: 'in_love',
      label: 'Super Amoureux(se)',
      note: 'Plein(e) de pensées pour toi !',
      intensity: 5,
      updatedAt: new Date().toISOString()
    };
  });

  const [partnerMood, setPartnerMood] = useState<EmotionalMood | null>(() => {
    try {
      const stored = localStorage.getItem(partnerStorageKey);
      if (stored) return JSON.parse(stored);
    } catch {}
    return {
      userId: partnerUser.id,
      mood: 'cuddle',
      label: 'En manque de câlins',
      note: 'Hâte de te retrouver ❤️',
      intensity: 4,
      updatedAt: new Date().toISOString()
    };
  });

  const [selectedMoodId, setSelectedMoodId] = useState<MoodEmojiType>(myMood.mood);
  const [intensity, setIntensity] = useState<1 | 2 | 3 | 4 | 5>(myMood.intensity);
  const [noteText, setNoteText] = useState(myMood.note || '');
  const [isSavedRecently, setIsSavedRecently] = useState(false);
  const [hugSent, setHugSent] = useState(false);

  if (!isOpen) return null;

  const handleSaveMood = () => {
    triggerHaptic(40);
    coupleVibrations.lovePulse();
    soundEffects.playTap();

    const selectedObj = MOODS.find(m => m.id === selectedMoodId) || MOODS[0];
    const updated: EmotionalMood = {
      userId: currentUser.id,
      mood: selectedMoodId,
      label: selectedObj.label,
      note: noteText.trim() || undefined,
      intensity,
      updatedAt: new Date().toISOString()
    };

    setMyMood(updated);
    try {
      localStorage.setItem(myStorageKey, JSON.stringify(updated));
    } catch {}

    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 2500);
  };

  const handleSendHug = () => {
    triggerHaptic([100, 60, 200, 80, 300]);
    coupleVibrations.heartbeat();
    soundEffects.playHeartbeat();
    setHugSent(true);
    if (onSendInstantHug) {
      onSendInstantHug();
    }
    setTimeout(() => setHugSent(false), 3000);
  };

  const partnerMoodObj = MOODS.find(m => m.id === partnerMood?.mood) || MOODS[1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-[#17112d] border border-[#2d2254] rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#2d2254] flex items-center justify-between bg-[#1b1435]/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#fd79a8] to-[#fdcb6e] flex items-center justify-center text-[#130f26] shadow-lg">
              <CloudSun size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Météo Émotionnelle</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#fd79a8]/20 text-[#fd79a8] font-semibold border border-[#fd79a8]/30">
                  Humeur du Jour
                </span>
              </h2>
              <p className="text-xs text-[#a29bfe]">Partagez votre état d’esprit en direct avec votre moitié</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#a29bfe] hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          
          {/* Partner Current Mood Card */}
          {partnerMood && (
            <div className={`p-4 sm:p-5 rounded-3xl border border-[#372863] bg-gradient-to-r ${partnerMoodObj.bgGradient} relative overflow-hidden shadow-xl space-y-3`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src={partnerUser.avatar}
                    alt={partnerUser.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-[#fd79a8]"
                  />
                  <div>
                    <h3 className="text-xs font-bold text-[#f1f2f6]">
                      Météo de {partnerUser.name.split(' ')[0]} :
                    </h3>
                    <p className="text-sm font-extrabold text-white flex items-center gap-1.5">
                      <span>{partnerMoodObj.emoji}</span>
                      <span>{partnerMoodObj.label}</span>
                    </p>
                  </div>
                </div>

                {/* Intensity */}
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <Heart
                      key={lvl}
                      size={13}
                      className={lvl <= partnerMood.intensity ? 'text-[#fd79a8] fill-[#fd79a8]' : 'text-gray-600'}
                    />
                  ))}
                </div>
              </div>

              {partnerMood.note && (
                <p className="text-xs text-[#f1f2f6]/90 italic bg-black/30 p-2.5 rounded-2xl border border-white/10">
                  « {partnerMood.note} »
                </p>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-[#a29bfe]">
                  Mis à jour aujourd'hui
                </span>
                
                <button
                  onClick={handleSendHug}
                  className={`px-3 py-1.5 rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
                    hugSent
                      ? 'bg-[#00b894] text-[#130f26]'
                      : 'bg-white/20 hover:bg-white/30 text-white border border-white/20'
                  }`}
                >
                  <Heart size={14} className={hugSent ? 'fill-[#130f26]' : 'fill-white'} />
                  <span>{hugSent ? 'Câlin transmis ! ❤️' : 'Lui envoyer un câlin'}</span>
                </button>
              </div>
            </div>
          )}

          {/* My Mood Selector */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#a29bfe] flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#ffeaa7]" />
              <span>Votre Météo Actuelle</span>
            </h3>

            {/* Grid of Mood Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {MOODS.map(mood => {
                const isSelected = selectedMoodId === mood.id;
                return (
                  <button
                    key={mood.id}
                    onClick={() => {
                      triggerHaptic(20);
                      setSelectedMoodId(mood.id);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col items-center text-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-[#6c5ce7]/30 border-[#fd79a8] shadow-[0_0_12px_rgba(253,121,168,0.3)]'
                        : 'bg-[#1b1435] border-[#2d2254] hover:border-[#6c5ce7]/40 text-[#a29bfe]'
                    }`}
                  >
                    <span className="text-2xl">{mood.emoji}</span>
                    <span className={`text-[11px] font-bold ${isSelected ? 'text-white' : 'text-[#a29bfe]'}`}>
                      {mood.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Intensity Slider */}
            <div className="p-3.5 rounded-2xl bg-[#1b1435] border border-[#2d2254] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#a29bfe] font-semibold">Intensité émotionnelle :</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(lvl => (
                    <Heart
                      key={lvl}
                      size={15}
                      className={lvl <= intensity ? 'text-[#fd79a8] fill-[#fd79a8]' : 'text-gray-600'}
                    />
                  ))}
                </div>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={intensity}
                onChange={e => setIntensity(Number(e.target.value) as any)}
                className="w-full accent-[#fd79a8] cursor-pointer"
              />
            </div>

            {/* Note text */}
            <div>
              <label className="block text-xs font-semibold text-[#a29bfe] mb-1">
                Petite note pour votre moitié (optionnelle)
              </label>
              <input
                type="text"
                placeholder="Ex: Hâte de te serrer dans mes bras..."
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#130f26] border border-[#2d2254] text-white text-xs placeholder:text-[#a29bfe]/40 focus:outline-none focus:border-[#fd79a8]"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveMood}
              className={`w-full py-3.5 rounded-2xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isSavedRecently
                  ? 'bg-[#00b894] text-[#130f26]'
                  : 'bg-gradient-to-r from-[#fd79a8] to-[#6c5ce7] text-white hover:brightness-110 active:scale-98'
              }`}
            >
              {isSavedRecently ? (
                <>
                  <Check size={16} />
                  <span>Météo mise à jour & transmise ! ❤️</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>Mettre à jour ma météo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
