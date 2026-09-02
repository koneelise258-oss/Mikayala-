export type MessageType = 
  | 'text' 
  | 'image' 
  | 'video' 
  | 'audio' 
  | 'video_note' 
  | 'document' 
  | 'location' 
  | 'contact' 
  | 'poll' 
  | 'event' 
  | 'heartbeat'
  | 'scratch_card'
  | 'digital_touch'
  | 'couple_coupon'
  | 'blind_quiz'
  | 'system';

export type NetworkMode = 'cloud' | 'sms' | 'proximity';
export type ProximityTech = 'bluetooth' | 'wifi_hotspot';

export interface NetworkState {
  mode: NetworkMode;
  isCloudOnline: boolean;
  isSmsReady: boolean;
  isProximityConnected: boolean;
  proximityTech: ProximityTech;
  proximityPeerName?: string;
  signalStrength?: number; // 0 - 100
  lastSyncTime?: number;
}

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read';

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // user IDs who voted
}

export interface PollData {
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
}

export interface EventAttendee {
  userId: string;
  status: 'going' | 'maybe' | 'declined';
}

export interface EventData {
  title: string;
  date: string;
  time: string;
  location: string;
  description?: string;
  attendees: EventAttendee[];
}

export interface LocationData {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface ContactCardData {
  name: string;
  phone: string;
  avatar?: string;
}

export interface ScratchCardData {
  id: string;
  title: string;
  secretContent: string;
  secretMediaUrl?: string;
  scratchColor?: 'gold' | 'silver' | 'ruby' | 'emerald';
  isScratched?: boolean;
  scratchProgress?: number;
}

export interface TouchPoint {
  x: number;
  y: number;
  color: string;
  size: number;
  time: number;
}

export interface DigitalTouchData {
  id?: string;
  paths?: Array<{
    points: Array<{ x: number; y: number }>;
    color: string;
    width: number;
  }>;
  strokes?: any[];
  taps?: Array<{ x: number; y: number; time: number }>;
  previewUrl: string;
  duration?: number;
  hasHeartbeat?: boolean;
  color?: string;
  sentAt?: number;
}

export interface CoupleCoupon {
  id: string;
  title: string;
  description: string;
  category: 'massage' | 'romantique' | 'coquin' | 'quotidien' | 'joker' | 'secret';
  icon: string;
  giverId: string; // user who offered the coupon or 'both'
  recipientId: string; // user who can claim it
  status: 'available' | 'claimed' | 'redeemed';
  claimedAt?: number;
  redeemedAt?: number;
  createdAt: number;
  colorTheme: string;
}

export interface BlindQuizAnswer {
  userId: string;
  answerText: string;
  answeredAt: number;
}

export interface BlindQuizQuestion {
  id: string;
  question: string;
  category: 'intimité' | 'romantisme' | 'souvenirs' | 'désirs' | 'futur' | 'vérité';
  suggestedAnswers?: string[];
  answers: Record<string, BlindQuizAnswer>; // userId -> answer
  isRevealed: boolean;
  revealedAt?: number;
  funFact?: string;
  createdAt?: number;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  timestamp: number;
  deliveredAt?: string | null;
  readAt?: string | null;
  status: MessageStatus;
  type: MessageType;
  content: string;
  storagePath?: string | null;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string;
  fileType?: string;
  audioDuration?: number;
  waveform?: number[];
  isViewOnce?: boolean;
  isViewed?: boolean;
  isHD?: boolean;
  pollData?: PollData;
  eventData?: EventData;
  locationData?: LocationData;
  contactCard?: ContactCardData;
  scratchCardData?: ScratchCardData;
  digitalTouchData?: DigitalTouchData;
  couponData?: CoupleCoupon;
  blindQuizData?: BlindQuizQuestion;
  reactions?: Record<string, string>; // userId -> emoji
  replyToId?: string;
  isStarred?: boolean;
  isPinned?: boolean;
  isEdited?: boolean;
  isDeletedForEveryone?: boolean;
  isDeletedForMe?: boolean;
  ephemeralDuration?: number; // seconds
  expiresAt?: number;
  transportMode?: NetworkMode; // 'cloud' | 'sms' | 'proximity'
}

export interface User {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  bio: string;
  isOnline: boolean;
  lastSeen: string;
  customStatus?: string;
  avatarPath?: string;
  avatarVersion?: number;
}

export interface UserProfile {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_path: string | null;
  avatar_version: number;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface PartnerNickname {
  id: string;
  owner_user_id: string;
  partner_user_id: string;
  couple_id: string;
  nickname: string;
  created_at: string;
  updated_at: string;
}

export type CallType = 'audio' | 'video';
export type CallStatus = 'incoming' | 'outgoing' | 'missed' | 'completed' | 'declined';

export interface CallRecord {
  id: string;
  callerId: string;
  receiverId: string;
  type: CallType;
  status: CallStatus;
  timestamp: number;
  duration?: number; // in seconds
}

/* --- MIKAYLA INTIMACY MODULES TYPES --- */

export interface VaultItem {
  id: string;
  title: string;
  type: 'photo' | 'video' | 'secret_note';
  mediaUrl: string;
  thumbnailUrl?: string;
  category: 'intime' | 'souvenirs' | 'voyages' | 'capsule';
  addedBy: string;
  dateAdded: number;
  createdAt?: number;
  isViewOnce?: boolean;
  isViewed?: boolean;
  isBurned?: boolean;
  caption?: string;
  tags?: string[];
}

export interface WishlistItem {
  id: string;
  title: string;
  category: 'date_night' | 'attention' | 'fantasme' | 'voyage' | 'surprise';
  description?: string;
  addedBy?: string;
  createdBy?: string;
  likedBy?: string[]; // user IDs who liked/validated this desire
  userWished?: boolean;
  partnerWished?: boolean;
  isMatch?: boolean;
  isMatched?: boolean;
  matchedAt?: number;
  isCompleted?: boolean;
  createdAt?: number;
}

export type GameChallengeType = 'truth' | 'dare' | 'wheel';

export interface GameChallenge {
  id: string;
  type?: GameChallengeType;
  category: 'vérité' | 'défi_coquin' | 'massage_soin' | 'romantique' | 'surprise' | string;
  title: string;
  description: string;
  intensity: 1 | 2 | 3;
  target?: 'both' | 'partner' | 'user';
  isCustom?: boolean;
  createdAt?: number;
}

export interface CustomDiceConfig {
  actions: string[];
  zones: string[];
  durations: string[];
}

export type CyclePhase = 'menstruelle' | 'folliculaire' | 'ovulatoire' | 'luteale';

export interface CycleData {
  dayOfCycle: number; // e.g. 14
  cycleLength: number; // e.g. 28
  periodLength: number; // e.g. 5
  lastPeriodStartDate: string; // ISO date YYYY-MM-DD
  currentPhase: CyclePhase;
  mood: 'joyeuse' | 'câline' | 'sensible' | 'fatiguée' | 'passionnée' | 'calme';
  energyLevel: number; // 1 to 5
  notes?: string;
  careTipsForPartner: {
    title: string;
    description: string;
    actionIdea: string;
    icon: string;
  };
}

export interface ChatSettings {
  wallpaperColor: string;
  wallpaperDoodle: boolean;
  doodleOpacity: number;
  fontSize: 'small' | 'medium' | 'large';
  bubbleTheme: 'emerald' | 'violet' | 'rose' | 'midnight';
  ephemeralDuration: number;
  isBiometricEnabled: boolean;
  securityPin: string;
  blurOnBackground: boolean;
  hideChatPreview: boolean;
  readReceipts: boolean;
  hapticFeedback: boolean;
}

export type BubbleShape = 'classic' | 'capsule' | 'comic';
export type FontFamilyOption = 'system' | 'roboto' | 'mono' | 'cursive';
export type AppIconPreset = 'purple' | 'neon' | 'pink' | 'blue' | 'gold' | 'mikayla_heart' | 'monogram' | 'neon_minimal' | 'custom';
export type WallpaperPreset = 'solid' | 'doodle_dark' | 'doodle_light' | 'gradient_neon' | 'gradient_rose' | 'gradient_emerald' | 'gradient_slate' | 'custom_image';

export interface CustomColors {
  // 1. EN-TÊTE & NAVIGATION
  headerBg: string;
  headerText: string;
  tabsBg: string;
  tabsActiveIndicator: string;
  
