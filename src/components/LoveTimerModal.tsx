import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Sparkles, 
  Calendar, 
  Clock, 
  Trophy, 
  Flame, 
  X, 
  Edit3, 
  Check, 
  Share2, 
  Gift, 
  PartyPopper 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { User } from '../types';
import { triggerHaptic } from '../utils/security';
import { soundEffects } from '../utils/audio';

interface LoveTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  partnerUser: User;
  onShareToChat?: (text: string) => void;
}

const STORAGE_KEY_START_DATE = 'mikayala_relationship_start_date';
const STORAGE_KEY_CUSTOM_NOTE = 'mikayala_love_timer_note';

export const LoveTimerModal: React.FC<LoveTimerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  partnerUser,
  onShareToChat
}) => {
  const [startDateStr, setStartDateStr] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_START_DATE) || '2024-01-01';
  });
  const [customNote, setCustomNote] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_CUSTOM_NOTE) || 'Chaque seconde à tes côtés est un trésor ✨';
  });
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [tempDate, setTempDate] = useState(startDateStr);
  const [tempNote, setTempNote] = useState(customNote);

  // Time elapsed state
  const [timeElapsed, setTimeElapsed] = useState({
    totalDays: 0,
    years: 0,
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const calculateTime = () => {
      const start = new Date(startDateStr).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, now - start);

      const totalDays = Math.floor(diff / (1000 * 60 * 60 * 24));
      const years = Math.floor(totalDays / 365.25);
      const remainingDaysAfterYears = totalDays - Math.floor(years * 365.25);
      const months = Math.floor(remainingDaysAfterYears / 30.44);
      const days = Math.floor(remainingDaysAfterYears % 30.44);

      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeElapsed({
        totalDays,
        years,
        months,
        days,
        hours,
        minutes,
        seconds
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [startDateStr]);

  if (!isOpen) return null;

  const handleSaveDate = () => {
    setStartDateStr(tempDate);
    setCustomNote(tempNote);
    localStorage.setItem(STORAGE_KEY_START_DATE, tempDate);
    localStorage.setItem(STORAGE_KEY_CUSTOM_NOTE, tempNote);
    setIsEditingDate(false);
    triggerHaptic([50, 50, 80]);
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
  };

  const handleShare = () => {
    triggerHaptic(30);
    soundEffects.playSent();
    const shareText = `⏳💖 *Notre Love Timer* (${currentUser.name} & ${partnerUser.name})\n` +
      `📅 Ensemble depuis le : ${new Date(startDateStr).toLocaleDateString('fr-FR')}\n` +
      `✨ Soit exactement : *${timeElapsed.totalDays} jours* d'amour (${timeElapsed.years > 0 ? `${timeElapsed.years} ans, ` : ''}${timeElapsed.months} mois et ${timeElapsed.days} jours) !\n` +
      `💌 "${customNote}"`;
    
    if (onShareToChat) {
      onShareToChat(shareText);
    }
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.7 } });
  };

  // Milestones
  const milestones = [
    { days: 100, label: '100 Jours de complicité' },
    { days: 182, label: '6 Mois d\'amour' },
    { days: 365, label: '1er Anniversaire (1 an)' },
    { days: 500, label: '500 Jours de bonheur' },
    { days: 730, label: '2 Ans ensemble' },
    { days: 1000, label: '1 000 Jours d\'aventures' },
    { days: 1825, label: '5 Ans d\'Amour Éternel' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#1b1435] border border-[#2d2254] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#171230] to-[#251948] border-b border-[#2d2254] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-[#fd79a8]/20 border border-[#fd79a8]/30 text-[#fd79a8]">
              <Heart size={20} className="fill-[#fd79a8] animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#f1f2f6] flex items-center gap-1.5">
                Love Timer & Compteur de Couple
              </h3>
              <p className="text-[11px] text-[#a29bfe]">
                {currentUser.name} & {partnerUser.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsEditingDate(!isEditingDate)}
              className="p-2 text-[#a29bfe] hover:text-[#55efc4] rounded-xl hover:bg-[#281e4b] transition-colors cursor-pointer"
              title="Modifier la date de début"
            >
              <Edit3 size={17} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#a29bfe] hover:text-white rounded-xl hover:bg-[#281e4b] transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {/* Edit Date Form */}
          {isEditingDate && (
            <div className="p-4 rounded-2xl bg-[#130f26] border border-[#372863] space-y-3 animate-in fade-in duration-150">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#55efc4]">
                Définir votre date de rencontre
              </h4>
              <div>
                <label className="text-[11px] text-[#a29bfe] block mb-1">Date de début de relation</label>
                <input
                  type="date"
                  value={tempDate}
                  onChange={(e) => setTempDate(e.target.value)}
                  className="w-full bg-[#1b1435] border border-[#2d2254] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#55efc4]"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#a29bfe] block mb-1">Phrase ou devise de couple</label>
                <input
                  type="text"
                  value={tempNote}
                  onChange={(e) => setTempNote(e.target.value)}
                  placeholder="Ex: Main dans la main pour toujours..."
                  className="w-full bg-[#1b1435] border border-[#2d2254] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#55efc4]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setIsEditingDate(false)}
                  className="px-3 py-1.5 text-xs text-[#a29bfe] hover:text-white"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveDate}
                  className="px-4 py-1.5 text-xs font-bold bg-[#00b894] hover:bg-[#00a884] text-[#130f26] rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Check size={14} />
                  <span>Enregistrer</span>
                </button>
              </div>
            </div>
          )}

          {/* Hero Counter Card */}
          <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-[#2d1b4e] via-[#1e133c] to-[#120c24] border border-[#fd79a8]/30 shadow-xl text-center">
            <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
              <Heart size={140} className="fill-[#fd79a8]" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fd79a8]/20 border border-[#fd79a8]/40 text-[#fd79a8] text-xs font-extrabold mb-3">
              <Sparkles size={12} />
              <span>Ensemble depuis</span>
            </div>

            <div className="flex items-baseline justify-center gap-2 my-2">
              <span className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#ffeaa7] via-[#fd79a8] to-[#55efc4] tracking-tight">
                {timeElapsed.totalDays}
              </span>
              <span className="text-xl sm:text-2xl font-bold text-[#f1f2f6]">Jours</span>
            </div>

            {/* Live HMS ticker */}
            <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-[#372863]/60">
              <div className="bg-[#130f26]/80 backdrop-blur-sm rounded-xl p-2 border border-[#2d2254]">
                <span className="block text-lg font-bold text-[#55efc4]">{timeElapsed.hours}</span>
                <span className="text-[10px] text-[#a29bfe]">Heures</span>
              </div>
              <div className="bg-[#130f26]/80 backdrop-blur-sm rounded-xl p-2 border border-[#2d2254]">
                <span className="block text-lg font-bold text-[#ffeaa7]">{timeElapsed.minutes}</span>
                <span className="text-[10px] text-[#a29bfe]">Minutes</span>
              </div>
              <div className="bg-[#130f26]/80 backdrop-blur-sm rounded-xl p-2 border border-[#2d2254]">
                <span className="block text-lg font-bold text-[#ff7675]">{timeElapsed.seconds}</span>
                <span className="text-[10px] text-[#a29bfe]">Secondes</span>
              </div>
              <div className="bg-[#130f26]/80 backdrop-blur-sm rounded-xl p-2 border border-[#2d2254]">
                <span className="block text-lg font-bold text-[#a29bfe]">{timeElapsed.months}m {timeElapsed.days}j</span>
                <span className="text-[10px] text-[#a29bfe]">Mois & j</span>
              </div>
            </div>

            <p className="text-xs italic text-[#a29bfe]/90 mt-4 px-2">
              "{customNote}"
            </p>
          </div>

          {/* Key Milestones Progress */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#a29bfe] flex items-center gap-1.5">
                <Trophy size={14} className="text-[#ffeaa7]" />
                <span>Jalons & Anniversaires</span>
              </h4>
              <span className="text-[10px] text-[#55efc4]">
                Début : {new Date(startDateStr).toLocaleDateString('fr-FR')}
              </span>
            </div>

            <div className="space-y-2.5">
              {milestones.map((m, idx) => {
                const isPassed = timeElapsed.totalDays >= m.days;
                const progress = Math.min(100, Math.round((timeElapsed.totalDays / m.days) * 100));
                const remaining = Math.max(0, m.days - timeElapsed.totalDays);

                return (
                  <div 
                    key={idx}
                    className={`p-3 rounded-2xl border transition-all ${
                      isPassed 
                        ? 'bg-[#00b894]/10 border-[#00b894]/30' 
                        : 'bg-[#130f26] border-[#2d2254]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        {isPassed ? (
                          <div className="w-5 h-5 rounded-full bg-[#00b894] text-[#130f26] flex items-center justify-center font-bold text-[10px]">
                            ✓
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-[#2d2254] text-[#a29bfe] flex items-center justify-center font-bold text-[10px]">
                            {idx + 1}
                          </div>
                        )}
                        <span className={`font-semibold ${isPassed ? 'text-[#55efc4]' : 'text-[#f1f2f6]'}`}>
                          {m.label}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-[#a29bfe]">
                        {isPassed ? 'Atteint ! 🎉' : `Dans ${remaining} jours`}
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-[#1b1435] rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isPassed ? 'bg-[#00b894]' : 'bg-gradient-to-r from-[#6c5ce7] to-[#fd79a8]'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#130f26] border-t border-[#2d2254] flex items-center justify-between">
          <div className="flex items-center gap-1 text-[11px] text-[#a29bfe]">
            <Sparkles size={13} className="text-[#ffeaa7]" />
            <span>Mis à jour en temps réel</span>
          </div>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 bg-[#fd79a8] hover:bg-[#e84393] text-[#130f26] font-bold text-xs px-4 py-2.5 rounded-xl transition-all active:scale-95 shadow-lg cursor-pointer"
          >
            <Share2 size={15} />
            <span>Partager dans le Chat</span>
          </button>
        </div>

      </div>
    </div>
  );
};
