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
  Shuffle,
  Settings
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { gameService } from '../services/gameService';
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
  coupleId: string;
  onShareChallengeToChat: (text: string) => void;
  onShareGameResultToChat?: (payload: any) => void;
  initialTab?: 'truth_or_dare' | 'wheel' | 'dice' | 'customizer';
}

export const CoupleGameModal: React.FC<CoupleGameModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  partnerUser,
  onShareChallengeToChat,
  onShareGameResultToChat,
  coupleId,
  initialTab = 'wheel'
}) => {
  const [activeTab, setActiveTab] = useState<'truth_or_dare' | 'wheel' | 'dice' | 'customizer'>(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  
  // Game Challenges State
  const [challenges, setChallenges] = useState<GameChallenge[]>(() => getStoredGameChallenges());
  const [diceConfig, setDiceConfig] = useState<CustomDiceConfig>(() => getStoredDiceConfig());

  // Real-time synchronization
  useEffect(() => {
    if (isOpen && coupleId && currentUser.id) {
      gameService.setup(coupleId, currentUser.id, (session) => {
        // Handle incoming database session updates
        if (session.game_type === 'challenge_wheel' && session.state?.challenge) {
          if (session.state.targetAngle) setRotationDegree(session.state.targetAngle);
          setSelectedWheelChallenge(session.state.challenge);
        } else if (session.game_type === 'intimate_dice' && session.state?.result) {
          setDiceResult(session.state.result);
        } else if (session.game_type === 'truth_or_dare' && session.state?.challenge) {
          setCurrentTodChallenge(session.state.challenge);
        }
      });

      gameService.setOnGameEvent((payload) => {
        if (payload.type === 'spin_wheel') {
          // Sync wheel spin
          setRotationDegree(payload.data.targetAngle);
          setIsSpinning(true);
          setSelectedWheelChallenge(null);
          
          setTimeout(() => {
            setIsSpinning(false);
            setSelectedWheelChallenge(payload.data.challenge);
            soundEffects.playMatchSound();
          }, 3800);
        } else if (payload.type === 'roll_dice') {
          setIsRollingDice(true);
          setDiceResult(null);
          setTimeout(() => {
            setDiceResult(payload.data.result);
            setIsRollingDice(false);
            soundEffects.playReaction();
          }, 1500);
        } else if (payload.type === 'draw_tod') {
          setIsTodRevealing(true);
          setCurrentTodChallenge(null);
          setTimeout(() => {
            setCurrentTodChallenge(payload.data.challenge);
            setIsTodRevealing(false);
            soundEffects.playReaction();
            if (payload.data.challenge.intensity === 3) {
              confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
            }
          }, 450);
        }
      });
    }
  }, [isOpen, coupleId, currentUser.id]);

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

      // Sync with partner & game_sessions
      gameService.createSession(coupleId, 'truth_or_dare', {
        challenge: chosen,
        intensity: chosen.intensity,
        status: 'finished'
      });
      gameService.sendEvent(coupleId, currentUser.id, 'draw_tod', { challenge: chosen });

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
      
      // Sync with partner & game_sessions
      gameService.createSession(coupleId, 'challenge_wheel', {
        challenge: chosen,
        targetAngle,
        status: 'finished'
      });
      gameService.sendEvent(coupleId, currentUser.id, 'spin_wheel', { targetAngle, challenge: chosen });

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

        const result = {
          action: finalAction,
          zone: finalZone,
          duration: finalDuration
        };
        setDiceResult(result);
        setIsRollingDice(false);
        soundEffects.playReaction();
        triggerHaptic([100, 100]);

        // Sync with partner & game_sessions
        gameService.createSession(coupleId, 'intimate_dice', {
          result,
          status: 'finished'
        });
        gameService.sendEvent(coupleId, currentUser.id, 'roll_dice', { result });
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
            className="w-10 h-10 flex items-center justify-center bg-[#2d2254] hover:bg-[#ff7675]/20 text-[#a29bfe] hover:text-[#ff7675] rounded-xl transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-2 bg-[#171230] border-b border-[#2d2254] overflow-x-auto shrink-0 custom-scrollbar">
          <button
            onClick={() => setActiveTab('truth_or_dare')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'truth_or_dare' ? 'bg-[#ff7675] text-[#130f26]' : 'text-[#a29bfe] hover:bg-[#2d2254]'
            }`}
          >
            Action ou Vérité
          </button>
          <button
            onClick={() => setActiveTab('wheel')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'wheel' ? 'bg-[#e056fd] text-white' : 'text-[#a29bfe] hover:bg-[#2d2254]'
            }`}
          >
            Roue Romantique
          </button>
          <button
            onClick={() => setActiveTab('dice')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'dice' ? 'bg-[#00b894] text-[#130f26]' : 'text-[#a29bfe] hover:bg-[#2d2254]'
            }`}
          >
            Dés Intimes
          </button>
          <button
            onClick={() => setActiveTab('customizer')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ml-auto flex items-center gap-1 ${
              activeTab === 'customizer' ? 'bg-[#1b1435] text-white border border-[#2d2254]' : 'text-[#a29bfe] hover:bg-[#2d2254]'
            }`}
          >
            <Settings size={14} />
            Studio
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
          
          {/* TAB 1: TRUTH OR DARE */}
          {activeTab === 'truth_or_dare' && (
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <span className="text-2xl">🔥</span> Action ou Vérité
              </h3>
              {currentTodChallenge ? (
                <div className="flex flex-col items-center gap-3 w-full max-w-md animate-in zoom-in-95">
                  <div className="bg-[#1b1435] border border-[#ff7675]/40 p-5 rounded-3xl w-full text-center shadow-xl">
                    <span className="text-2xl mb-1 block">
                      {currentTodChallenge.type === 'truth' ? '🤫' : '🔥'}
                    </span>
                    <h4 className="text-[#ff7675] font-bold text-base mb-1">{currentTodChallenge.title}</h4>
                    <p className="text-white text-xs sm:text-sm leading-relaxed font-medium">{currentTodChallenge.description}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2.5 w-full">
                    <button
                      onClick={() => {
                        const tods = challenges.filter(c => c.type !== 'wheel');
                        if (tods.length) setCurrentTodChallenge(tods[Math.floor(Math.random() * tods.length)]);
                        soundEffects.playBiometricSuccess();
                      }}
                      className="px-4 py-2.5 rounded-xl bg-[#2d2254] hover:bg-[#3d2f6f] text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      Tirer une autre carte 🔄
                    </button>

                    <button
                      onClick={() => {
                        console.log('[Game] Message action ou vérité créé dans le chat');
                        const challengeText = currentTodChallenge.description || currentTodChallenge.title;
                        if (onShareGameResultToChat) {
                          onShareGameResultToChat({
                            gameType: "truth_or_dare",
                            result: {
                              type: currentTodChallenge.type,
                              title: currentTodChallenge.title,
                              description: currentTodChallenge.description
                            }
                          });
                        } else {
                          onShareChallengeToChat(`🔥 *Action ou Vérité Mikayla :*\n👉 *${currentTodChallenge.title} :* ${challengeText}`);
                        }
                        onClose();
                      }}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff7675] to-[#fd79a8] hover:from-[#d63031] hover:to-[#e84393] text-[#130f26] font-extrabold text-xs flex items-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
                    >
                      <Send size={14} />
                      <span>Partager ce gage dans le chat</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    const tods = challenges.filter(c => c.type !== 'wheel');
                    if (tods.length) setCurrentTodChallenge(tods[Math.floor(Math.random() * tods.length)]);
                    soundEffects.playBiometricSuccess();
                  }}
                  className="px-8 py-3.5 bg-gradient-to-r from-[#ff7675] to-[#fd79a8] text-[#130f26] rounded-2xl font-extrabold text-sm shadow-xl hover:shadow-[0_0_20px_rgba(255,118,117,0.4)] transition-all active:scale-95 cursor-pointer"
                >
                  Tirer une carte 🔥
                </button>
              )}
            </div>
          )}

          {/* TAB 2: WHEEL */}
          {activeTab === 'wheel' && (
            <div className="flex flex-col items-center justify-center min-h-[360px] gap-5 py-2">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-2xl">🎡</span> Roue de défis
              </h3>

              {/* Visual Spinning Wheel Container */}
              <div className="relative w-60 h-60 sm:w-64 sm:h-64 flex items-center justify-center my-1">
                {/* Top Pointer Indicator */}
                <div className="absolute -top-3 z-20 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-[#ff7675] filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />

                {/* Outer Glow Ring */}
                <div className="absolute inset-0 rounded-full border-4 border-[#e056fd]/30 shadow-[0_0_25px_rgba(224,86,253,0.3)] pointer-events-none" />

                {/* Spinning SVG Wheel */}
                <div
                  className="w-full h-full rounded-full overflow-hidden shadow-2xl relative"
                  style={{
                    transform: `rotate(${rotationDegree}deg)`,
                    transition: isSpinning ? 'transform 3.8s cubic-bezier(0.15, 0.9, 0.2, 1)' : 'none'
                  }}
                >
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    {wheelSlices.map((slice, i) => {
                      const angle = 360 / wheelSlices.length;
                      const startAngle = i * angle;
                      const endAngle = (i + 1) * angle;

                      const x1 = 50 + 50 * Math.cos((Math.PI * startAngle) / 180);
                      const y1 = 50 + 50 * Math.sin((Math.PI * startAngle) / 180);
                      const x2 = 50 + 50 * Math.cos((Math.PI * endAngle) / 180);
                      const y2 = 50 + 50 * Math.sin((Math.PI * endAngle) / 180);

                      const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`;

                      const textAngle = startAngle + angle / 2;
                      const textX = 50 + 32 * Math.cos((Math.PI * textAngle) / 180);
                      const textY = 50 + 32 * Math.sin((Math.PI * textAngle) / 180);

                      return (
                        <g key={i}>
                          <path d={pathData} fill={slice.color} stroke="#130f26" strokeWidth="1" />
                          <text
                            x={textX}
                            y={textY}
                            fill="#ffffff"
                            fontSize="4.5"
                            fontWeight="bold"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`}
                          >
                            {slice.icon} {slice.label.split(' ')[0]}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  {/* Center Knob */}
                  <div className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-[#130f26] border-2 border-[#e056fd] flex items-center justify-center text-lg shadow-lg">
                    💖
                  </div>
                </div>
              </div>

              {/* Result or Spin Button */}
              {selectedWheelChallenge ? (
                <div className="flex flex-col items-center gap-3 w-full max-w-md animate-in zoom-in-95">
                  <div className="bg-[#1b1435] border border-[#e056fd]/40 p-5 rounded-3xl w-full text-center shadow-xl">
                    <span className="text-2xl mb-1 block">✨</span>
                    <h4 className="text-[#e056fd] font-bold text-base mb-1">{selectedWheelChallenge.title}</h4>
                    <p className="text-white text-xs sm:text-sm leading-relaxed font-medium">{selectedWheelChallenge.description}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2.5 w-full">
                    <button
                      onClick={handleSpinWheel}
                      disabled={isSpinning}
                      className="px-4 py-2.5 rounded-xl bg-[#2d2254] hover:bg-[#3d2f6f] text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      Tourner à nouveau 🔄
                    </button>

                    <button
                      onClick={() => {
                        console.log('[Game] Message roue créé dans le chat');
                        const challengeText = selectedWheelChallenge.description || selectedWheelChallenge.title;
                        if (onShareGameResultToChat) {
                          onShareGameResultToChat({
                            gameType: "challenge_wheel",
                            result: {
                              challenge: challengeText
                            }
                          });
                        } else {
                          onShareChallengeToChat(`🎡 *Roue de défis Mikayla :*\n👉 *Défi :* ${challengeText}`);
                        }
                        onClose();
                      }}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#e056fd] to-[#fd79a8] hover:from-[#be2edd] hover:to-[#e84393] text-white font-extrabold text-xs flex items-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
                    >
                      <Send size={14} />
                      <span>Partager ce défi dans le chat</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleSpinWheel}
                  disabled={isSpinning}
                  className="px-8 py-3.5 bg-gradient-to-r from-[#e056fd] to-[#fd79a8] hover:from-[#be2edd] hover:to-[#e84393] text-white text-xs sm:text-sm font-extrabold rounded-2xl shadow-xl hover:shadow-[0_0_20px_rgba(224,86,253,0.4)] transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  <span className={isSpinning ? 'animate-spin text-base' : 'text-base'}>🎡</span>
                  <span>{isSpinning ? 'La roue tourne...' : 'Tourner la roue de défis'}</span>
                </button>
              )}
            </div>
          )}

          {/* TAB 3: DICE */}
          {activeTab === 'dice' && (
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg">
                <div className="bg-[#1e173e] border border-[#2d2254] rounded-2xl p-4 text-center shadow-md">
                  <span className="text-[10px] uppercase font-bold text-[#a29bfe] tracking-wider block mb-1">
                    🎯 Action
                  </span>
                  <div className="text-sm font-bold text-[#55efc4] min-h-[44px] flex items-center justify-center">
                    {diceResult ? diceResult.action : 'Action ?'}
                  </div>
                </div>
                <div className="bg-[#1e173e] border border-[#2d2254] rounded-2xl p-4 text-center shadow-md">
                  <span className="text-[10px] uppercase font-bold text-[#a29bfe] tracking-wider block mb-1">
                    💋 Zone / Contact
                  </span>
                  <div className="text-sm font-bold text-[#fd79a8] min-h-[44px] flex items-center justify-center">
                    {diceResult ? diceResult.zone : 'Zone ?'}
                  </div>
                </div>
                <div className="bg-[#1e173e] border border-[#2d2254] rounded-2xl p-4 text-center shadow-md">
                  <span className="text-[10px] uppercase font-bold text-[#a29bfe] tracking-wider block mb-1">
                    ⏳ Durée / Condition
                  </span>
                  <div className="text-sm font-bold text-[#ffeaa7] min-h-[44px] flex items-center justify-center">
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
                    console.log('[Game] Message dés créé dans le chat');
                    if (onShareGameResultToChat) {
                      onShareGameResultToChat({
                        gameType: "intimate_dice",
                        result: diceResult
                      });
                    } else {
                      onShareChallengeToChat(`🎲 *Dés Intimes Mikayla :* \n👉 *Action :* ${diceResult.action}\n👉 *Zone :* ${diceResult.zone}\n👉 *Condition :* ${diceResult.duration} 🔥`);
                    }
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
