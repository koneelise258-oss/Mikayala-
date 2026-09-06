import React, { useState, useEffect, useMemo } from 'react';
import { 
  Heart, 
  Sparkles, 
  Moon, 
  Sun, 
  Coffee, 
  Smile, 
  Zap, 
  X, 
  Calendar as CalendarIcon, 
  Gift, 
  Info,
  Send,
  HeartHandshake,
  ChevronLeft,
  ChevronRight,
  Settings,
  Bell,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Thermometer,
  Droplets,
  CalendarCheck,
  RotateCcw
} from 'lucide-react';
import { CycleData, User, CyclePhase, MenstrualFlow, DailySymptomLog, CycleHistoryItem } from '../types';
import { cycleService } from '../services/cycleService';
import { triggerHaptic } from '../utils/security';
import { soundEffects } from '../utils/audio';

interface CycleCareModalProps {
  isOpen: boolean;
  onClose: () => void;
  cycleData: CycleData;
  currentUser: User;
  partnerUser: User;
  coupleId?: string;
  onUpdateCycleData: (data: Partial<CycleData>) => void;
  onShareCareToChat: (text: string) => void;
}

const PHASE_CONFIG: Record<CyclePhase, {
  label: string;
  color: string;
  badgeBg: string;
  emoji: string;
  shortDesc: string;
  fullDesc: string;
  partnerAdvice: string;
  partnerGiftIdea: string;
}> = {
  menstruelle: {
    label: 'Phase Menstruelle',
    color: '#ff7675',
    badgeBg: 'bg-[#ff7675]/20 text-[#ff7675] border-[#ff7675]/40',
    emoji: '🌸',
    shortDesc: 'Règles en cours - Chaleur & repos',
    fullDesc: 'Le corps élimine l’endomètre. Moment clé pour ralentir, rester au chaud et écouter ses besoins.',
    partnerAdvice: 'Prépare-lui une bouillotte chaude, une tisane douce et propose un massage doux des pieds ou du dos sans rien demander en retour.',
    partnerGiftIdea: 'Tisane bio réconfortante & bouillotte moelleuse'
  },
  folliculaire: {
    label: 'Phase Folliculaire',
    color: '#55efc4',
    badgeBg: 'bg-[#00b894]/20 text-[#55efc4] border-[#00b894]/40',
    emoji: '🌱',
    shortDesc: 'Montée d’énergie & renouveau',
    fullDesc: 'La maturation des follicules et la hausse des œstrogènes boostent la créativité, l’optimisme et l’énergie.',
    partnerAdvice: 'Super moment pour organiser une sortie dynamique, tester un nouveau restaurant ou planifier vos prochaines vacances à deux.',
    partnerGiftIdea: 'Sortie imprévue en amoureux ou balade au grand air'
  },
  ovulatoire: {
    label: 'Phase Ovulatoire',
    color: '#0984e3',
    badgeBg: 'bg-[#0984e3]/20 text-[#74b9ff] border-[#0984e3]/40',
    emoji: '✨',
    shortDesc: 'Pic de fertilité & sensualité',
    fullDesc: 'Libération de l’ovocyte. Rayonnement maximal, confiance en soi au sommet et libido élevée.',
    partnerAdvice: 'Elle est au sommet de son magnétisme ! Idéal pour sortir le grand jeu : lingerie, dîner romantique, mots doux et passion partagée.',
    partnerGiftIdea: 'Dîner aux chandelles, compliment sincère et lingerie délicate'
  },
  luteale: {
    label: 'Phase Lutéale',
    color: '#a29bfe',
    badgeBg: 'bg-[#a29bfe]/20 text-[#d63031] border-[#a29bfe]/40',
    emoji: '🌙',
    shortDesc: 'Sensibilité accrue & SPM doux',
    fullDesc: 'Après l’ovulation, la progestérone grimpe puis décroît. Sensibilité émotionnelle, besoin de cocon et de douceur.',
    partnerAdvice: 'Sois à l’écoute avec patience. Une friandise préférée, un câlin prolongé et lui éviter les sources de stress feront des merveilles.',
    partnerGiftIdea: 'Chocolat chaud onctueux, friandise préférée & câlin prolongé'
  }
};