  // 2. BULLES DE MESSAGES ENVOYÉS (Moi)
  bubbleSentBg: string;
  bubbleSentText: string;
  bubbleSentTime: string;
  tickSingle: string;
  tickDelivered: string;
  tickRead: string;
  
  // 3. BULLES DE MESSAGES REÇUS (Partenaire)
  bubbleRecvBg: string;
  bubbleRecvText: string;
  bubbleRecvSender: string;
  bubbleRecvTime: string;
  
  // 4. ÉLÉMENTS D'ACCENTUATION ET INTERFACE
  accentColor: string;
  inputBg: string;
  bottomNavBg: string;
}

export interface WallpaperConfig {
  preset: WallpaperPreset;
  customColor: string;
  customImageUrl?: string;
  opacity: number; // 0 to 100
  blur: number; // 0 to 10px
  darkOverlay: number; // 0 to 100
}

export interface TypographyConfig {
  fontSize: number; // 12 to 22
  fontFamily: FontFamilyOption;
  bubbleBorderRadius: number; // 0 to 24
  bubbleShape: BubbleShape;
  iosEmojis: boolean;
}

export interface AppThemeConfig {
  id: string;
  name: string;
  colors: CustomColors;
  wallpaper: WallpaperConfig;
  typography: TypographyConfig;
  appIcon: AppIconPreset;
}

export interface SupabaseConfig {
  url?: string;
  anonKey?: string;
  isConnected: boolean;
}

export interface CoupleSpace {
  id: string;
  pairingCode: string;
  user1Id: string;
  user2Id?: string;
  status: 'waiting' | 'paired';
  createdAt: number;
  pairedAt?: number;
}

export interface PairingState {
  isPaired: boolean;
  coupleId?: string;
  pairingCode?: string;
  role?: 'user1' | 'user2';
  partnerId?: string;
  pairedAt?: number;
}
