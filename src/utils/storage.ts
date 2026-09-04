import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { 
  User, 
  Message, 
  CallRecord, 
  ChatSettings, 
  VaultItem, 
  WishlistItem, 
  GameChallenge, 
  CycleData,
  CoupleCoupon,
  BlindQuizQuestion,
  CustomDiceConfig
} from '../types';

export const DEFAULT_USER: User = {
  id: '',
  name: 'Moi',
  phone: '',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  bio: 'Mon sanctuaire ✨ | Protégé par Mikayla 🔒',
  isOnline: true,
  lastSeen: 'En ligne',
  customStatus: 'Connecté(e) 🌸'
};

export const DEFAULT_PARTNER: User = {
  id: '',
  name: 'Partenaire',
  phone: '',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
  bio: 'Sanctuaire Mikayla 🔒',
  isOnline: false,
  lastSeen: '',
  customStatus: 'Protéger nos moments 💓'
};

export const DEFAULT_SETTINGS: ChatSettings = {
  wallpaperColor: '#130f26',
  wallpaperDoodle: true,
  doodleOpacity: 0.1,
  fontSize: 'medium',
  bubbleTheme: 'emerald',
  ephemeralDuration: 0,
  isBiometricEnabled: true,
  securityPin: '2026',
  blurOnBackground: true,
  hideChatPreview: false,
  readReceipts: true,
  hapticFeedback: true
};

export const INITIAL_VAULT_ITEMS: VaultItem[] = [];

export const INITIAL_WISHLIST: WishlistItem[] = [];

export const GAME_CHALLENGES: GameChallenge[] = [
  // --- VÉRITÉS (Truths) ---
  {
    id: 'tr_1',
    type: 'truth',
    category: 'vérité',
    title: 'Le premier coup de foudre ⚡',
    description: 'Raconte exactement ce qui t’a séduit(e) et fait chavirer la toute première fois que nos regards se sont croisés.',
    intensity: 1
  },
  {
    id: 'tr_2',
    type: 'truth',
    category: 'vérité',
    title: 'Secret inavoué 🤫',
    description: 'Quelle est la chose la plus folle ou secrète que tu as déjà imaginée faire avec moi sans jamais oser me le dire ?',
    intensity: 2
  },
  {
    id: 'tr_3',
    type: 'truth',
    category: 'vérité',
    title: 'Zone interdite & désir 🔥',
    description: 'Quel endroit insolite ou scénario interdit te ferait le plus vibrer si nous étions sûrs de ne jamais être découverts ?',
    intensity: 3
  },
  {
    id: 'tr_4',
    type: 'truth',
    category: 'vérité',
    title: 'Souvenir le plus sensuel 💭',
    description: 'Quel moment précis partagé entre nous deux t’a laissé le souvenir le plus intense et brûlant ?',
    intensity: 2
  },
  {
    id: 'tr_5',
    type: 'truth',
    category: 'vérité',
    title: 'Déclaration sincère ❤️',
    description: 'Quelle est la qualité invisible chez moi que tu admires en secret chaque jour ?',
    intensity: 1
  },
  {
    id: 'tr_6',
    type: 'truth',
    category: 'vérité',
    title: 'Frisson absolu 🌶️',
    description: 'Quelle tenue, geste ou mot chuchoté par moi te rend instantanément vulnérable au désir ?',
    intensity: 3
  },

  // --- ACTIONS (Dares) ---
  {
    id: 'da_1',
    type: 'dare',
    category: 'romantique',
    title: 'Regard magnétique 👁️✨',
    description: 'Regardez-vous dans les yeux pendant 60 secondes sans détourner le regard ni parler, puis terminez par un baiser volé.',
    intensity: 1
  },
  {
    id: 'da_2',
    type: 'dare',
    category: 'massage_soin',
    title: 'Massage envoûtant 💆🕯️',
    description: 'Offre un massage ultra-lent et délicat de 3 minutes sur les trapèzes et la nuque de ton partenaire.',
    intensity: 1
  },
  {
    id: 'da_3',
    type: 'dare',
    category: 'défi_coquin',
    title: 'Murmure frisson 👄🔥',
    description: 'Approche-toi tout près de son oreille et décris-lui en chuchotant avec sensualité ce que tu veux lui faire plus tard.',
    intensity: 2
  },
  {
    id: 'da_4',
    type: 'dare',
    category: 'défi_coquin',
    title: 'Parcours des lèvres 💋',
    description: 'Dépose 10 baisers lents et brûlants de son poignet en remontant le long de son bras jusqu’à son cou.',
    intensity: 2
  },
  {
    id: 'da_5',
    type: 'dare',
    category: 'défi_coquin',
    title: 'Toucher les yeux bandés 🙈🌶️',
    description: 'Bande les yeux de ton partenaire. Effleure 3 zones de son corps avec tes lèvres ou tes doigts : il/elle doit deviner exactement où.',
    intensity: 3
  },
  {
    id: 'da_6',
    type: 'dare',
    category: 'défi_coquin',
    title: 'Glaçon ou souffle chaud ❄️🔥',
    description: 'Passe un souffle chaud puis un effleurement très lent le long de sa taille et de ses hanches jusqu’à obtenir un frisson visible.',
    intensity: 3
  },

  // --- ROULETTE / AUTRES ---
  {
    id: 'ch_1',
    type: 'wheel',
    category: 'romantique',
    title: 'Éloge passionnée',
    description: 'Dis 3 phrases d\'amour que tu n\'as jamais dites de cette manière.',
    intensity: 1
  },
  {
    id: 'ch_2',
    type: 'wheel',
    category: 'massage_soin',
    title: 'Soin des mains & doigts',
    description: 'Prends les mains de ton partenaire et masse chaque doigt avec douceur.',
    intensity: 1
  },
  {
    id: 'ch_3',
    type: 'wheel',
    category: 'surprise',
    title: 'Joker de couple',
    description: 'Ton partenaire gagne un bon immédiat pour un câlin prolongé ou un vœu secret.',
    intensity: 2
  }
];

