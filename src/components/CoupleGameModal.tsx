import React, { useState, useEffect } from 'react';
import { 
  Dices, 
  Sparkles, 
  Flame, 
  RotateCw, 
  Send, 
  X, 
  Heart, 
  Zap, 
  Gift,
  HelpCircle,
  Clock,
  Plus,
  Trash2,
  Edit3,
  Sliders,
  Check,
  RefreshCw,
  Eye,
  Shield,
  Shuffle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { GameChallenge, CustomDiceConfig, User } from '../types';
import { triggerHaptic } from '../utils/security';
import { soundEffects } from '../utils/audio';
import { 
  getStoredGameChallenges, 
  saveGameChallenges, 
  getStoredDiceConfig, 
  saveDiceConfig, 
  GAME_CHALLENGES as DEFAULT_CHALLENGES, 
  INITIAL_DICE_CONFIG 
} from '../utils/storage';

interface CoupleGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  partnerUser: User;
  onShareChallengeToChat: (text: string) => void;
}

export const CoupleGameModal: React.FC<CoupleGameModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  partnerUser,
  onShareChallengeToChat
}) => {
  const [activeTab, setActiveTab] = useState<'truth_or_dare' | 'wheel' | 'dice' | 'customizer'>('truth_or_dare');
  
  // Game Challenges State
  const [challenges, setChallenges] = useState<GameChallenge[]>(() => getStoredGameChallenges());
  const [diceConfig, setDiceConfig] = useState<CustomDiceConfig>(() => getStoredDiceConfig());

  // --- TRUTH OR DARE STATE ---
  const [todMode, setTodMode] = useState<'all' | 'truth' | 'dare'>('all');
  const [todIntensity, setTodIntensity] = useState<1 | 2 | 3>(2);
  const [activePlayerTurn, setActivePlayerTurn] = useState<string>('random');
  const [currentTodChallenge, setCurrentTodChallenge] = useState<GameChallenge | null>(null);
  const [isTodRevealing, setIsTodRevealing] = useState<boolean>(false);

  // --- WHEEL STATE ---
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [rotationDegree, setRotationDegree] = useState<number>(0);
  const [selectedWheelChallenge, setSelectedWheelChallenge] = useState<GameChallenge | null>(null);

  // --- DICE STATE ---
  const [isRollingDice, setIsRollingDice] = useState<boolean>(false);
  const [diceResult, setDiceResult] = useState<{ action: string; zone: string; duration: string } | null>(null);

  // --- CUSTOMIZER STATE ---
  const [customizerSubTab, setCustomizerSubTab] = useState<'challenges' | 'dice'>('challenges');
  const [editingChallengeId, setEditingChallengeId] = useState<string | null>(null);
  const [showNewChallengeForm, setShowNewChallengeForm] = useState<boolean>(false);
  
  // New Challenge Form
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newType, setNewType] = useState<'truth' | 'dare' | 'wheel'>('truth');
  const [newCategory, setNewCategory] = useState<string>('vérité');
  const [newIntensity, setNewIntensity] = useState<1 | 2 | 3>(2);

  // Edit Challenge Form
  const [editTitle, setEditTitle] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editType, setEditType] = useState<'truth' | 'dare' | 'wheel'>('truth');
  const [editCategory, setEditCategory] = useState<string>('vérité');
  const [editIntensity, setEditIntensity] = useState<1 | 2 | 3>(2);

  // New Dice Item inputs
  const [newDiceAction, setNewDiceAction] = useState<string>('');
  const [newDiceZone, setNewDiceZone] = useState<string>('');
  const [newDiceDuration, setNewDiceDuration] = useState<string>('');

  useEffect(() => {
    saveGameChallenges(challenges);
  }, [challenges]);

  useEffect(() => {
    saveDiceConfig(diceConfig);
  }, [diceConfig]);

  if (!isOpen) return null;

  // Wheel slices
  const wheelSlices = [
    { label: 'Vérité intime', color: '#6c5ce7', category: 'vérité', icon: '💬' },
    { label: 'Gage coquin', color: '#ff7675', category: 'défi_coquin', icon: '🔥' },
    { label: 'Massage & Soin', color: '#00b894', category: 'massage_soin', icon: '💆' },
    { label: 'Défi romantique', color: '#fd79a8', category: 'romantique', icon: '❤️' },
    { label: 'Vœu surprise', color: '#fdcb6e', category: 'surprise', icon: '✨' },
    { label: 'Baiser passion', color: '#e84393', category: 'défi_coquin', icon: '💋' },
  ];

  // --- TRUTH OR DARE HANDLER ---
  const handleDrawTruthOrDare = (type: 'truth' | 'dare' | 'random') => {
    setIsTodRevealing(true);
    setCurrentTodChallenge(null);
    triggerHaptic([50, 50, 80]);

    const actualType = type === 'random' ? (Math.random() > 0.5 ? 'truth' : 'dare') : type;
    
    // Filter matching challenges by type and intensity <= selected
    let pool = challenges.filter(c => {
      const isTypeMatch = actualType === 'truth' ? (c.type === 'truth' || c.category === 'vérité') : (c.type === 'dare' || c.category !== 'vérité');
      const isIntensityMatch = c.intensity === todIntensity || c.intensity <= todIntensity;
      return isTypeMatch && isIntensityMatch;
    });

    if (pool.length === 0) {
      pool = challenges.filter(c => actualType === 'truth' ? (c.type === 'truth' || c.category === 'vérité') : (c.type === 'dare' || c.category !== 'vérité'));
    }

    if (pool.length === 0) {
      pool = challenges;
    }

    setTimeout(() => {
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      setCurrentTodChallenge(chosen);
      setIsTodRevealing(false);
      soundEffects.playReaction();
      triggerHaptic([80, 40, 120]);

      if (chosen.intensity === 3) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#ff7675', '#fd79a8', '#6c5ce7']
        });
      }
    }, 450);
  };

  // --- WHEEL HANDLER ---
  const handleSpinWheel = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setSelectedWheelChallenge(null);
    triggerHaptic([60, 40, 60]);

    const randomTurns = 5 + Math.floor(Math.random() * 5);
    const randomSliceIndex = Math.floor(Math.random() * wheelSlices.length);
    const sliceAngle = 360 / wheelSlices.length;
    const targetAngle = rotationDegree + randomTurns * 360 + randomSliceIndex * sliceAngle + (sliceAngle / 2);

    setRotationDegree(targetAngle);

    let tickCount = 0;
    const tickInterval = setInterval(() => {
      soundEffects.playWheelTick();
      triggerHaptic(20);
      tickCount++;
      if (tickCount > 18) clearInterval(tickInterval);
    }, 180);

    setTimeout(() => {
      setIsSpinning(false);
      clearInterval(tickInterval);

      const slice = wheelSlices[randomSliceIndex];
      const matchingChallenges = challenges.filter(c => c.category === slice.category);
      const chosen = matchingChallenges.length > 0 
        ? matchingChallenges[Math.floor(Math.random() * matchingChallenges.length)]
        : challenges[Math.floor(Math.random() * challenges.length)];

      setSelectedWheelChallenge(chosen);
      soundEffects.playMatchSound();
      triggerHaptic([100, 50, 150]);

      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.5 },
        colors: ['#00b894', '#fd79a8', '#6c5ce7']
      });
    }, 3800);
  };

  // --- DICE HANDLER ---
  const handleRollDice = () => {
    if (isRollingDice) return;
    setIsRollingDice(true);
    setDiceResult(null);
    triggerHaptic([80, 40, 80]);

    const actions = diceConfig.actions.length > 0 ? diceConfig.actions : INITIAL_DICE_CONFIG.actions;
    const zones = diceConfig.zones.length > 0 ? diceConfig.zones : INITIAL_DICE_CONFIG.zones;
    const durations = diceConfig.durations.length > 0 ? diceConfig.durations : INITIAL_DICE_CONFIG.durations;

    let rollSteps = 0;
    const interval = setInterval(() => {
      soundEffects.playWheelTick();
      triggerHaptic(25);
      rollSteps++;
      if (rollSteps > 12) {
        clearInterval(interval);
        const finalAction = actions[Math.floor(Math.random() * actions.length)];
        const finalZone = zones[Math.floor(Math.random() * zones.length)];
        const finalDuration = durations[Math.floor(Math.random() * durations.length)];

        setDiceResult({
          action: finalAction,
          zone: finalZone,
          duration: finalDuration
        });
        setIsRollingDice(false);
        soundEffects.playReaction();
        triggerHaptic([100, 100]);
      }
    }, 120);
  };

  // --- CUSTOMIZER OPERATIONS ---
  const handleAddNewChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const created: GameChallenge = {
      id: `ch_custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      title: newTitle.trim(),
      description: newDescription.trim() || newTitle.trim(),
      type: newType,
      category: newCategory,
      intensity: newIntensity,
      isCustom: true,
      createdAt: Date.now()
    };

    setChallenges(prev => [created, ...prev]);
    setNewTitle('');
    setNewDescription('');
    setShowNewChallengeForm(false);
    triggerHaptic([50, 50]);
    soundEffects.playSent();
  };

  const handleStartEditChallenge = (item: GameChallenge) => {
    setEditingChallengeId(item.id);
    setEditTitle(item.title);
    setEditDescription(item.description);
    setEditType(item.type || (item.category === 'vérité' ? 'truth' : 'dare'));
    setEditCategory(item.category);
    setEditIntensity(item.intensity);
  };

  const handleSaveEditChallenge = (id: string) => {
    if (!editTitle.trim()) return;
    setChallenges(prev =>
      prev.map(c => (c.id === id ? {
        ...c,
        title: editTitle.trim(),
        description: editDescription.trim(),
        type: editType,
        category: editCategory,
        intensity: editIntensity
      } : c))
    );
    setEditingChallengeId(null);
    triggerHaptic(40);
    soundEffects.playReaction();
  };

  const handleDeleteChallenge = (id: string) => {
    setChallenges(prev => prev.filter(c => c.id !== id));
    triggerHaptic(40);
  };

  const handleResetToDefaults = () => {
    if (confirm('Voulez-vous restaurer tous les défis et dés intimes par défaut ?')) {
      setChallenges(DEFAULT_CHALLENGES);
      setDiceConfig(INITIAL_DICE_CONFIG);
      triggerHaptic([60, 60, 60]);
      soundEffects.playBiometricSuccess();
    }
  };

  // Dice customization
  const handleAddDiceAction = () => {
    if (!newDiceAction.trim()) return;
    setDiceConfig(prev => ({ ...prev, actions: [...prev.actions, newDiceAction.trim()] }));
    setNewDiceAction('');
    triggerHaptic(40);
  };

  const handleDeleteDiceAction = (index: number) => {
    setDiceConfig(prev => ({ ...prev, actions: prev.actions.filter((_, i) => i !== index) }));
    triggerHaptic(40);
  };

  const handleAddDiceZone = () => {
    if (!newDiceZone.trim()) return;
    setDiceConfig(prev => ({ ...prev, zones: [...prev.zones, newDiceZone.trim()] }));
    setNewDiceZone('');
    triggerHaptic(40);
  };

  const handleDeleteDiceZone = (index: number) => {
    setDiceConfig(prev => ({ ...prev, zones: prev.zones.filter((_, i) => i !== index) }));
    triggerHaptic(40);
  };

  const handleAddDiceDuration = () => {
    if (!newDiceDuration.trim()) return;
    setDiceConfig(prev => ({ ...prev, durations: [...prev.durations, newDiceDuration.trim()] }));
    setNewDiceDuration('');
    triggerHaptic(40);
  };

  const handleDeleteDiceDuration = (index: number) => {
    setDiceConfig(prev => ({ ...prev, durations: prev.durations.filter((_, i) => i !== index) }));
    triggerHaptic(40);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0e0b1c]/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-[#171230] border border-[#2d2254] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="h-[64px] bg-[#1f1742] px-5 flex items-center justify-between border-b border-[#2d2254] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#ff7675] via-[#fd79a8] to-[#6c5ce7] flex items-center justify-center shadow-[0_0_15px_rgba(255,118,117,0.3)]">
              <Dices size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#f1f2f6] flex items-center gap-2">
                <span>Jeux de Couple & Défis</span>
                <span className="text-[10px] bg-[#ff7675]/20 text-[#ff7675] border border-[#ff7675]/40 px-2 py-0.5 rounded-full font-bold">
                  100% Modifiable
                </span>
              </h2>
              <p className="text-xs text-[#a29bfe]">Action ou Vérité, Roue Romantique et Dés Intimes personnalisables</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#a29bfe] hover:text-white rounded-full hover:bg-[#281e4b] transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* 4 Mode Selector Tabs */}
        <div className="grid grid-cols-4 bg-[#130f26] p-1.5 border-b border-[#2d2254] text-xs font-bold gap-1">
          <button
            onClick={() => setActiveTab('truth_or_dare')}
            className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'truth_or_dare'
                ? 'bg-gradient-to-r from-[#6c5ce7] to-[#fd79a8] text-white shadow-md'
                : 'text-[#a29bfe] hover:text-white'
            }`}
          >
            <Zap size={14} />
            <span className="truncate">Action / Vérité</span>
          </button>

          <button
            onClick={() => setActiveTab('wheel')}
            className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'wheel'
                ? 'bg-[#6c5ce7] text-white shadow-md'
                : 'text-[#a29bfe] hover:text-white'
            }`}
          >
            <RotateCw size={14} />
            <span className="truncate">Roue</span>
          </button>

          <button
            onClick={() => setActiveTab('dice')}
            className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'dice'
                ? 'bg-[#6c5ce7] text-white shadow-md'
                : 'text-[#a29bfe] hover:text-white'
            }`}
          >
            <Dices size={14} />
            <span className="truncate">Dés Intimes</span>
          </button>

          <button
            onClick={() => setActiveTab('customizer')}
            className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'customizer'
                ? 'bg-[#00b894] text-[#130f26] shadow-md font-black'
                : 'text-[#55efc4] hover:bg-[#00b894]/10'
            }`}
          >
            <Sliders size={14} />
            <span className="truncate">Studio / Éditeur</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {/* ========================================================
              TAB 1: ACTION OU VÉRITÉ (TRUTH OR DARE)
             ======================================================== */}
          {activeTab === 'truth_or_dare' && (
            <div className="flex flex-col items-center space-y-4 max-w-lg mx-auto">
              {/* Turn & Intensity Controls */}
              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#1e173e] p-3 rounded-2xl border border-[#2d2254]">
                {/* Intensity selector */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[#a29bfe] font-semibold">Intensité :</span>
                  {[
                    { level: 1, label: '🌸 Doux', color: 'text-[#55efc4]' },
                    { level: 2, label: '🔥 Complice', color: 'text-[#fd79a8]' },
                    { level: 3, label: '🌶️ Torride', color: 'text-[#ff7675]' },
                  ].map(lvl => (
                    <button
                      key={lvl.level}
                      onClick={() => {
                        setTodIntensity(lvl.level as 1 | 2 | 3);
                        triggerHaptic(30);
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                        todIntensity === lvl.level
                          ? 'bg-[#130f26] border border-[#6c5ce7] shadow-inner ' + lvl.color
                          : 'text-[#a29bfe]/60 hover:text-white'
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>

                {/* Turn selector */}
                <div className="flex items-center gap-1 text-[11px] bg-[#130f26] p-1 rounded-xl border border-[#2d2254]">
                  <button
                    onClick={() => setActivePlayerTurn(currentUser.id)}
                    className={`px-2 py-0.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                      activePlayerTurn === currentUser.id ? 'bg-[#6c5ce7] text-white' : 'text-[#a29bfe]'
                    }`}
                  >
                    Pour moi
                  </button>
                  <button
                    onClick={() => setActivePlayerTurn(partnerUser.id)}
                    className={`px-2 py-0.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                      activePlayerTurn === partnerUser.id ? 'bg-[#fd79a8] text-white' : 'text-[#a29bfe]'
                    }`}
                  >
                    Pour {partnerUser.name}
                  </button>
                  <button
                    onClick={() => setActivePlayerTurn('random')}
                    className={`px-2 py-0.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                      activePlayerTurn === 'random' ? 'bg-[#00b894] text-[#130f26]' : 'text-[#a29bfe]'
                    }`}
                  >
                    🎲 Aléatoire
                  </button>
                </div>
              </div>

              {/* 3 Main Choice Buttons */}
              <div className="grid grid-cols-3 gap-3 w-full">
                <button
                  onClick={() => handleDrawTruthOrDare('truth')}
                  className="py-4 px-3 rounded-2xl bg-gradient-to-b from-[#6c5ce7] to-[#4834d4] hover:from-[#5b4bc4] hover:to-[#3826ba] text-white font-extrabold text-xs sm:text-sm flex flex-col items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer border border-[#6c5ce7]/50"
                >
                  <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                    💬
                  </div>
                  <span>VÉRITÉ</span>
                  <span className="text-[10px] text-white/70 font-normal">Aveu & Secret</span>
                </button>

                <button
                  onClick={() => handleDrawTruthOrDare('dare')}
                  className="py-4 px-3 rounded-2xl bg-gradient-to-b from-[#ff7675] to-[#d63031] hover:from-[#e66767] hover:to-[#b71540] text-white font-extrabold text-xs sm:text-sm flex flex-col items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer border border-[#ff7675]/50"
                >
                  <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                    ⚡
                  </div>
                  <span>ACTION</span>
                  <span className="text-[10px] text-white/70 font-normal">Gage & Frisson</span>
                </button>

                <button
                  onClick={() => handleDrawTruthOrDare('random')}
                  className="py-4 px-3 rounded-2xl bg-gradient-to-b from-[#00b894] to-[#008f6b] hover:from-[#00a884] hover:to-[#007355] text-[#130f26] font-black text-xs sm:text-sm flex flex-col items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer border border-[#00b894]/50"
                >
                  <div className="w-9 h-9 rounded-full bg-black/15 flex items-center justify-center">
                    <Shuffle size={18} className="text-[#130f26]" />
                  </div>
                  <span>MYSTÈRE</span>
                  <span className="text-[10px] text-[#130f26]/80 font-bold">Le destin choisit</span>
                </button>
              </div>

              {/* Challenge Result Display Card */}
              {currentTodChallenge && (
                <div className="w-full bg-gradient-to-b from-[#1f1742] to-[#171230] border-2 border-[#6c5ce7] rounded-3xl p-5 shadow-[0_0_30px_rgba(108,92,231,0.25)] animate-in zoom-in-95 text-center relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-[#130f26] text-[#55efc4] border border-[#2d2254]">
                      {currentTodChallenge.type === 'truth' || currentTodChallenge.category === 'vérité' ? '💬 VÉRITÉ' : '⚡ ACTION'}
                    </span>
                    <span className="text-[11px] font-bold text-[#fd79a8] flex items-center gap-1">
                      {currentTodChallenge.intensity === 1 ? '🌸 Doux' : currentTodChallenge.intensity === 2 ? '🔥 Complice' : '🌶️ Torride'}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-white my-2">
                    {currentTodChallenge.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#f1f2f6] leading-relaxed bg-[#130f26]/80 p-4 rounded-2xl border border-[#2d2254] my-3">
                    {currentTodChallenge.description}
                  </p>

                  <div className="space-y-2 mt-4">
                    <button
                      onClick={() => {
                        const typeLabel = currentTodChallenge.type === 'truth' || currentTodChallenge.category === 'vérité' ? '💬 VÉRITÉ' : '⚡ ACTION';
                        onShareChallengeToChat(`🎲 *Action ou Vérité Mikayala :*\n👉 *${typeLabel} : ${currentTodChallenge.title}*\n${currentTodChallenge.description} ✨`);
                        onClose();
                      }}
                      className="w-full py-3 px-4 rounded-xl bg-[#00b894] hover:bg-[#00a884] text-[#130f26] font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95 cursor-pointer"
                    >
                      <Send size={15} />
                      <span>Envoyer ce gage dans notre chat</span>
                    </button>

                    <button
                      onClick={() => handleDrawTruthOrDare('random')}
                      className="w-full py-2 text-xs text-[#a29bfe] hover:text-white transition-colors cursor-pointer"
                    >
                      Tirer un autre gage 🎲
                    </button>
                  </div>
                </div>
              )}

              {/* Quick link to customize */}
              <button
                onClick={() => {
                  setActiveTab('customizer');
                  setShowNewChallengeForm(true);
                }}
                className="text-xs text-[#55efc4] hover:underline flex items-center gap-1 font-semibold pt-2 cursor-pointer"
              >
                <Plus size={14} />
                <span>Ajouter vos propres questions et actions personnalisées</span>
              </button>
            </div>
          )}

          {/* ========================================================
              TAB 2: ROUE ROMANTIQUE
             ======================================================== */}
          {activeTab === 'wheel' && (
            <div className="w-full flex flex-col items-center">
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 my-2 flex items-center justify-center">
                {/* Pointer */}
                <div className="absolute -top-3 z-30 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-[#00b894] drop-shadow-[0_4px_8px_rgba(0,184,148,0.6)]" />

                {/* Spinning Wheel */}
                <div
                  className="w-full h-full rounded-full border-4 border-[#2d2254] shadow-[0_0_30px_rgba(108,92,231,0.25)] transition-transform duration-[3800ms] ease-out relative overflow-hidden"
                  style={{ transform: `rotate(${rotationDegree}deg)` }}
                >
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    {wheelSlices.map((slice, idx) => {
                      const startAngle = (idx * 360) / wheelSlices.length;
                      const endAngle = ((idx + 1) * 360) / wheelSlices.length;
                      const x1 = 50 + 50 * Math.cos((Math.PI * (startAngle - 90)) / 180);
                      const y1 = 50 + 50 * Math.sin((Math.PI * (startAngle - 90)) / 180);
                      const x2 = 50 + 50 * Math.cos((Math.PI * (endAngle - 90)) / 180);
                      const y2 = 50 + 50 * Math.sin((Math.PI * (endAngle - 90)) / 180);
                      const path = `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`;

                      const midAngle = startAngle + (endAngle - startAngle) / 2;
                      const tx = 50 + 32 * Math.cos((Math.PI * (midAngle - 90)) / 180);
                      const ty = 50 + 32 * Math.sin((Math.PI * (midAngle - 90)) / 180);

                      return (
                        <g key={idx}>
                          <path d={path} fill={slice.color} opacity={0.9} stroke="#171230" strokeWidth="0.8" />
                          <text
                            x={tx}
                            y={ty}
                            fill="#ffffff"
                            fontSize="5.5"
                            fontWeight="bold"
                            textAnchor="middle"
                            dominantBaseline="central"
                            transform={`rotate(${midAngle}, ${tx}, ${ty})`}
                          >
                            {slice.icon}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Center Spin Button */}
                <button
                  onClick={handleSpinWheel}
                  disabled={isSpinning}
                  className="absolute z-20 w-16 h-16 rounded-full bg-[#130f26] border-4 border-[#00b894] text-white font-bold text-xs flex flex-col items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-transform disabled:opacity-75 cursor-pointer"
                >
                  <Sparkles size={16} className="text-[#00b894] mb-0.5" />
                  <span className="text-[10px] uppercase font-black text-[#55efc4]">
                    {isSpinning ? '...' : 'Tourner'}
                  </span>
                </button>
              </div>

              {selectedWheelChallenge && (
                <div className="w-full bg-[#1e173e] border border-[#00b894]/60 rounded-2xl p-4 mt-4 animate-in zoom-in-95 shadow-[0_0_20px_rgba(0,184,148,0.2)] text-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs text-[#55efc4] font-bold mb-1">
                    <Flame size={14} className="text-[#00b894]" />
                    <span className="uppercase tracking-wider">Défi Tiré au Sort</span>
                  </div>
                  <h4 className="text-base font-bold text-white mb-1.5">
                    {selectedWheelChallenge.title}
                  </h4>
                  <p className="text-xs text-[#f1f2f6] leading-relaxed mb-3">
                    {selectedWheelChallenge.description}
                  </p>

                  <button
                    onClick={() => {
                      onShareChallengeToChat(`🎲 *Défi Roue Mikayala :* \n*${selectedWheelChallenge.title}* : ${selectedWheelChallenge.description} ✨`);
                      onClose();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#00b894] hover:bg-[#00a884] text-[#130f26] font-bold text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md cursor-pointer"
                  >
                    <Send size={14} />
                    <span>Envoyer ce défi dans la discussion</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              TAB 3: DÉS INTIMES (SENSUSAL DICE)
             ======================================================== */}
          {activeTab === 'dice' && (
            <div className="w-full flex flex-col items-center py-2 max-w-lg mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-6">
                <div className="bg-[#1e173e] border border-[#2d2254] rounded-2xl p-4 text-center shadow-md">
                  <span className="text-[10px] uppercase font-bold text-[#a29bfe] tracking-wider block mb-1">
                    🎲 Action
                  </span>
                  <div className="text-sm font-bold text-[#55efc4] min-h-11 flex items-center justify-center">
                    {diceResult ? diceResult.action : 'Action ?'}
                  </div>
                </div>

                <div className="bg-[#1e173e] border border-[#2d2254] rounded-2xl p-4 text-center shadow-md">
                  <span className="text-[10px] uppercase font-bold text-[#a29bfe] tracking-wider block mb-1">
                    💋 Zone / Contact
                  </span>
                  <div className="text-sm font-bold text-[#fd79a8] min-h-11 flex items-center justify-center">
                    {diceResult ? diceResult.zone : 'Zone ?'}
                  </div>
                </div>

                <div className="bg-[#1e173e] border border-[#2d2254] rounded-2xl p-4 text-center shadow-md">
                  <span className="text-[10px] uppercase font-bold text-[#a29bfe] tracking-wider block mb-1">
                    ⏳ Durée / Condition
                  </span>
                  <div className="text-sm font-bold text-[#ffeaa7] min-h-11 flex items-center justify-center">
                    {diceResult ? diceResult.duration : 'Durée ?'}
                  </div>
                </div>
              </div>

              <button
                onClick={handleRollDice}
                disabled={isRollingDice}
                className="w-full max-w-xs py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#6c5ce7] to-[#00b894] hover:from-[#5b4bc4] hover:to-[#00a884] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Dices size={20} className={isRollingDice ? 'animate-spin' : ''} />
                <span>{isRollingDice ? 'Lancement des dés...' : 'Lancer les 3 Dés Intimes'}</span>
              </button>

              {diceResult && (
                <button
                  onClick={() => {
                    onShareChallengeToChat(`🎲 *Dés Intimes Mikayala :* \n👉 *Action :* ${diceResult.action}\n👉 *Zone :* ${diceResult.zone}\n👉 *Condition :* ${diceResult.duration} 🔥`);
                    onClose();
                  }}
                  className="mt-4 text-xs font-bold text-[#55efc4] hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <Send size={14} />
                  <span>Partager ce gage dans le chat</span>
                </button>
              )}
            </div>
          )}

          {/* ========================================================
              TAB 4: STUDIO / CUSTOMIZER (TOTAL POWER OVER GAMES)
             ======================================================== */}
          {activeTab === 'customizer' && (
            <div className="space-y-4">
              {/* Sub tabs & Reset Button */}
              <div className="flex items-center justify-between border-b border-[#2d2254] pb-3 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCustomizerSubTab('challenges')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                      customizerSubTab === 'challenges'
                        ? 'bg-[#6c5ce7] text-white shadow-md'
                        : 'bg-[#1e173e] text-[#a29bfe] hover:text-white'
                    }`}
                  >
                    Questions & Actions ({challenges.length})
                  </button>

                  <button
                    onClick={() => setCustomizerSubTab('dice')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                      customizerSubTab === 'dice'
                        ? 'bg-[#6c5ce7] text-white shadow-md'
                        : 'bg-[#1e173e] text-[#a29bfe] hover:text-white'
                    }`}
                  >
                    Dés Intimes (Actions/Zones)
                  </button>
                </div>

                <button
                  onClick={handleResetToDefaults}
                  className="flex items-center gap-1 text-[11px] text-[#a29bfe] hover:text-[#ff7675] p-1 cursor-pointer"
                  title="Restaurer les packs d'origine"
                >
                  <RefreshCw size={13} />
                  <span className="hidden sm:inline">Restaurer défaut</span>
                </button>
              </div>

              {/* --- SECTION: CHALLENGES & QUESTIONS MANAGEMENT --- */}
              {customizerSubTab === 'challenges' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#a29bfe]">
                      Créez, modifiez ou supprimez n'importe quelle question et défi pour votre couple.
                    </span>
                    <button
                      onClick={() => setShowNewChallengeForm(!showNewChallengeForm)}
                      className="px-3 py-1.5 bg-[#00b894] hover:bg-[#00a884] text-[#130f26] font-bold text-xs rounded-xl flex items-center gap-1 shadow-md transition-transform active:scale-95 cursor-pointer shrink-0"
                    >
                      <Plus size={14} />
                      <span>{showNewChallengeForm ? 'Fermer' : 'Nouveau défi'}</span>
                    </button>
                  </div>

                  {/* Add New Challenge Form */}
                  {showNewChallengeForm && (
                    <form onSubmit={handleAddNewChallenge} className="bg-[#1e173e] border border-[#00b894]/50 rounded-2xl p-4 space-y-3 text-xs shadow-lg animate-in slide-in-from-top-2">
                      <h4 className="font-bold text-white flex items-center gap-1.5">
                        <Sparkles size={15} className="text-[#00b894]" />
                        Créer un défi ou une question personnalisée
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[#a29bfe] mb-1 font-semibold">Type de jeu</label>
                          <select
                            value={newType}
                            onChange={e => setNewType(e.target.value as any)}
                            className="w-full bg-[#130f26] border border-[#2d2254] rounded-xl px-2.5 py-2 text-white"
                          >
                            <option value="truth">💬 Vérité (Question intime)</option>
                            <option value="dare">⚡ Action (Gage tactile/romantique)</option>
                            <option value="wheel">🎡 Roue Romantique</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[#a29bfe] mb-1 font-semibold">Intensité</label>
                          <select
                            value={newIntensity}
                            onChange={e => setNewIntensity(Number(e.target.value) as 1 | 2 | 3)}
                            className="w-full bg-[#130f26] border border-[#2d2254] rounded-xl px-2.5 py-2 text-white"
                          >
                            <option value={1}>🌸 1 : Doux & Romantique</option>
                            <option value={2}>🔥 2 : Complice & Pimenté</option>
                            <option value={3}>🌶️ 3 : Torride & Sensuel</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[#a29bfe] mb-1 font-semibold">Catégorie</label>
                          <select
                            value={newCategory}
                            onChange={e => setNewCategory(e.target.value)}
                            className="w-full bg-[#130f26] border border-[#2d2254] rounded-xl px-2.5 py-2 text-white"
                          >
                            <option value="vérité">Vérité intime</option>
                            <option value="défi_coquin">Défi coquin / Gage</option>
                            <option value="romantique">Romantique & Amour</option>
                            <option value="massage_soin">Massage & Soin</option>
                            <option value="surprise">Surprise & Joker</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[#a29bfe] mb-1 font-semibold">Titre du défi *</label>
                        <input
                          type="text"
                          value={newTitle}
                          onChange={e => setNewTitle(e.target.value)}
                          placeholder="Ex: Confession sous les draps..."
                          className="w-full bg-[#130f26] border border-[#2d2254] rounded-xl px-3 py-2 text-white placeholder:text-[#a29bfe]/40 focus:border-[#00b894] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[#a29bfe] mb-1 font-semibold">Description détaillée / Consigne</label>
                        <textarea
                          value={newDescription}
                          onChange={e => setNewDescription(e.target.value)}
                          placeholder="Consigne exacte du gage ou question à poser..."
                          rows={2}
                          className="w-full bg-[#130f26] border border-[#2d2254] rounded-xl px-3 py-2 text-white placeholder:text-[#a29bfe]/40 focus:border-[#00b894] outline-none resize-none"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowNewChallengeForm(false)}
                          className="px-3 py-1.5 text-[#a29bfe] hover:bg-[#281e4b] rounded-xl"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          disabled={!newTitle.trim()}
                          className="px-4 py-1.5 bg-[#00b894] text-[#130f26] font-bold rounded-xl shadow-md disabled:opacity-50"
                        >
                          Ajouter au jeu ✨
                        </button>
                      </div>
                    </form>
                  )}

                  {/* List of Challenges */}
                  <div className="space-y-2.5">
                    {challenges.map(item => {
                      const isEditing = editingChallengeId === item.id;

                      if (isEditing) {
                        return (
                          <div key={item.id} className="p-3 bg-[#1e173e] border border-[#6c5ce7] rounded-2xl space-y-2 text-xs">
                            <input
                              type="text"
                              value={editTitle}
                              onChange={e => setEditTitle(e.target.value)}
                              className="w-full bg-[#130f26] border border-[#2d2254] rounded-xl px-3 py-1.5 text-white"
                            />
                            <textarea
                              value={editDescription}
                              onChange={e => setEditDescription(e.target.value)}
                              rows={2}
                              className="w-full bg-[#130f26] border border-[#2d2254] rounded-xl px-3 py-1.5 text-white resize-none"
                            />
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <select
                                  value={editIntensity}
                                  onChange={e => setEditIntensity(Number(e.target.value) as 1 | 2 | 3)}
                                  className="bg-[#130f26] border border-[#2d2254] rounded-lg px-2 py-1 text-white"
                                >
                                  <option value={1}>🌸 Doux (1)</option>
                                  <option value={2}>🔥 Complice (2)</option>
                                  <option value={3}>🌶️ Torride (3)</option>
                                </select>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setEditingChallengeId(null)}
                                  className="px-3 py-1 text-[#a29bfe]"
                                >
                                  Annuler
                                </button>
                                <button
                                  onClick={() => handleSaveEditChallenge(item.id)}
                                  className="px-3 py-1 bg-[#6c5ce7] text-white font-bold rounded-lg"
                                >
                                  Sauvegarder
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={item.id}
                          className="p-3 bg-[#1e173e] border border-[#2d2254] hover:border-[#6c5ce7]/50 rounded-2xl flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#130f26] text-[#55efc4]">
                                {item.type === 'truth' || item.category === 'vérité' ? '💬 VÉRITÉ' : '⚡ ACTION'}
                              </span>
                              <span className="text-[10px] text-[#fd79a8] font-semibold">
                                {item.intensity === 1 ? '🌸' : item.intensity === 2 ? '🔥' : '🌶️'}
                              </span>
                              {item.isCustom && (
                                <span className="text-[9px] bg-[#00b894]/20 text-[#55efc4] px-1.5 py-0.2 rounded font-bold">
                                  Créé par vous
                                </span>
                              )}
                            </div>
                            <h5 className="font-bold text-white text-xs">{item.title}</h5>
                            <p className="text-[#a29bfe] text-[11px] mt-0.5 leading-relaxed">{item.description}</p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleStartEditChallenge(item)}
                              className="p-1.5 text-[#a29bfe] hover:text-white rounded-lg hover:bg-[#281e4b] transition-colors"
                              title="Modifier ce défi"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteChallenge(item.id)}
                              className="p-1.5 text-[#a29bfe] hover:text-[#ff7675] rounded-lg hover:bg-[#281e4b] transition-colors"
                              title="Supprimer ce défi"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* --- SECTION: DICE CUSTOMIZATION --- */}
              {customizerSubTab === 'dice' && (
                <div className="space-y-5 text-xs">
                  {/* Actions column */}
                  <div className="bg-[#1e173e] p-3.5 rounded-2xl border border-[#2d2254] space-y-2">
                    <h5 className="font-bold text-[#55efc4] flex items-center gap-1.5">
                      <Dices size={15} />
                      Actions des Dés Intimes ({diceConfig.actions.length})
                    </h5>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newDiceAction}
                        onChange={e => setNewDiceAction(e.target.value)}
                        placeholder="Ex: Effleurer avec lenteur..."
                        className="flex-1 bg-[#130f26] border border-[#2d2254] rounded-xl px-3 py-1.5 text-white outline-none focus:border-[#00b894]"
                      />
                      <button
                        onClick={handleAddDiceAction}
                        className="px-3 py-1.5 bg-[#00b894] text-[#130f26] font-bold rounded-xl shrink-0"
                      >
                        + Ajouter
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {diceConfig.actions.map((act, idx) => (
                        <span key={idx} className="bg-[#130f26] border border-[#2d2254] px-2.5 py-1 rounded-xl flex items-center gap-1.5 text-[#f1f2f6] text-[11px]">
                          {act}
                          <button onClick={() => handleDeleteDiceAction(idx)} className="text-[#a29bfe] hover:text-[#ff7675]">
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Zones column */}
                  <div className="bg-[#1e173e] p-3.5 rounded-2xl border border-[#2d2254] space-y-2">
                    <h5 className="font-bold text-[#fd79a8] flex items-center gap-1.5">
                      <Heart size={15} />
                      Zones du Corps & Points de Contact ({diceConfig.zones.length})
                    </h5>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newDiceZone}
                        onChange={e => setNewDiceZone(e.target.value)}
                        placeholder="Ex: Le creux des reins..."
                        className="flex-1 bg-[#130f26] border border-[#2d2254] rounded-xl px-3 py-1.5 text-white outline-none focus:border-[#fd79a8]"
                      />
                      <button
                        onClick={handleAddDiceZone}
                        className="px-3 py-1.5 bg-[#fd79a8] text-white font-bold rounded-xl shrink-0"
                      >
                        + Ajouter
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {diceConfig.zones.map((zone, idx) => (
                        <span key={idx} className="bg-[#130f26] border border-[#2d2254] px-2.5 py-1 rounded-xl flex items-center gap-1.5 text-[#f1f2f6] text-[11px]">
                          {zone}
                          <button onClick={() => handleDeleteDiceZone(idx)} className="text-[#a29bfe] hover:text-[#ff7675]">
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Durations column */}
                  <div className="bg-[#1e173e] p-3.5 rounded-2xl border border-[#2d2254] space-y-2">
                    <h5 className="font-bold text-[#ffeaa7] flex items-center gap-1.5">
                      <Clock size={15} />
                      Durées & Conditions ({diceConfig.durations.length})
                    </h5>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newDiceDuration}
                        onChange={e => setNewDiceDuration(e.target.value)}
                        placeholder="Ex: Les yeux fermés, 90 secondes..."
                        className="flex-1 bg-[#130f26] border border-[#2d2254] rounded-xl px-3 py-1.5 text-white outline-none focus:border-[#ffeaa7]"
                      />
                      <button
                        onClick={handleAddDiceDuration}
                        className="px-3 py-1.5 bg-[#ffeaa7] text-[#130f26] font-bold rounded-xl shrink-0"
                      >
                        + Ajouter
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {diceConfig.durations.map((dur, idx) => (
                        <span key={idx} className="bg-[#130f26] border border-[#2d2254] px-2.5 py-1 rounded-xl flex items-center gap-1.5 text-[#f1f2f6] text-[11px]">
                          {dur}
                          <button onClick={() => handleDeleteDiceDuration(idx)} className="text-[#a29bfe] hover:text-[#ff7675]">
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
