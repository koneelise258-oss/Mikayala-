import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  User, 
  UserProfile,
  Message, 
  CallRecord, 
  ChatSettings, 
  CallType, 
  PollData, 
  EventData, 
  LocationData,
  VaultItem,
  WishlistItem,
  GameChallenge,
  CycleData,
  CoupleCoupon,
  BlindQuizQuestion,
  ScratchCardData,
  DigitalTouchData,
  NetworkState,
  NetworkMode,
  ProximityTech,
  AppThemeConfig,
  PairingState
} from './types';
import {
  getStoredUserProfile, saveStoredUserProfile,
  getStoredPartnerProfile, saveStoredPartnerProfile,
  getStoredMessages, saveMessages,
  getStoredCalls, saveCalls,
  getStoredSettings, saveSettings,
  getStoredVaultItems, saveVaultItems,
  getStoredWishlistItems, saveWishlistItems,
  getStoredGameChallenges, saveGameChallenges,
  getStoredCycleData, saveCycleData,
  getStoredCoupons, saveCoupons,
  getStoredQuizzes, saveQuizzes,
  getSupabaseClient
} from './utils/storage';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { 
  initAnonymousAuth, 
  getStoredPairingState, 
  saveStoredPairingState,
  clearPairingState
} from './services/authService';
import { profileService } from './services/profileService';
import { 
  getMessages,
  obtenirMessages, 
  sAbonnerAuxMessages, 
  envoyerMessageTexte,
  clearSignedUrlCache
} from './services/messageService';
import { 
  formatLastSeen,
  updateUserActivity,
  setupCouplePresence,
  setupCoupleTyping,
  fetchPartnerLastSeen,
  subscribeToPartnerActivity
} from './services/presenceService';
import { 
  getStoredThemeConfig, 
  saveThemeConfig, 
  applyThemeToDOM, 
  generateDynamicFavicon 
} from './utils/themeEngine';
import { getStoredNetworkState, saveNetworkState, saveNetworkMode } from './utils/networkManager';
import { Header } from './components/Header';
import { TabsNav, ActiveTab } from './components/TabsNav';
import { BottomCoupleNav, BottomNavTab } from './components/BottomCoupleNav';
import { CoupleHubModal } from './components/CoupleHubModal';
import { NetworkModeModal } from './components/NetworkModeModal';
import { SmsImportModal } from './components/SmsImportModal';
import { ChatList } from './components/ChatList';
import { ChatView } from './components/ChatView';
import { CallsTab } from './components/CallsTab';
import { CallModal } from './components/CallModal';
import { ContactInfoModal } from './components/ContactInfoModal';
import { QRCodeModal } from './components/QRCodeModal';
import { CameraCaptureModal } from './components/CameraCaptureModal';
import { SettingsModal } from './components/SettingsModal';
import { MediaLightbox } from './components/MediaLightbox';
import { PollModal } from './components/PollModal';
import { EventModal } from './components/EventModal';
import { LocationModal } from './components/LocationModal';
import { BiometricAuthModal } from './components/BiometricAuthModal';
import { PairingModal } from './components/auth/PairingModal';
import { VaultModal } from './components/VaultModal';
import { WishlistModal } from './components/WishlistModal';
import { CoupleGameModal } from './components/CoupleGameModal';
import { CycleCareModal } from './components/CycleCareModal';
import { HeartbeatModal } from './components/HeartbeatModal';
import { PrivacyBlurOverlay } from './components/PrivacyBlurOverlay';
import { CouponsModal } from './components/CouponsModal';
import { BlindQuizModal } from './components/BlindQuizModal';
import { DigitalTouchModal } from './components/DigitalTouchModal';
import { ScratchCardModal } from './components/ScratchCardModal';
import { FakeCalculatorCamouflage } from './components/FakeCalculatorCamouflage';
import { CoupleHubView } from './components/CoupleHubView';
import { LoveTimerModal } from './components/LoveTimerModal';
import { CoupleCalendarModal } from './components/CoupleCalendarModal';
import { Lock, Star, X, CheckCheck } from 'lucide-react';
import { formatTime, formatDateDivider } from './utils/formatters';
import { soundEffects } from './utils/audio';
import { triggerHaptic } from './utils/security';