export const INITIAL_DICE_CONFIG: CustomDiceConfig = {
  actions: [
    'Embrasser tendrement',
    'Masser avec lenteur',
    'Caresser du bout des doigts',
    'Chuchoter un secret coquin à',
    'Mordiller délicatement',
    'Effleurer avec un souffle chaud sur',
    'Couvrir de baisers',
    'Dessiner une forme secrète sur'
  ],
  zones: [
    'Le cou & la nuque',
    'Les lèvres & le menton',
    'Le bas du dos & les reins',
    'Les épaules & clavicules',
    'Le creux de l\'oreille',
    'Le creux de la taille & hanches',
    'Les mains & doigts',
    'L\'intérieur des cuisses'
  ],
  durations: [
    '30 secondes',
    '1 minute',
    '2 minutes',
    '3 minutes',
    'Les yeux bandés',
    'Jusqu\'au premier frisson',
    'Dans le noir complet',
    'Sans un seul mot'
  ]
};

export const INITIAL_CYCLE_DATA: CycleData = {
  dayOfCycle: 14,
  cycleLength: 28,
  periodLength: 5,
  lastPeriodStartDate: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
  currentPhase: 'ovulatoire',
  mood: 'passionnée',
  energyLevel: 5,
  notes: 'Pleine d’énergie et envie de moments complices à deux ✨',
  careTipsForPartner: {
    title: 'Phase Ovulatoire : Pic d’énergie & sensualité ❤️🔥',
    description: 'Mikaela est au sommet de sa forme, lumineuse et très réceptive aux moments intimes et aux surprises passionnées.',
    actionIdea: 'C’est le moment idéal pour une soirée romantique inoubliable, un dîner aux chandelles ou un défi de couple !',
    icon: 'Sparkles'
  }
};

// Production-ready initial states without mock messages or call history
const INITIAL_MESSAGES: Message[] = [];
export const INITIAL_CALLS: CallRecord[] = [];
export const INITIAL_COUPONS: CoupleCoupon[] = [];

export const INITIAL_BLIND_QUIZ: BlindQuizQuestion[] = [
  {
    id: 'quiz_1',
    question: 'Quel est ton souvenir intime le plus marquant ou émouvant avec moi ?',
    category: 'souvenirs',
    suggestedAnswers: [
      'Notre premier baiser sous la pluie',
      'Notre nuit d\'été sur la plage à la belle étoile',
      'Le week-end surprise au chalet au coin du feu',
      'Ce fou rire complice au lit un dimanche matin'
    ],
    answers: {},
    isRevealed: false,
    funFact: 'Les souvenirs partagés renforcent de 70% la complicité émotionnelle du duo.'
  },
  {
    id: 'quiz_2',
    question: 'Quelle est la petite attention du quotidien qui te fait fondre instantanément ?',
    category: 'romantisme',
    suggestedAnswers: [
      'Un baiser surprise dans le cou quand je cuisine',
      'Un message doux inattendu au milieu d\'une journée chargée',
      'Quand tu me prépares mon café préféré le matin',
      'Quand tu me prends la main spontanément'
    ],
    answers: {},
    isRevealed: false,
    funFact: 'Vous êtes tous les deux ultra sensibles aux caresses spontanées !'
  },
  {
    id: 'quiz_3',
    question: 'Si nous avions 48h sans aucun téléphone ni contrainte, où irions-nous ?',
    category: 'désirs',
    suggestedAnswers: [
      'Une cabane spa perchée dans les arbres',
      'Une crique secrète en Méditerranée',
      'Un hôtel de luxe avec lit king-size et room service',
      'Un road trip improvisé sans destination fixe'
    ],
    answers: {},
    isRevealed: false
  },
  {
    id: 'quiz_4',
    question: 'Quel est le fantasme doux ou audacieux que tu aimerais explorer ensemble ce mois-ci ?',
    category: 'intimité',
    answers: {},
    isRevealed: false
  }
];