const SYMPTOMS_LIST = [
  { id: 'crampes', label: 'Crampes / Douleurs bas-ventre', emoji: '⚡' },
  { id: 'maux_de_tete', label: 'Maux de tête', emoji: '🤕' },
  { id: 'fatigue', label: 'Fatigue intense', emoji: '😴' },
  { id: 'ballonnements', label: 'Ballonnements', emoji: '🎈' },
  { id: 'acne', label: 'Peau sensible / Acné', emoji: '✨' },
  { id: 'seins_sensibles', label: 'Seins sensibles', emoji: '🌸' },
  { id: 'dos', label: 'Douleurs lombaires', emoji: '🩹' },
  { id: 'nausees', label: 'Nausées', emoji: '🤢' }
];

const MOODS_LIST = [
  { id: 'joyeuse', label: 'Rayonnante & Joyeuse', emoji: '✨' },
  { id: 'caline', label: 'Câline & Douce', emoji: '🧸' },
  { id: 'sensible', label: 'Émotive & Sensible', emoji: '🥺' },
  { id: 'fatiguee', label: 'Besoin de repos', emoji: '💤' },
  { id: 'passionnee', label: 'Passionnée & Amoureuse', emoji: '🔥' },
  { id: 'calme', label: 'Zen & Paisible', emoji: '🌿' },
  { id: 'irritable', label: 'Irritée / Stressée', emoji: '⚡' }
];

