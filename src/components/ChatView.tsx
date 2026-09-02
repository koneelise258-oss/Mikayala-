import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft, Phone, Video, Search, MoreVertical, Paperclip, Smile,
  Mic, Send, Check, CheckCheck, Star, Pin, CornerUpLeft, Trash2, Edit3,
  Info, Eye, BarChart2, Calendar, MapPin, FileText, User as UserIcon,
  Play, Pause, X, ChevronDown, Sparkles, Plus, Compass, Heart, Lock,
  Dices, HeartHandshake, Flame, Volume2, Ticket, EyeOff, Zap, Award, Gift,
  Globe, MessageSquare, Radio, Bluetooth, Wifi, ArrowDownToLine, AlertCircle, Loader2,
  Image as ImageIcon, Camera
} from 'lucide-react';
import { User, Message, ChatSettings, PollData, EventData, LocationData, CallType, CoupleCoupon, NetworkState, UserProfile } from '../types';
import { formatTime, formatDateDivider, formatDuration, renderFormattedText } from '../utils/formatters';
import { soundEffects } from '../utils/audio';
import { triggerHaptic } from '../utils/security';
import { triggerNativeSmsApp } from '../utils/networkManager';
import { ScratchCardBubble } from './ScratchCardBubble';
import { PhotoBubbleImage, SecureChatMessageImage } from './PhotoBubbleImage';
import { PhotoPreviewModal } from './PhotoPreviewModal';
import { DirectCameraModal } from './DirectCameraModal';
import { PhotoEditor } from './photo/PhotoEditor';
import { getStoredPairingState, initAnonymousAuth, fetchActiveCoupleFromSupabase } from '../services/authService';
import { 
  envoyerMessageTexte, 
  envoyerMessagePhoto,
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
  canMarkConversationAsRead as canMarkConversationAsReadGlobal
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
  onOpenGames?: () => void;
  onOpenCycleCare?: () => void;
  onOpenHeartbeat?: () => void;
  onOpenCoupons?: () => void;
  onOpenBlindQuiz?: () => void;
  onOpenDigitalTouch?: () => void;
  onOpenScratchCard?: () => void;
  onClaimCoupon?: (couponId: string) => void;
  onRedeemCoupon?: (couponId: string) => void;
  isPartnerOnline?: boolean;
  isPartnerTyping?: boolean;
  partnerLastSeen?: string | null;
  sendTypingStatus?: (isTyping: boolean) => void;
  // Centralized navigation states
  isPhotoEditorOpen: boolean;
  setIsPhotoEditorOpen: (val: boolean) => void;
  isDirectCameraOpen: boolean;
  setIsDirectCameraOpen: (val: boolean) => void;
  isPhotoPreviewOpen: boolean;
  setIsPhotoPreviewOpen: (val: boolean) => void;
  selectedPhotoFile: File | null;
  setSelectedPhotoFile: (file: File | null) => void;
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
  onClaimCoupon,
  onRedeemCoupon,
  isPartnerOnline = false,
  isPartnerTyping = false,
  partnerLastSeen = null,
  sendTypingStatus = (_isTyping: boolean) => {},
  // New centralized props
  isPhotoEditorOpen,
  setIsPhotoEditorOpen,
  isDirectCameraOpen,
  setIsDirectCameraOpen,
  isPhotoPreviewOpen,
  setIsPhotoPreviewOpen,
  selectedPhotoFile,
  setSelectedPhotoFile
}) => {
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [activeContextMenuMsgId, setActiveContextMenuMsgId] = useState<string | null>(null);
  const [searchInChat, setSearchInChat] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');

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

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const chatMenuRef = useRef<HTMLDivElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const attachButtonRef = useRef<HTMLButtonElement>(null);

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

    return () => {
      window.removeEventListener('mikayala_pairing_changed', handlePairingUpdate);
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
        setRealMessages(fetched);
        setChatError(null);
        // À l'ouverture de la discussion sur chaque téléphone, marquer comme livrés (✓✓ gris)
        marquerMessagesCommeLivrés(coupleId);
        // Marquer comme lus (✓✓ turquoise) UNIQUEMENT si toutes les 6 conditions sont remplies
        if (canMarkConversationAsRead(coupleId)) {
          marquerMessagesCommeLus(coupleId);
        }
      })
      .catch((err: any) => {
        console.error('[ChatView] Erreur chargement messages Supabase:', err);
        setChatError(err.message || 'Impossible de récupérer les messages depuis la base de données.');
      })
      .finally(() => {
        setIsLoadingMessages(false);
      });

    // Realtime Postgres Changes Subscription with filter: couple_id=eq.${coupleId}
    const unsubscribe = sAbonnerAuxMessages(
      coupleId,
      (incomingMessage: Message) => {
        setRealMessages(prev => {
          const existingIdx = prev.findIndex(m => m.id === incomingMessage.id);
          if (existingIdx >= 0) {
            // Update existing message (ex: delivered_at / read_at mis à jour par Realtime UPDATE)
            const existing = prev[existingIdx];
            const merged: Message = {
              ...existing,
              ...incomingMessage,
              // Ne jamais perdre les métadonnées média et contenu
              storagePath: incomingMessage.storagePath || existing.storagePath,
              mediaUrl: incomingMessage.mediaUrl || existing.mediaUrl,
              content: incomingMessage.content || existing.content,
              senderId: incomingMessage.senderId || existing.senderId,
              type: incomingMessage.type || existing.type,
              // Fusionner deliveredAt et readAt sans écraser une valeur valide par null
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
          return [...prev, incomingMessage].sort((a, b) => a.timestamp - b.timestamp);
        });

        // Lorsqu'un nouveau message du partenaire arrive par Realtime :
        const activeUid = currentAuthUserId || currentUser.id;
        if (incomingMessage.senderId && activeUid && incomingMessage.senderId !== activeUid) {
          // 1. Toujours marquer comme reçu / délivré (✓✓ gris)
          marquerMessagesCommeLivrés(coupleId);
          // 2. Marquer comme lu (✓✓ turquoise) UNIQUEMENT si la discussion est ouverte, réellement visible et avec focus
          if (canMarkConversationAsRead(coupleId)) {
            marquerMessagesCommeLus(coupleId);
          }
        }
      },
      (realtimeError: Error) => {
        console.error('[ChatView] Erreur flux Realtime:', realtimeError);
        setChatError(realtimeError.message || 'Erreur lors de la connexion au flux en temps réel.');
      }
    );

    return () => {
      unsubscribe();
    };
  }, [pairingState?.coupleId, currentAuthUserId, isChatActive, isPhotoPreviewOpen, isDirectCameraOpen]);

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

  const activeMessages = (pairingState?.isPaired && pairingState?.coupleId) ? realMessages : parentMessages;
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
      onUpdateMessage(editingMessage.id, {
        content: textToSend,
        isEdited: true
      });
      setEditingMessage(null);
      setInputText('');
      return;
    }

    const currentMode = networkState?.mode || 'cloud';

    // If in SMS mode, trigger native SMS application intent/URI
    if (currentMode === 'sms') {
      triggerNativeSmsApp(partnerUser.phone, textToSend);
    }

    const targetCoupleId = pairingState?.coupleId;

    setIsSending(true);
    setChatError(null);

    try {
      if (targetCoupleId && isSupabaseConfigured()) {
        // Direct insertion into Supabase public.messages
        const sentMessage = await envoyerMessageTexte(targetCoupleId, textToSend);

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
          status: 'sent'
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
        status: 'sent'
      });
      setInputText('');
      setReplyingTo(null);
      setShowEmojiPicker(false);
    } finally {
      setIsSending(false);
    }
  };

  const handleFinishVoiceRecord = () => {
    if (recordTimer < 1) {
      setIsRecordingVoice(false);
      return;
    }

    if (inputMode === 'voice') {
      onSendMessage({
        senderId: currentUser.id,
        receiverId: partnerUser.id,
        type: 'audio',
        content: 'Note vocale',
        audioDuration: Math.max(recordTimer, 2),
        waveform: Array.from({ length: 18 }, () => Math.floor(Math.random() * 75) + 20)
      });
    } else {
      onSendMessage({
        senderId: currentUser.id,
        receiverId: partnerUser.id,
        type: 'video_note',
        content: 'Message vidéo instantané',
        mediaUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
        audioDuration: Math.max(recordTimer, 2)
      });
    }

    soundEffects.playSent();
    setIsRecordingVoice(false);
  };

  const handleToggleReaction = (msgId: string, emoji: string) => {
    const msg = activeMessages.find(m => m.id === msgId);
    if (!msg) return;

    const currentReactions = { ...(msg.reactions || {}) };
    if (currentReactions[currentUser.id] === emoji) {
      delete currentReactions[currentUser.id];
    } else {
      currentReactions[currentUser.id] = emoji;
      soundEffects.playReaction();
      triggerHaptic(30);
    }

    onUpdateMessage(msgId, { reactions: currentReactions });
    setActiveReactionMsgId(null);
    setActiveContextMenuMsgId(null);
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

  const handlePhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so selecting the same file again triggers onChange
    e.target.value = '';

    setShowAttachMenu(false);
    setPhotoError(null);
    setSelectedPhotoFile(file);
    setIsPhotoEditorOpen(true);
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
    const coupleId = getStoredPairingState().coupleId || pairingState?.coupleId;
    if (!coupleId) {
      setPhotoError("Votre couple n'est pas encore jumelé. Appairage Supabase requis pour envoyer une photo privée.");
      return;
    }

    const senderId = currentAuthUserId || currentUser.id;
    if (!senderId) {
      setPhotoError("Identité d'authentification introuvable. Veuillez recharger l'application.");
      return;
    }

    setIsOptimizingPhoto(true);
    setPhotoError(null);

    try {
      const sentMessage = await envoyerMessagePhoto({
        coupleId,
        senderId,
        file,
        caption
      });

      // Insert immediately into local UI state if not already populated by Realtime
      setRealMessages(prev => {
        if (prev.some(m => m.id === sentMessage.id)) return prev;
        return [...prev, sentMessage].sort((a, b) => a.timestamp - b.timestamp);
      });

      soundEffects.playSent();
      triggerHaptic(20);

      // Close modal
      setIsPhotoPreviewOpen(false);
      setSelectedPhotoFile(null);
      setPhotoError(null);
    } catch (err: any) {
      console.error('[ChatView] Erreur envoi photo privée:', err);
      setPhotoError(err.message || "Échec de l'optimisation ou de l'envoi de la photo.");
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

  return (
    <div 
      ref={chatContainerRef}
      className="flex-1 flex flex-col h-full relative overflow-hidden select-none"
      style={{ backgroundColor: 'var(--mk-wallpaper-color, #130f26)' }}
    >
      {/* Dynamic Wallpaper Layer */}
      <div 
        className="absolute inset-0 pointer-events-none transition-all z-0"
        style={{
          opacity: 'var(--mk-wallpaper-opacity, 0.85)',
          filter: 'blur(var(--mk-wallpaper-blur, 0px))',
          backgroundImage: 'var(--mk-wallpaper-image, none)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      <div 
        className="absolute inset-0 pointer-events-none bg-black z-0"
        style={{ opacity: 'var(--mk-wallpaper-dark-overlay, 0.3)' }}
      />

      {/* Top Chat Header */}
      <div 
        className="h-[62px] px-3.5 flex items-center justify-between border-b border-[#2d2254] relative z-30 shrink-0 transition-colors"
        style={{
          backgroundColor: 'var(--mk-header-bg)',
          color: 'var(--mk-header-text)'
        }}
      >
        {searchInChat ? (
          <div className="flex items-center w-full bg-[#130f26] rounded-xl px-3 py-1.5 border border-[#372863]">
            <Search size={16} className="text-[#a29bfe] mr-2" />
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
              className="text-xs text-[#00b894] font-medium ml-2 hover:underline cursor-pointer"
            >
              Fermer
            </button>
          </div>
        ) : (
          <>
            {/* Left: Back Button & Partner Profile */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                onClick={onBack}
                className="p-1 text-[#a29bfe] hover:text-white rounded-full transition-colors cursor-pointer md:hidden shrink-0"
                title="Retour aux discussions"
              >
                <ArrowLeft size={20} />
              </button>

              <div
                onClick={onOpenContactInfo}
                className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity min-w-0"
              >
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-2xl bg-[#00b894] overflow-hidden border border-[#2d2254]">
                    <img
                      src={partnerUser.avatar}
                      alt={partnerUser.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {isPartnerOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#00b894] border-2 border-[#171230] rounded-full ring-1 ring-[#00b894]/30" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm text-white truncate max-w-[130px] sm:max-w-[200px]">
                      {partnerNickname || partnerProfile?.display_name || partnerUser.name}
                    </h3>
                  </div>
                  <p className="text-[11px] truncate flex items-center gap-1.5 transition-colors">
                    {isPartnerTyping ? (
                      <span className="text-[#55efc4] font-medium flex items-center gap-1">
                        <span>En train d'écrire</span>
                        <span className="inline-flex tracking-wider font-bold animate-pulse">…</span>
                      </span>
                    ) : isPartnerOnline ? (
                      <span className="text-[#00b894] font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00b894] inline-block animate-pulse shrink-0" />
                        <span>En ligne</span>
                      </span>
                    ) : partnerLastSeenText ? (
                      <span className="text-[#a29bfe]/80 font-normal">
                        {partnerLastSeenText}
                      </span>
                    ) : (
                      <span className="text-[#a29bfe]/60 font-normal">
                        Hors ligne
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Quick Action Buttons */}
            <div className="flex items-center space-x-1 sm:space-x-2 text-[#a29bfe]">
              {/* Quick Heartbeat trigger */}
              {onOpenHeartbeat && (
                <button
                  onClick={onOpenHeartbeat}
                  className="p-2 text-[#fd79a8] hover:bg-[#281e4b] rounded-xl transition-colors cursor-pointer"
                  title="Envoyer un battement de cœur"
                >
                  <Heart size={18} className="fill-[#fd79a8] animate-pulse" />
                </button>
              )}

              {/* Video Call */}
              <button
                onClick={() => onStartCall('video')}
                className="p-2 text-[#a29bfe] hover:text-white hover:bg-[#281e4b] rounded-xl transition-colors cursor-pointer"
                title="Appel vidéo"
              >
                <Video size={18} />
              </button>

              {/* Audio Call */}
              <button
                onClick={() => onStartCall('audio')}
                className="p-2 text-[#a29bfe] hover:text-white hover:bg-[#281e4b] rounded-xl transition-colors cursor-pointer"
                title="Appel vocal"
              >
                <Phone size={18} />
              </button>

              {/* Chat Search */}
              <button
                onClick={() => setSearchInChat(true)}
                className="p-2 text-[#a29bfe] hover:text-white hover:bg-[#281e4b] rounded-xl transition-colors cursor-pointer"
                title="Rechercher"
              >
                <Search size={18} />
              </button>

              {/* 3-dots Chat Menu */}
              <div className="relative" ref={chatMenuRef}>
                <button
                  onClick={() => setShowChatMenu(!showChatMenu)}
                  className="p-2 text-[#a29bfe] hover:text-white hover:bg-[#281e4b] rounded-xl transition-colors cursor-pointer"
                  title="Plus"
                >
                  <MoreVertical size={18} />
                </button>

                {showChatMenu && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-[#1b1435] rounded-2xl shadow-2xl py-2 z-50 border border-[#372863] text-sm animate-in fade-in zoom-in-95">
                    <button
                      onClick={() => {
                        onOpenContactInfo();
                        setShowChatMenu(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-[#281e4b] flex items-center space-x-3 text-white"
                    >
                      <UserIcon size={16} className="text-[#00b894]" />
                      <span>Infos du profil intime</span>
                    </button>

                    {onOpenVault && (
                      <button
                        onClick={() => {
                          onOpenVault();
                          setShowChatMenu(false);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-[#281e4b] flex items-center space-x-3 text-white"
                      >
                        <Lock size={16} className="text-[#00b894]" />
                        <span>Ouvrir le Coffre-Fort</span>
                      </button>
                    )}

                    {onOpenWishlist && (
                      <button
                        onClick={() => {
                          onOpenWishlist();
                          setShowChatMenu(false);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-[#281e4b] flex items-center space-x-3 text-white"
                      >
                        <Sparkles size={16} className="text-[#fd79a8]" />
                        <span>Wishlist & Fantasmes</span>
                      </button>
                    )}

                    {onOpenGames && (
                      <button
                        onClick={() => {
                          onOpenGames();
                          setShowChatMenu(false);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-[#281e4b] flex items-center space-x-3 text-white"
                      >
                        <Dices size={16} className="text-[#ffeaa7]" />
                        <span>Roue & Jeux de couple</span>
                      </button>
                    )}

                    <div className="h-px bg-[#2d2254] my-1" />

                    <button
                      onClick={() => {
                        setSearchInChat(true);
                        setShowChatMenu(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-[#281e4b] flex items-center space-x-3 text-white"
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
          const isMe = Boolean(authenticatedId && msg.senderId === authenticatedId);
          const showDateDivider = index === 0 || 
            new Date(msg.timestamp).toDateString() !== new Date(filteredMessages[index - 1].timestamp).toDateString();
          
          const isPlayingThis = playingAudioId === msg.id;
          const quotedMsg = msg.replyToId ? activeMessages.find(m => m.id === msg.replyToId) : null;

          return (
            <React.Fragment key={msg.id}>
              {/* Date Divider */}
              {showDateDivider && (
                <div className="flex justify-center my-3">
                  <span className="bg-[#1b1435] text-[#a29bfe] text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full shadow-xs border border-[#2d2254]">
                    {formatDateDivider(msg.timestamp)}
                  </span>
                </div>
              )}

              {/* Message Row */}
              <div
                id={`msg-${msg.id}`}
                className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'} relative my-0.5`}
              >
                {/* Floating Reaction Bar */}
                {activeReactionMsgId === msg.id && (
                  <div className="reaction-bar-container absolute -top-10 z-40 bg-[#1b1435] border border-[#372863] rounded-full px-2 py-1 shadow-2xl flex items-center gap-1.5 animate-in zoom-in-95 duration-100">
                    {['❤️', '🔥', '😘', '🥺', '✨', '😂'].map(emoji => (
                      <button
                        key={emoji}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleReaction(msg.id, emoji);
                        }}
                        className="text-base hover:scale-130 transition-transform p-1 cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveContextMenuMsgId(msg.id);
                        setActiveReactionMsgId(null);
                      }}
                      className="p-1 text-[#a29bfe] hover:text-white rounded-full cursor-pointer"
                      title="Plus d'actions"
                    >
                      <MoreVertical size={14} />
                    </button>
                  </div>
                )}

                {/* Message Bubble Card */}
                <div
                  onClick={() => {
                    setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id);
                  }}
                  className={`message-bubble relative max-w-[85%] sm:max-w-[65%] p-3 shadow-md cursor-pointer transition-all ${
                    isMe
                      ? 'rounded-2xl rounded-tr-xs'
                      : 'rounded-2xl rounded-tl-xs border border-[#2d2254]'
                  }`}
                  style={{
                    backgroundColor: isMe ? 'var(--mk-bubble-sent-bg)' : 'var(--mk-bubble-recv-bg)',
                    color: isMe ? 'var(--mk-bubble-sent-text)' : 'var(--mk-bubble-recv-text)',
                    borderRadius: 'var(--mk-bubble-radius, 16px)',
                    fontFamily: 'var(--mk-font-family)'
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
                      <p className="text-[#a29bfe] truncate">{quotedMsg.content}</p>
                    </div>
                  )}

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

                  {/* Normal Text Message */}
                  {msg.type === 'text' && (
                    <div 
                      className="leading-relaxed whitespace-pre-wrap break-words font-medium"
                      style={{ fontSize: 'var(--mk-font-size, 14px)' }}
                    >
                      {renderFormattedText(msg.content)}
                    </div>
                  )}

                  {/* Photo / Video */}
                  {(msg.type === 'image' || msg.type === 'video') && (
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
                      ) : msg.type === 'image' ? (
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
                      ) : (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenMediaLightbox(msg);
                          }}
                          className="rounded-xl overflow-hidden cursor-pointer relative group/img bg-black/20"
                        >
                          <video
                            src={msg.mediaUrl}
                            className="max-h-72 w-full object-cover rounded-xl"
                          />
                          {msg.isHD && (
                            <span className="absolute top-2 left-2 text-[10px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded backdrop-blur-xs">
                              HD
                            </span>
                          )}
                        </div>
                      )}

                      {msg.content && (
                        <p className="text-xs sm:text-sm pt-1">{renderFormattedText(msg.content)}</p>
                      )}
                    </div>
                  )}

                  {/* Voice Audio Player */}
                  {msg.type === 'audio' && (
                    <div className="flex items-center gap-3 py-1 min-w-[200px] sm:min-w-[240px]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlayingAudioId(isPlayingThis ? null : msg.id);
                        }}
                        className="w-10 h-10 rounded-full bg-[#00b894] text-[#130f26] flex items-center justify-center shrink-0 shadow-md hover:scale-105 transition-transform cursor-pointer"
                      >
                        {isPlayingThis ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                      </button>

                      <div className="flex-1 flex flex-col justify-center gap-1.5">
                        <div className="flex items-end gap-0.5 h-6">
                          {(msg.waveform || [30, 60, 40, 90, 70, 50, 80, 40, 60, 30, 90, 70, 40, 60]).map((h, barIdx) => {
                            const totalBars = (msg.waveform || []).length || 14;
                            const currentProgressRatio = ((audioProgress[msg.id] || 0) / ((msg.audioDuration || 14) * 10));
                            const isBarActive = barIdx / totalBars <= currentProgressRatio;

                            return (
                              <div
                                key={barIdx}
                                style={{ height: `${h}%` }}
                                className={`flex-1 rounded-full transition-colors ${
                                  isBarActive ? 'bg-[#00b894]' : 'bg-[#a29bfe]/40'
                                }`}
                              />
                            );
                          })}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[#a29bfe]">
                          <span>
                            {isPlayingThis
                              ? formatDuration(Math.floor((audioProgress[msg.id] || 0) / 10))
                              : formatDuration(msg.audioDuration || 14)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAudioSpeed(prev => prev === 1 ? 1.5 : prev === 1.5 ? 2 : 1);
                            }}
                            className="bg-black/30 hover:bg-black/50 px-1.5 py-0.5 rounded text-white font-semibold cursor-pointer"
                          >
                            {audioSpeed}x
                          </button>
                        </div>
                      </div>
                    </div>
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
                    {msg.isEdited && <span className="italic mr-0.5">modifié</span>}
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
                    <div className="bg-[#171230] border border-[#2d2254] rounded-full px-2 py-0.5 text-xs shadow-md flex items-center gap-1">
                      {Object.entries(msg.reactions).map(([userId, emoji]) => (
                        <span key={userId} className="leading-none">{emoji}</span>
                      ))}
                    </div>
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
              {/* 1. Galerie - ACTIVE */}
              <button
                type="button"
                onClick={() => {
                  setShowAttachMenu(false);
                  galleryInputRef.current?.click();
                }}
                aria-label="Galerie photo"
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
              {onOpenDigitalTouch && (
                <button
                  type="button"
                  onClick={() => { setShowAttachMenu(false); onOpenDigitalTouch(); }}
                  className="px-3 py-1.5 rounded-full bg-[#130f26] hover:bg-[#281e4b] border border-[#2d2254] text-[11px] font-medium text-white flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <Zap size={13} className="text-[#00b894]" />
                  <span>Digital Touch</span>
                </button>
              )}
              {onOpenCoupons && (
                <button
                  type="button"
                  onClick={() => { setShowAttachMenu(false); onOpenCoupons(); }}
                  className="px-3 py-1.5 rounded-full bg-[#130f26] hover:bg-[#281e4b] border border-[#2d2254] text-[11px] font-medium text-white flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <Ticket size={13} className="text-[#fd79a8]" />
                  <span>Bons Intimes</span>
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
              {onOpenGames && (
                <button
                  type="button"
                  onClick={() => { setShowAttachMenu(false); onOpenGames(); }}
                  className="px-3 py-1.5 rounded-full bg-[#130f26] hover:bg-[#281e4b] border border-[#2d2254] text-[11px] font-medium text-white flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <Dices size={13} className="text-[#6c5ce7]" />
                  <span>Jeux Couple</span>
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

      {/* Hidden File Input for Gallery Photo (Phase 1) */}
      <input
        type="file"
        ref={galleryInputRef}
        onChange={handlePhotoSelected}
        className="hidden"
        accept="image/jpeg,image/png,image/webp"
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
                onClick={() => setIsRecordingVoice(true)}
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

      {/* Direct Camera Modal (Live capture -> Photo Editor -> Photo Preview) */}
      <DirectCameraModal
        isOpen={isDirectCameraOpen}
        onClose={() => window.history.back()}
        onCapturePhoto={(file: File) => {
          setSelectedPhotoFile(file);
          setIsPhotoEditorOpen(true);
        }}
        onOpenGalleryFallback={() => {
          window.history.back();
          galleryInputRef.current?.click();
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

      {/* Photo Preview Modal with Caption and WebP Optimizer (Phase 1) */}
      <PhotoPreviewModal
        isOpen={isPhotoPreviewOpen}
        file={selectedPhotoFile}
        onClose={() => window.history.back()}
        onSend={handleSendPhotoMessage}
        isSending={isOptimizingPhoto}
        errorMessage={photoError}
      />
    </div>
  );
};