const STORAGE_KEYS = {
  LOCAL_USER: 'mikayala_local_user_profile',
  PARTNER_USER: 'mikayala_partner_user_profile',
  MESSAGES: 'mikayala_messages',
  CALLS: 'mikayala_calls',
  SETTINGS: 'mikayala_settings',
  VAULT: 'mikayala_vault',
  WISHLIST: 'mikayala_wishlist',
  CYCLE: 'mikayala_cycle',
  COUPONS: 'mikayala_coupons',
  BLIND_QUIZ: 'mikayala_blind_quiz',
  OFFLINE_QUEUE: 'mikayala_offline_queue',
  SUPABASE_CONFIG: 'mikayala_supabase_cfg'
};

// --- SUPABASE CLIENT SINGLETON ---
export const getSupabaseClient = () => {
  return supabase;
};

// Storage Helpers with robust JSON parsing (Single local profile per device)
export const getStoredUserProfile = (): User => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.LOCAL_USER);
    if (saved) return JSON.parse(saved);
  } catch (err) {
    console.error('[storage] Error reading user profile:', err);
  }
  return DEFAULT_USER;
};

export const saveStoredUserProfile = (user: User): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.LOCAL_USER, JSON.stringify(user));
  } catch (err) {
    console.error('[storage] Error saving user profile:', err);
  }
};

export const getStoredPartnerProfile = (): User => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.PARTNER_USER);
    if (saved) return JSON.parse(saved);
  } catch (err) {
    console.error('[storage] Error reading partner profile:', err);
  }
  return DEFAULT_PARTNER;
};

export const saveStoredPartnerProfile = (partner: User): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.PARTNER_USER, JSON.stringify(partner));
  } catch (err) {
    console.error('[storage] Error saving partner profile:', err);
  }
};

// Backward-compatibility aliases during cleanup
export const getStoredCurrentUser = (): string => {
  return getStoredUserProfile().id || '';
};

export const setStoredCurrentUser = (userId: string) => {
  const current = getStoredUserProfile();
  saveStoredUserProfile({ ...current, id: userId });
};

export const getStoredUsers = (): { userA: User; userB: User } => {
  const user = getStoredUserProfile();
  const partner = getStoredPartnerProfile();
  return {
    userA: user,
    userB: partner
  };
};

export const saveUsers = (userA: User, userB: User) => {
  saveStoredUserProfile(userA);
  saveStoredPartnerProfile(userB);
};

export const getStoredMessages = (): Message[] => {
  const saved = localStorage.getItem(STORAGE_KEYS.MESSAGES);
  if (!saved) {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(INITIAL_MESSAGES));
    return INITIAL_MESSAGES;
  }
  try {
    const list: Message[] = JSON.parse(saved);
    const now = Date.now();
    return list.filter(m => !m.expiresAt || m.expiresAt > now);
  } catch {
    return INITIAL_MESSAGES;
  }
};

export const saveMessages = (messages: Message[]) => {
  localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
};

export const getStoredCalls = (): CallRecord[] => {
  const saved = localStorage.getItem(STORAGE_KEYS.CALLS);
  if (!saved) {
    localStorage.setItem(STORAGE_KEYS.CALLS, JSON.stringify(INITIAL_CALLS));
    return INITIAL_CALLS;
  }
  try {
    return JSON.parse(saved);
  } catch {
    return INITIAL_CALLS;
  }
};

export const saveCalls = (calls: CallRecord[]) => {
  localStorage.setItem(STORAGE_KEYS.CALLS, JSON.stringify(calls));
};

export const getStoredSettings = (): ChatSettings => {
  const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (!saved) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    return DEFAULT_SETTINGS;
  }
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: ChatSettings) => {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
};

// Vault Helpers
export const getStoredVault = (): VaultItem[] => {
  const saved = localStorage.getItem(STORAGE_KEYS.VAULT);
  if (!saved) {
    localStorage.setItem(STORAGE_KEYS.VAULT, JSON.stringify(INITIAL_VAULT_ITEMS));
    return INITIAL_VAULT_ITEMS;
  }
  try {
    return JSON.parse(saved);
  } catch {
    return INITIAL_VAULT_ITEMS;
  }
};

