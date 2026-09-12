import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ArrowLeft, Phone, Video, Search, MoreVertical, Paperclip, Smile,
  Mic, Send, Check, CheckCheck, Star, Pin, CornerUpLeft, Trash2, Edit3,
  Info, Eye, BarChart2, Calendar, MapPin, FileText, User as UserIcon,
  Play, Pause, X, ChevronDown, Sparkles, Plus, Compass, Heart, Lock,
  Dices, HeartHandshake, Flame, Volume2, Ticket, EyeOff, Zap, Award, Gift,
  Globe, MessageSquare, Radio, Bluetooth, Wifi, ArrowDownToLine, AlertCircle, Loader2,
  Image as ImageIcon, Camera, PhoneMissed, VideoOff, Palette
} from 'lucide-react';
import { audioRecorder } from '../services/audioRecorder';
import { videoRecorder } from '../services/videoRecorder';
import { User, Message, ChatSettings, PollData, EventData, LocationData, CallType, CoupleCoupon, NetworkState, UserProfile, AppThemeConfig, ScratchCardData } from '../types';
import { formatTime, formatDateDivider, formatDuration, renderFormattedText } from '../utils/formatters';
import { soundEffects } from '../utils/audio';
import { triggerHaptic } from '../utils/security';
import { triggerNativeSmsApp } from '../utils/networkManager';
import { ScratchCardBubble } from './ScratchCardBubble';
import { PhotoBubbleImage, SecureChatMessageImage } from './PhotoBubbleImage';
import { MediaBubble } from './MediaBubble';
import { PhotoPreviewModal } from './PhotoPreviewModal';
import { DirectCameraModal } from './DirectCameraModal';
import { PhotoEditor } from './photo/PhotoEditor';
import { ChatThemeDrawer } from './ChatThemeDrawer';
import { MediaGalleryPickerModal } from './media/MediaGalleryPickerModal';
import { EmojiReactionPickerModal } from './chat/EmojiReactionPickerModal';
import { GalleryMediaItem } from '../types';
import { getStoredPairingState, initAnonymousAuth, fetchActiveCoupleFromSupabase } from '../services/authService';
import { 
  envoyerMessageTexte, 
  envoyerMessagePhoto,
  envoyerMessageAudio,
  envoyerMessageVideo,
  obtenirSignedUrl,
  clearSignedUrlCache,
  getMessages, 
  obtenirMessages, 
  sAbonnerAuxMessages, 
  marquerMessagesCommeLivrés,
  marquerMessagesCommeLus,
  markMessagesAsDelivered,
  markMessagesAsRead,
  markMessageAsRead,
  canMarkConversationAsRead as canMarkConversationAsReadGlobal,
  uploadMediaToStorage,
  updateMessageReactions,
  editMessageContent,
  broadcastMessageToCouple,
  getLocalDeletedForEveryoneIds,
  getLocalDeletedForMeIds,
  getLocalEditedMessages
} from '../services/messageService';
import {
  formatLastSeen,
  setupCouplePresence,
  setupCoupleTyping,
  fetchPartnerLastSeen,
  subscribeToPartnerActivity
} from '../services/presenceService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface ChatViewProps {
  currentUser: User;
  partnerUser: User;
  partnerProfile?: UserProfile | null;
  partnerNickname?: string | null;
  messages: Message[];
  settings: ChatSettings;
  networkState?: NetworkState;
  isChatActive?: boolean;
  onOpenNetworkModal?: () => void;
  onOpenSmsImport?: () => void;
  onBack: () => void;
  onSendMessage: (msg: Partial<Message>) => void;
  onUpdateMessage: (msgId: string, updates: Partial<Message>) => void;
  onDeleteMessage: (msgId: string, forEveryone: boolean) => void;
  onStartCall: (type: CallType) => void;
  onOpenContactInfo: () => void;
  onOpenCamera: () => void;
  onOpenMediaLightbox: (msg: Message) => void;
  onOpenPollModal: () => void;
  onOpenEventModal: () => void;
  onOpenLocationModal: () => void;
  onOpenVault?: () => void;
  onOpenWishlist?: () => void;
  onOpenGames?: (initialTab?: 'truth_or_dare' | 'wheel' | 'dice' | 'customizer') => void;
  onOpenCycleCare?: () => void;
  onOpenHeartbeat?: () => void;
  onOpenCoupons?: () => void;
  onOpenBlindQuiz?: (sessionId?: string) => void;
  onOpenDigitalTouch?: () => void;
  onOpenScratchCard?: () => void;
  onScratchCardSession?: (sessionId: string) => void;
  onClaimCoupon?: (couponId: string) => void;
  onRedeemCoupon?: (couponId: string) => void;
  coupleId: string;
  isPartnerOnline?: boolean;
  isPartnerTyping?: boolean;
  partnerLastSeen?: string | null;
  sendTypingStatus?: (isTyping: boolean) => void;
  // Centralized navigation states
  isPhotoEditorOpen?: boolean;
  setIsPhotoEditorOpen?: (val: boolean) => void;
  isDirectCameraOpen?: boolean;
  setIsDirectCameraOpen?: (val: boolean) => void;
  isPhotoPreviewOpen?: boolean;
  setIsPhotoPreviewOpen?: (val: boolean) => void;
  selectedPhotoFile?: File | null;
  setSelectedPhotoFile?: (file: File | null) => void;
  // Dynamic theme & chat personalization
  themeConfig?: AppThemeConfig;
  onThemeChange?: (newTheme: AppThemeConfig) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  currentUser,
  partnerUser,
  partnerProfile,
  partnerNickname,
  messages: parentMessages,
  settings,
  networkState,
  isChatActive = true,
  onOpenNetworkModal,
  onOpenSmsImport,
  onBack,
  onSendMessage,
  onUpdateMessage,
  onDeleteMessage,
  onStartCall,
  onOpenContactInfo,
  onOpenCamera,
  onOpenMediaLightbox,
  onOpenPollModal,
  onOpenEventModal,
  onOpenLocationModal,
  onOpenVault,
  onOpenWishlist,
  onOpenGames,
  onOpenCycleCare,
  onOpenHeartbeat,
  onOpenCoupons,
  onOpenBlindQuiz,
  onOpenDigitalTouch,
  onOpenScratchCard,
  onScratchCardSession,
  onClaimCoupon,
  onRedeemCoupon,
  coupleId,
  isPartnerOnline = false,
  isPartnerTyping = false,
  partnerLastSeen = null,
  sendTypingStatus = (_isTyping: boolean) => {},
  // New centralized props
  isPhotoEditorOpen = false,
  setIsPhotoEditorOpen = (_val: boolean) => {},
  isDirectCameraOpen = false,
  setIsDirectCameraOpen = (_val: boolean) => {},
  isPhotoPreviewOpen = false,
  setIsPhotoPreviewOpen = (_val: boolean) => {},
  selectedPhotoFile = null,
  setSelectedPhotoFile = (_file: File | null) => {},
  themeConfig,
  onThemeChange
}) => {
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [isThemeDrawerOpen, setIsThemeDrawerOpen] = useState(false);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [activeContextMenuMsgId, setActiveContextMenuMsgId] = useState<string | null>(null);
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState<string | null>(null);
  const [deleteConfirmMsgId, setDeleteConfirmMsgId] = useState<string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchInChat, setSearchInChat] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [isGalleryPickerOpen, setIsGalleryPickerOpen] = useState(false);

  // Supabase state
  const [currentAuthUserId, setCurrentAuthUserId] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [pairingState, setPairingState] = useState(getStoredPairingState);
  const [realMessages, setRealMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Audio note playback state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const [audioSpeed, setAudioSpeed] = useState<number>(1);

  // Voice recording state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordTimer, setRecordTimer] = useState(0);
  const [inputMode, setInputMode] = useState<'voice' | 'video_note'>('voice');

  // Photo states removed (moved to App.tsx)
  const [isOptimizingPhoto, setIsOptimizingPhoto] = useState<boolean>(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [comingSoonToast, setComingSoonToast] = useState<string | null>(null);

  const typingTimeoutRef = useRef<number | null>(null);

  const textInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const chatMenuRef = useRef<HTMLDivElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const attachButtonRef = useRef<HTMLButtonElement>(null);

  // Swipe-to-Reply gesture state (WhatsApp style)
  const [swipingMsgId, setSwipingMsgId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [hasTriggeredSwipeHaptic, setHasTriggeredSwipeHaptic] = useState<boolean>(false);
  const touchStartPosRef = useRef<{ x: number; y: number; msgId: string; time: number } | null>(null);

  /**
   * Vérifie STRICTEMENT les 6 conditions obligatoires avant de marquer comme lu :
   * a) l'utilisateur authentifié est membre du couple ;
   * b) la discussion ouverte est exactement celle de target coupleId ;
   * c) cette discussion est réellement visible à l'écran (isChatActive !== false) ;
   * d) document.visibilityState === 'visible' ;
   * e) la fenêtre possède le focus (document.hasFocus()) ;
   * f) ce n'est pas seulement l'écran d'accueil, la liste des discussions, les paramètres, la calculette, une modal ou une autre fonctionnalité qui est ouverte.
   */
  const canMarkConversationAsRead = (targetCoupleId?: string): boolean => {
    // a) Membre authentifié du couple
    const currentUid = currentAuthUserId || currentUser.id;
    const storedPairing = getStoredPairingState();
    const activeCoupleId = storedPairing.coupleId || pairingState?.coupleId;

    if (!currentUid || !storedPairing.isPaired || !activeCoupleId) {
      return false;
    }

    // b) Discussion ouverte correspond exactement au couple cible
    if (targetCoupleId && targetCoupleId !== activeCoupleId) {
      return false;
    }

    // c & f) La vue de discussion est active et n'est pas masquée par l'accueil, la calculette ou une modal parente
    if (isChatActive === false) {
      return false;
    }

    // Aucune modal interne de ChatView n'est ouverte (photo preview, photo editor, caméra directe)
    if (isPhotoPreviewOpen || isDirectCameraOpen || isPhotoEditorOpen) {
      return false;
    }

    // d) Document visible (onglet actif au premier plan)
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return false;
    }

    // e) Fenêtre avec focus
    if (typeof document !== 'undefined' && typeof document.hasFocus === 'function') {
      if (!document.hasFocus()) {
        return false;
      }
    }

    // f) Vérification de la visibilité réelle dans le DOM (largeur/hauteur > 0 et non caché)
    if (chatContainerRef.current) {
      const rect = chatContainerRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return false;
      }
      try {
        const style = window.getComputedStyle(chatContainerRef.current);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          return false;
        }
      } catch {
        // En cas d'environnement sans computed style
      }
    }

    return true;
  };

  // Synchronize pairing state and authenticated Supabase user
  useEffect(() => {
    const handlePairingUpdate = () => {
      setPairingState(getStoredPairingState());
    };
    window.addEventListener('mikayala_pairing_changed', handlePairingUpdate);

    const initAuth = async () => {
      if (!isSupabaseConfigured()) return;
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (user?.id) {
          setCurrentAuthUserId(user.id);
        } else {
          if (error) console.warn('[ChatView] Aucune session active, relance initAnonymousAuth():', error.message);
          const newUserId = await initAnonymousAuth();
          if (newUserId) {
            setCurrentAuthUserId(newUserId);
          }
        }
      } catch (err: any) {
        console.error('[ChatView] Erreur récupération identité auth:', err);
        try {
          const fallbackId = await initAnonymousAuth();
          if (fallbackId) setCurrentAuthUserId(fallbackId);
        } catch (e) {
          console.error('[ChatView] Échec critique réinitialisation session:', e);
        }
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) {
        setCurrentAuthUserId(session.user.id);
      } else {
        setCurrentAuthUserId('');
        setRealMessages([]);
      }
    });

    // When visibility changes or window blurs, automatically cancel typing status
    const handleWindowBlurOrHide = () => {
      // Send false if document is hidden OR window loses focus
      if (typeof document !== 'undefined' && (document.visibilityState !== 'visible' || !document.hasFocus())) {
        if (typingTimeoutRef.current) {
          window.clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
        sendTypingStatus(false);
      }
    };

    document.addEventListener('visibilitychange', handleWindowBlurOrHide);
    window.addEventListener('blur', handleWindowBlurOrHide);

    // Listen to local optimistic message broadcasts
    const handleNewMessageSent = (e: any) => {
      const msg = e.detail;
      if (msg) {
        setRealMessages(prev => {
          const idx = prev.findIndex(m => m.id === msg.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], ...msg };
            return copy;
          }
          return [...prev, msg].sort((a, b) => a.timestamp - b.timestamp);
        });
      }
    };
    window.addEventListener('mikayla_new_message_sent', handleNewMessageSent);

    return () => {
      window.removeEventListener('mikayala_pairing_changed', handlePairingUpdate);
      window.removeEventListener('mikayla_new_message_sent', handleNewMessageSent);
      authListener?.subscription?.unsubscribe();
      document.removeEventListener('visibilitychange', handleWindowBlurOrHide);
      window.removeEventListener('blur', handleWindowBlurOrHide);
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      sendTypingStatus(false);
    };
  }, []);

  // Fetch real messages and subscribe to Supabase Realtime
  useEffect(() => {
    const coupleId = getStoredPairingState().coupleId || pairingState?.coupleId;
    console.log('[Chat] coupleId chargé:', coupleId || 'non jumelé');
    if (!coupleId || !isSupabaseConfigured()) {
      setRealMessages(parentMessages || []);
      return;
    }

    setIsLoadingMessages(true);
    setChatError(null);

    // Initial fetch from public.messages using select('*').eq('couple_id', coupleId).order('created_at', { ascending: true })
    getMessages(coupleId)
      .then(fetched => {
        if (Array.isArray(fetched) && fetched.length > 0) {
          setRealMessages(fetched);
        } else {
          setRealMessages(prev => prev.length > 0 ? prev : fetched);
        }
        setChatError(null);
        // À l'ouverture de la discussion sur chaque téléphone, marquer comme livrés (✓✓ gris)
        marquerMessagesCommeLivrés(coupleId);
        // Marquer comme lus (✓✓ turquoise) UNIQUEMENT si toutes les 6 conditions sont remplies
        if (canMarkConversationAsRead(coupleId)) {
          marquerMessagesCommeLus(coupleId);
        }
      })
      .catch((err: any) => {
        console.warn('[ChatView] Problème chargement messages Supabase:', err?.message || err);
      })
      .finally(() => {
        setIsLoadingMessages(false);
      });

    // Realtime Postgres Changes Subscription with filter: couple_id=eq.${coupleId}
    const unsubscribe = sAbonnerAuxMessages(
      coupleId,
      (incomingMessage: any) => {
        setRealMessages(prev => {
          if (!incomingMessage || !incomingMessage.id) return prev;

          // Si le message a été supprimé pour l'utilisateur actuel
          const activeUid = currentAuthUserId || currentUser.id;
          const isLocallyDelForMe = getLocalDeletedForMeIds(coupleId).has(incomingMessage.id);
          if (incomingMessage.isDeletedForMe || isLocallyDelForMe || (incomingMessage.deletedForUsers && incomingMessage.deletedForUsers.includes(activeUid))) {
            return prev.filter(m => m.id !== incomingMessage.id);
          }

          if (incomingMessage.eventType === 'status_update') {
            const status = incomingMessage.status;
            const updatedTime = incomingMessage.readAt || incomingMessage.deliveredAt || new Date().toISOString();
            return prev.map(m => {
              if (status === 'read') {
                return {
                  ...m,
                  status: 'read',
                  readAt: m.readAt || updatedTime,
                  deliveredAt: m.deliveredAt || updatedTime
                };
              } else if (status === 'delivered') {
                if (m.status === 'sent' || m.status === 'pending' || !m.deliveredAt) {
                  return {
                    ...m,
                    status: 'delivered',
                    deliveredAt: m.deliveredAt || updatedTime
                  };
                }
              }
              return m;
            });
          }

          const isLocallyDeletedForEveryone = getLocalDeletedForEveryoneIds(coupleId).has(incomingMessage.id);
          const localEdit = getLocalEditedMessages(coupleId)[incomingMessage.id];

          const existingIdx = prev.findIndex(m => m.id === incomingMessage.id);
          const isDelForEveryone = isLocallyDeletedForEveryone || Boolean(
            incomingMessage.isDeletedForEveryone ||
            incomingMessage.deletedForEveryone ||
            incomingMessage.deleted_for_everyone
          );

          if (existingIdx >= 0) {
            const existing = prev[existingIdx];
            const wasDeleted = isDelForEveryone || Boolean(existing.isDeletedForEveryone || existing.deletedForEveryone || existing.deleted_for_everyone);
            if (wasDeleted) {
              const updated = [...prev];
              updated[existingIdx] = {
                ...existing,
                ...incomingMessage,
                isDeletedForEveryone: true,
                deletedForEveryone: true,
                deleted_for_everyone: true,
                deletedAt: incomingMessage.deletedAt || existing.deletedAt || new Date().toISOString(),
                content: 'Ce message a été supprimé',
                mediaUrl: undefined,
                storagePath: undefined
              };
              return updated;
            }

            const finalIsEdited = Boolean(localEdit || incomingMessage.isEdited || incomingMessage.is_edited || existing.isEdited || existing.is_edited);
            const finalContent = localEdit ? localEdit.content : (incomingMessage.content || existing.content);

            const merged: Message = {
              ...existing,
              ...incomingMessage,
              reactions: incomingMessage.reactions !== undefined ? incomingMessage.reactions : existing.reactions,
              storagePath: incomingMessage.storagePath || existing.storagePath,
              mediaUrl: incomingMessage.mediaUrl || existing.mediaUrl,
              content: finalContent,
              isEdited: finalIsEdited,
              is_edited: finalIsEdited,
              senderId: incomingMessage.senderId || existing.senderId,
              type: incomingMessage.type || existing.type,
              deliveredAt: incomingMessage.deliveredAt || existing.deliveredAt,
              readAt: incomingMessage.readAt || existing.readAt,
              status: (incomingMessage.readAt || incomingMessage.status === 'read' || existing.readAt || existing.status === 'read')
                ? 'read'
                : (incomingMessage.deliveredAt || incomingMessage.status === 'delivered' || existing.deliveredAt || existing.status === 'delivered')
                ? 'delivered'
                : (incomingMessage.status || existing.status)
            };
            const updated = [...prev];
            updated[existingIdx] = merged;
            return updated;
          }
          // Append new incoming message
          const finalIsEdited = Boolean(localEdit || incomingMessage.isEdited || incomingMessage.is_edited);
          const finalContent = isDelForEveryone 
            ? 'Ce message a été supprimé' 
            : (localEdit ? localEdit.content : (incomingMessage.content || ''));

          const initialMsg: Message = {
            ...incomingMessage,
            content: finalContent,
            isEdited: finalIsEdited,
            is_edited: finalIsEdited,
            isDeletedForEveryone: isDelForEveryone,
            deletedForEveryone: isDelForEveryone,
            deleted_for_everyone: isDelForEveryone,
            mediaUrl: isDelForEveryone ? undefined : incomingMessage.mediaUrl,
            storagePath: isDelForEveryone ? undefined : incomingMessage.storagePath
          };
          return [...prev, initialMsg].sort((a, b) => a.timestamp - b.timestamp);
        });

        // Lorsqu'un nouveau message du partenaire arrive par Realtime :
        const isFromPartner = Boolean(
          incomingMessage?.senderId &&
          incomingMessage.senderId !== currentUser.id &&
          (!currentAuthUserId || incomingMessage.senderId !== currentAuthUserId) &&
          (partnerUser.id ? incomingMessage.senderId === partnerUser.id : true)
        );

        if (isFromPartner) {
          // 1. Toujours marquer comme reçu / délivré (✓✓ gris)
          marquerMessagesCommeLivrés(coupleId);
          // 2. Marquer comme lu (✓✓ turquoise) si la discussion est active et visible
          if (canMarkConversationAsRead(coupleId)) {
            marquerMessagesCommeLus(coupleId);
          }
        }
      },
      (deletedId) => {
        if (deletedId) {
          setRealMessages(prev => prev.filter(m => m.id !== deletedId));
        }
      },
      (realtimeError: Error) => {
        // Only show error if it's not a transient connection error being retried
        if (!realtimeError.message?.includes('socket closed') && !realtimeError.message?.includes('CHANNEL_ERROR')) {
          console.error('[ChatView] Erreur flux Realtime:', realtimeError);
          setChatError(realtimeError.message || 'Erreur lors de la connexion au flux en temps réel.');
        } else {
          console.warn('[ChatView] Erreur de connexion Realtime (tentative de reconnexion en cours...):', realtimeError.message);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [pairingState?.coupleId, currentAuthUserId, isChatActive, isPhotoPreviewOpen, isDirectCameraOpen]);

  // Synchroniser les mises à jour de parentMessages (ex: suppressions optimistes, réactions, modifications de texte) dans realMessages
  useEffect(() => {
    if (!parentMessages || parentMessages.length === 0) return;
    setRealMessages(prev => {
      if (prev.length === 0) return prev;
      let hasChange = false;
      const updated = prev.map(m => {
        const parentMatch = parentMessages.find(pm => pm.id === m.id);
        if (!parentMatch) return m;

        const isParentDel = Boolean(parentMatch.isDeletedForEveryone || parentMatch.deletedForEveryone || parentMatch.deleted_for_everyone);
        const isCurrentDel = Boolean(m.isDeletedForEveryone || m.deletedForEveryone || m.deleted_for_everyone);
        const reactionsDiffer = JSON.stringify(parentMatch.reactions || {}) !== JSON.stringify(m.reactions || {});
        const contentDiffer = parentMatch.content !== m.content;
        const editedDiffer = Boolean(parentMatch.isEdited || parentMatch.is_edited) !== Boolean(m.isEdited || m.is_edited);

        if (isParentDel !== isCurrentDel || reactionsDiffer || contentDiffer || editedDiffer) {
          hasChange = true;
          return {
            ...m,
            ...parentMatch,
            isDeletedForEveryone: isParentDel,
            deletedForEveryone: isParentDel,
            deleted_for_everyone: isParentDel,
            content: isParentDel ? 'Ce message a été supprimé' : (parentMatch.content || m.content),
            isEdited: Boolean(parentMatch.isEdited || parentMatch.is_edited || m.isEdited || m.is_edited),
            is_edited: Boolean(parentMatch.isEdited || parentMatch.is_edited || m.isEdited || m.is_edited),
            mediaUrl: isParentDel ? undefined : (parentMatch.mediaUrl ?? m.mediaUrl),
            storagePath: isParentDel ? undefined : (parentMatch.storagePath ?? m.storagePath),
            reactions: parentMatch.reactions || m.reactions
          };
        }
        return m;
      });
      return hasChange ? updated : prev;
    });
  }, [parentMessages]);

  // Mark partner messages as read ONLY when the discussion is genuinely active, visible, and focused
  useEffect(() => {
    const coupleId = getStoredPairingState().coupleId || pairingState?.coupleId;
    if (!coupleId) return;

    const triggerMarkAsReadIfVisible = async () => {
      if (canMarkConversationAsRead(coupleId)) {
        try {
          await marquerMessagesCommeLus(coupleId);
        } catch (err) {
          console.warn('[ChatView] Erreur lors du marquage des messages lus:', err);
        }
      }
    };

    // Déclencher lors de l'activation/ouverture réelle de la discussion
    if (isChatActive) {
      const timer = setTimeout(() => {
        triggerMarkAsReadIfVisible();
      }, 60);
      return () => clearTimeout(timer);
    }

    const handleVisibilityOrFocus = () => {
      triggerMarkAsReadIfVisible();
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('click', handleVisibilityOrFocus, { passive: true });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('click', handleVisibilityOrFocus);
    };
  }, [pairingState?.coupleId, isChatActive, isPhotoPreviewOpen, isDirectCameraOpen, currentAuthUserId]);

  const rawActiveMessages = (pairingState?.isPaired && pairingState?.coupleId) ? realMessages : parentMessages;
  const activeUserId = currentAuthUserId || currentUser.id;

  const activeMessages = useMemo(() => {
    return rawActiveMessages.filter(m => {
      if (m.isDeletedForMe) return false;
      if (activeUserId && m.deletedForUsers && m.deletedForUsers.includes(activeUserId)) return false;
      return true;
    });
  }, [rawActiveMessages, activeUserId]);

  // Optimized O(1) Map for high-performance reply and reference resolution on low-end CPUs
  const messagesByIdMap = useMemo(() => {
    const map = new Map<string, Message>();
    for (let i = 0; i < activeMessages.length; i++) {
      map.set(activeMessages[i].id, activeMessages[i]);
    }
    return map;
  }, [activeMessages]);

  const partnerLastSeenText = formatLastSeen(partnerLastSeen);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (val.trim().length > 0) {
      sendTypingStatus(true);
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = window.setTimeout(() => {
        sendTypingStatus(false);
        typingTimeoutRef.current = null;
      }, 2000);
    } else {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      sendTypingStatus(false);
    }
  };

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length]);

  // Handle outside click & Escape key for menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(e.target as Node)) {
        setShowChatMenu(false);
      }
      if (
        attachMenuRef.current &&
        !attachMenuRef.current.contains(e.target as Node) &&
        !attachButtonRef.current?.contains(e.target as Node)
      ) {
        setShowAttachMenu(false);
      }
      if (!(e.target as HTMLElement).closest('.reaction-bar-container') && !(e.target as HTMLElement).closest('.message-bubble')) {
        setActiveReactionMsgId(null);
        setActiveContextMenuMsgId(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAttachMenu(false);
        setShowEmojiPicker(false);
        setShowChatMenu(false);
        setActiveContextMenuMsgId(null);
        setActiveReactionMsgId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Voice recording timer
  useEffect(() => {
    let timerInterval: number;
    if (isRecordingVoice) {
      timerInterval = window.setInterval(() => {
        setRecordTimer(prev => prev + 1);
      }, 1000);
    } else {
      setRecordTimer(0);
    }
    return () => clearInterval(timerInterval);
  }, [isRecordingVoice]);

  // Audio Playback simulation
  useEffect(() => {
    let playInterval: number;
    if (playingAudioId) {
      playInterval = window.setInterval(() => {
        setAudioProgress(prev => {
          const current = prev[playingAudioId] || 0;
          const msg = activeMessages.find(m => m.id === playingAudioId);
          const total = (msg?.audioDuration || 14) * 10;
          if (current >= total) {
            setPlayingAudioId(null);
            return { ...prev, [playingAudioId]: 0 };
          }
          return { ...prev, [playingAudioId]: current + (1 * audioSpeed) };
        });
      }, 100);
    }
    return () => clearInterval(playInterval);
  }, [playingAudioId, audioSpeed, activeMessages]);

  const handleSendText = async () => {
    const textToSend = inputText.trim();
    if (!textToSend || isSending) return;

    // Immediately stop typing status when sending
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    sendTypingStatus(false);

    if (editingMessage) {
      const editId = editingMessage.id;
      const targetCoupleId = coupleId || pairingState?.coupleId || getStoredPairingState().coupleId;

      // 1. Optimistic immediate update of realMessages in ChatView
      setRealMessages(prev => prev.map(m => m.id === editId ? {
        ...m,
        content: textToSend,
        isEdited: true,
        is_edited: true,
        editedAt: new Date().toISOString()
      } : m));

      // 2. Call parent onUpdateMessage
      onUpdateMessage(editId, {
        content: textToSend,
        isEdited: true
      });

      // 3. Persist and broadcast
      if (targetCoupleId) {
        editMessageContent(editId, textToSend, targetCoupleId);
      }

      setEditingMessage(null);
      setInputText('');
      soundEffects.playSent();
      triggerHaptic(20);
      return;
    }

    const currentMode = networkState?.mode || 'cloud';

    // If in SMS mode, trigger native SMS application intent/URI
    if (currentMode === 'sms') {
      triggerNativeSmsApp(partnerUser.phone, textToSend);
    }

    const targetCoupleId = pairingState?.coupleId;
    const currentReplyId = replyingTo?.id || null;

    setIsSending(true);
    setChatError(null);

    try {
      if (targetCoupleId && isSupabaseConfigured()) {
        // Direct insertion into Supabase public.messages with optional reply_to_id
        const sentMessage = await envoyerMessageTexte(targetCoupleId, textToSend, currentReplyId);

        // Add to local realMessages state immediately if not already present
        setRealMessages(prev => {
          if (prev.some(m => m.id === sentMessage.id)) return prev;
          return [...prev, sentMessage].sort((a, b) => a.timestamp - b.timestamp);
        });

        // Synchronize with parent state
        onSendMessage(sentMessage);
      } else {
        // Fallback local mode
        onSendMessage({
          content: textToSend,
          type: 'text',
          senderId: currentUser.id,
          receiverId: partnerUser.id,
          status: 'sent',
          replyToId: currentReplyId || undefined
        });
      }

      soundEffects.playSent();
      triggerHaptic(20);
      setInputText(''); // Cleared ONLY on success
      setReplyingTo(null);
      setShowEmojiPicker(false);
    } catch (err: any) {
      console.error('[ChatView] Erreur lors de l’envoi du message:', err);
      // Even if network fails, fallback to local sent message so user is not blocked
      onSendMessage({
        content: textToSend,
        type: 'text',
        senderId: currentUser.id,
        receiverId: partnerUser.id,
        status: 'sent',
        replyToId: currentReplyId || undefined
      });
      setInputText('');
      setReplyingTo(null);
      setShowEmojiPicker(false);
    } finally {
      setIsSending(false);
    }
  };

  const handleStartVoiceRecord = async () => {
    try {
      if (inputMode === 'voice') {
        await audioRecorder.start();
      } else {
        await videoRecorder.start();
      }
      setIsRecordingVoice(true);
      triggerHaptic(50);
    } catch (err: any) {
      console.error('[Chat] Recording error:', err);
      setComingSoonToast(err.message || "Erreur microphone/caméra");
    }
  };

  const handleFinishVoiceRecord = async () => {
    // Si recordTimer < 1, on annule silencieusement (idempotent)
    if (recordTimer < 1) {
      if (inputMode === 'voice') audioRecorder.cancel();
      else videoRecorder.cancel();
      setIsRecordingVoice(false);
      return;
    }

    setIsSending(true);
    try {
      let resultMessage: Message;
      
      if (inputMode === 'voice') {
        const result = await audioRecorder.stop();
        resultMessage = await envoyerMessageAudio(coupleId, result.blob, result.duration, result.waveform);
      } else {
        const result = await videoRecorder.stop();
        resultMessage = await envoyerMessageVideo(coupleId, result.blob, result.duration);
      }

      // Ajout immédiat à l'état local si Supabase est configuré
      if (isSupabaseConfigured()) {
        setRealMessages(prev => {
          if (prev.some(m => m.id === resultMessage.id)) return prev;
          return [...prev, resultMessage].sort((a, b) => a.timestamp - b.timestamp);
        });
      }

      onSendMessage(resultMessage);
      soundEffects.playSent();
    } catch (err: any) {
      // Gestion de l'erreur idempotente si stop a déjà été appelé par le timeout automatique
      if (
        err.message === 'STOP_ALREADY_CALLED' ||
        err.message === 'NO_ACTIVE_RECORDING' ||
        err.message === 'EMPTY_RECORDING' ||
        err.message?.includes('Aucun enregistrement en cours')
      ) {
        console.warn('[Chat] Recording already stopped or inactive.');
      } else {
        console.error('[Chat] Error finishing record:', err);
        setComingSoonToast(err.message || "Échec de l'envoi du média.");
      }
    } finally {
      setIsSending(false);
      setIsRecordingVoice(false);
    }
  };

  const handleToggleReaction = (msgId: string, emoji: string) => {
    const msg = activeMessages.find(m => m.id === msgId);
    if (!msg) return;

    const myId = currentAuthUserId || currentUser.id;
    const currentReactions = { ...(msg.reactions || {}) };
    if (currentReactions[myId] === emoji || currentReactions[currentUser.id] === emoji) {
      delete currentReactions[myId];
      delete currentReactions[currentUser.id];
    } else {
      currentReactions[myId] = emoji;
      currentReactions[currentUser.id] = emoji;
      soundEffects.playReaction();
      triggerHaptic(30);
    }

    // 1. Optimistic update in realMessages
    setRealMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions: currentReactions } : m));

    // 2. Call parent onUpdateMessage
    onUpdateMessage(msgId, { reactions: currentReactions });

    // 3. Persist and broadcast to partner via Supabase
    const targetCoupleId = coupleId || pairingState?.coupleId || getStoredPairingState().coupleId;
    if (targetCoupleId) {
      updateMessageReactions(msgId, currentReactions, targetCoupleId);
    }

    setActiveReactionMsgId(null);
    setActiveContextMenuMsgId(null);
    setEmojiPickerMsgId(null);
  };

  const checkIsMyMessage = (msg?: Message | null) => {
    if (!msg) return true; // Par défaut autoriser si l'objet n'est pas fourni
    const myId = currentUser.id;
    const authId = currentAuthUserId;
    if (msg.senderId === myId) return true;
    if (authId && msg.senderId === authId) return true;
    if (msg.senderId && partnerUser?.id && msg.senderId === partnerUser.id) return false;
    if (partnerUser?.id && msg.receiverId === partnerUser.id) return true;
    return true;
  };

  const handleTouchStartMessage = (e: React.TouchEvent | React.MouseEvent, msg: Message) => {
    if (msg.isDeletedForEveryone || msg.deletedForEveryone || msg.deleted_for_everyone) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    touchStartPosRef.current = {
      x: clientX,
      y: clientY,
      msgId: msg.id,
      time: Date.now()
    };

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      triggerHaptic(40);
      setActiveContextMenuMsgId(msg.id);
      touchStartPosRef.current = null;
    }, 450);
  };

  const handleTouchMoveMessage = (e: React.TouchEvent | React.MouseEvent, msg: Message) => {
    if (!touchStartPosRef.current || touchStartPosRef.current.msgId !== msg.id) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const dx = clientX - touchStartPosRef.current.x;
    const dy = clientY - touchStartPosRef.current.y;

    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }

    // Swipe horizontal vers la droite (style WhatsApp)
    if (dx > 0 && Math.abs(dx) > Math.abs(dy) * 1.1) {
      const distance = Math.min(dx * 0.7, 75);
      setSwipingMsgId(msg.id);
      setSwipeOffset(distance);

      if (distance >= 45 && !hasTriggeredSwipeHaptic) {
        triggerHaptic(25);
        setHasTriggeredSwipeHaptic(true);
      } else if (distance < 45 && hasTriggeredSwipeHaptic) {
        setHasTriggeredSwipeHaptic(false);
      }
    }
  };

  const handleTouchEndMessage = (msg: Message) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (swipingMsgId === msg.id) {
      if (swipeOffset >= 45) {
        triggerHaptic([25, 20, 25]);
        soundEffects.playPop();
        setReplyingTo(msg);
        setEditingMessage(null);
        setTimeout(() => {
          textInputRef.current?.focus();
        }, 60);
      }
      setSwipingMsgId(null);
      setSwipeOffset(0);
      setHasTriggeredSwipeHaptic(false);
    }
    touchStartPosRef.current = null;
  };

  const handleDeleteMessageInternal = (msgId: string, forEveryone: boolean) => {
    // 1. Optimistic immediate update of realMessages in ChatView
    if (forEveryone) {
      setRealMessages(prev => prev.map(m => m.id === msgId ? {
        ...m,
        isDeletedForEveryone: true,
        deletedForEveryone: true,
        deleted_for_everyone: true,
        deletedAt: new Date().toISOString(),
        content: 'Ce message a été supprimé',
        mediaUrl: undefined,
        storagePath: undefined
      } : m));
    } else {
      setRealMessages(prev => prev.filter(m => m.id !== msgId));
    }
    // 2. Call parent handler
    onDeleteMessage(msgId, forEveryone);
    // 3. Close all related modals and menus
    setDeleteConfirmMsgId(null);
    setActiveContextMenuMsgId(null);
    setActiveReactionMsgId(null);
  };

  const handleVotePoll = (msgId: string, optionId: string) => {
    const msg = activeMessages.find(m => m.id === msgId);
    if (!msg || !msg.pollData) return;

    const poll = { ...msg.pollData };
    poll.options = poll.options.map(opt => {
      let votes = [...opt.votes];
      if (opt.id === optionId) {
        if (votes.includes(currentUser.id)) {
          votes = votes.filter(id => id !== currentUser.id);
        } else {
          votes.push(currentUser.id);
        }
      } else if (!poll.allowMultiple) {
        votes = votes.filter(id => id !== currentUser.id);
      }
      return { ...opt, votes };
    });

    onUpdateMessage(msgId, { pollData: poll });
  };

  const handleRSVPEvent = (msgId: string, status: 'going' | 'maybe' | 'declined') => {
    const msg = activeMessages.find(m => m.id === msgId);
    if (!msg || !msg.eventData) return;

    const eventData = { ...msg.eventData };
    const existing = eventData.attendees.filter(a => a.userId !== currentUser.id);
    existing.push({ userId: currentUser.id, status });
    eventData.attendees = existing;

    onUpdateMessage(msgId, { eventData });
  };

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so selecting the same file again triggers onChange
    e.target.value = '';

    setShowAttachMenu(false);
    setPhotoError(null);

    const isVideo = file.type.startsWith('video/') || !!file.name.match(/\.(mp4|webm|mov|m4v|mkv|avi)$/i);

    if (isVideo) {
      if (file.size === 0) {
        setComingSoonToast("Le fichier vidéo sélectionné est vide.");
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        setComingSoonToast("La vidéo ne doit pas dépasser 50 Mo.");
        return;
      }

      const targetCoupleId = getStoredPairingState().coupleId || pairingState?.coupleId;
      if (!targetCoupleId) {
        setComingSoonToast("Votre couple n'est pas encore jumelé.");
        return;
      }

      setIsSending(true);
      try {
        const tempUrl = URL.createObjectURL(file);
        const tempVideo = document.createElement('video');
        tempVideo.src = tempUrl;
        await new Promise((res) => { tempVideo.onloadedmetadata = res; setTimeout(res, 1000); });
        const duration = Math.round(tempVideo.duration) || 5;
        URL.revokeObjectURL(tempUrl);

        const resultMessage = await envoyerMessageVideo(targetCoupleId, file, duration);
        if (isSupabaseConfigured()) {
          setRealMessages(prev => [...prev.filter(m => m.id !== resultMessage.id), resultMessage]);
        }
        soundEffects.playSent();
        triggerHaptic(20);
      } catch (err: any) {
        console.error('[ChatView] Erreur envoi vidéo galerie:', err);
        setComingSoonToast(err.message || "Erreur lors de l'envoi de la vidéo.");
      } finally {
        setIsSending(false);
      }
    } else {
      setSelectedPhotoFile(file);
      setIsPhotoEditorOpen(true);
    }
  };

  const handleConfirmGalleryMedia = async (selectedMedia: GalleryMediaItem[]) => {
    if (!selectedMedia || selectedMedia.length === 0) return;
    const targetCoupleId = getStoredPairingState().coupleId || pairingState?.coupleId;

    for (const item of selectedMedia) {
      if (item.type === 'video') {
        if (!targetCoupleId) {
          setComingSoonToast("Votre couple n'est pas encore jumelé.");
          continue;
        }
        setIsSending(true);
        try {
          const resultMessage = await envoyerMessageVideo(targetCoupleId, item.file, item.duration || 5);
          if (isSupabaseConfigured()) {
            setRealMessages(prev => [...prev.filter(m => m.id !== resultMessage.id), resultMessage]);
          }
          soundEffects.playSent();
          triggerHaptic(20);
        } catch (err: any) {
          console.error('[ChatView] Erreur envoi vidéo galerie:', err);
          setComingSoonToast(err.message || "Erreur lors de l'envoi de la vidéo.");
        } finally {
          setIsSending(false);
        }
      } else {
        if (selectedMedia.length === 1) {
          setSelectedPhotoFile(item.file);
          setIsPhotoEditorOpen(true);
        } else {
          await handleSendPhotoMessage(item.file, '');
        }
      }
    }
  };

  const handleClosePhotoPreview = () => {
    if (isOptimizingPhoto) return;
    setIsPhotoPreviewOpen(false);
    setSelectedPhotoFile(null);
    setPhotoError(null);
  };

  const handleComingSoon = (featureName: string) => {
    setComingSoonToast(`Fonctionnalité bientôt disponible : ${featureName}`);
    setTimeout(() => {
      setComingSoonToast(current => (current?.includes(featureName) ? null : current));
    }, 2500);
  };

  const handleSendPhotoMessage = async (file: File, caption: string) => {
    const coupleId = getStoredPairingState().coupleId || pairingState?.coupleId || 'local_couple';
    const senderId = currentAuthUserId || currentUser.id;

    setIsOptimizingPhoto(true);
    setPhotoError(null);

    try {
      let sentMessage: Message;
      if (isSupabaseConfigured() && navigator.onLine) {
        sentMessage = await envoyerMessagePhoto({
          coupleId,
          senderId,
          file,
          caption
        });
      } else {
        // Fallback Hors-Ligne / Proximité directe (0 Data)
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        sentMessage = {
          id: `msg_img_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          senderId,
          receiverId: partnerUser.id,
          timestamp: Date.now(),
          status: 'sent',
          type: 'image',
          content: caption || '',
          mediaUrl: dataUrl,
          fileSize: `${Math.round(file.size / 1024)} Ko`,
          fileType: 'image/jpeg',
          transportMode: 'proximity'
        };
      }

      // Insert immediately into local UI state if not already populated by Realtime
      setRealMessages(prev => {
        if (prev.some(m => m.id === sentMessage.id)) return prev;
        return [...prev, sentMessage].sort((a, b) => a.timestamp - b.timestamp);
      });

      onSendMessage(sentMessage);
      soundEffects.playSent();
      triggerHaptic(20);

      // Close modal
      setIsPhotoPreviewOpen(false);
      setSelectedPhotoFile(null);
      setPhotoError(null);
    } catch (err: any) {
      console.error('[ChatView] Erreur envoi photo privée:', err);
      // Fallback local gracieux pour ne pas bloquer l'utilisateur
      try {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        const fallbackMsg: Message = {
          id: `msg_img_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          senderId,
          receiverId: partnerUser.id,
          timestamp: Date.now(),
          status: 'sent',
          type: 'image',
          content: caption || '',
          mediaUrl: dataUrl,
          transportMode: 'proximity'
        };

        setRealMessages(prev => [...prev.filter(m => m.id !== fallbackMsg.id), fallbackMsg]);
        onSendMessage(fallbackMsg);
        soundEffects.playSent();
        setIsPhotoPreviewOpen(false);
        setSelectedPhotoFile(null);
      } catch {
        setPhotoError(err.message || "Échec de l'optimisation ou de l'envoi de la photo.");
      }
    } finally {
      setIsOptimizingPhoto(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isHD = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      onSendMessage({
        senderId: currentUser.id,
        receiverId: partnerUser.id,
        type: isVideo ? 'video' : isImage ? 'image' : 'document',
        content: file.name,
        mediaUrl: result,
        fileName: file.name,
        fileSize: `${Math.round(file.size / 1024)} KB`,
        isHD: isHD
      });
      soundEffects.playSent();
    };
    reader.readAsDataURL(file);
    setShowAttachMenu(false);
  };

  const pinnedMessage = activeMessages.find(m => m.isPinned);

  const filteredMessages = searchInChat && chatSearchQuery
    ? activeMessages.filter(m => m.content.toLowerCase().includes(chatSearchQuery.toLowerCase()))
    : activeMessages;

  // Sent bubble style based on theme
  const getSentBubbleColor = () => {
    switch (settings.bubbleColor) {
      case 'violet':
        return 'bg-[#6c5ce7] text-white';
      case 'rose':
        return 'bg-[#fd79a8] text-[#130f26]';
      case 'midnight':
        return 'bg-[#0984e3] text-white';
      case 'emerald':
      default:
        return 'bg-[#005c4b] text-[#f1f2f6]';
    }
  };

  // Dynamic wallpaper and bubble styles
  const activeWallpaperPreset = themeConfig?.wallpaper?.preset || 'doodle_dark';
  const wallpaperPresetClass = 
    activeWallpaperPreset === 'doodle_dark' ? 'wallpaper-doodle-dark' :
    activeWallpaperPreset === 'doodle_light' ? 'wallpaper-doodle-light' :
    activeWallpaperPreset === 'gradient_neon' ? 'wallpaper-gradient-neon' :
    activeWallpaperPreset === 'gradient_rose' ? 'wallpaper-gradient-rose' :
    activeWallpaperPreset === 'gradient_emerald' ? 'wallpaper-gradient-emerald' :
    activeWallpaperPreset === 'gradient_slate' ? 'wallpaper-gradient-slate' : '';

  const bubbleShape = themeConfig?.typography?.bubbleShape || 'classic';
  const getBubbleShapeClass = (isMe: boolean) => {
    if (bubbleShape === 'capsule') return 'rounded-full px-4';
    if (bubbleShape === 'comic') return isMe ? 'bubble-shape-comic-sent rounded-xl' : 'bubble-shape-comic-recv rounded-xl';
    if (bubbleShape === 'modern') return 'rounded-2xl';
    return isMe ? 'rounded-2xl rounded-tr-xs' : 'rounded-2xl rounded-tl-xs border border-[#2d2254]';
  };

  return (
    <div 
      ref={chatContainerRef}
      className="flex-1 flex flex-col h-full relative overflow-hidden select-none"
      style={{ backgroundColor: 'var(--mk-wallpaper-color, #130f26)' }}
    >
      {/* Dynamic Wallpaper Layer */}
      <div 
        className={`absolute inset-0 pointer-events-none transition-all duration-300 z-0 ${wallpaperPresetClass}`}
        style={{
          opacity: 'var(--mk-wallpaper-opacity, 0.85)',
          filter: themeConfig?.wallpaper?.blur ? `blur(${themeConfig.wallpaper.blur}px)` : undefined,
          backgroundImage: themeConfig?.wallpaper?.preset === 'custom_image' && themeConfig?.wallpaper?.customImageUrl
            ? `url("${themeConfig.wallpaper.customImageUrl}")`
            : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: themeConfig?.wallpaper?.customColor || 'var(--mk-wallpaper-color, #130f26)'
        }}
      />
      <div 
        className="absolute inset-0 pointer-events-none bg-black z-0 transition-opacity duration-300"
        style={{ opacity: 'var(--mk-wallpaper-dark-overlay, 0.3)' }}
      />

      {/* Top Chat Header */}
      <div 
        className="h-[62px] px-3.5 flex items-center justify-between border-b border-white/5 relative z-30 shrink-0 transition-colors bg-[#11141d]/95 backdrop-blur-xl shadow-md"
        style={{
          backgroundColor: 'var(--mk-header-bg, #11141d)',
          color: 'var(--mk-header-text, #ffffff)'
        }}
      >
        {searchInChat ? (
          <div className="flex items-center w-full bg-[#181b26] rounded-full px-3.5 py-1.5 border border-white/10 shadow-inner">
            <Search size={16} className="text-[#8e95a5] mr-2" />
            <input
              type="text"
              placeholder="Rechercher dans la discussion..."
              value={chatSearchQuery}
              onChange={(e) => setChatSearchQuery(e.target.value)}
              autoFocus
              className="flex-1 bg-transparent text-xs text-white focus:outline-none"
            />
            <button
              onClick={() => {
                setSearchInChat(false);
                setChatSearchQuery('');
              }}
              className="p-1.5 text-[#8e95a5] hover:text-white hover:bg-white/10 rounded-full cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center space-x-3 flex-1 overflow-hidden">
              <button
                onClick={onBack}
                className="p-1.5 sm:hidden text-[#8e95a5] hover:text-white hover:bg-white/5 rounded-full transition-all cursor-pointer"
              >
                <ArrowLeft size={20} />
              </button>
              
              <div 
                className="relative cursor-pointer group"
                onClick={onOpenContactInfo}
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full p-[2px] bg-gradient-to-tr from-[#fd79a8] via-[#a29bfe] to-[#6c5ce7] shadow-lg relative group-hover:scale-105 transition-transform">
                  <div className="w-full h-full rounded-full overflow-hidden bg-[#11141d]">
                    {partnerProfile?.avatarUrl ? (
                      <img src={partnerProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UserIcon size={20} className="text-[#a29bfe]" />
                      </div>
                    )}
                  </div>
                </div>
                {isPartnerOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#00b894] border-2 border-[#11141d] rounded-full shadow-sm animate-pulse" />
                )}
              </div>
              
              <div 
                className="flex flex-col min-w-0 cursor-pointer group flex-1"
                onClick={onOpenContactInfo}
              >
                <div className="flex items-center gap-1.5">
                  <h2 className="font-bold text-sm sm:text-base text-white truncate group-hover:text-[#a29bfe] transition-colors leading-tight">
                    {partnerNickname || partnerUser.name}
                  </h2>
                </div>
                <div className="flex items-center text-[11px] text-[#8e95a5] mt-0.5">
                  {isPartnerTyping ? (
                    <span className="text-[#55efc4] font-medium italic animate-pulse">écrit…</span>
                  ) : isPartnerOnline ? (
                    <span className="text-[#00b894] font-medium">En ligne</span>
                  ) : partnerLastSeenText ? (
                    <span className="text-[#8e95a5]">{partnerLastSeenText}</span>
                  ) : (
                    <span className="text-[#8e95a5]/70">Hors ligne</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
              <button
                onClick={() => onStartCall('video')}
                disabled={!pairingState?.isPaired || !pairingState?.coupleId}
                className="p-2 sm:p-2.5 text-[#8e95a5] hover:text-white hover:bg-white/10 bg-white/5 border border-white/5 rounded-full transition-all disabled:opacity-50 cursor-pointer"
                title="Appel vidéo intime"
              >
                <Video size={18} />
              </button>
              <button
                onClick={() => onStartCall('audio')}
                disabled={!pairingState?.isPaired || !pairingState?.coupleId}
                className="p-2 sm:p-2.5 text-[#8e95a5] hover:text-white hover:bg-white/10 bg-white/5 border border-white/5 rounded-full transition-all disabled:opacity-50 cursor-pointer"
                title="Appel vocal intime"
              >
                <Phone size={18} />
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setShowChatMenu(!showChatMenu)}
                  className="p-2 sm:p-2.5 text-[#8e95a5] hover:text-white hover:bg-white/10 bg-white/5 border border-white/5 rounded-full transition-all cursor-pointer"
                  title="Menu discussion"
                >
                  <MoreVertical size={18} />
                </button>

                {showChatMenu && (
                  <div className="absolute right-0 top-12 w-56 bg-[#171b26] border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-2 animate-in zoom-in-95 duration-100 origin-top-right z-50 backdrop-blur-2xl">
                    
                    {onOpenGames && pairingState?.isPaired && (
                      <button
                        onClick={() => {
                          setShowChatMenu(false);
                          console.log('[Game] Bouton roue de défis cliqué');
                          onOpenGames('wheel');
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-white/5 flex items-center space-x-3 text-white cursor-pointer"
                      >
                        <span className="text-base">🎡</span>
                        <span>Roue de défis</span>
                      </button>
                    )}

                    <div className="h-px bg-white/5 my-1" />

                    <button
                      onClick={() => {
                        setSearchInChat(true);
                        setShowChatMenu(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-white/5 flex items-center space-x-3 text-white cursor-pointer"
                    >
                      <Search size={16} className="text-[#a29bfe]" />
                      <span>Rechercher</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Supabase Error & Pairing Status Banners */}
      {(!pairingState?.isPaired || !pairingState?.coupleId) && (
        <div className="bg-[#2d1215] border-b border-[#ff7675]/40 px-4 py-2 text-xs text-[#ff7675] flex items-center justify-center gap-2 text-center z-20">
          <AlertCircle size={14} className="shrink-0 text-[#ff7675]" />
          <span>Aucun couple appairé. Veuillez appairer vos deux appareils pour discuter sur Mikayla.</span>
        </div>
      )}

      {chatError && (
        <div className="bg-[#2d1215] border-b border-[#ff7675]/40 px-4 py-2 text-xs text-[#ff7675] flex items-center justify-between gap-2 z-20">
          <div className="flex items-center gap-2 truncate">
            <AlertCircle size={14} className="shrink-0 text-[#ff7675]" />
            <span className="truncate">{chatError}</span>
          </div>
          <button 
            onClick={() => setChatError(null)} 
            className="text-[#ff7675] hover:text-white font-bold text-xs cursor-pointer px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Dynamic Tri-Mode Network Sub-banner */}
      {networkState && (
        <div className={`px-3 py-1.5 flex items-center justify-between text-[11px] border-b z-20 transition-colors ${
          networkState.mode === 'sms'
            ? 'bg-[#26171d] border-[#ff7675]/40 text-[#ff7675]'
            : networkState.mode === 'proximity'
            ? 'bg-[#1e153a] border-[#6c5ce7]/40 text-[#a29bfe]'
            : 'bg-[#111f26] border-[#00b894]/30 text-[#55efc4]'
        }`}>
          <div className="flex items-center gap-2 truncate">
            {networkState.mode === 'sms' ? (
              <>
                <MessageSquare size={13} className="shrink-0 text-[#ff7675]" />
                <span className="font-bold">Mode SMS Direct (0-Data) :</span>
                <span className="text-[#ffeaa7] truncate">Envoi via SMS vers {partnerUser.phone || partnerUser.name}</span>
              </>
            ) : networkState.mode === 'proximity' ? (
              <>
                <Bluetooth size={13} className="shrink-0 text-[#a29bfe]" />
                <span className="font-bold">Mode Proximité ({networkState.proximityTech === 'bluetooth' ? 'Bluetooth Direct' : 'Wi-Fi Direct'}) :</span>
                <span className="text-white truncate">Signal {networkState.signalStrength || 95}% (0-Data)</span>
              </>
            ) : (
              <>
                <Globe size={13} className="shrink-0 text-[#00b894]" />
                <span className="font-bold">Mode Cloud & Visio :</span>
                <span className="text-[#a29bfe] truncate">Supabase Realtime • Chiffré</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-2">
            {networkState.mode === 'sms' && onOpenSmsImport && (
              <button
                type="button"
                onClick={onOpenSmsImport}
                className="px-2 py-0.5 rounded-lg bg-[#ff7675]/20 hover:bg-[#ff7675]/30 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                title="Coller un SMS reçu de votre partenaire"
              >
                <ArrowDownToLine size={11} />
                <span>Importer SMS</span>
              </button>
            )}
            {onOpenNetworkModal && (
              <button
                type="button"
                onClick={onOpenNetworkModal}
                className="text-[10px] font-bold underline hover:opacity-80 cursor-pointer"
              >
                Changer
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pinned Message Banner */}
      {pinnedMessage && (
        <div
          onClick={() => {
            const el = document.getElementById(`msg-${pinnedMessage.id}`);
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-[#1b1435]/90 border-b border-[#2d2254] px-4 py-2 flex items-center justify-between text-xs cursor-pointer z-20 backdrop-blur-sm shadow-sm"
        >
          <div className="flex items-center gap-2 truncate">
            <Pin size={13} className="text-[#00b894] shrink-0 rotate-45" />
            <span className="font-semibold text-white">Épinglé :</span>
            <span className="text-[#a29bfe] truncate">{pinnedMessage.content}</span>
          </div>
          <span className="text-[10px] text-[#55efc4] font-medium shrink-0 ml-2">Voir</span>
        </div>
      )}

      {/* Ephemeral Timer Banner if active */}
      {settings.ephemeralDuration && settings.ephemeralDuration > 0 && (
        <div className="bg-[#130f26]/80 text-[#a29bfe] text-[11px] py-1 px-4 text-center border-b border-[#2d2254]/50 flex items-center justify-center gap-1.5">
          <Sparkles size={12} className="text-[#55efc4]" />
          <span>Messages éphémères actifs (disparition après {Math.round(settings.ephemeralDuration / 60)} min)</span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-2 relative z-10 w-full">
        {/* Starry Ambient Wallpaper Effect */}
        {settings.wallpaperDoodle && (
          <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
        )}

        <div className="max-w-4xl mx-auto w-full space-y-2 relative">
          {/* Chiffrement Notice Card */}
          <div className="my-3 flex justify-center">
            <div className="bg-[#171230]/90 border border-[#2d2254] rounded-2xl p-2.5 max-w-xs text-center shadow-sm">
              <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#55efc4] mb-0.5">
                <Lock size={11} />
                <span>Chiffrement de bout en bout Mikayla</span>
              </div>
              <p className="text-[10px] text-[#a29bfe] leading-tight">
                Seuls vous deux pouvez lire ou écouter les messages intimes échangés ici.
              </p>
            </div>
          </div>

        {filteredMessages.map((msg, index) => {
          const authenticatedId = currentAuthUserId || currentUser.id;
          const isMe = Boolean(
            msg.senderId && (
              msg.senderId === currentUser.id ||
              (currentAuthUserId && msg.senderId === currentAuthUserId) ||
              (authenticatedId && msg.senderId === authenticatedId) ||
              (partnerUser.id ? msg.senderId !== partnerUser.id : false)
            )
          );
          const showDateDivider = index === 0 || 
            new Date(msg.timestamp).toDateString() !== new Date(filteredMessages[index - 1].timestamp).toDateString();
          
          const isPlayingThis = playingAudioId === msg.id;
          const quotedMsg = msg.replyToId ? messagesByIdMap.get(msg.replyToId) : null;

          return (
            <React.Fragment key={msg.id}>
              {/* Date Divider */}
              {showDateDivider && (
                <div className="flex justify-center my-3.5">
                  <span className="bg-[#171b26]/90 backdrop-blur-md text-[#8e95a5] text-[10px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-sm border border-white/5">
                    {formatDateDivider(msg.timestamp)}
                  </span>
                </div>
              )}

              {/* Message Row */}
              <div
                id={`msg-${msg.id}`}
                className={`message-item-container flex flex-col group ${isMe ? 'items-end' : 'items-start'} relative my-0.5`}
              >
                {/* Floating Reaction Bar */}
                {activeReactionMsgId === msg.id && !msg.isDeletedForEveryone && (
                  <div className="reaction-bar-container absolute -top-11 z-40 bg-[#171b26]/95 backdrop-blur-xl border border-white/10 rounded-full px-2.5 py-1 shadow-2xl flex items-center gap-1.5 animate-in zoom-in-95 duration-100">
                    {['❤️', '🔥', '😘', '🥺', '✨', '😂', '😍', '👍'].map(emoji => (
                      <button
                        key={emoji}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleReaction(msg.id, emoji);
                        }}
                        className="text-base hover:scale-130 active:scale-95 transition-transform p-1 cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                    {/* Plus button to open full emoji & system emoji palette */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEmojiPickerMsgId(msg.id);
                        setActiveReactionMsgId(null);
                      }}
                      className="p-1 text-[#fd79a8] hover:scale-125 rounded-full transition-transform cursor-pointer"
                      title="Tous les émojis système & couple"
                    >
                      <Plus size={16} />
                    </button>
                    <div className="w-px h-4 bg-white/20 mx-0.5" />
                    {/* Direct Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmMsgId(msg.id);
                        setActiveReactionMsgId(null);
                      }}
                      className="p-1 text-[#ff7675] hover:scale-125 rounded-full transition-transform cursor-pointer hover:bg-[#ff7675]/20"
                      title="Supprimer ce message"
                    >
                      <Trash2 size={15} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveContextMenuMsgId(msg.id);
                        setActiveReactionMsgId(null);
                      }}
                      className="p-1 text-[#8e95a5] hover:text-white rounded-full cursor-pointer"
                      title="Plus d'actions"
                    >
                      <MoreVertical size={14} />
                    </button>
                  </div>
                )}

                {/* Quick Action Trigger Buttons on Hover */}
                {!msg.isDeletedForEveryone && (
                  <div className={`opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute top-1/2 -translate-y-1/2 ${isMe ? '-left-24' : '-right-24'} hidden sm:flex items-center gap-1 z-20`}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id);
                      }}
                      className="p-1.5 rounded-full bg-[#1b1435]/90 hover:bg-[#281e4b] border border-[#2d2254] text-[#a29bfe] hover:text-[#fd79a8] shadow-md transition-all hover:scale-110 cursor-pointer"
                      title="Réagir avec un émoji"
                    >
                      <Smile size={14} />
                    </button>
                    {isMe && (!msg.type || msg.type === 'text') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingMessage(msg);
                          setInputText(msg.content);
                          setReplyingTo(null);
                        }}
                        className="p-1.5 rounded-full bg-[#1b1435]/90 hover:bg-[#74b9ff]/20 border border-[#2d2254] text-[#a29bfe] hover:text-[#74b9ff] shadow-md transition-all hover:scale-110 cursor-pointer"
                        title="Modifier ce message"
                      >
                        <Edit3 size={14} />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmMsgId(msg.id);
                      }}
                      className="p-1.5 rounded-full bg-[#1b1435]/90 hover:bg-[#ff7675]/20 border border-[#2d2254] text-[#a29bfe] hover:text-[#ff7675] shadow-md transition-all hover:scale-110 cursor-pointer"
                      title="Supprimer ce message"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}

                {/* Swipe-to-reply visual indicator badge */}
                {swipingMsgId === msg.id && swipeOffset > 5 && (
                  <div 
                    className="absolute left-1 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-[#00b894]/20 border border-[#00b894]/40 text-[#00b894] transition-opacity pointer-events-none z-10 shadow-lg"
                    style={{
                      opacity: Math.min(swipeOffset / 45, 1),
                      transform: `translateY(-50%) scale(${Math.min(0.6 + (swipeOffset / 45) * 0.5, 1.15)})`
                    }}
                  >
                    <CornerUpLeft size={16} />
                  </div>
                )}

                {/* Message Bubble Card */}
                <div
                  onClick={() => {
                    if (swipingMsgId === msg.id && swipeOffset > 10) return;
                    setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    triggerHaptic(30);
                    setActiveContextMenuMsgId(msg.id);
                  }}
                  onTouchStart={(e) => handleTouchStartMessage(e, msg)}
                  onTouchMove={(e) => handleTouchMoveMessage(e, msg)}
                  onTouchEnd={() => handleTouchEndMessage(msg)}
                  onTouchCancel={() => handleTouchEndMessage(msg)}
                  onMouseDown={(e) => handleTouchStartMessage(e, msg)}
                  onMouseMove={(e) => handleTouchMoveMessage(e, msg)}
                  onMouseUp={() => handleTouchEndMessage(msg)}
                  onMouseLeave={() => handleTouchEndMessage(msg)}
                  className={`message-bubble relative max-w-[85%] sm:max-w-[65%] p-3 shadow-md cursor-pointer select-none ${getBubbleShapeClass(isMe)}`}
                  style={{
                    backgroundColor: isMe ? 'var(--mk-bubble-sent-bg)' : 'var(--mk-bubble-recv-bg)',
                    color: isMe ? 'var(--mk-bubble-sent-text)' : 'var(--mk-bubble-recv-text)',
                    borderRadius: bubbleShape === 'capsule' ? '9999px' : 'var(--mk-bubble-radius, 16px)',
                    fontFamily: 'var(--mk-font-family)',
                    transform: swipingMsgId === msg.id ? `translateX(${swipeOffset}px)` : 'translateX(0px)',
                    transition: swipingMsgId === msg.id ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)'
                  }}
                >
                  {/* Recv Sender Name */}
                  {!isMe && (
                    <p 
                      className="font-bold text-[10px] mb-1"
                      style={{ color: 'var(--mk-bubble-recv-sender)' }}
                    >
                      {partnerUser.name}
                    </p>
                  )}

                  {/* Quoted Message preview if reply */}
                  {quotedMsg && (
                    <div className="mb-2 p-2 rounded-xl bg-black/25 border-l-3 border-[#fd79a8] text-xs">
                      <p className="font-bold text-[#55efc4]">
                        {quotedMsg.senderId === currentUser.id ? 'Vous' : partnerUser.name}
                      </p>
                      <p className={`text-[#a29bfe] truncate ${quotedMsg.isDeletedForEveryone ? 'italic' : ''}`}>
                        {Boolean(quotedMsg.isDeletedForEveryone || quotedMsg.deletedForEveryone || quotedMsg.deleted_for_everyone) ? 'Ce message a été supprimé' : quotedMsg.content}
                      </p>
                    </div>
                  )}

                  {/* Deleted Message Placeholder */}
                  {Boolean(msg.isDeletedForEveryone || msg.deletedForEveryone || msg.deleted_for_everyone) ? (
                    <div className="flex items-center gap-2 italic text-stone-400 dark:text-stone-400 text-xs py-1 px-1 select-none">
                      <Trash2 size={13} className="opacity-70 flex-shrink-0" />
                      <span>Ce message a été supprimé</span>
                    </div>
                  ) : (
                    <>
                      {/* HEARTBEAT MESSAGE TYPE */}
                      {msg.type === 'heartbeat' && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        soundEffects.playHeartbeat();
                        triggerHaptic([120, 60, 220, 60, 350]);
                      }}
                      className="p-2 flex flex-col items-center text-center cursor-pointer select-none"
                    >
                      <div className="relative my-2">
                        <Heart size={48} className="text-[#fd79a8] fill-[#fd79a8] animate-heart-thump" />
                        <Sparkles size={16} className="absolute -top-1 -right-1 text-[#ffeaa7]" />
                      </div>
                      <h4 className="font-bold text-sm text-white mb-0.5">
                        {msg.content || 'Battement de Cœur Transmis'}
                      </h4>
                      <p className="text-[10px] text-[#a29bfe] flex items-center gap-1 justify-center">
                        <Volume2 size={11} className="text-[#55efc4]" />
                        <span>Touchez pour écouter & ressentir</span>
                      </p>
                    </div>
                  )}

                  {/* Missed Call or Normal Text Message */}
                  {(msg.type === 'text' || msg.type === 'system') && (
                    Boolean(msg.content && (msg.content.includes('Appel vocal manqué') || msg.content.includes('Appel vidéo manqué') || msg.content.includes('Appel manqué'))) ? (
                      <div className="p-1 min-w-[200px]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-[#ff7675]/20 border border-[#ff7675]/35 flex items-center justify-center shrink-0 shadow-inner">
                            {msg.content.includes('vidéo') ? (
                              <VideoOff size={20} className="text-[#ff7675]" />
                            ) : (
                              <PhoneMissed size={20} className="text-[#ff7675]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm text-[#ff7675] truncate leading-tight">
                              {msg.content.includes('vidéo') ? 'Appel vidéo manqué' : 'Appel vocal manqué'}
                            </h4>
                            <p className="text-xs text-[#a29bfe] font-medium truncate mt-0.5">
                              {msg.content.includes('Origine :')
                                ? msg.content.substring(msg.content.indexOf('Origine :'))
                                : `Origine : ${isMe ? (currentUser.name || 'Vous') : (partnerNickname || partnerProfile?.name || partnerUser.name)}`}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartCall(msg.content.includes('vidéo') ? 'video' : 'audio');
                          }}
                          className="w-full mt-2.5 py-1.5 px-3 bg-[#ff7675]/15 hover:bg-[#ff7675]/25 active:scale-95 border border-[#ff7675]/30 rounded-xl text-xs font-bold text-[#ff7675] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                          title="Rappeler directement"
                        >
                          {msg.content.includes('vidéo') ? <Video size={14} /> : <Phone size={14} />}
                          <span>Rappeler</span>
                        </button>
                      </div>
                    ) : (
                      // Ne pas afficher de texte brut si le message contient un JSON de jeu ou structure de données
                      (!msg.content?.trim().startsWith('{') && !msg.content?.includes('"gameType"')) ? (
                        <div 
                          className="leading-relaxed whitespace-pre-wrap break-words font-medium"
                          style={{ fontSize: 'var(--mk-font-size, 14px)' }}
                        >
                          {renderFormattedText(msg.content)}
                        </div>
                      ) : null
                    )
                  )}

                  {/* Photo */}
                  {msg.type === 'image' && (
                    <div className="space-y-1.5">
                      {msg.isViewOnce && msg.isViewed ? (
                        <div className="p-3 rounded-xl bg-black/30 border border-[#2d2254] flex items-center gap-2 text-xs text-[#a29bfe]">
                          <Eye size={16} className="text-[#a29bfe]" />
                          <span>Photo vue unique ouverte</span>
                        </div>
                      ) : msg.isViewOnce ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenMediaLightbox(msg);
                          }}
                          className="px-3.5 py-2.5 rounded-xl bg-[#130f26] hover:bg-[#20183e] border border-[#00b894]/40 flex items-center gap-2 text-xs font-bold text-[#55efc4] w-full cursor-pointer"
                        >
                          <div className="w-6 h-6 rounded-full border-2 border-[#00b894] flex items-center justify-center text-[10px] font-bold">
                            1
                          </div>
                          <span>Photo vue unique (Touchez pour voir)</span>
                        </button>
                      ) : (
                        <SecureChatMessageImage
                          storagePath={msg.storagePath}
                          mediaUrl={msg.mediaUrl}
                          isHD={msg.isHD}
                          alt="Photo intime"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenMediaLightbox(msg);
                          }}
                        />
                      )}

                      {msg.content && (
                        <p className="text-xs sm:text-sm pt-1">{renderFormattedText(msg.content)}</p>
                      )}
                    </div>
                  )}

                  {/* Voice Audio Player */}
                  {msg.type === 'audio' && (
                    <MediaBubble
                      type="audio"
                      storagePath={msg.storagePath}
                      mediaUrl={msg.mediaUrl}
                      audioDuration={msg.audioDuration}
                      waveform={msg.waveform}
                      isPlaying={playingAudioId === msg.id}
                      progress={audioProgress[msg.id] || 0}
                      onTogglePlay={() => setPlayingAudioId(playingAudioId === msg.id ? null : msg.id)}
                    />
                  )}

                  {/* Video Message Player */}
                  {(msg.type === 'video' || msg.type === 'video_note') && (
                    <MediaBubble
                      type="video"
                      storagePath={msg.storagePath}
                      mediaUrl={msg.mediaUrl}
                      isPlaying={playingAudioId === msg.id}
                      onTogglePlay={() => setPlayingAudioId(playingAudioId === msg.id ? null : msg.id)}
                    />
                  )}


                  {/* Interactive Poll */}
                  {msg.type === 'poll' && msg.pollData && (
                    <div className="space-y-2.5 min-w-[220px] sm:min-w-[260px]">
                      <div className="flex items-center gap-2 text-[#55efc4] text-xs font-bold">
                        <BarChart2 size={16} />
                        <span>Sondage de Couple</span>
                      </div>
                      <h4 className="font-bold text-sm text-white">{msg.pollData.question}</h4>

                      <div className="space-y-2">
                        {msg.pollData.options.map((opt) => {
                          const totalVotes = msg.pollData?.options.reduce((sum, o) => sum + o.votes.length, 0) || 0;
                          const hasVoted = opt.votes.includes(currentUser.id);
                          const percentage = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;

                          return (
                            <div
                              key={opt.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVotePoll(msg.id, opt.id);
                              }}
                              className="relative bg-black/20 border border-[#2d2254] rounded-xl p-2.5 cursor-pointer overflow-hidden transition-all hover:bg-black/30"
                            >
                              <div
                                style={{ width: `${percentage}%` }}
                                className="absolute left-0 top-0 bottom-0 bg-[#00b894]/25 transition-all duration-300 pointer-events-none"
                              />

                              <div className="relative z-10 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                    hasVoted ? 'border-[#00b894] bg-[#00b894]' : 'border-[#a29bfe]'
                                  }`}>
                                    {hasVoted && <Check size={11} className="text-[#130f26] stroke-[3]" />}
                                  </div>
                                  <span className="font-semibold text-white">{opt.text}</span>
                                </div>
                                <span className="font-bold text-[#a29bfe]">{opt.votes.length} ({percentage}%)</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SCRATCH CARD MESSAGE TYPE */}
                  {msg.type === 'scratch_card' && msg.scratchCardData && (
                    <div className="py-1">
                      <ScratchCardBubble
                        data={msg.scratchCardData}
                        isSender={isMe}
                        onFullyScratched={() => {
                          if (!msg.scratchCardData?.isScratched) {
                            onUpdateMessage(msg.id, {
                              scratchCardData: {
                                ...msg.scratchCardData,
                                isScratched: true,
                                scratchProgress: 100
                              }
                            });
                          }
                        }}
                      />
                    </div>
                  )}

                  {/* DIGITAL TOUCH MESSAGE TYPE */}
                  {msg.type === 'digital_touch' && msg.digitalTouchData && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        soundEffects.playHeartbeat();
                        triggerHaptic([60, 40, 100, 40, 150]);
                      }}
                      className="p-1 space-y-2 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#00b894]">
                        <Zap size={15} />
                        <span>Toucher Lumineux Partagé ✨</span>
                      </div>
                      <div className="rounded-2xl overflow-hidden border border-[#2d2254] bg-[#130f26] relative group">
                        <img
                          src={msg.digitalTouchData.previewUrl}
                          alt="Toucher Digital"
                          className="w-full max-h-60 object-contain rounded-2xl"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="px-3 py-1.5 rounded-xl bg-[#00b894] text-[#130f26] font-bold text-xs shadow-lg flex items-center gap-1">
                            <Heart size={14} className="fill-[#130f26]" />
                            <span>Ressentir à nouveau</span>
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-[#a29bfe] text-center">
                        Touchez pour ressentir les vibrations & battements
                      </p>
                    </div>
                  )}

                  {/* COUPLE COUPON MESSAGE TYPE */}
                  {msg.type === 'couple_coupon' && msg.couponData && (
                    <div className="py-1 min-w-[240px] sm:min-w-[280px]">
                      <div className="bg-gradient-to-br from-[#6c5ce7]/20 via-[#1b1435] to-[#fd79a8]/20 border border-[#6c5ce7]/50 rounded-2xl p-3.5 shadow-lg relative overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#6c5ce7]/20 text-[#a29bfe]">
                            Bon d'Amour
                          </span>
                          <span className="text-[10px] font-semibold text-[#55efc4] flex items-center gap-1">
                            <Ticket size={12} />
                            <span>{msg.couponData.status === 'available' ? 'Disponible' : msg.couponData.status === 'claimed' ? 'Réclamé' : 'Validé'}</span>
                          </span>
                        </div>

                        <h4 className="font-bold text-sm text-white mb-1">{msg.couponData.title}</h4>
                        <p className="text-xs text-[#a29bfe] mb-3 leading-relaxed">{msg.couponData.description}</p>

                        <div className="flex items-center justify-between pt-2 border-t border-[#2d2254]">
                          <span className="text-[10px] text-[#a29bfe]">
                            Bénéficiaire : <strong className="text-white">{msg.couponData.recipientId === currentUser.id ? 'Vous' : partnerUser.name}</strong>
                          </span>

                          {msg.couponData.status === 'available' && onClaimCoupon && msg.couponData.recipientId === currentUser.id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onClaimCoupon(msg.couponData!.id);
                              }}
                              className="px-3 py-1 bg-[#fd79a8] hover:bg-[#e84393] text-[#130f26] font-bold text-xs rounded-xl shadow-sm transition-transform active:scale-95 cursor-pointer"
                            >
                              Réclamer
                            </button>
                          )}

                          {msg.couponData.status === 'claimed' && onRedeemCoupon && msg.couponData.giverId === currentUser.id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRedeemCoupon(msg.couponData!.id);
                              }}
                              className="px-3 py-1 bg-[#00b894] hover:bg-[#00a884] text-[#130f26] font-bold text-xs rounded-xl shadow-sm transition-transform active:scale-95 cursor-pointer"
                            >
                              Valider & Honorer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* BLIND QUIZ MESSAGE TYPE */}
                  {msg.type === 'blind_quiz' && msg.blindQuizData && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenBlindQuiz) onOpenBlindQuiz();
                      }}
                      className="py-1 min-w-[240px] sm:min-w-[280px] cursor-pointer"
                    >
                      <div className="bg-[#130f26] border border-[#00b894]/40 rounded-2xl p-3.5 shadow-md hover:border-[#00b894] transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#00b894]">
                            <EyeOff size={14} />
                            <span>Quiz Double Aveugle</span>
                          </div>
                          <span className="text-[10px] bg-[#00b894]/20 text-[#55efc4] px-2 py-0.5 rounded-full font-semibold">
                            {msg.blindQuizData.isRevealed ? 'Révélé ✨' : 'Sous Scellé 🔒'}
                          </span>
                        </div>

                        <h4 className="font-bold text-xs sm:text-sm text-white mb-2">{msg.blindQuizData.question}</h4>

                        {msg.blindQuizData.isRevealed ? (
                          <div className="p-2 rounded-xl bg-[#1b1435] text-xs space-y-1">
                            <p className="text-[#55efc4] font-medium">Vous : "{msg.blindQuizData.answers[currentUser.id]?.answerText}"</p>
                            <p className="text-[#fd79a8] font-medium">{partnerUser.name} : "{msg.blindQuizData.answers[partnerUser.id]?.answerText}"</p>
                          </div>
                        ) : (
                          <p className="text-[11px] text-[#a29bfe]">
                            Touchez pour ouvrir le quiz et comparer vos réponses complices !
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              
                  {/* ====== JEUX & MESSAGES CACHÉS ====== */}
                  {(msg.type === 'game' || msg.type === 'scratch_card' || msg.type === 'blind_quiz' || (msg.type === 'text' && msg.content && (msg.content.startsWith('{') || msg.content.includes('"gameType"')))) && (() => {
                    let gameData: any = null;
                    if (msg.type === 'scratch_card' && msg.scratchCardData) {
                      gameData = {
                        gameType: 'scratch_card',
                        sessionId: msg.scratchCardData.id,
                        status: msg.scratchCardData.isScratched ? 'scratched' : 'created',
                        content: {
                          title: msg.scratchCardData.title,
                          secretContent: msg.scratchCardData.secretContent,
                          secretMediaUrl: msg.scratchCardData.secretMediaUrl,
                          scratchColor: msg.scratchCardData.scratchColor
                        }
                      };
                    } else if (msg.type === 'blind_quiz' && msg.blindQuizData) {
                      gameData = {
                        gameType: 'blind_quiz',
                        sessionId: msg.blindQuizData.sessionId,
                        question: msg.blindQuizData.question,
                        status: msg.blindQuizData.isRevealed ? 'finished' : 'pending'
                      };
                    } else {
                      try {
                        gameData = JSON.parse(msg.content);
                      } catch(e) {}
                    }
                    
                    if (!gameData || typeof gameData !== 'object') {
                      return <span>{msg.content}</span>;
                    }

                    // 1. DÉS INTIMES
                    if (gameData.gameType === 'intimate_dice' || gameData.gameType === 'dice') {
                      console.log('[Game] Résultat affiché dans la bulle dés');
                      return (
                        <div className="flex flex-col gap-2.5 min-w-[220px] max-w-xs">
                          <div className="flex items-center justify-between pb-2 border-b border-white/10">
                            <div className="flex items-center gap-2">
                              <Dices size={18} className="text-[#55efc4]" />
                              <span className="font-bold text-sm tracking-wide text-white">Dés Intimes</span>
                            </div>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#55efc4]/20 text-[#55efc4] border border-[#55efc4]/40">
                              🎲 Gage
                            </span>
                          </div>
                          
                          <div className="space-y-1.5 text-xs bg-white/5 p-3 rounded-2xl border border-white/10">
                            <div>
                              <span className="text-[#a29bfe] uppercase text-[9px] font-bold tracking-wider block">Action</span>
                              <span className="font-bold text-[#55efc4] text-xs sm:text-sm">{gameData.result?.action || 'Caresse'}</span>
                            </div>
                            <div>
                              <span className="text-[#a29bfe] uppercase text-[9px] font-bold tracking-wider block">Zone</span>
                              <span className="font-bold text-[#fd79a8] text-xs sm:text-sm">{gameData.result?.zone || 'Dans le cou'}</span>
                            </div>
                            <div>
                              <span className="text-[#a29bfe] uppercase text-[9px] font-bold tracking-wider block">Condition</span>
                              <span className="font-bold text-[#ffeaa7] text-xs sm:text-sm">{gameData.result?.duration || 'Pendant 2 minutes'}</span>
                            </div>
                          </div>

                          {onOpenGames && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenGames('dice');
                              }}
                              className="w-full py-2 rounded-xl bg-[#2d2254] hover:bg-[#3d2f6f] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Dices size={14} className="text-[#55efc4]" />
                              <span>Relancer les Dés Intimes 🎲</span>
                            </button>
                          )}
                        </div>
                      );
                    }

                    // 2. ROUE DE DÉFIS
                    if (gameData.gameType === 'challenge_wheel' || gameData.gameType === 'wheel') {
                      console.log('[Game] Résultat affiché dans la bulle roue');
                      const challengeText = gameData.result?.challenge || gameData.result?.description || gameData.result?.title || gameData.challenge || 'Défi tiré au sort !';
                      return (
                        <div className="flex flex-col gap-2.5 min-w-[220px] max-w-xs">
                          <div className="flex items-center justify-between pb-2 border-b border-white/10">
                            <div className="flex items-center gap-2">
                              <span className="text-lg leading-none">🎡</span>
                              <span className="font-bold text-sm tracking-wide text-white">Roue de défis</span>
                            </div>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#e056fd]/20 text-[#e056fd] border border-[#e056fd]/40">
                              ✨ Tirage
                            </span>
                          </div>

                          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                            <span className="text-[#e056fd] uppercase text-[9px] font-extrabold tracking-wider block">
                              Défi complice :
                            </span>
                            <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed">
                              {challengeText}
                            </p>
                          </div>

                          {onOpenGames && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenGames('wheel');
                              }}
                              className="w-full py-2 rounded-xl bg-gradient-to-r from-[#e056fd]/80 to-[#fd79a8]/80 hover:from-[#e056fd] hover:to-[#fd79a8] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                            >
                              <span>🎡 Tourner la Roue de Défis</span>
                            </button>
                          )}
                        </div>
                      );
                    }

                    // 3. ACTION OU VÉRITÉ
                    if (gameData.gameType === 'truth_or_dare' || gameData.gameType === 'tod' || gameData.gameType === 'action_verite') {
                      console.log('[Game] Résultat affiché dans la bulle action ou vérité');
                      const title = gameData.result?.title || gameData.title || 'Action ou Vérité';
                      const desc = gameData.result?.description || gameData.description || gameData.result?.challenge || '';
                      const isTruth = (gameData.result?.type === 'truth' || gameData.type === 'truth');
                      return (
                        <div className="flex flex-col gap-2.5 min-w-[220px] max-w-xs">
                          <div className="flex items-center justify-between pb-2 border-b border-white/10">
                            <div className="flex items-center gap-2">
                              <span className="text-lg leading-none">{isTruth ? '🤫' : '🔥'}</span>
                              <span className="font-bold text-sm tracking-wide text-white">{isTruth ? 'Vérité' : 'Action'}</span>
                            </div>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              isTruth 
                                ? 'bg-[#74b9ff]/20 text-[#74b9ff] border border-[#74b9ff]/40' 
                                : 'bg-[#ff7675]/20 text-[#ff7675] border border-[#ff7675]/40'
                            }`}>
                              {isTruth ? 'Confession 🤫' : 'Gage 🔥'}
                            </span>
                          </div>

                          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                            <h5 className="text-[#ff7675] font-bold text-xs">{title}</h5>
                            <p className="text-xs sm:text-sm font-medium text-white leading-relaxed">
                              {desc}
                            </p>
                          </div>

                          {onOpenGames && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenGames('truth_or_dare');
                              }}
                              className="w-full py-2 rounded-xl bg-gradient-to-r from-[#ff7675] to-[#fd79a8] text-[#130f26] font-bold text-xs flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow-md"
                            >
                              <span>🔥 Tirer une autre carte</span>
                            </button>
                          )}
                        </div>
                      );
                    }

                    // 4. QUIZ DOUBLE AVEUGLE
                    if (gameData.gameType === 'blind_quiz') {
                      console.log('[Quiz] Affichage bulle quiz dans le chat', gameData);
                      const isFinished = gameData.status === 'finished';
                      const questionText = gameData.question || gameData.title || "Quiz Double Aveugle";
                      return (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenBlindQuiz) onOpenBlindQuiz(gameData.sessionId);
                          }}
                          className="flex flex-col gap-2 min-w-[240px] sm:min-w-[260px] cursor-pointer"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg leading-none">❓</span>
                              <span className="font-bold text-sm tracking-wide text-white">
                                {isFinished ? "Quiz terminé ✨" : "Quiz lancé 🔒"}
                              </span>
                            </div>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              isFinished ? 'bg-[#00b894]/20 text-[#55efc4] border border-[#00b894]/40' : 'bg-[#ffeaa7]/20 text-[#ffeaa7] border border-[#ffeaa7]/40 animate-pulse'
                            }`}>
                              {isFinished ? 'Révélé ✨' : 'Sous Scellé 🔒'}
                            </span>
                          </div>
                          
                          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                            <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed">
                              "{questionText}"
                            </p>

                            {isFinished && gameData.summary ? (
                              <div className="p-2.5 rounded-xl bg-black/30 border border-white/10 text-xs space-y-1">
                                <p className="text-[#55efc4] font-medium">Vous : "{gameData.summary.user1Answer}"</p>
                                <p className="text-[#fd79a8] font-medium">{partnerUser.name} : "{gameData.summary.user2Answer}"</p>
                              </div>
                            ) : null}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onOpenBlindQuiz) onOpenBlindQuiz(gameData.sessionId);
                              }}
                              className="w-full py-2 mt-1 rounded-xl bg-gradient-to-r from-[#00b894] to-[#00cec9] hover:from-[#00a884] hover:to-[#00b894] text-[#130f26] font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition-transform active:scale-95 cursor-pointer"
                            >
                              <span>{isFinished ? "Voir le résultat ✨" : "Rejoindre le Quiz 🔓"}</span>
                            </button>
                          </div>
                        </div>
                      );
                    }

                    // 5. CARTE À GRATTER
                    if (gameData.gameType === 'scratch_card') {
                      console.log('[Scratch] Affichage bulle carte à gratter dans le chat', gameData);
                      const isScratched = gameData.status === 'scratched';
                      const cardContent = gameData.content || {};
                      const cardDataForBubble: ScratchCardData = {
                        id: gameData.sessionId || 'scratch_' + msg.id,
                        title: cardContent.title || 'Message à Gratter 🎫',
                        secretContent: cardContent.secretContent || 'Secret à découvrir...',
                        secretMediaUrl: cardContent.secretMediaUrl,
                        scratchColor: cardContent.scratchColor || 'gold',
                        isScratched: isScratched,
                        scratchProgress: isScratched ? 100 : 0
                      };

                      return (
                        <div className="py-1 min-w-[240px] max-w-xs select-none">
                          <div className="flex items-center justify-between pb-1.5 border-b border-white/10 mb-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#ffeaa7]">
                              <span className="text-base leading-none">🎫</span>
                              <span>Carte à gratter</span>
                            </div>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              isScratched 
                                ? 'bg-[#00b894]/20 text-[#55efc4] border border-[#00b894]/40' 
                                : 'bg-[#ffeaa7]/20 text-[#ffeaa7] border border-[#ffeaa7]/40 animate-pulse'
                            }`}>
                              {isScratched ? 'Découverte ✨' : 'Nouvelle carte 🔒'}
                            </span>
                          </div>

                          <ScratchCardBubble
                            data={cardDataForBubble}
                            isSender={isMe}
                            onFullyScratched={() => {
                              if (!isScratched && onScratchCardSession && gameData.sessionId) {
                                onScratchCardSession(gameData.sessionId);
                              }
                            }}
                          />
                        </div>
                      );
                    }

                    // Fallback propre pour tout autre jeu/gage - Ne JAMAIS afficher de JSON brut ou code
                    const customTitle = gameData.title || gameData.result?.title || gameData.result?.action || gameData.name || 'Jeu Complice';
                    const customDesc = gameData.description || gameData.result?.description || gameData.result?.challenge || gameData.challenge || gameData.question || gameData.text || (typeof gameData.result === 'string' ? gameData.result : '');

                    return (
                      <div className="flex flex-col gap-2 min-w-[220px] max-w-xs">
                        <div className="flex items-center justify-between pb-2 border-b border-white/10">
                          <div className="flex items-center gap-2">
                            <Sparkles size={16} className="text-[#fd79a8]" />
                            <span className="font-bold text-sm tracking-wide text-white">{customTitle}</span>
                          </div>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#fd79a8]/20 text-[#fd79a8] border border-[#fd79a8]/40">
                            🎲 Complice
                          </span>
                        </div>
                        {customDesc ? (
                          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs sm:text-sm font-medium text-white leading-relaxed">
                            {customDesc}
                          </div>
                        ) : null}
                      </div>
                    );
                  })()}

              {/* Footer info: Time, Transport Badge, Ticks, Pin, Star */}
                  <div 
                    className="flex items-center justify-end gap-1 text-[10px] mt-1 shrink-0 select-none"
                    style={{
                      color: isMe ? 'var(--mk-bubble-sent-time)' : 'var(--mk-bubble-recv-time)'
                    }}
                  >
                    {msg.transportMode === 'sms' && (
                      <span className="bg-[#ff7675]/20 text-[#ff7675] font-extrabold text-[8px] px-1 py-0.2 rounded border border-[#ff7675]/40 mr-0.5">
                        SMS
                      </span>
                    )}
                    {msg.transportMode === 'proximity' && (
                      <span className="bg-[#6c5ce7]/20 text-[#a29bfe] font-extrabold text-[8px] px-1 py-0.2 rounded border border-[#6c5ce7]/40 mr-0.5 flex items-center gap-0.5">
                        <Bluetooth size={8} /> Prox
                      </span>
                    )}
                    {Boolean(msg.isEdited || msg.is_edited) && <span className="italic mr-0.5 text-[9px] opacity-80">modifié</span>}
                    {msg.isPinned && <Pin size={10} className="text-[#00b894] rotate-45" />}
                    {msg.isStarred && <Star size={10} className="text-[#ffeaa7] fill-[#ffeaa7]" />}
                    <span>{formatTime(msg.timestamp)}</span>
                    {isMe && (
                      <span 
                        className="ml-0.5 inline-flex items-center" 
                        title={
                          (msg.readAt || msg.status === 'read')
                            ? 'Lu par votre partenaire' 
                            : (msg.deliveredAt || msg.status === 'delivered')
                            ? 'Reçu par le partenaire (non lu)' 
                            : 'Envoyé'
                        }
                      >
                        {(msg.readAt || msg.status === 'read') ? (
                          <CheckCheck size={14} className="text-[#55efc4]" style={{ color: 'var(--mk-tick-read, #55efc4)' }} />
                        ) : (msg.deliveredAt || msg.status === 'delivered') ? (
                          <CheckCheck size={14} className="text-gray-400 opacity-80" style={{ color: 'var(--mk-tick-delivered, #cbd5e1)' }} />
                        ) : (
                          <Check size={14} className="text-gray-400 opacity-80" style={{ color: 'var(--mk-tick-single, #9ca3af)' }} />
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Reactions list badge below bubble */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className={`flex items-center -mt-2 z-20 ${isMe ? 'mr-2' : 'ml-2'}`}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEmojiPickerMsgId(msg.id);
                      }}
                      className="bg-[#171230] border border-[#2d2254] hover:border-[#fd79a8]/50 rounded-full px-2 py-0.5 text-xs shadow-md flex items-center gap-1 cursor-pointer transition-transform hover:scale-105"
                      title="Gérer les réactions"
                    >
                      {Object.entries(msg.reactions).map(([userId, emoji]) => (
                        <span key={userId} className="leading-none">{emoji}</span>
                      ))}
                    </button>
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Banner */}
      {replyingTo && (
        <div className="bg-[#1b1435] border-t border-[#2d2254] p-3 z-30">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 border-l-4 border-[#00b894] pl-2 text-xs truncate">
              <CornerUpLeft size={16} className="text-[#00b894] shrink-0" />
              <div className="truncate">
                <p className="font-bold text-[#55efc4]">
                  Répondre à {replyingTo.senderId === currentUser.id ? 'Vous-même' : partnerUser.name}
                </p>
                <p className="text-[#a29bfe] truncate">{replyingTo.content}</p>
              </div>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 text-[#a29bfe] hover:text-white rounded-full cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Edit Message Banner */}
      {editingMessage && (
        <div className="bg-[#1b1435] border-t border-[#2d2254] p-3 z-30">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 border-l-4 border-[#74b9ff] pl-2 text-xs truncate">
              <Edit3 size={16} className="text-[#74b9ff] shrink-0" />
              <div className="truncate">
                <p className="font-bold text-[#74b9ff]">
                  Modifier le message
                </p>
                <p className="text-white/80 truncate">{editingMessage.content}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingMessage(null);
                setInputText('');
              }}
              className="p-1 text-[#a29bfe] hover:text-white rounded-full cursor-pointer"
              title="Annuler la modification"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Attachments Menu Drawer */}
      {showAttachMenu && (
        <div
          ref={attachMenuRef}
          role="menu"
          aria-label="Menu des pièces jointes"
          className="bg-[#1b1435]/95 backdrop-blur-xl border-t border-[#2d2254] p-4 z-30 shadow-2xl animate-in slide-in-from-bottom-3 duration-150"
        >
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Header with Title & Close button */}
            <div className="flex items-center justify-between pb-2 border-b border-[#2d2254]/60">
              <span className="text-xs font-bold text-[#e9edef] tracking-wide uppercase flex items-center gap-2">
                <Paperclip size={14} className="text-[#00b894]" />
                <span>Pièces jointes & Médias</span>
              </span>
              <button
                type="button"
                onClick={() => setShowAttachMenu(false)}
                aria-label="Fermer le menu pièces jointes"
                className="text-[#a29bfe] hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Standard 6 Media Items Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {/* 1. Galerie - ACTIVE (Photos & Vidéos) */}
              <button
                type="button"
                onClick={() => {
                  setShowAttachMenu(false);
                  setIsGalleryPickerOpen(true);
                }}
                aria-label="Galerie photos et vidéos"
                className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-white/5 transition-all group/item cursor-pointer active:scale-95"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0984e3] to-[#74b9ff] flex items-center justify-center text-white shadow-lg group-hover/item:scale-105 transition-transform">
                  <ImageIcon size={22} />
                </div>
                <span className="text-[11px] font-bold text-white whitespace-nowrap">Galerie</span>
              </button>

              {/* 2. Caméra - ACTIVE */}
              <button
                type="button"
                onClick={() => {
                  setShowAttachMenu(false);
                  setIsDirectCameraOpen(true);
                }}
                aria-label="Caméra directe"
                className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-white/5 transition-all group/item cursor-pointer active:scale-95"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00b894] to-[#55efc4] flex items-center justify-center text-[#130f26] shadow-lg group-hover/item:scale-105 transition-transform">
                  <Camera size={22} />
                </div>
                <span className="text-[11px] font-bold text-white whitespace-nowrap">Caméra</span>
              </button>

              {/* 3. Document / PDF - BIEN TÔT */}
              <button
                type="button"
                onClick={() => handleComingSoon("Document / PDF")}
                aria-label="Document (Bientôt disponible)"
                className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-white/5 transition-all group/item cursor-pointer active:scale-95 relative"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#6c5ce7] to-[#a29bfe] flex items-center justify-center text-white shadow-lg opacity-85 group-hover/item:scale-105 transition-transform relative">
                  <FileText size={22} />
                  <span className="absolute -top-1.5 -right-1 text-[8px] font-extrabold bg-[#fdcb6e] text-[#130f26] px-1.5 py-0.2 rounded-full shadow-sm">
                    Bientôt
                  </span>
                </div>
                <span className="text-[11px] font-medium text-[#a29bfe] whitespace-nowrap">Document</span>
              </button>

              {/* 4. Audio - BIEN TÔT */}
              <button
                type="button"
                onClick={() => handleComingSoon("Audio")}
                aria-label="Fichier Audio (Bientôt disponible)"
                className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-white/5 transition-all group/item cursor-pointer active:scale-95 relative"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#e17055] to-[#fab1a0] flex items-center justify-center text-white shadow-lg opacity-85 group-hover/item:scale-105 transition-transform relative">
                  <Volume2 size={22} />
                  <span className="absolute -top-1.5 -right-1 text-[8px] font-extrabold bg-[#fdcb6e] text-[#130f26] px-1.5 py-0.2 rounded-full shadow-sm">
                    Bientôt
                  </span>
                </div>
                <span className="text-[11px] font-medium text-[#a29bfe] whitespace-nowrap">Audio</span>
              </button>

              {/* 5. Sondage - BIEN TÔT */}
              <button
                type="button"
                onClick={() => handleComingSoon("Sondage")}
                aria-label="Sondage (Bientôt disponible)"
                className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-white/5 transition-all group/item cursor-pointer active:scale-95 relative"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#fdcb6e] to-[#ffeaa7] flex items-center justify-center text-[#130f26] shadow-lg opacity-85 group-hover/item:scale-105 transition-transform relative">
                  <BarChart2 size={22} />
                  <span className="absolute -top-1.5 -right-1 text-[8px] font-extrabold bg-[#fdcb6e] text-[#130f26] px-1.5 py-0.2 rounded-full shadow-sm">
                    Bientôt
                  </span>
                </div>
                <span className="text-[11px] font-medium text-[#a29bfe] whitespace-nowrap">Sondage</span>
              </button>

              {/* 6. Localisation - BIEN TÔT */}
              <button
                type="button"
                onClick={() => handleComingSoon("Localisation")}
                aria-label="Localisation (Bientôt disponible)"
                className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-white/5 transition-all group/item cursor-pointer active:scale-95 relative"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#ff7675] to-[#fd79a8] flex items-center justify-center text-white shadow-lg opacity-85 group-hover/item:scale-105 transition-transform relative">
                  <MapPin size={22} />
                  <span className="absolute -top-1.5 -right-1 text-[8px] font-extrabold bg-[#fdcb6e] text-[#130f26] px-1.5 py-0.2 rounded-full shadow-sm">
                    Bientôt
                  </span>
                </div>
                <span className="text-[11px] font-medium text-[#a29bfe] whitespace-nowrap">Localisation</span>
              </button>
            </div>

            {/* Couple Intimacy & Utilities Drawer */}
            <div className="pt-2 border-t border-[#2d2254]/40 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {onOpenScratchCard && (
                <button
                  type="button"
                  onClick={() => { setShowAttachMenu(false); onOpenScratchCard(); }}
                  className="px-3 py-1.5 rounded-full bg-[#130f26] hover:bg-[#281e4b] border border-[#2d2254] text-[11px] font-medium text-white flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <Gift size={13} className="text-[#fdcb6e]" />
                  <span>À Gratter</span>
                </button>
              )}
              {onOpenGames && pairingState?.isPaired && (
                <button
                  type="button"
                  onClick={() => { setShowAttachMenu(false); console.log('[Game] Bouton roue de défis cliqué'); onOpenGames('wheel'); }}
                  className="px-3 py-1.5 rounded-full bg-[#130f26] hover:bg-[#281e4b] border border-[#e056fd]/40 text-[11px] font-medium text-white flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <span className="text-xs">🎡</span>
                  <span>Roue de défis</span>
                </button>
              )}
              {onOpenGames && pairingState?.isPaired && (
                <button
                  type="button"
                  onClick={() => { setShowAttachMenu(false); console.log('[Game] Bouton dés intimes cliqué'); onOpenGames('dice'); }}
                  className="px-3 py-1.5 rounded-full bg-[#130f26] hover:bg-[#281e4b] border border-[#fd79a8]/40 text-[11px] font-medium text-white flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <span className="text-xs">🎲</span>
                  <span>Dés Intimes</span>
                </button>
              )}
              {onOpenBlindQuiz && (
                <button
                  type="button"
                  onClick={() => { setShowAttachMenu(false); onOpenBlindQuiz(); }}
                  className="px-3 py-1.5 rounded-full bg-[#130f26] hover:bg-[#281e4b] border border-[#2d2254] text-[11px] font-medium text-white flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <EyeOff size={13} className="text-[#a29bfe]" />
                  <span>Quiz Aveugle</span>
                </button>
              )}
              {onOpenVault && (
                <button
                  type="button"
                  onClick={() => { setShowAttachMenu(false); onOpenVault(); }}
                  className="px-3 py-1.5 rounded-full bg-[#130f26] hover:bg-[#281e4b] border border-[#2d2254] text-[11px] font-medium text-white flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <Lock size={13} className="text-[#00b894]" />
                  <span>Coffre-Fort</span>
                </button>
              )}
              {onOpenWishlist && (
                <button
                  type="button"
                  onClick={() => { setShowAttachMenu(false); onOpenWishlist(); }}
                  className="px-3 py-1.5 rounded-full bg-[#130f26] hover:bg-[#281e4b] border border-[#2d2254] text-[11px] font-medium text-white flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <Sparkles size={13} className="text-[#fd79a8]" />
                  <span>Wishlist</span>
                </button>
              )}
              {onOpenGames && pairingState?.isPaired && (
                <button
                  type="button"
                  onClick={() => { setShowAttachMenu(false); console.log('[Game] Bouton roue de défis cliqué'); onOpenGames('wheel'); }}
                  className="px-3 py-1.5 rounded-full bg-[#130f26] hover:bg-[#281e4b] border border-[#e056fd]/40 text-[11px] font-medium text-white flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <span className="text-xs">🎡</span>
                  <span>Roue de défis</span>
                </button>
              )}
              {onOpenCycleCare && (
                <button
                  type="button"
                  onClick={() => { setShowAttachMenu(false); onOpenCycleCare(); }}
                  className="px-3 py-1.5 rounded-full bg-[#130f26] hover:bg-[#281e4b] border border-[#2d2254] text-[11px] font-medium text-white flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <HeartHandshake size={13} className="text-[#fdcb6e]" />
                  <span>Soin & Cycle</span>
                </button>
              )}
              {onOpenSmsImport && (
                <button
                  type="button"
                  onClick={() => { setShowAttachMenu(false); onOpenSmsImport(); }}
                  className="px-3 py-1.5 rounded-full bg-[#130f26] hover:bg-[#281e4b] border border-[#2d2254] text-[11px] font-medium text-white flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <ArrowDownToLine size={13} className="text-[#ff7675]" />
                  <span>Importer SMS</span>
                </button>
              )}
              {onOpenNetworkModal && (
                <button
                  type="button"
                  onClick={() => { setShowAttachMenu(false); onOpenNetworkModal(); }}
                  className="px-3 py-1.5 rounded-full bg-[#130f26] hover:bg-[#281e4b] border border-[#2d2254] text-[11px] font-medium text-white flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <Radio size={13} className="text-[#00b894]" />
                  <span>Mode Réseau</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input for Gallery Media (Photos & Videos) */}
      <input
        type="file"
        ref={galleryInputRef}
        onChange={handlePhotoSelected}
        className="hidden"
        accept="image/*,video/*,image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
      />

      {/* Hidden File Input for Direct Camera Photo (Phase 1) */}
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handlePhotoSelected}
        className="hidden"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
      />

      {/* Hidden Generic File Input (Fallback) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileUpload(e)}
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf"
      />

      {/* Emoji Picker Drawer */}
      {showEmojiPicker && (
        <div className="bg-[#1b1435] border-t border-[#2d2254] p-3 max-h-48 overflow-y-auto z-30">
          <div className="max-w-4xl mx-auto grid grid-cols-8 sm:grid-cols-12 md:grid-cols-16 gap-2 text-2xl">
            {['❤️', '😍', '😘', '🥰', '✨', '🔥', '😂', '🤣', '😊', '🤗', '🍕', '☕', '🍰', '🌸', '🌹', '🌊', '🌴', '⭐', '🌙', '☀️', '🎉', '🎁', '🏖️', '✈️', '🚀', '🚗', '💬', '📱', '🔒', '💯', '👌', '👍'].map(emoji => (
              <button
                key={emoji}
                onClick={() => setInputText(prev => prev + emoji)}
                className="hover:scale-125 transition-transform p-1 cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Message Input Bar */}
      <div 
        className="h-[64px] pb-safe px-2.5 sm:px-4 flex items-center z-30 shrink-0 border-t border-[#2d2254] transition-colors"
        style={{
          backgroundColor: 'var(--mk-header-bg)'
        }}
      >
        <div className="max-w-4xl mx-auto w-full flex items-center gap-1.5 sm:gap-2.5">
        {isRecordingVoice ? (
          <div className="flex-1 flex items-center justify-between bg-[#130f26] rounded-2xl px-4 py-2 border border-[#2d2254]">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#ff7675] animate-pulse-record" />
              <span className="font-mono text-sm font-bold text-white">
                {formatDuration(recordTimer)}
              </span>
              <span className="text-xs text-[#a29bfe]">
                {inputMode === 'voice' ? 'Enregistrement vocal...' : 'Vidéo instantanée...'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsRecordingVoice(false)}
                aria-label="Annuler l'enregistrement"
                className="text-xs text-[#ff7675] hover:underline font-bold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleFinishVoiceRecord}
                aria-label="Envoyer l'enregistrement"
                className="w-8 h-8 rounded-full bg-[#00b894] text-[#130f26] flex items-center justify-center font-bold shadow-md cursor-pointer"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Emoji toggle */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              aria-label="Émojis"
              className={`p-2 rounded-xl transition-colors cursor-pointer shrink-0 ${
                showEmojiPicker ? 'text-[#00b894]' : 'text-[#a29bfe] hover:text-white'
              }`}
              title="Émojis"
            >
              <Smile size={22} />
            </button>

            {/* Paperclip attachment menu */}
            <button
              type="button"
              ref={attachButtonRef}
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              aria-label="Pièce jointe"
              className={`p-2 rounded-xl transition-colors cursor-pointer shrink-0 ${
                showAttachMenu ? 'text-[#00b894]' : 'text-[#a29bfe] hover:text-white'
              }`}
              title="Pièces jointes"
            >
              <Paperclip size={22} />
            </button>

            {/* Text input with auto-formatting support & mode indication */}
            <div className="flex-1 relative flex items-center min-w-0">
              <input
                ref={textInputRef}
                type="text"
                disabled={!pairingState?.isPaired || !pairingState?.coupleId || isSending}
                placeholder={
                  !pairingState?.isPaired || !pairingState?.coupleId
                    ? "Appairage Supabase requis pour discuter..."
                    : networkState?.mode === 'sms'
                    ? `SMS Direct vers ${partnerUser.name.split(' ')[0]}...`
                    : networkState?.mode === 'proximity'
                    ? `Proximité 0-Data vers ${partnerUser.name.split(' ')[0]}...`
                    : "Message (*gras*, _italique_...)"
                }
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendText();
                  }
                }}
                style={{ backgroundColor: 'var(--mk-input-bg)' }}
                className={`w-full border rounded-2xl px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm text-white placeholder-[#a29bfe]/60 focus:outline-none transition-colors ${
                  !pairingState?.isPaired || !pairingState?.coupleId
                    ? 'border-[#ff7675]/30 opacity-70 cursor-not-allowed'
                    : networkState?.mode === 'sms'
                    ? 'border-[#ff7675]/50 focus:border-[#ff7675] pr-16'
                    : networkState?.mode === 'proximity'
                    ? 'border-[#6c5ce7]/50 focus:border-[#6c5ce7]'
                    : 'border-[#2d2254] focus:border-[#00b894]'
                }`}
              />
              {networkState?.mode === 'sms' && inputText.length > 0 && (
                <span className="absolute right-3 text-[9px] font-mono text-[#ff7675] font-bold pointer-events-none">
                  {inputText.length}/160
                </span>
              )}
            </div>

            {/* Direct Camera Button: ALWAYS visible next to text input before Send/Mic */}
            <button
              type="button"
              onClick={() => setIsDirectCameraOpen(true)}
              aria-label="Caméra"
              className="p-2 sm:p-2.5 text-[#a29bfe] hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-95 cursor-pointer shrink-0"
              title="Prendre une photo"
            >
              <Camera size={21} className="stroke-[2.2]" />
            </button>

            {/* Quick Heartbeat Button next to input when empty */}
            {inputText.trim().length === 0 && onOpenHeartbeat && (
              <button
                type="button"
                onClick={onOpenHeartbeat}
                aria-label="Battement de cœur"
                className="p-2 sm:p-2.5 text-[#fd79a8] hover:bg-[#281e4b] rounded-2xl transition-transform active:scale-95 cursor-pointer shrink-0"
                title="Battement de cœur instantané"
              >
                <Heart size={20} className="fill-[#fd79a8] animate-pulse" />
              </button>
            )}

            {/* Send or Voice Note Button */}
            {inputText.trim().length > 0 ? (
              <button
                type="button"
                onClick={handleSendText}
                disabled={isSending || !pairingState?.isPaired || !pairingState?.coupleId}
                aria-label="Envoyer"
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-95 shrink-0 cursor-pointer text-white font-bold ${
                  isSending || !pairingState?.isPaired || !pairingState?.coupleId
                    ? 'bg-[#2d2254] text-[#a29bfe] cursor-not-allowed opacity-60'
                    : networkState?.mode === 'sms'
                    ? 'bg-gradient-to-r from-[#ff7675] to-[#fd79a8] shadow-[0_0_15px_rgba(255,118,117,0.3)]'
                    : networkState?.mode === 'proximity'
                    ? 'bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] shadow-[0_0_15px_rgba(108,92,231,0.3)]'
                    : 'bg-[#00b894] hover:bg-[#00a884] text-[#130f26]'
                }`}
                title={networkState?.mode === 'sms' ? "Envoyer via SMS" : "Envoyer"}
              >
                {isSending ? (
                  <Loader2 size={18} className="animate-spin text-white" />
                ) : (
                  <Send size={18} className="ml-0.5 stroke-[2.5]" />
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartVoiceRecord}
                onDoubleClick={() => setInputMode(inputMode === 'voice' ? 'video_note' : 'voice')}
                aria-label="Note vocale"
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#00b894] hover:bg-[#00a884] text-[#130f26] flex items-center justify-center shadow-lg transition-transform active:scale-95 shrink-0 cursor-pointer"
                title={inputMode === 'voice' ? 'Note vocale (Double-clic pour Note Vidéo)' : 'Note vidéo instantanée'}
              >
                {inputMode === 'voice' ? <Mic size={20} className="stroke-[2.5]" /> : <Video size={20} className="stroke-[2.5]" />}
              </button>
            )}
          </>
        )}
        </div>
      </div>

      {/* Direct Camera Modal (Live capture -> Photo Editor -> Photo Preview or Direct Video) */}
      <DirectCameraModal
        isOpen={isDirectCameraOpen}
        onClose={() => window.history.back()}
        onCapturePhoto={(file: File) => {
          setSelectedPhotoFile(file);
          setIsPhotoEditorOpen(true);
        }}
        onCaptureVideo={async (file: File, duration: number) => {
          window.history.back();
          setIsSending(true);
          try {
            const resultMessage = await envoyerMessageVideo(coupleId, file, duration);
            if (isSupabaseConfigured()) {
              setRealMessages(prev => [...prev.filter(m => m.id !== resultMessage.id), resultMessage]);
            }
          } catch (err: any) {
            console.error('[ChatView] Erreur envoi vidéo enregistrée:', err);
            setComingSoonToast(err.message || "Erreur lors de l'envoi de la vidéo.");
          } finally {
            setIsSending(false);
          }
        }}
        onOpenGalleryFallback={() => {
          window.history.back();
          setIsGalleryPickerOpen(true);
        }}
      />

      {/* Floating Notification Toast for "Bientôt disponible" items */}
      {comingSoonToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#1b1435]/95 border border-[#fdcb6e]/40 text-[#fdcb6e] px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Sparkles size={16} className="text-[#fdcb6e] shrink-0" />
          <span>{comingSoonToast}</span>
        </div>
      )}

      {/* Photo Editor Modal (Phase 2A - Crop, Rotate, Adjust, Filter) */}
      <PhotoEditor
        isOpen={isPhotoEditorOpen}
        file={selectedPhotoFile}
        onClose={() => {
          window.history.back();
        }}
        onComplete={(editedFile: File) => {
          setSelectedPhotoFile(editedFile);
          setIsPhotoPreviewOpen(true);
        }}
      />

      {/* Message Actions Context Menu Overlay */}
      {activeContextMenuMsgId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setActiveContextMenuMsgId(null)}
        >
          <div 
            className="w-full max-w-xs bg-[#1b1435] border border-[#2d2254] rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[#2d2254] flex items-center justify-between">
              <span className="text-xs font-bold text-[#a29bfe] uppercase tracking-wider">Options du message</span>
              <button onClick={() => setActiveContextMenuMsgId(null)} className="text-[#a29bfe] hover:text-white p-1 rounded-lg hover:bg-white/5">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-2 space-y-1">
              <button 
                onClick={() => {
                  if (activeContextMenuMsgId) {
                    setEmojiPickerMsgId(activeContextMenuMsgId);
                    setActiveContextMenuMsgId(null);
                  }
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 text-sm text-[#fd79a8] font-medium transition-colors text-left cursor-pointer"
              >
                <Smile size={18} className="text-[#fd79a8]" />
                <div className="flex flex-col">
                  <span className="font-bold">Réagir au message</span>
                  <span className="text-[10px] text-[#a29bfe]/70 font-normal">Émojis couple & clavier système</span>
                </div>
              </button>

              <button 
                onClick={() => {
                  const msg = filteredMessages.find(m => m.id === activeContextMenuMsgId);
                  if (msg) setReplyingTo(msg);
                  setActiveContextMenuMsgId(null);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 text-sm text-white transition-colors text-left cursor-pointer"
              >
                <CornerUpLeft size={18} className="text-[#00b894]" />
                <span>Répondre</span>
              </button>

              {(() => {
                const targetMsg = filteredMessages.find(m => m.id === activeContextMenuMsgId);
                const isMyMsg = checkIsMyMessage(targetMsg);
                const canEdit = isMyMsg && (!targetMsg?.type || targetMsg?.type === 'text') && !targetMsg?.isDeletedForEveryone;
                if (!canEdit) return null;
                return (
                  <button 
                    onClick={() => {
                      if (targetMsg) {
                        setEditingMessage(targetMsg);
                        setInputText(targetMsg.content);
                        setReplyingTo(null);
                      }
                      setActiveContextMenuMsgId(null);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 text-sm text-[#74b9ff] transition-colors text-left cursor-pointer"
                  >
                    <Edit3 size={18} />
                    <div className="flex flex-col">
                      <span className="font-semibold">Modifier le message</span>
                      <span className="text-[10px] text-[#74b9ff]/70">Corriger ou ajuster le texte</span>
                    </div>
                  </button>
                );
              })()}
              
              <button 
                onClick={() => {
                  setActiveContextMenuMsgId(null);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 text-sm text-white transition-colors text-left"
              >
                <Star size={18} className="text-[#ffeaa7]" />
                <span>Marquer d'une étoile</span>
              </button>

              <div className="h-px bg-[#2d2254] my-1 mx-2" />
              
              <button 
                onClick={() => {
                  if (activeContextMenuMsgId) {
                    setDeleteConfirmMsgId(activeContextMenuMsgId);
                    setActiveContextMenuMsgId(null);
                  }
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-[#ff7675]/20 text-sm text-[#ff7675] transition-colors text-left cursor-pointer"
              >
                <Trash2 size={18} />
                <div className="flex flex-col">
                  <span className="font-semibold">Supprimer le message</span>
                  <span className="text-[10px] text-[#ff7675]/70">Supprimer pour vous ou pour tout le monde</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Message Delete Confirmation Modal */}
      {deleteConfirmMsgId && (
        <div 
          onClick={() => setDeleteConfirmMsgId(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#1b1435] border border-[#2d2254] rounded-3xl p-6 shadow-2xl relative text-center animate-in zoom-in-95 duration-150"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#ff7675]/15 border border-[#ff7675]/30 flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(255,118,117,0.2)]">
              <Trash2 size={26} className="text-[#ff7675]" />
            </div>

            <h3 className="text-base font-bold text-white mb-1.5">
              Supprimer le message ?
            </h3>
            <p className="text-xs text-[#a29bfe] mb-5 leading-relaxed px-2">
              Choisissez comment vous souhaitez supprimer ce message dans votre conversation.
            </p>

            <div className="space-y-2.5">
              {/* Option 1: Supprimer pour tout le monde (affiché si auteur) */}
              {(() => {
                const target = activeMessages.find(m => m.id === deleteConfirmMsgId) || 
                  realMessages.find(m => m.id === deleteConfirmMsgId) || 
                  parentMessages?.find(m => m.id === deleteConfirmMsgId);
                const isMyMsg = checkIsMyMessage(target);
                if (!isMyMsg) return null;

                return (
                  <button
                    onClick={() => handleDeleteMessageInternal(deleteConfirmMsgId, true)}
                    className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#ff7675] to-[#d63031] text-white font-bold text-sm shadow-md hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Trash2 size={16} />
                    <span>Supprimer pour tout le monde</span>
                  </button>
                );
              })()}

              <button
                onClick={() => handleDeleteMessageInternal(deleteConfirmMsgId, false)}
                className="w-full py-3 px-4 rounded-2xl bg-[#281e4b] hover:bg-[#34275f] text-white font-medium text-sm border border-[#3f316e] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 size={15} className="text-[#a29bfe]" />
                <span>Supprimer pour moi</span>
              </button>

              <button
                onClick={() => setDeleteConfirmMsgId(null)}
                className="w-full py-2.5 text-xs text-[#a29bfe] hover:text-white transition-colors cursor-pointer"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview Modal with Caption and WebP Optimizer (Phase 1) */}
      <PhotoPreviewModal
        isOpen={isPhotoPreviewOpen}
        file={selectedPhotoFile}
        onClose={() => window.history.back()}
        onSend={handleSendPhotoMessage}
        isSending={isOptimizingPhoto}
        errorMessage={photoError}
      />

      {/* Direct In-Chat Theme & Personalization Drawer */}
      {themeConfig && onThemeChange && (
        <ChatThemeDrawer
          isOpen={isThemeDrawerOpen}
          onClose={() => setIsThemeDrawerOpen(false)}
          themeConfig={themeConfig}
          onThemeChange={onThemeChange}
          partnerName={partnerNickname || partnerProfile?.display_name || partnerUser.name}
          partnerAvatar={partnerUser.avatar}
        />
      )}

      {/* Media Gallery Picker Modal (Photos & Vidéos avec multi-sélection) */}
      {isGalleryPickerOpen && (
        <MediaGalleryPickerModal
          isOpen={isGalleryPickerOpen}
          onClose={() => setIsGalleryPickerOpen(false)}
          onConfirm={handleConfirmGalleryMedia}
          title="Sélectionner des Photos & Vidéos"
          maxSelection={10}
        />
      )}

      {/* Emoji Reaction & System Emoji Picker Modal */}
      <EmojiReactionPickerModal
        isOpen={Boolean(emojiPickerMsgId)}
        onClose={() => setEmojiPickerMsgId(null)}
        onSelectEmoji={(emoji) => {
          if (emojiPickerMsgId) {
            handleToggleReaction(emojiPickerMsgId, emoji);
          }
        }}
        currentReaction={
          emojiPickerMsgId
            ? activeMessages.find(m => m.id === emojiPickerMsgId)?.reactions?.[currentAuthUserId || currentUser.id]
            : undefined
        }
      />
    </div>
  );
};