export default function App() {
  // Single Authenticated User & Partner Profiles
  const [currentUser, setCurrentUser] = useState<User>(getStoredUserProfile);
  const [partnerUser, setPartnerUser] = useState<User>(getStoredPartnerProfile);
  const [messages, setMessages] = useState<Message[]>(getStoredMessages);
  const [calls, setCalls] = useState<CallRecord[]>(getStoredCalls);
  const [settings, setSettings] = useState<ChatSettings>(getStoredSettings);
  const [themeConfig, setThemeConfig] = useState<AppThemeConfig>(getStoredThemeConfig);

  // Profile & Nickname States
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null);
  const [partnerNickname, setPartnerNickname] = useState<string | null>(null);

  // Couple Space & Pairing State
  const [pairingState, setPairingState] = useState<PairingState>(getStoredPairingState);
  const [isPairingModalOpen, setIsPairingModalOpen] = useState<boolean>(() => !getStoredPairingState().isPaired);
  const [hasNewVersion, setHasNewVersion] = useState<boolean>(false);

  // Global Partner Presence & Activity states
  const [isPartnerOnline, setIsPartnerOnline] = useState<boolean>(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState<boolean>(false);
  const [partnerLastSeen, setPartnerLastSeen] = useState<string | null>(null);
  const typingHandleRef = useRef<{ sendTypingStatus: (isTyping: boolean) => void; cleanup: () => void } | null>(null);

  // Écoute de disponibilité d'une nouvelle version PWA
  useEffect(() => {
    const handleUpdate = () => setHasNewVersion(true);
    window.addEventListener('mikayala_app_update_available', handleUpdate);
    return () => window.removeEventListener('mikayala_app_update_available', handleUpdate);
  }, []);

  // Stable function to load profiles and nicknames
  const loadProfiles = useCallback(async (uid: string, partnerId?: string | null, coupleId?: string | null) => {
    // My profile
    const myRes = await profileService.getMyProfile();
    if (myRes.success && myRes.data) {
      setMyProfile(myRes.data);
      
      // Handle signed URL for my avatar
      if (myRes.data.avatar_path) {
        const url = await profileService.getSignedAvatarUrl(myRes.data.avatar_path, myRes.data.avatar_version);
        if (url) {
          setCurrentUser(prev => ({
            ...prev,
            name: myRes.data!.display_name,
            bio: myRes.data!.bio || prev.bio,
            avatar: url
          }));
        }
      } else {
        setCurrentUser(prev => ({
          ...prev,
          name: myRes.data!.display_name,
          bio: myRes.data!.bio || prev.bio,
          avatar: undefined // Reset if no path
        }));
      }
    }

    // Partner profile & nickname
    if (partnerId) {
      const pRes = await profileService.getPartnerProfile(partnerId);
      if (pRes.success && pRes.data) {
        setPartnerProfile(pRes.data);
        
        // Handle signed URL for partner avatar
        if (pRes.data.avatar_path) {
          const url = await profileService.getSignedAvatarUrl(pRes.data.avatar_path, pRes.data.avatar_version);
          if (url) {
            setPartnerUser(prev => ({
              ...prev,
              name: pRes.data!.display_name,
              bio: pRes.data!.bio || prev.bio,
              avatar: url
            }));
          }
        } else {
          setPartnerUser(prev => ({
            ...prev,
            name: pRes.data!.display_name,
            bio: pRes.data!.bio || prev.bio,
            avatar: undefined // Reset if no path
          }));
        }
      }

      if (coupleId) {
        const nRes = await profileService.getPartnerNickname(partnerId, coupleId);
        if (nRes.success) setPartnerNickname(nRes.data || null);
      }
    }
  }, []);

  // Initialize Anonymous Supabase Auth & Fetch Profiles
  useEffect(() => {
    const initAuth = async () => {
      if (!isSupabaseConfigured()) return;
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        let uid = user?.id;
        if (!uid) {
          if (error) console.warn('[App] Aucune session active, relance initAnonymousAuth():', error.message);
          uid = await initAnonymousAuth();
        }
        if (uid) {
          const stored = getStoredPairingState();
          setCurrentUser(prev => {
            const updated = { ...prev, id: uid };
            saveStoredUserProfile(updated);
            return updated;
          });
          updateUserActivity(uid, true);
          loadProfiles(uid, stored.partnerId, stored.coupleId);
        }
      } catch (err: any) {
        console.error('[App] Erreur initialisation identité auth:', err);
      }
    };

    initAuth();
    
    // Auth Listener
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      clearSignedUrlCache();
      if (session?.user?.id) {
        const stored = getStoredPairingState();
        setCurrentUser(prev => {
          const updated = { ...prev, id: session.user.id };
          saveStoredUserProfile(updated);
          return updated;
        });
        updateUserActivity(session.user.id);
        loadProfiles(session.user.id, stored.partnerId, stored.coupleId);
      }
    });

    const handlePairingChanged = () => {
      const updated = getStoredPairingState();
      setPairingState(updated);
      if (currentUser.id) loadProfiles(currentUser.id, updated.partnerId, updated.coupleId);
    };

    window.addEventListener('mikayala_pairing_changed', handlePairingChanged);
    return () => {
      window.removeEventListener('mikayala_pairing_changed', handlePairingChanged);
      authListener?.subscription?.unsubscribe();
    };
  }, [currentUser.id, loadProfiles]);

  // Subscribe to Partner Presence, Typing and Activity globally
  useEffect(() => {
    let isMounted = true;
    const coupleId = pairingState?.coupleId;
    const currentUid = currentUser.id;
    let cleanupPresence = () => {};
    let cleanupTyping = () => {};
    let cleanupActivity = () => {};

    if (!isSupabaseConfigured() || !coupleId || !currentUid || !pairingState.isPaired) {
      setIsPartnerOnline(false);
      setIsPartnerTyping(false);
      return;
    }

    const initPresence = async () => {
      const stored = getStoredPairingState();
      let partnerUid = pairingState?.partnerId || stored.partnerId || null;
      
      // 1. Presence
      cleanupPresence = setupCouplePresence(coupleId, currentUid, partnerUid, (online) => {
        if (isMounted) setIsPartnerOnline(online);
      });

      // 2. Typing
      const typing = setupCoupleTyping(coupleId, currentUid, partnerUid, (typing) => {
        if (isMounted) setIsPartnerTyping(typing);
      });
      typingHandleRef.current = typing;
      cleanupTyping = typing.cleanup;

      // 3. Activity (Last Seen)
      if (partnerUid) {
        fetchPartnerLastSeen(partnerUid).then(ls => {
          if (isMounted && ls) setPartnerLastSeen(ls);
        });
        cleanupActivity = subscribeToPartnerActivity(partnerUid, (ls) => {
          if (isMounted) setPartnerLastSeen(ls);
        });
      }
    };

    initPresence();

    return () => {
      isMounted = false;
      cleanupPresence();
      cleanupTyping();
      cleanupActivity();
      typingHandleRef.current = null;
    };
  }, [pairingState.isPaired, pairingState.coupleId, currentUser.id]);

  // Periodic and event-driven user activity tracker for last seen ("Vu à...")
  useEffect(() => {
    const currentUid = currentUser.id;
    if (!currentUid || !isSupabaseConfigured()) return;

    updateUserActivity(currentUid);

    // Periodic heartbeat every 60 seconds (throttled internally to min 45s)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        updateUserActivity(currentUid);
      }
    }, 60000);

    const handleActiveEvent = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        updateUserActivity(currentUid);
      }
    };

    const handleBeforeUnload = () => {
      updateUserActivity(currentUid, true);
    };

    document.addEventListener('visibilitychange', handleActiveEvent);
    window.addEventListener('focus', handleActiveEvent);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleActiveEvent);
      window.removeEventListener('focus', handleActiveEvent);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser.id]);

  // Synchronize messages with Supabase public.messages in real time
  useEffect(() => {
    const coupleId = pairingState?.coupleId || getStoredPairingState().coupleId;
    if (!pairingState?.isPaired || !coupleId) return;

    getMessages(coupleId)
      .then(fetched => {
        setMessages(fetched);
      })
      .catch(err => console.warn('[App] Fetch messages error:', err));

    const unsubscribe = sAbonnerAuxMessages(coupleId, (newMsg: Message) => {
      setMessages(prev => {
        const idx = prev.findIndex(m => m.id === newMsg.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = newMsg;
          return updated.sort((a, b) => a.timestamp - b.timestamp);
        }
        return [...prev, newMsg].sort((a, b) => a.timestamp - b.timestamp);
      });
    });

    return () => {
      unsubscribe();
    };
  }, [pairingState?.coupleId, pairingState?.isPaired]);

  // Initialize and apply dynamic theme variables & dynamic favicon
  useEffect(() => {
    applyThemeToDOM(themeConfig);
    const monogram = `${currentUser.name[0] || 'M'} & ${partnerUser.name[0] || 'P'}`;
    generateDynamicFavicon(themeConfig.appIcon || 'mikayala_heart', monogram);
  }, [themeConfig, currentUser.name, partnerUser.name]);

  // Intimate Modules States
  const [vaultItems, setVaultItems] = useState<VaultItem[]>(getStoredVaultItems);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>(getStoredWishlistItems);
  const [gameChallenges, setGameChallenges] = useState<GameChallenge[]>(getStoredGameChallenges);
  const [cycleData, setCycleData] = useState<CycleData>(getStoredCycleData);
  const [coupons, setCoupons] = useState<CoupleCoupon[]>(getStoredCoupons);
  const [quizzes, setQuizzes] = useState<BlindQuizQuestion[]>(getStoredQuizzes);

  // Connectivity, Sync & Tri-Mode Network States
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [networkState, setNetworkState] = useState<NetworkState>(getStoredNetworkState);
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState<boolean>(false);
  const [isSmsImportModalOpen, setIsSmsImportModalOpen] = useState<boolean>(false);
  const [isCoupleHubOpen, setIsCoupleHubOpen] = useState<boolean>(false);
  const [activeBottomTab, setActiveBottomTab] = useState<BottomNavTab>('chat');

  // Navigation & View states
  const [activeTab, setActiveTab] = useState<ActiveTab>('discussions');
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Biometrics & Security Locks
  const [isAppAuthenticated, setIsAppAuthenticated] = useState<boolean>(!settings.isBiometricEnabled);
  const [isVaultAuthenticated, setIsVaultAuthenticated] = useState<boolean>(false);
  const [showBiometricForVault, setShowBiometricForVault] = useState<boolean>(false);
  const [isPrivacyBlurred, setIsPrivacyBlurred] = useState<boolean>(false);

  // Camouflage State (Fake Calculator)
  const [isCamouflageActive, setIsCamouflageActive] = useState<boolean>(false);

  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [activeCall, setActiveCall] = useState<{ isOpen: boolean; type: CallType }>({ isOpen: false, type: 'video' });
  const [isContactInfoOpen, setIsContactInfoOpen] = useState(false);
  const [isQRCodeOpen, setIsQRCodeOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStarredOpen, setIsStarredOpen] = useState(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [activeMediaLightbox, setActiveMediaLightbox] = useState<Message | null>(null);

  // Intimacy Modals
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isGamesOpen, setIsGamesOpen] = useState(false);
  const [isCycleCareOpen, setIsCycleCareOpen] = useState(false);
  const [isHeartbeatOpen, setIsHeartbeatOpen] = useState(false);
  const [isCouponsOpen, setIsCouponsOpen] = useState(false);
  const [isBlindQuizOpen, setIsBlindQuizOpen] = useState(false);
  const [isDigitalTouchOpen, setIsDigitalTouchOpen] = useState(false);
  const [isScratchCardOpen, setIsScratchCardOpen] = useState(false);
  const [isLoveTimerOpen, setIsLoveTimerOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Overlay state: discussion masked by modals, sub-features, or camouflage
  const isAnyOverlayOpen = Boolean(
    isCamouflageActive ||
    (!isAppAuthenticated && settings.isBiometricEnabled) ||
    isSettingsOpen ||
    isVaultOpen ||
    isWishlistOpen ||
    isGamesOpen ||
    isCycleCareOpen ||
    isHeartbeatOpen ||
    isCouponsOpen ||
    isBlindQuizOpen ||
    isDigitalTouchOpen ||
    isScratchCardOpen ||
    isContactInfoOpen ||
    isQRCodeOpen ||
    isCameraOpen ||
    isStarredOpen ||
    activeMediaLightbox !== null ||
    isPollModalOpen ||
    isEventModalOpen ||
    isLocationModalOpen ||
    isNetworkModalOpen ||
    isSmsImportModalOpen ||
    isCoupleHubOpen ||
    isLoveTimerOpen ||
    isCalendarOpen ||
    activeCall.isOpen
  );

  const isMobileChatActive = Boolean(isChatOpen && !isAnyOverlayOpen);
  const isDesktopChatActive = Boolean(!isAnyOverlayOpen);

  // Save to LocalStorage whenever state changes
  useEffect(() => { saveStoredUserProfile(currentUser); }, [currentUser]);
  useEffect(() => { saveStoredPartnerProfile(partnerUser); }, [partnerUser]);
  useEffect(() => { saveMessages(messages); }, [messages]);
  useEffect(() => { saveCalls(calls); }, [calls]);
  useEffect(() => { saveSettings(settings); }, [settings]);
  useEffect(() => { saveVaultItems(vaultItems); }, [vaultItems]);
  useEffect(() => { saveWishlistItems(wishlistItems); }, [wishlistItems]);
  useEffect(() => { saveGameChallenges(gameChallenges); }, [gameChallenges]);
  useEffect(() => { saveCycleData(cycleData); }, [cycleData]);
  useEffect(() => { saveCoupons(coupons); }, [coupons]);
  useEffect(() => { saveQuizzes(quizzes); }, [quizzes]);

  // Shake Gesture Detection for Camouflage Mode (Deactivated for now)
  /*
  useEffect(() => {
    let lastX: number | null = null;
    let lastY: number | null = null;
    let lastZ: number | null = null;
    let lastUpdate = 0;
    const SHAKE_THRESHOLD = 15;

    const handleMotion = (e: DeviceMotionEvent) => {
      const current = e.accelerationIncludingGravity;
      if (!current || current.x === null) return;

      const currentTime = Date.now();
      if ((currentTime - lastUpdate) > 100) {
        const diffTime = currentTime - lastUpdate;
        lastUpdate = currentTime;

        const x = current.x || 0;
        const y = current.y || 0;
        const z = current.z || 0;

        if (lastX !== null && lastY !== null && lastZ !== null) {
          const speed = Math.abs(x + y + z - lastX - lastY - lastZ) / diffTime * 10000;
          if (speed > SHAKE_THRESHOLD * 50) {
            setIsCamouflageActive(true);
            triggerHaptic([100, 50, 100]);
          }
        }

        lastX = x;
        lastY = y;
        lastZ = z;
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, []);
  */

  // Online / Offline Listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setNetworkState(prev => {
        const next = { ...prev, isCloudOnline: true };
        saveNetworkState(next);
        return next;
      });
    };
    const handleOffline = () => {
      setIsOnline(false);
      setNetworkState(prev => {
        const next = { ...prev, isCloudOnline: false };
        saveNetworkState(next);
        return next;
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSelectNetworkMode = (mode: NetworkMode, tech?: ProximityTech) => {
    const updated = saveNetworkMode(mode, tech);
    setNetworkState(updated);
  };

  const handleImportSms = (smsText: string) => {
    handleSendMessage({
      senderId: partnerUser.id,
      receiverId: currentUser.id,
      type: 'text',
      content: smsText,
      transportMode: 'sms',
      status: 'read'
    });
    setIsChatOpen(true);
  };

  const handleBottomNavSelect = (tab: BottomNavTab) => {
    if (tab === 'vault') {
      handleOpenVault();
      return;
    }
    if (tab === 'settings') {
      setIsSettingsOpen(true);
      return;
    }
    setActiveBottomTab(tab);
    if (tab === 'chat') {
      setActiveTab('discussions');
      setIsChatOpen(false);
    }
  };

  // Anti-Discretion Blur on window blur / tab switch / minimize
  useEffect(() => {
    if (!settings.antiScreenshotBlur) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPrivacyBlurred(true);
      }
    };

    const handleWindowBlur = () => {
      setIsPrivacyBlurred(true);
    };

    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [settings.antiScreenshotBlur]);

  // Mark messages as read when opening chat (local fallback when not paired)
  useEffect(() => {
    if (isChatOpen && !isAnyOverlayOpen && typeof document !== 'undefined' && document.visibilityState === 'visible') {
      setMessages(prev =>
        prev.map(m => {
          if (m.receiverId === currentUser.id && m.status !== 'read') {
            return { ...m, status: 'read' };
          }
          return m;
        })
      );
    }
  }, [isChatOpen, isAnyOverlayOpen, currentUser.id]);

  // Message Operations
  const handleSendMessage = (msgData: Partial<Message>) => {
    const msgId = msgData.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newMsg: Message = {
      id: msgId,
      senderId: msgData.senderId || currentUser.id,
      receiverId: msgData.receiverId || partnerUser.id,
      timestamp: msgData.timestamp || Date.now(),
      status: msgData.status || 'sent',
      type: msgData.type || 'text',
      content: msgData.content || '',
      ...msgData
    };

    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === newMsg.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = newMsg;
        return updated;
      }
      return [...prev, newMsg];
    });

    // If offline, increment pending counter
    if (!isOnline) {
      setPendingSyncCount(prev => prev + 1);
    }

    // Simulation dynamique du cycle des coches (Envoyé -> Reçu -> Lu) en mode démo/local
    const isPaired = pairingState?.isPaired && pairingState?.coupleId && isSupabaseConfigured();
    if (!isPaired) {
      // Étape 1 : Distribué / Reçu sur l'appareil (2 coches grises) après 800ms
      setTimeout(() => {
        setMessages(prev =>
          prev.map(m => (m.id === msgId && m.status === 'sent' ? { ...m, status: 'delivered', deliveredAt: new Date().toISOString() } : m))
        );
      }, 800);

      // Étape 2 : Lu par le partenaire (2 coches colorées Mikayala) après 2200ms
      setTimeout(() => {
        setMessages(prev =>
          prev.map(m => (m.id === msgId && (m.status === 'sent' || m.status === 'delivered') ? { ...m, status: 'read', readAt: new Date().toISOString() } : m))
        );
      }, 2200);
    }
  };

  const handleUpdateMessage = (msgId: string, updates: Partial<Message>) => {
    setMessages(prev =>
      prev.map(m => (m.id === msgId ? { ...m, ...updates } : m))
    );
  };

  const handleDeleteMessage = (msgId: string, forEveryone: boolean) => {
    if (forEveryone) {
      setMessages(prev =>
        prev.map(m =>
          m.id === msgId
            ? { ...m, isDeleted: true, content: 'Ce message intime a été effacé.' }
            : m
        )
      );
    } else {
      setMessages(prev => prev.filter(m => m.id !== msgId));
    }
  };

  // Calls Handler
  const handleStartCall = (type: CallType) => {
    setActiveCall({ isOpen: true, type });
    triggerHaptic(60);
    soundEffects.playHeartbeat();
  };

  const handleEndCall = (durationSec: number) => {
    const newCall: CallRecord = {
      id: `call_${Date.now()}`,
      callerId: currentUser.id,
      receiverId: partnerUser.id,
      timestamp: Date.now(),
      type: activeCall.type,
      duration: durationSec,
      status: durationSec > 0 ? 'completed' : 'declined'
    };

    setCalls(prev => [newCall, ...prev]);
    setActiveCall({ isOpen: false, type: 'video' });
  };

  // Vault Item Handlers
  const handleAddVaultItem = (item: Omit<VaultItem, 'id' | 'createdAt'>) => {
    const newItem: VaultItem = {
      ...item,
      id: `vault_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: Date.now()
    };
    setVaultItems(prev => [newItem, ...prev]);
    triggerHaptic(50);
  };

  const handleDeleteVaultItem = (id: string) => {
    setVaultItems(prev => prev.filter(v => v.id !== id));
  };

  const handleViewOnceBurned = (id: string) => {
    setVaultItems(prev =>
      prev.map(v => (v.id === id ? { ...v, isBurned: true } : v))
    );
  };

  // Wishlist Handlers
  const handleAddWishlistItem = (item: Omit<WishlistItem, 'id' | 'createdAt' | 'isMatched' | 'likedBy'>) => {
    const newItem: WishlistItem = {
      ...item,
      id: `wish_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: Date.now(),
      addedBy: currentUser.id,
      likedBy: [currentUser.id],
      isMatched: false,
      isMatch: false,
      isCompleted: false
    };
    setWishlistItems(prev => [newItem, ...prev]);
  };

  const handleToggleWish = (id: string) => {
    setWishlistItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const currentLiked = item.likedBy || [];
          const isLikedByMe = currentLiked.includes(currentUser.id);
          const newLiked = isLikedByMe
            ? currentLiked.filter(uid => uid !== currentUser.id)
            : [...currentLiked, currentUser.id];
          
          const isMatch = newLiked.length >= 2;
          if (isMatch && !item.isMatched && !item.isMatch) {
            soundEffects.playMatchSound();
            triggerHaptic([100, 50, 200, 50, 300]);
          }
          return {
            ...item,
            likedBy: newLiked,
            isMatched: isMatch,
            isMatch: isMatch,
            matchedAt: isMatch ? (item.matchedAt || Date.now()) : undefined
          };
        }
        return item;
      })
    );
  };

  const handleToggleCompleteWish = (id: string) => {
    setWishlistItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
      )
    );
  };

  const handleEditWishlistItem = (id: string, updates: Partial<WishlistItem>) => {
    setWishlistItems(prev =>
      prev.map(item => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleDeleteWishlistItem = (id: string) => {
    setWishlistItems(prev => prev.filter(item => item.id !== id));
  };

  // Couples Coupons Handlers
  const handleCreateCoupon = (newCoupon: Omit<CoupleCoupon, 'id' | 'createdAt' | 'status'>) => {
    const coupon: CoupleCoupon = {
      ...newCoupon,
      id: `coupon_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: Date.now(),
      status: 'available'
    };
    setCoupons(prev => [coupon, ...prev]);

    // Send coupon into chat
    handleSendMessage({
      type: 'couple_coupon',
      content: `🎁 Bon d'Amour offert : ${coupon.title}`,
      couponData: coupon
    });
  };

  const handleClaimCoupon = (couponId: string) => {
    setCoupons(prev =>
      prev.map(c =>
        c.id === couponId ? { ...c, status: 'claimed', claimedAt: Date.now() } : c
      )
    );
    // Also update any message containing this coupon
    setMessages(prev =>
      prev.map(m =>
        m.couponData?.id === couponId
          ? { ...m, couponData: { ...m.couponData, status: 'claimed', claimedAt: Date.now() } }
          : m
      )
    );
    soundEffects.playSent();
    triggerHaptic(50);
  };

  const handleRedeemCoupon = (couponId: string) => {
    setCoupons(prev =>
      prev.map(c =>
        c.id === couponId ? { ...c, status: 'redeemed', redeemedAt: Date.now() } : c
      )
    );
    // Also update message
    setMessages(prev =>
      prev.map(m =>
        m.couponData?.id === couponId
          ? { ...m, couponData: { ...m.couponData, status: 'redeemed', redeemedAt: Date.now() } }
          : m
      )
    );
    soundEffects.playHeartbeat();
    triggerHaptic([100, 50, 150]);
  };

  // Blind Quiz Handlers
  const handleAnswerQuiz = (quizId: string, answerText: string) => {
    setQuizzes(prev =>
      prev.map(q => {
        if (q.id === quizId) {
          const updatedAnswers = {
            ...q.answers,
            [currentUser.id]: {
              userId: currentUser.id,
              answerText,
              answeredAt: Date.now()
            }
          };

          const bothAnswered = Object.keys(updatedAnswers).length >= 2;

          const updatedQuiz: BlindQuizQuestion = {
            ...q,
            answers: updatedAnswers,
            isRevealed: bothAnswered,
            revealedAt: bothAnswered ? Date.now() : undefined
          };

          // Also update messages in chat
          setMessages(msgList =>
            msgList.map(m =>
              m.blindQuizData?.id === quizId
                ? { ...m, blindQuizData: updatedQuiz }
                : m
            )
          );

          if (bothAnswered) {
            soundEffects.playReaction();
            triggerHaptic([150, 80, 250]);
          }

          return updatedQuiz;
        }
        return q;
      })
    );
  };

  const handleCreateQuiz = (newQuiz: Omit<BlindQuizQuestion, 'id' | 'createdAt' | 'answers' | 'isRevealed'>) => {
    const quiz: BlindQuizQuestion = {
      ...newQuiz,
      id: `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: Date.now(),
      answers: {},
      isRevealed: false
    };
    setQuizzes(prev => [quiz, ...prev]);

    // Send quiz into chat
    handleSendMessage({
      type: 'blind_quiz',
      content: `🔒 Quiz Double Aveugle : "${quiz.question}"`,
      blindQuizData: quiz
    });
  };

  // Digital Touch Handler
  const handleSendDigitalTouch = (previewUrl: string, strokes: any[], hasHeartbeat: boolean) => {
    const digitalTouchData: DigitalTouchData = {
      previewUrl,
      strokes,
      hasHeartbeat,
      color: '#00b894',
      sentAt: Date.now()
    };

    handleSendMessage({
      type: 'digital_touch',
      content: 'Toucher Lumineux Partagé ✨',
      digitalTouchData
    });
    soundEffects.playSent();
    triggerHaptic(50);
  };

  // Scratch Card Handler
  const handleSendScratchCard = (cardData: Omit<ScratchCardData, 'id' | 'isScratched' | 'scratchProgress'>) => {
    const scratchCardData: ScratchCardData = {
      ...cardData,
      id: `scratch_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      isScratched: false,
      scratchProgress: 0
    };

    handleSendMessage({
      type: 'scratch_card',
      content: 'Message Secret à Gratter 🎁',
      scratchCardData
    });
    soundEffects.playSent();
    triggerHaptic(50);
  };

  // Vault Gate - Always requires authentication on each entry & exit
  const handleOpenVault = () => {
    // Always require authentication on entry
    setShowBiometricForVault(true);
  };

  const handleCloseVault = () => {
    setIsVaultOpen(false);
    setIsVaultAuthenticated(false);
    setShowBiometricForVault(false);
  };

  // Starred messages
  const starredMessages = messages.filter(m => m.isStarred);

  return (
    <div className="h-[100dvh] w-full bg-[#0a0714] overflow-hidden select-none flex flex-col">
      {/* App Container - Responsive Mobile, Tablet & Desktop */}
      <div className="w-full h-full flex flex-col md:flex-row bg-[#130f26] relative overflow-hidden">
        
        {/* Mobile View: Either ChatView or Main Home */}
        <div className="flex-1 flex flex-col h-full md:hidden relative overflow-hidden">
          {isChatOpen ? (
            /* Active Chat View on Mobile */
            <div className="flex-1 flex flex-col h-full bg-[#130f26] relative overflow-hidden">
              <ChatView
                currentUser={currentUser}
                partnerUser={partnerUser}
                partnerProfile={partnerProfile}
                partnerNickname={partnerNickname}
                messages={messages}
                settings={settings}
                networkState={networkState}
                isChatActive={isMobileChatActive}
                onOpenNetworkModal={() => setIsNetworkModalOpen(true)}
                onOpenSmsImport={() => setIsSmsImportModalOpen(true)}
                onBack={() => setIsChatOpen(false)}
                onSendMessage={handleSendMessage}
                onUpdateMessage={handleUpdateMessage}
                onDeleteMessage={handleDeleteMessage}
                onStartCall={handleStartCall}
                onOpenContactInfo={() => setIsContactInfoOpen(true)}
                onOpenCamera={() => setIsCameraOpen(true)}
                onOpenMediaLightbox={(msg) => setActiveMediaLightbox(msg)}
                onOpenPollModal={() => setIsPollModalOpen(true)}
                onOpenEventModal={() => setIsEventModalOpen(true)}
                onOpenLocationModal={() => setIsLocationModalOpen(true)}
                onOpenVault={handleOpenVault}
                onOpenWishlist={() => setIsWishlistOpen(true)}
                onOpenGames={() => setIsGamesOpen(true)}
                onOpenCycleCare={() => setIsCycleCareOpen(true)}
                onOpenHeartbeat={() => setIsHeartbeatOpen(true)}
                onOpenCoupons={() => setIsCouponsOpen(true)}
                onOpenBlindQuiz={() => setIsBlindQuizOpen(true)}
                onOpenDigitalTouch={() => setIsDigitalTouchOpen(true)}
                onOpenScratchCard={() => setIsScratchCardOpen(true)}
                onClaimCoupon={handleClaimCoupon}
                onRedeemCoupon={handleRedeemCoupon}
                isPartnerOnline={isPartnerOnline}
                isPartnerTyping={isPartnerTyping}
                partnerLastSeen={partnerLastSeen}
                sendTypingStatus={(typing) => typingHandleRef.current?.sendTypingStatus(typing)}
              />
            </div>
          ) : (
            /* Main Home View on Mobile */
            <div className="flex-1 flex flex-col h-full bg-[#130f26] relative overflow-hidden">
              <Header
                currentUser={currentUser}
                myProfile={myProfile}
                partnerUser={partnerUser}
                partnerProfile={partnerProfile}
                partnerNickname={partnerNickname}
                networkState={networkState}
                onOpenNetworkModal={() => setIsNetworkModalOpen(true)}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenQRCode={() => setIsQRCodeOpen(true)}
                onOpenCamera={() => setIsCameraOpen(true)}
                onOpenStarred={() => setIsStarredOpen(true)}
                onOpenCamouflage={() => setIsCamouflageActive(true)}
                onOpenThemeCustomizer={() => setIsSettingsOpen(true)}
                onSearchToggle={() => {
                  setIsSearching(!isSearching);
                  if (isSearching) setSearchQuery('');
                }}
                isSearching={isSearching}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                isOnline={isOnline}
                pendingSyncCount={pendingSyncCount}
                isPartnerOnline={isPartnerOnline}
                isPartnerTyping={isPartnerTyping}
                partnerLastSeen={partnerLastSeen}
              />

              {activeBottomTab === 'games' ? (
                <div className="flex-1 overflow-y-auto relative p-3">
                  <CoupleHubView
                    currentUser={currentUser}
                    partnerUser={partnerUser}
                    onOpenCoupons={() => setIsCouponsOpen(true)}
                    onOpenBlindQuiz={() => setIsBlindQuizOpen(true)}
                    onOpenLoveTimer={() => setIsLoveTimerOpen(true)}
                    onOpenWishlist={() => setIsWishlistOpen(true)}
                    onOpenGames={() => setIsGamesOpen(true)}
                    onOpenCalendar={() => setIsCalendarOpen(true)}
                    onOpenDigitalTouch={() => setIsDigitalTouchOpen(true)}
                    onOpenHeartbeat={() => setIsHeartbeatOpen(true)}
                    onOpenCycleCare={() => setIsCycleCareOpen(true)}
                    onOpenScratchCard={() => setIsScratchCardOpen(true)}
                    coupons={coupons as any}
                    quizzes={quizzes as any}
                    wishlistItems={wishlistItems}
                  />
                </div>
              ) : (
                <>
                  <TabsNav
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    unreadCount={messages.filter(m => m.receiverId === currentUser.id && m.status !== 'read').length}
                    missedCallsCount={calls.filter(c => c.status === 'missed').length}
                  />

                  <div className="flex-1 overflow-y-auto relative">
                    {activeTab === 'discussions' ? (
                      <ChatList
                        currentUser={currentUser}
                        partnerUser={partnerUser}
                        partnerProfile={partnerProfile}
                        partnerNickname={partnerNickname}
                        messages={messages}
                        onSelectChat={() => setIsChatOpen(true)}
                        onOpenNewChat={() => setIsQRCodeOpen(true)}
                        onOpenVault={handleOpenVault}
                        onOpenWishlist={() => setIsWishlistOpen(true)}
                        onOpenGames={() => setIsGamesOpen(true)}
                        onOpenLoveTimer={() => setIsLoveTimerOpen(true)}
                        onOpenCalendar={() => setIsCalendarOpen(true)}
                        onOpenCoupons={() => setIsCouponsOpen(true)}
                        onOpenQuiz={() => setIsBlindQuizOpen(true)}
                        onOpenDigitalTouch={() => setIsDigitalTouchOpen(true)}
                        onOpenScratchCard={() => setIsScratchCardOpen(true)}
                        searchQuery={searchQuery}
                        hideChatPreview={settings.hideChatPreview}
                      />
                    ) : (
                      <CallsTab
                        currentUser={currentUser}
                        partnerUser={partnerUser}
                        calls={calls}
                        onStartCall={handleStartCall}
                      />
                    )}
                  </div>
                </>
              )}

              <BottomCoupleNav
                activeTab={activeBottomTab}
                onSelectTab={handleBottomNavSelect}
                unreadCount={messages.filter(m => m.receiverId === currentUser.id && m.status !== 'read').length}
                isVaultLocked={!isVaultAuthenticated}
              />
            </div>
          )}
        </div>

        {/* Tablet & Desktop View: Split Sidebar (Left) + Chat View (Right) */}
        <div className="hidden md:flex flex-row w-full h-full">
          {/* Left Navigation Sidebar */}
          <div className="w-[340px] lg:w-[390px] xl:w-[420px] shrink-0 border-r border-[#2d2254] flex flex-col h-full bg-[#130f26] relative z-20">
            <Header
              currentUser={currentUser}
              myProfile={myProfile}
              partnerUser={partnerUser}
              partnerProfile={partnerProfile}
              partnerNickname={partnerNickname}
              networkState={networkState}
              onOpenNetworkModal={() => setIsNetworkModalOpen(true)}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenQRCode={() => setIsQRCodeOpen(true)}
              onOpenCamera={() => setIsCameraOpen(true)}
              onOpenStarred={() => setIsStarredOpen(true)}
              onOpenCamouflage={() => setIsCamouflageActive(true)}
              onOpenThemeCustomizer={() => setIsSettingsOpen(true)}
              onSearchToggle={() => {
                setIsSearching(!isSearching);
                if (isSearching) setSearchQuery('');
              }}
              isSearching={isSearching}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              isOnline={isOnline}
              pendingSyncCount={pendingSyncCount}
              isPartnerOnline={isPartnerOnline}
              isPartnerTyping={isPartnerTyping}
              partnerLastSeen={partnerLastSeen}
            />

            {activeBottomTab === 'games' ? (
              <div className="flex-1 overflow-y-auto relative p-3">
                <CoupleHubView
                  currentUser={currentUser}
                  partnerUser={partnerUser}
                  onOpenCoupons={() => setIsCouponsOpen(true)}
                  onOpenBlindQuiz={() => setIsBlindQuizOpen(true)}
                  onOpenLoveTimer={() => setIsLoveTimerOpen(true)}
                  onOpenWishlist={() => setIsWishlistOpen(true)}
                  onOpenGames={() => setIsGamesOpen(true)}
                  onOpenCalendar={() => setIsCalendarOpen(true)}
                  onOpenDigitalTouch={() => setIsDigitalTouchOpen(true)}
                  onOpenHeartbeat={() => setIsHeartbeatOpen(true)}
                  onOpenCycleCare={() => setIsCycleCareOpen(true)}
                  onOpenScratchCard={() => setIsScratchCardOpen(true)}
                  coupons={coupons as any}
                  quizzes={quizzes as any}
                  wishlistItems={wishlistItems}
                />
              </div>
            ) : (
              <>
                <TabsNav
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  unreadCount={messages.filter(m => m.receiverId === currentUser.id && m.status !== 'read').length}
                  missedCallsCount={calls.filter(c => c.status === 'missed').length}
                />

                <div className="flex-1 overflow-y-auto relative">
                  {activeTab === 'discussions' ? (
                    <ChatList
                      currentUser={currentUser}
                      partnerUser={partnerUser}
                      partnerProfile={partnerProfile}
                      partnerNickname={partnerNickname}
                      messages={messages}
                      onSelectChat={() => setIsChatOpen(true)}
                      onOpenNewChat={() => setIsQRCodeOpen(true)}
                      onOpenVault={handleOpenVault}
                      onOpenWishlist={() => setIsWishlistOpen(true)}
                      onOpenGames={() => setIsGamesOpen(true)}
                      onOpenLoveTimer={() => setIsLoveTimerOpen(true)}
                      onOpenCalendar={() => setIsCalendarOpen(true)}
                      onOpenCoupons={() => setIsCouponsOpen(true)}
                      onOpenQuiz={() => setIsBlindQuizOpen(true)}
                      onOpenDigitalTouch={() => setIsDigitalTouchOpen(true)}
                      onOpenScratchCard={() => setIsScratchCardOpen(true)}
                      searchQuery={searchQuery}
                      hideChatPreview={settings.hideChatPreview}
                    />
                  ) : (
                    <CallsTab
                      currentUser={currentUser}
                      partnerUser={partnerUser}
                      calls={calls}
                      onStartCall={handleStartCall}
                    />
                  )}
                </div>
              </>
            )}

            <BottomCoupleNav
              activeTab={activeBottomTab}
              onSelectTab={handleBottomNavSelect}
              unreadCount={messages.filter(m => m.receiverId === currentUser.id && m.status !== 'read').length}
              isVaultLocked={!isVaultAuthenticated}
            />
          </div>

          {/* Right Main Chat Area */}
          <div className="flex-1 flex flex-col h-full bg-[#130f26] relative overflow-hidden">
            <ChatView
              currentUser={currentUser}
              partnerUser={partnerUser}
              messages={messages}
              settings={settings}
              networkState={networkState}
              isChatActive={isDesktopChatActive}
              onOpenNetworkModal={() => setIsNetworkModalOpen(true)}
              onOpenSmsImport={() => setIsSmsImportModalOpen(true)}
              onBack={() => setIsChatOpen(false)}
              onSendMessage={handleSendMessage}
              onUpdateMessage={handleUpdateMessage}
              onDeleteMessage={handleDeleteMessage}
              onStartCall={handleStartCall}
              onOpenContactInfo={() => setIsContactInfoOpen(true)}
              onOpenCamera={() => setIsCameraOpen(true)}
              onOpenMediaLightbox={(msg) => setActiveMediaLightbox(msg)}
              onOpenPollModal={() => setIsPollModalOpen(true)}
              onOpenEventModal={() => setIsEventModalOpen(true)}
              onOpenLocationModal={() => setIsLocationModalOpen(true)}
              onOpenVault={handleOpenVault}
              onOpenWishlist={() => setIsWishlistOpen(true)}
              onOpenGames={() => setIsGamesOpen(true)}
              onOpenCycleCare={() => setIsCycleCareOpen(true)}
              onOpenHeartbeat={() => setIsHeartbeatOpen(true)}
              onOpenCoupons={() => setIsCouponsOpen(true)}
              onOpenBlindQuiz={() => setIsBlindQuizOpen(true)}
              onOpenDigitalTouch={() => setIsDigitalTouchOpen(true)}
              onOpenScratchCard={() => setIsScratchCardOpen(true)}
              onClaimCoupon={handleClaimCoupon}
              onRedeemCoupon={handleRedeemCoupon}
              isPartnerOnline={isPartnerOnline}
              isPartnerTyping={isPartnerTyping}
              partnerLastSeen={partnerLastSeen}
              sendTypingStatus={(typing) => typingHandleRef.current?.sendTypingStatus(typing)}
            />
          </div>
        </div>

      </div>

      {/* Tri-Mode Network Modal */}
      <NetworkModeModal
        isOpen={isNetworkModalOpen}
        onClose={() => setIsNetworkModalOpen(false)}
        networkState={networkState}
        partnerUser={partnerUser}
        onSelectMode={handleSelectNetworkMode}
      />

      {/* SMS Import Modal */}
      <SmsImportModal
        isOpen={isSmsImportModalOpen}
        onClose={() => setIsSmsImportModalOpen(false)}
        partnerUser={partnerUser}
        onImportSms={handleImportSms}
      />

      {/* Centralized Couple Hub Modal (Jeux, Désirs, Quiz, Bons) */}
      <CoupleHubModal
        isOpen={isCoupleHubOpen}
        onClose={() => setIsCoupleHubOpen(false)}
        onOpenGames={() => setIsGamesOpen(true)}
        onOpenWishlist={() => setIsWishlistOpen(true)}
        onOpenCoupons={() => setIsCouponsOpen(true)}
        onOpenBlindQuiz={() => setIsBlindQuizOpen(true)}
        onOpenDigitalTouch={() => setIsDigitalTouchOpen(true)}
        onOpenHeartbeat={() => setIsHeartbeatOpen(true)}
        onOpenCycleCare={() => setIsCycleCareOpen(true)}
        onOpenScratchCard={() => setIsScratchCardOpen(true)}
      />

      {/* Camouflage Fake Calculator Mode */}
      {isCamouflageActive && (
        <FakeCalculatorCamouflage
          isOpen={isCamouflageActive}
          onClose={() => setIsCamouflageActive(false)}
          secretPin={settings.pinCode || '2026'}
        />
      )}

      {/* Couple Space Anonymous Pairing Modal */}
      {isPairingModalOpen && (
        <PairingModal
          isOpen={isPairingModalOpen}
          onPairingComplete={(pin, newPairingState) => {
            setPairingState(newPairingState);
            saveStoredPairingState(newPairingState);

            const updatedSettings = {
              ...settings,
              securityPin: pin,
              isBiometricEnabled: true
            };
            setSettings(updatedSettings);
            saveSettings(updatedSettings);

            setIsPairingModalOpen(false);
            setIsAppAuthenticated(true);
            triggerHaptic([50, 50, 100]);
          }}
          onClose={() => setIsPairingModalOpen(false)}
          canDismiss={pairingState.isPaired}
        />
      )}

      {/* Main App Biometric Gate on Launch */}
      {settings.isBiometricEnabled && !isAppAuthenticated && !isPairingModalOpen && (
        <BiometricAuthModal
          isOpen={!isAppAuthenticated && !isPairingModalOpen}
          onSuccess={() => setIsAppAuthenticated(true)}
          expectedPin={settings.securityPin || '2026'}
          title="Mikayala Protégé"
          subtitle="Authentification biométrique requise pour accéder au sanctuaire."
        />
      )}

      {/* Vault Biometric Gate */}
      {showBiometricForVault && (
        <BiometricAuthModal
          isOpen={showBiometricForVault}
          onSuccess={() => {
            setShowBiometricForVault(false);
            setIsVaultAuthenticated(true);
            setIsVaultOpen(true);
          }}
          onClose={() => {
            setShowBiometricForVault(false);
            setIsVaultAuthenticated(false);
          }}
          onCancel={() => {
            setShowBiometricForVault(false);
            setIsVaultAuthenticated(false);
          }}
          expectedPin={settings.securityPin || '2026'}
          title="Accès Coffre-Fort Intime"
          subtitle="Confirmez votre empreinte ou code secret pour déverrouiller vos photos et vidéos privées."
        />
      )}

      {/* Anti-Discretion Privacy Blur Overlay */}
      {settings.blurOnBackground && isPrivacyBlurred && (
        <PrivacyBlurOverlay
          isBlurred={isPrivacyBlurred}
          onUnlock={() => setIsPrivacyBlurred(false)}
        />
      )}

      {/* Intimate Modules: Bons de Couple (Coupons) */}
      {isCouponsOpen && (
        <CouponsModal
          isOpen={isCouponsOpen}
          onClose={() => setIsCouponsOpen(false)}
          coupons={coupons}
          currentUser={currentUser}
          partnerUser={partnerUser}
          onCreateCoupon={handleCreateCoupon}
          onClaimCoupon={handleClaimCoupon}
          onRedeemCoupon={handleRedeemCoupon}
        />
      )}

      {/* Intimate Modules: Quiz Double Aveugle */}
      {isBlindQuizOpen && (
        <BlindQuizModal
          isOpen={isBlindQuizOpen}
          onClose={() => setIsBlindQuizOpen(false)}
          quizzes={quizzes}
          currentUser={currentUser}
          partnerUser={partnerUser}
          onAnswerQuiz={handleAnswerQuiz}
          onCreateQuiz={handleCreateQuiz}
        />
      )}

      {/* Intimate Modules: Digital Touch & Dessin Live */}
      {isDigitalTouchOpen && (
        <DigitalTouchModal
          isOpen={isDigitalTouchOpen}
          onClose={() => setIsDigitalTouchOpen(false)}
          partnerUser={partnerUser}
          onSendTouch={handleSendDigitalTouch}
        />
      )}

      {/* Intimate Modules: Carte & Photo à Gratter */}
      {isScratchCardOpen && (
        <ScratchCardModal
          isOpen={isScratchCardOpen}
          onClose={() => setIsScratchCardOpen(false)}
          onSendScratchCard={handleSendScratchCard}
        />
      )}

      {/* Intimate Modules: Coffre-Fort Modal */}
      {isVaultOpen && (
        <VaultModal
          isOpen={isVaultOpen}
          onClose={handleCloseVault}
          onLock={handleCloseVault}
          vaultItems={vaultItems}
          currentUser={currentUser}
          onAddItem={handleAddVaultItem}
          onDeleteItem={handleDeleteVaultItem}
          onViewOnceBurned={handleViewOnceBurned}
        />
      )}

      {/* Intimate Modules: Wishlist & Match Modal */}
      {isWishlistOpen && (
        <WishlistModal
          isOpen={isWishlistOpen}
          onClose={() => setIsWishlistOpen(false)}
          wishlist={wishlistItems}
          currentUser={currentUser}
          partnerUser={partnerUser}
          onAddWish={handleAddWishlistItem}
          onToggleLikeWish={handleToggleWish}
          onToggleCompleteWish={handleToggleCompleteWish}
          onEditWish={handleEditWishlistItem}
          onDeleteWish={handleDeleteWishlistItem}
          onShareToChat={(text) => {
            handleSendMessage({
              type: 'text',
              content: text
            });
            setIsChatOpen(true);
          }}
        />
      )}

      {/* Intimate Modules: Jeu de Couple & Roue Romantique & Action/Vérité Modal */}
      {isGamesOpen && (
        <CoupleGameModal
          isOpen={isGamesOpen}
          onClose={() => setIsGamesOpen(false)}
          currentUser={currentUser}
          partnerUser={partnerUser}
          onShareChallengeToChat={(text) => {
            handleSendMessage({
              type: 'text',
              content: text
            });
            setIsChatOpen(true);
          }}
        />
      )}

      {/* Intimate Modules: Cycle Care & Empathie Complice */}
      {isCycleCareOpen && (
        <CycleCareModal
          isOpen={isCycleCareOpen}
          onClose={() => setIsCycleCareOpen(false)}
          cycleData={cycleData}
          currentUser={currentUser}
          partnerUser={partnerUser}
          onUpdateCycleData={(updated) => {
            setCycleData(prev => ({ ...prev, ...updated }));
          }}
          onShareCareToChat={(text) => {
            handleSendMessage({
              type: 'text',
              content: text
            });
            setIsChatOpen(true);
          }}
        />
      )}

      {/* Intimate Modules: "Tu me manques" Heartbeat Modal */}
      {isHeartbeatOpen && (
        <HeartbeatModal
          isOpen={isHeartbeatOpen}
          onClose={() => setIsHeartbeatOpen(false)}
          partnerUser={partnerUser}
          onSendHeartbeat={(customText) => {
            handleSendMessage({
              type: 'heartbeat',
              content: customText || 'Tu me manques fort mon amour... 💓'
            });
            setIsChatOpen(true);
          }}
        />
      )}

      {/* Intimate Modules: Love Timer Modal */}
      {isLoveTimerOpen && (
        <LoveTimerModal
          isOpen={isLoveTimerOpen}
          onClose={() => setIsLoveTimerOpen(false)}
          currentUser={currentUser}
          partnerUser={partnerUser}
          onShareToChat={(text) => {
            handleSendMessage({
              type: 'text',
              content: text
            });
            setIsChatOpen(true);
          }}
        />
      )}

      {/* Intimate Modules: Calendrier de Couple Modal */}
      {isCalendarOpen && (
        <CoupleCalendarModal
          isOpen={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
          currentUser={currentUser}
          partnerUser={partnerUser}
          onShareToChat={(text) => {
            handleSendMessage({
              type: 'text',
              content: text
            });
            setIsChatOpen(true);
          }}
        />
      )}

      {/* Fullscreen Active Audio/Video Call Modal */}
      {activeCall.isOpen && (
        <CallModal
          isOpen={activeCall.isOpen}
          callType={activeCall.type}
          partnerUser={partnerUser}
          onEndCall={handleEndCall}
          onSendMessageDuringCall={(text) => {
            handleSendMessage({
              type: 'text',
              content: text
            });
          }}
        />
      )}

      {/* Contact Info Modal */}
      {isContactInfoOpen && (
        <ContactInfoModal
          isOpen={isContactInfoOpen}
          onClose={() => setIsContactInfoOpen(false)}
          partnerUser={partnerUser}
          partnerProfile={partnerProfile}
          partnerNickname={partnerNickname}
          coupleId={pairingState.coupleId || undefined}
          onNicknameUpdated={async () => {
            if (pairingState.partnerId && pairingState.coupleId) {
              loadProfiles(currentUser.id, pairingState.partnerId, pairingState.coupleId);
            }
          }}
          messages={messages}
          settings={settings}
          onUpdateSettings={setSettings}
          onStartCall={handleStartCall}
          onClearChat={() => {
            setMessages([]);
            setIsContactInfoOpen(false);
          }}
          onViewMedia={(msg) => setActiveMediaLightbox(msg)}
        />
      )}

      {/* QR Code Modal */}
      {isQRCodeOpen && (
        <QRCodeModal
          isOpen={isQRCodeOpen}
          onClose={() => setIsQRCodeOpen(false)}
          currentUser={currentUser}
        />
      )}

      {/* Instant Camera Capture Modal */}
      {isCameraOpen && (
        <CameraCaptureModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onCapture={(mediaUrl, type, isHD, isViewOnce, caption) => {
            handleSendMessage({
              type,
              mediaUrl,
              isHD,
              isViewOnce,
              content: caption
            });
            soundEffects.playSent();
          }}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          currentUser={currentUser}
          partnerUser={partnerUser}
          settings={settings}
          themeConfig={themeConfig}
          pairingState={pairingState}
          myProfile={myProfile}
          onProfileUpdated={async () => {
            if (currentUser.id) {
              loadProfiles(currentUser.id, pairingState.partnerId, pairingState.coupleId);
            }
          }}
          onOpenPairingModal={() => setIsPairingModalOpen(true)}
          onResetPairing={() => {
            clearPairingState();
            setPairingState({ isPaired: false });
            setIsSettingsOpen(false);
            setIsChatOpen(false);
            setIsPairingModalOpen(true);
            triggerHaptic([50, 100]);
          }}
          onThemeChange={(newTheme) => {
            setThemeConfig(newTheme);
            saveThemeConfig(newTheme);
            applyThemeToDOM(newTheme);
          }}
          onUpdateCurrentUser={(updated) => {
            setCurrentUser(updated);
            saveStoredUserProfile(updated);
          }}
          onUpdatePartnerUser={(updated) => {
            setPartnerUser(updated);
            saveStoredPartnerProfile(updated);
          }}
          onUpdateSettings={setSettings}
        />
      )}

      {/* Starred Messages Modal */}
      {isStarredOpen && (
        <div className="fixed inset-0 z-50 bg-[#0e0b1c]/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#171230] text-[#f1f2f6] rounded-3xl w-full max-w-md p-5 border border-[#2d2254] shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between pb-3 border-b border-[#2d2254]">
              <div className="flex items-center gap-2 text-[#ffeaa7]">
                <Star size={20} className="fill-[#ffeaa7]" />
                <h3 className="font-bold text-base text-white">Messages & Mots doux favoris ({starredMessages.length})</h3>
              </div>
              <button onClick={() => setIsStarredOpen(false)} className="p-1 text-[#a29bfe] hover:text-white rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pt-3 space-y-2">
              {starredMessages.length > 0 ? (
                starredMessages.map(msg => (
                  <div key={msg.id} className="p-3 bg-[#130f26] rounded-2xl border border-[#2d2254] text-xs">
                    <div className="flex items-center justify-between text-[#a29bfe] mb-1">
                      <span className="font-bold text-[#00b894]">
                        {msg.senderId === currentUser.id ? 'Vous' : partnerUser.name}
                      </span>
                      <span>{formatTime(msg.timestamp)}</span>
                    </div>
                    <p className="text-sm text-[#f1f2f6]">{msg.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-center text-xs text-[#a29bfe] py-6">Aucun message favori enregistré.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Media Lightbox */}
      {activeMediaLightbox && (
        <MediaLightbox
          message={activeMediaLightbox}
          onClose={() => setActiveMediaLightbox(null)}
          onMarkAsViewed={(msgId) => {
            handleUpdateMessage(msgId, { isViewed: true });
          }}
        />
      )}

      {/* Poll Creation Modal */}
      {isPollModalOpen && (
        <PollModal
          isOpen={isPollModalOpen}
          onClose={() => setIsPollModalOpen(false)}
          onCreatePoll={(pollData) => {
            handleSendMessage({
              type: 'poll',
              content: 'Sondage',
              pollData
            });
            soundEffects.playSent();
          }}
        />
      )}

      {/* Event Creation Modal */}
      {isEventModalOpen && (
        <EventModal
          isOpen={isEventModalOpen}
          currentUser={currentUser}
          onClose={() => setIsEventModalOpen(false)}
          onCreateEvent={(eventData) => {
            handleSendMessage({
              type: 'event',
              content: 'Événement',
              eventData
            });
            soundEffects.playSent();
          }}
        />
      )}

      {/* Location Modal */}
      {isLocationModalOpen && (
        <LocationModal
          isOpen={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
          onSendLocation={(locationData) => {
            handleSendMessage({
              type: 'location',
              content: 'Position partagée',
              locationData
            });
            soundEffects.playSent();
          }}
        />
      )}

      {/* New Version Available Banner */}
      {hasNewVersion && (
        <div id="pwa-update-banner" className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#130f26] border border-[#00b894] px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 text-xs font-semibold text-white animate-in slide-in-from-bottom-4">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00b894] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00b894]"></span>
          </span>
          <span>Une nouvelle version est disponible</span>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#00b894] hover:bg-[#00a884] text-[#130f26] px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Actualiser
          </button>
        </div>
      )}
    </div>
  );
}