export const saveVault = (items: VaultItem[]) => {
  localStorage.setItem(STORAGE_KEYS.VAULT, JSON.stringify(items));
};

// Wishlist Helpers
export const getStoredWishlist = (): WishlistItem[] => {
  const saved = localStorage.getItem(STORAGE_KEYS.WISHLIST);
  if (!saved) {
    localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(INITIAL_WISHLIST));
    return INITIAL_WISHLIST;
  }
  try {
    return JSON.parse(saved);
  } catch {
    return INITIAL_WISHLIST;
  }
};

export const saveWishlist = (items: WishlistItem[]) => {
  localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(items));
};

// Aliases
export const getStoredVaultItems = getStoredVault;
export const saveVaultItems = saveVault;
export const getStoredWishlistItems = getStoredWishlist;
export const saveWishlistItems = saveWishlist;

// Game Challenges Helpers
export const getStoredGameChallenges = (): GameChallenge[] => {
  const saved = localStorage.getItem('mikayala_challenges');
  if (!saved) {
    localStorage.setItem('mikayala_challenges', JSON.stringify(GAME_CHALLENGES));
    return GAME_CHALLENGES;
  }
  try {
    return JSON.parse(saved);
  } catch {
    return GAME_CHALLENGES;
  }
};

export const saveGameChallenges = (challenges: GameChallenge[]) => {
  localStorage.setItem('mikayala_challenges', JSON.stringify(challenges));
};

// Dice Configuration Helpers
export const getStoredDiceConfig = (): CustomDiceConfig => {
  const saved = localStorage.getItem('mikayala_dice_config');
  if (!saved) {
    localStorage.setItem('mikayala_dice_config', JSON.stringify(INITIAL_DICE_CONFIG));
    return INITIAL_DICE_CONFIG;
  }
  try {
    return JSON.parse(saved);
  } catch {
    return INITIAL_DICE_CONFIG;
  }
};

export const saveDiceConfig = (config: CustomDiceConfig) => {
  localStorage.setItem('mikayala_dice_config', JSON.stringify(config));
};

// Cycle Data Helpers
export const getStoredCycleData = (): CycleData => {
  const saved = localStorage.getItem(STORAGE_KEYS.CYCLE);
  if (!saved) {
    localStorage.setItem(STORAGE_KEYS.CYCLE, JSON.stringify(INITIAL_CYCLE_DATA));
    return INITIAL_CYCLE_DATA;
  }
  try {
    return { ...INITIAL_CYCLE_DATA, ...JSON.parse(saved) };
  } catch {
    return INITIAL_CYCLE_DATA;
  }
};

export const saveCycleData = (data: CycleData) => {
  localStorage.setItem(STORAGE_KEYS.CYCLE, JSON.stringify(data));
};

// Coupons Helpers
export const getStoredCoupons = (): CoupleCoupon[] => {
  const saved = localStorage.getItem(STORAGE_KEYS.COUPONS);
  if (!saved) {
    localStorage.setItem(STORAGE_KEYS.COUPONS, JSON.stringify(INITIAL_COUPONS));
    return INITIAL_COUPONS;
  }
  try {
    return JSON.parse(saved);
  } catch {
    return INITIAL_COUPONS;
  }
};

export const saveCoupons = (coupons: CoupleCoupon[]) => {
  localStorage.setItem(STORAGE_KEYS.COUPONS, JSON.stringify(coupons));
};

// Blind Quiz Helpers
export const getStoredBlindQuiz = (): BlindQuizQuestion[] => {
  const saved = localStorage.getItem(STORAGE_KEYS.BLIND_QUIZ);
  if (!saved) {
    localStorage.setItem(STORAGE_KEYS.BLIND_QUIZ, JSON.stringify(INITIAL_BLIND_QUIZ));
    return INITIAL_BLIND_QUIZ;
  }
  try {
    return JSON.parse(saved);
  } catch {
    return INITIAL_BLIND_QUIZ;
  }
};

export const saveBlindQuiz = (questions: BlindQuizQuestion[]) => {
  localStorage.setItem(STORAGE_KEYS.BLIND_QUIZ, JSON.stringify(questions));
};

export const getStoredQuizzes = getStoredBlindQuiz;
export const saveQuizzes = saveBlindQuiz;

// Offline Outbox Queue
export const getStoredOfflineQueue = (): Message[] => {
  const saved = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
};

export const saveOfflineQueue = (queue: Message[]) => {
  localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
};