export const CycleCareModal: React.FC<CycleCareModalProps> = ({
  isOpen,
  onClose,
  cycleData,
  currentUser,
  partnerUser,
  coupleId = 'local_couple',
  onUpdateCycleData,
  onShareCareToChat
}) => {
  // Navigation Tabs: 'dashboard' | 'calendar' | 'symptoms' | 'settings'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'symptoms' | 'settings'>('dashboard');

  // Interactive Calendar View Month Offset
  const [calendarOffset, setCalendarOffset] = useState(0);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Real-time synchronization
  useEffect(() => {
    if (!isOpen) return;

    cycleService.setup(coupleId, currentUser.id, (incoming) => {
      onUpdateCycleData(incoming);
      soundEffects.playReceived();
      triggerHaptic(30);
    });

    return () => {
      cycleService.cleanup();
    };
  }, [isOpen, coupleId, currentUser.id]);

  // Settings State Form
  const [inputLastStartDate, setInputLastStartDate] = useState(cycleData.lastPeriodStartDate || new Date().toISOString().split('T')[0]);
  const [inputCycleLength, setInputCycleLength] = useState(cycleData.cycleLength || 28);
  const [inputPeriodLength, setInputPeriodLength] = useState(cycleData.periodLength || 5);

  // Daily Log State
  const [selectedFlow, setSelectedFlow] = useState<MenstrualFlow>(cycleData.flow || 'none');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(cycleData.selectedSymptoms || []);
  const [selectedMood, setSelectedMood] = useState<string>(cycleData.mood || 'joyeuse');
  const [selectedEnergy, setSelectedEnergy] = useState<number>(cycleData.energyLevel || 3);
  const [dailyBbt, setDailyBbt] = useState<string>('36.6');
  const [dailyNotes, setDailyNotes] = useState<string>('');
  const [isSavedBannerVisible, setIsSavedBannerVisible] = useState(false);

  // Compute live smart prediction
  const prediction = useMemo(() => {
    return cycleService.calculatePredictions(
      inputLastStartDate,
      inputCycleLength,
      inputPeriodLength,
      cycleData.history || []
    );
  }, [inputLastStartDate, inputCycleLength, inputPeriodLength, cycleData.history]);

  const currentPhaseConfig = PHASE_CONFIG[prediction.currentPhase];
  const smartNotifications = useMemo(() => {
    return cycleService.generateSmartNotifications(prediction);
  }, [prediction]);

  // Load existing log when calendar date is clicked
  useEffect(() => {
    if (cycleData.dailyLogs && cycleData.dailyLogs[selectedCalendarDate]) {
      const log = cycleData.dailyLogs[selectedCalendarDate];
      setSelectedFlow(log.flow || 'none');
      setSelectedSymptoms(log.symptoms || []);
      setSelectedEnergy(log.energyLevel || 3);
      if (log.moods && log.moods.length > 0) {
        setSelectedMood(log.moods[0]);
      }
      if (log.bbt) {
        setDailyBbt(String(log.bbt));
      }
      setDailyNotes(log.notes || '');
    } else {
      setSelectedFlow('none');
      setSelectedSymptoms([]);
      setDailyNotes('');
    }
  }, [selectedCalendarDate, cycleData.dailyLogs]);

  if (!isOpen) return null;

  // Save Settings
  const handleSaveSettings = async () => {
    triggerHaptic(40);
    soundEffects.playTap();

    const updatedData: CycleData = {
      ...cycleData,
      lastPeriodStartDate: inputLastStartDate,
      cycleLength: Number(inputCycleLength),
      periodLength: Number(inputPeriodLength)
    };

    const saved = await cycleService.saveCycleData(currentUser.id, coupleId, updatedData);
    onUpdateCycleData(saved);
    setIsSavedBannerVisible(true);
    setTimeout(() => setIsSavedBannerVisible(false), 3000);
    setActiveTab('dashboard');
  };

  // Save Daily Symptom Log
  const handleSaveDailyLog = async () => {
    triggerHaptic(40);
    soundEffects.playTap();

    const currentLogs = { ...(cycleData.dailyLogs || {}) };
    const logItem: DailySymptomLog = {
      date: selectedCalendarDate,
      flow: selectedFlow,
      symptoms: selectedSymptoms,
      moods: [selectedMood],
      energyLevel: selectedEnergy,
      bbt: parseFloat(dailyBbt) || 36.6,
      notes: dailyNotes
    };
    currentLogs[selectedCalendarDate] = logItem;

    const updatedData: CycleData = {
      ...cycleData,
      dailyLogs: currentLogs,
      flow: selectedFlow,
      selectedSymptoms: selectedSymptoms,
      mood: selectedMood as any,
      energyLevel: selectedEnergy
    };

    const saved = await cycleService.saveCycleData(currentUser.id, coupleId, updatedData);
    onUpdateCycleData(saved);
    setIsSavedBannerVisible(true);
    setTimeout(() => setIsSavedBannerVisible(false), 2500);
  };

  const toggleSymptom = (symId: string) => {
    triggerHaptic(20);
    if (selectedSymptoms.includes(symId)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== symId));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symId]);
    }
  };

  // Generate Month Days Grid for Interactive Calendar
  const calendarDays = () => {
    const now = new Date();
    const targetMonth = new Date(now.getFullYear(), now.getMonth() + calendarOffset, 1);
    const year = targetMonth.getFullYear();
    const month = targetMonth.getMonth();

    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(year, month, d);
      const iso = dateObj.toISOString().split('T')[0];
      const classification = cycleService.getDayClassification(
        dateObj,
        inputLastStartDate,
        inputCycleLength,
        inputPeriodLength
      );
      days.push({
        dayNumber: d,
        dateIso: iso,
        dateObj,
        classification,
        isToday: dateObj.toDateString() === new Date().toDateString(),
        hasLog: Boolean(cycleData.dailyLogs && cycleData.dailyLogs[iso])
      });
    }
    return { days, monthName: targetMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) };
  };

  const { days: monthDays, monthName } = calendarDays();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0714]/90 backdrop-blur-md p-2 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#171230] border border-[#2d2254] rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* HEADER */}
        <div className="h-[68px] bg-[#1f1742] px-5 flex items-center justify-between border-b border-[#2d2254] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#ff7675] via-[#fd79a8] to-[#00b894] flex items-center justify-center shadow-[0_0_15px_rgba(253,121,168,0.35)]">
              <HeartHandshake size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#f1f2f6]">Cycle Menstruel & Soin Complice</h2>
              <p className="text-xs text-[#a29bfe]">Calcul intelligent style Flo & attentions bienveillantes</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#a29bfe] hover:text-white rounded-full hover:bg-[#281e4b] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex items-center justify-around bg-[#130f26] border-b border-[#2d2254] p-1.5 text-xs font-semibold shrink-0">
          {[
            { id: 'dashboard', label: 'Aperçu & Conseils', icon: Sparkles },
            { id: 'calendar', label: 'Calendrier Flo', icon: CalendarIcon },
            { id: 'symptoms', label: 'Symptômes & Flux', icon: Droplets },
            { id: 'settings', label: 'Paramètres & Calcul', icon: Settings },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  triggerHaptic(20);
                }}
                className={`flex items-center gap-1.5 py-2 px-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-[#6c5ce7] text-white font-bold shadow-md' 
                    : 'text-[#a29bfe] hover:text-white hover:bg-[#1b1435]'
                }`}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* SAVED BANNER */}
        {isSavedBannerVisible && (
          <div className="bg-[#00b894] text-[#130f26] px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 animate-in slide-in-from-top">
            <CheckCircle2 size={16} />
            Données du cycle synchronisées et prédictions actualisées !
          </div>
        )}

        {/* MAIN BODY CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* TAB 1 : DASHBOARD / APERÇU */}
          {activeTab === 'dashboard' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* SMART CYCLE CIRCLE CARD */}
              <div className="bg-gradient-to-br from-[#20183e] via-[#171230] to-[#120e29] border border-[#372863] rounded-3xl p-5 text-center relative overflow-hidden shadow-xl">
                {/* Visual Ring Header */}
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-3xl">{currentPhaseConfig.emoji}</span>
                  <div className="text-left">
                    <span className="text-[11px] uppercase tracking-widest font-extrabold text-[#55efc4] block">
                      Jour {prediction.currentCycleDay} du Cycle (Sur {inputCycleLength}j)
                    </span>
                    <span className="text-xs text-[#a29bfe]">{currentPhaseConfig.shortDesc}</span>
                  </div>
                </div>

                <h3 className="text-2xl font-extrabold text-white mt-2 mb-1" style={{ color: currentPhaseConfig.color }}>
                  {currentPhaseConfig.label}
                </h3>
                <p className="text-xs text-[#dfe6e9] max-w-md mx-auto leading-relaxed mb-4">
                  {currentPhaseConfig.fullDesc}
                </p>

                {/* Progress Bar through 28 days */}
                <div className="w-full bg-[#130f26] h-3 rounded-full overflow-hidden border border-[#2d2254] p-0.5 mb-4">
                  <div 
                    className="h-full rounded-full transition-all duration-500 shadow-lg"
                    style={{ 
                      width: `${Math.min(100, Math.round((prediction.currentCycleDay / inputCycleLength) * 100))}%`,
                      backgroundColor: currentPhaseConfig.color
                    }}
                  />
                </div>

                {/* Quick Indicators Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-[#130f26]/80 p-2.5 rounded-2xl border border-[#2d2254]">
                    <span className="text-[10px] text-[#a29bfe] block">Prochaines règles</span>
                    <span className="font-extrabold text-[#ff7675]">
                      {prediction.daysUntilNextPeriod === 0 ? "Aujourd'hui" : `Dans ${prediction.daysUntilNextPeriod}j`}
                    </span>
                  </div>

                  <div className="bg-[#130f26]/80 p-2.5 rounded-2xl border border-[#2d2254]">
                    <span className="text-[10px] text-[#a29bfe] block">Ovulation estimée</span>
                    <span className="font-extrabold text-[#0984e3]">
                      {prediction.isOvulationToday ? "Aujourd'hui ✨" : `Dans ${prediction.daysUntilOvulation}j`}
                    </span>
                  </div>

                  <div className="bg-[#130f26]/80 p-2.5 rounded-2xl border border-[#2d2254]">
                    <span className="text-[10px] text-[#a29bfe] block">Fenêtre fertile</span>
                    <span className="font-extrabold text-[#55efc4]">
                      {prediction.isFertileToday ? 'En cours 🟢' : 'Non active'}
                    </span>
                  </div>

                  <div className="bg-[#130f26]/80 p-2.5 rounded-2xl border border-[#2d2254]">
                    <span className="text-[10px] text-[#a29bfe] block">Chances fertilité</span>
                    <span className="font-extrabold text-white capitalize">
                      {prediction.conceptionChance}
                    </span>
                  </div>
                </div>
              </div>

              {/* SMART NOTIFICATIONS LIST */}
              {smartNotifications.length > 0 && (
                <div className="bg-[#1e173e] border border-[#6c5ce7]/40 rounded-2xl p-3.5 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#a29bfe]">
                    <Bell size={14} className="text-[#fd79a8]" />
                    <span>Rappels & Alertes Intelligents</span>
                  </div>
                  {smartNotifications.map((notif, idx) => (
                    <p key={idx} className="text-xs text-[#f1f2f6] bg-[#130f26] p-2.5 rounded-xl border border-[#2d2254]">
                      {notif}
                    </p>
                  ))}
                </div>
              )}

              {/* PARTNER CARE ADVICE & ONE-CLICK SHARE */}
              <div className="bg-[#1e173e] border border-[#00b894]/50 rounded-2xl p-4 shadow-[0_0_20px_rgba(0,184,148,0.12)]">
                <div className="flex items-center gap-2 text-xs font-bold text-[#55efc4] mb-2">
                  <Heart size={15} className="text-[#00b894]" />
                  <span>Guide Soin & Attentions pour {partnerUser.name}</span>
                </div>
                
                <p className="text-xs text-[#f1f2f6] leading-relaxed bg-[#130f26] p-3 rounded-xl border border-[#2d2254] mb-3">
                  {currentPhaseConfig.partnerAdvice}
                </p>

                <div className="flex items-center gap-2 text-[11px] text-[#a29bfe] mb-3">
                  <Gift size={14} className="text-[#fd79a8]" />
                  <span>Idée cadeau / attention : <strong className="text-white">{currentPhaseConfig.partnerGiftIdea}</strong></span>
                </div>

                <button
                  onClick={() => {
                    const advice = cycleService.getPartnerCareAdvice(prediction.currentPhase, prediction.currentCycleDay);
                    onShareCareToChat(advice.chatProposal);
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#00b894] hover:bg-[#00a884] text-[#130f26] font-bold text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md"
                >
                  <Send size={14} />
                  <span>Envoyer une attention personnalisée dans la discussion</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2 : FLO-STYLE INTERACTIVE CALENDAR */}
          {activeTab === 'calendar' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Calendar Month Navigation Header */}
              <div className="bg-[#1e173e] border border-[#2d2254] rounded-2xl p-3 flex items-center justify-between">
                <button
                  onClick={() => setCalendarOffset(calendarOffset - 1)}
                  className="p-1.5 rounded-lg bg-[#130f26] text-[#a29bfe] hover:text-white"
                >
                  <ChevronLeft size={18} />
                </button>
                <h4 className="text-sm font-bold text-white capitalize">{monthName}</h4>
                <button
                  onClick={() => setCalendarOffset(calendarOffset + 1)}
                  className="p-1.5 rounded-lg bg-[#130f26] text-[#a29bfe] hover:text-white"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Color Code Legend */}
              <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-[#a29bfe] bg-[#130f26] p-2.5 rounded-2xl border border-[#2d2254]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff7675]" />
                  <span>🔴 Règles</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00b894]" />
                  <span>🟢 Fertile</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0984e3]" />
                  <span>🔵 Ovulation</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#a29bfe]" />
                  <span>🟣 Lutéale</span>
                </div>
              </div>

              {/* Days Grid */}
              <div className="bg-[#1e173e] border border-[#2d2254] rounded-2xl p-3">
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#a29bfe] mb-2">
                  <span>LUN</span><span>MAR</span><span>MER</span><span>JEU</span><span>VEN</span><span>SAM</span><span>DIM</span>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {monthDays.map((day, idx) => {
                    if (!day) {
                      return <div key={`empty-${idx}`} className="h-10 rounded-xl" />;
                    }

                    const isSelected = selectedCalendarDate === day.dateIso;
                    const { classification, dayNumber, dateIso, isToday, hasLog } = day;

                    return (
                      <button
                        key={dateIso}
                        onClick={() => {
                          setSelectedCalendarDate(dateIso);
                          triggerHaptic(20);
                        }}
                        className={`h-11 rounded-xl flex flex-col items-center justify-center relative transition-all text-xs font-semibold ${
                          isSelected ? 'ring-2 ring-white scale-105 z-10' : ''
                        } ${
                          classification.isPeriod 
                            ? 'bg-[#ff7675] text-white shadow-sm' 
                            : classification.isOvulation 
                            ? 'bg-[#0984e3] text-white shadow-sm' 
                            : classification.isFertile 
                            ? 'bg-[#00b894]/25 border border-[#00b894] text-[#55efc4]' 
                            : classification.isLuteal 
                            ? 'bg-[#a29bfe]/20 text-[#a29bfe]' 
                            : 'bg-[#130f26] text-[#dfe6e9] hover:bg-[#20183e]'
                        }`}
                      >
                        <span>{dayNumber}</span>
                        {isToday && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white absolute bottom-1" />
                        )}
                        {hasLog && !isToday && (
                          <span className="w-1 h-1 rounded-full bg-[#fdcb6e] absolute bottom-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Day Details & Quick Add */}
              <div className="bg-[#130f26] border border-[#2d2254] rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">
                    Jour sélectionné : {new Date(selectedCalendarDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                  <span className="text-[11px] text-[#a29bfe]">
                    Statut estimé : {cycleService.getDayClassification(new Date(selectedCalendarDate), inputLastStartDate, inputCycleLength, inputPeriodLength).label}
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('symptoms')}
                  className="py-2 px-3 rounded-xl bg-[#6c5ce7] hover:bg-[#5b4bc4] text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Droplets size={14} />
                  <span>Enregistrer symptômes</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3 : SYMPTOMS, FLOW & MOOD LOGGER */}
          {activeTab === 'symptoms' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-[#1e173e] border border-[#2d2254] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-[#a29bfe] uppercase tracking-wider">
                    Flux menstruel ({selectedCalendarDate})
                  </h4>
                  <input
                    type="date"
                    value={selectedCalendarDate}
                    onChange={e => setSelectedCalendarDate(e.target.value)}
                    className="bg-[#130f26] border border-[#2d2254] text-white text-xs rounded-lg px-2 py-1"
                  />
                </div>

                <div className="grid grid-cols-5 gap-2 text-xs">
                  {[
                    { id: 'none', label: 'Aucun', emoji: '⚪' },
                    { id: 'spotting', label: 'Spotting', emoji: '💧' },
                    { id: 'light', label: 'Léger', emoji: '🩸' },
                    { id: 'medium', label: 'Moyen', emoji: '🩸🩸' },
                    { id: 'heavy', label: 'Abondant', emoji: '🩸🩸🩸' },
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSelectedFlow(item.id as MenstrualFlow);
                        triggerHaptic(20);
                      }}
                      className={`p-2 rounded-xl text-center font-medium transition-all ${
                        selectedFlow === item.id 
                          ? 'bg-[#ff7675] text-white font-bold shadow-md' 
                          : 'bg-[#130f26] text-[#a29bfe] border border-[#2d2254]'
                      }`}
                    >
                      <span className="block text-sm mb-0.5">{item.emoji}</span>
                      <span className="text-[10px]">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Symptoms Picker */}
              <div className="bg-[#1e173e] border border-[#2d2254] rounded-2xl p-4">
                <h4 className="text-xs font-bold text-[#a29bfe] uppercase tracking-wider mb-3">
                  Symptômes physiques
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {SYMPTOMS_LIST.map(sym => {
                    const isSelected = selectedSymptoms.includes(sym.id);
                    return (
                      <button
                        key={sym.id}
                        onClick={() => toggleSymptom(sym.id)}
                        className={`p-2.5 rounded-xl text-left flex items-center gap-2 transition-all ${
                          isSelected 
                            ? 'bg-[#6c5ce7] text-white font-bold shadow-md' 
                            : 'bg-[#130f26] text-[#dfe6e9] border border-[#2d2254] hover:border-[#6c5ce7]/50'
                        }`}
                      >
                        <span className="text-sm">{sym.emoji}</span>
                        <span className="text-[11px] truncate">{sym.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mood & Energy */}
              <div className="bg-[#1e173e] border border-[#2d2254] rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-[#a29bfe] uppercase tracking-wider">
                  Humeur & Énergie
                </h4>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
                  {MOODS_LIST.map(m => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedMood(m.id);
                        triggerHaptic(20);
                      }}
                      className={`p-2 rounded-xl text-center transition-all ${
                        selectedMood === m.id
                          ? 'bg-[#00b894] text-[#130f26] font-bold shadow-md'
                          : 'bg-[#130f26] text-[#a29bfe] border border-[#2d2254]'
                      }`}
                    >
                      <span className="block text-sm mb-0.5">{m.emoji}</span>
                      <span className="text-[10px] truncate block">{m.label}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#2d2254] text-xs text-[#a29bfe]">
                  <span>Niveau d'énergie (1 à 5) :</span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map(lvl => (
                      <button
                        key={lvl}
                        onClick={() => setSelectedEnergy(lvl)}
                        className={`w-7 h-7 rounded-lg font-bold text-xs ${
                          lvl <= selectedEnergy ? 'bg-[#00b894] text-[#130f26]' : 'bg-[#130f26] text-[#a29bfe] border border-[#2d2254]'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleSaveDailyLog}
                className="w-full py-3 rounded-2xl bg-[#6c5ce7] hover:bg-[#5b4bc4] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
              >
                <CheckCircle2 size={16} />
                <span>Enregistrer les symptômes du jour</span>
              </button>
            </div>
          )}

          {/* TAB 4 : SETTINGS & AUTOMATIC ALGORITHM CONFIG */}
          {activeTab === 'settings' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-[#1e173e] border border-[#2d2254] rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-[#a29bfe] uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarCheck size={16} className="text-[#00b894]" /> Paramètres de calcul automatique
                </h4>
                <p className="text-xs text-[#dfe6e9]">
                  Renseigne simplement ces 3 informations. L'algorithme se charge de calculer l'ovulation, les prochaines règles et les fenêtres fertiles.
                </p>

                {/* 1. Start date */}
                <div>
                  <label className="text-xs font-semibold text-[#a29bfe] block mb-1">
                    Date de début de tes dernières règles :
                  </label>
                  <input
                    type="date"
                    value={inputLastStartDate}
                    onChange={e => setInputLastStartDate(e.target.value)}
                    className="w-full bg-[#130f26] border border-[#2d2254] rounded-xl px-3 py-2 text-white text-xs focus:border-[#6c5ce7] outline-none"
                  />
                </div>

                {/* 2. Cycle Length */}
                <div>
                  <div className="flex justify-between text-xs font-semibold text-[#a29bfe] mb-1">
                    <span>Durée moyenne de ton cycle :</span>
                    <strong className="text-white">{inputCycleLength} jours</strong>
                  </div>
                  <input
                    type="range"
                    min="21"
                    max="40"
                    value={inputCycleLength}
                    onChange={e => setInputCycleLength(Number(e.target.value))}
                    className="w-full accent-[#6c5ce7]"
                  />
                  <span className="text-[10px] text-[#a29bfe]">La moyenne standard est de 28 jours (ovulation au 14ème jour).</span>
                </div>

                {/* 3. Period Length */}
                <div>
                  <div className="flex justify-between text-xs font-semibold text-[#a29bfe] mb-1">
                    <span>Durée habituelle de tes règles :</span>
                    <strong className="text-white">{inputPeriodLength} jours</strong>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="8"
                    value={inputPeriodLength}
                    onChange={e => setInputPeriodLength(Number(e.target.value))}
                    className="w-full accent-[#ff7675]"
                  />
                </div>
              </div>

              {/* Automatic Adaptation Info */}
              <div className="bg-[#130f26] border border-[#2d2254] rounded-2xl p-3.5 text-xs text-[#a29bfe] space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <TrendingUp size={15} className="text-[#55efc4]" /> Algorithme adaptatif multi-cycles
                </span>
                <p className="text-[11px] text-[#dfe6e9] leading-relaxed">
                  Après 3 cycles enregistrés dans l'application, Mikayla affine automatiquement la durée moyenne réelle, ajuste les dates d'ovulation et détecte toute irrégularité.
                </p>
              </div>

              <button
                onClick={handleSaveSettings}
                className="w-full py-3 rounded-2xl bg-[#00b894] hover:bg-[#00a884] text-[#130f26] font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
              >
                <CheckCircle2 size={16} />
                <span>Enregistrer & Recalculer les Prédictions</span>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
