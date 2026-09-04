import React, { useState } from 'react';
import { User, Message, UserProfile } from '../types';
import { 
  Check, 
  CheckCheck, 
  Pin, 
  Image, 
  Mic, 
  Video, 
  MessageSquarePlus,
  Heart,
  Lock,
  Sparkles,
  Dices,
  Calendar,
  Ticket,
  HelpCircle,
  Fingerprint,
   Gift,
  Flame,
  BarChart2,
  MapPin,
  User as UserIcon,
  PhoneMissed
} from 'lucide-react';
import { formatTime } from '../utils/formatters';
import { triggerHaptic } from '../utils/security';
import { soundEffects } from '../utils/audio';

interface ChatListProps {
  currentUser: User;
  partnerUser: User;
  partnerProfile?: UserProfile | null;
  partnerNickname?: string | null;
  messages: Message[];
  onSelectChat: () => void;
  onOpenNewChat: () => void;
  onOpenVault: () => void;
  onOpenWishlist: () => void;
  onOpenGames: () => void;
  onOpenLoveTimer?: () => void;
  onOpenCalendar?: () => void;
  onOpenCoupons?: () => void;
  onOpenQuiz?: () => void;
  onOpenDigitalTouch?: () => void;
  onOpenScratchCard?: () => void;
  searchQuery?: string;
  hideChatPreview?: boolean;
  isPartnerOnline?: boolean;
}

export const ChatList: React.FC<ChatListProps> = ({
  currentUser,
  partnerUser,
  partnerProfile,
  partnerNickname,
  messages,
  onSelectChat,
  onOpenNewChat,
  onOpenVault,
  onOpenWishlist,
  onOpenGames,
  onOpenLoveTimer,
  onOpenCalendar,
  onOpenCoupons,
  onOpenQuiz,
  onOpenDigitalTouch,
  onOpenScratchCard,
  searchQuery = '',
  hideChatPreview = false,
  isPartnerOnline = false
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'favorites'>('all');

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const unreadMessagesCount = messages.filter(m => m.receiverId === currentUser.id && m.status !== 'read').length;

  const partnerName = partnerNickname || partnerProfile?.display_name || partnerUser.name;

  const matchesSearch = searchQuery === '' || 
    partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleChatClick = () => {
    triggerHaptic(25);
    soundEffects.playTap();
    onSelectChat();
  };

  // Render last message snippet icon & text
  const renderLastMessageSnippet = () => {
    if (!lastMessage) return <span className="italic text-[#a29bfe]/60">Sanctuaire intime prêt</span>;

    if (hideChatPreview) {
      return (
        <span className="flex items-center gap-1 text-xs text-[#a29bfe]/70 italic">
          <Lock size={12} className="text-[#00b894]" /> Message masqué (Anti-discrétion)
        </span>
      );
    }

    const isMe = Boolean(currentUser.id && lastMessage.senderId === currentUser.id);

    const renderTicks = () => {
      if (!isMe) return null;
      if (lastMessage.readAt || lastMessage.status === 'read') {
        return <CheckCheck size={15} className="text-[#55efc4] shrink-0" />;
      } else if (lastMessage.deliveredAt || lastMessage.status === 'delivered') {
        return <CheckCheck size={15} className="text-[#a29bfe]/70 shrink-0" />;
      }
      return <Check size={15} className="text-[#a29bfe]/70 shrink-0" />;
    };

    let contentNode = <span>{lastMessage.content}</span>;

    if (lastMessage.content && (lastMessage.content.includes('Appel vocal manqué') || lastMessage.content.includes('Appel vidéo manqué') || lastMessage.content.includes('Appel manqué'))) {
      contentNode = (
        <span className="flex items-center gap-1.5 text-[#ff7675] font-semibold">
          <PhoneMissed size={14} className="text-[#ff7675] shrink-0" /> {lastMessage.content}
        </span>
      );
    } else if (lastMessage.type === 'heartbeat') {
      contentNode = (
        <span className="flex items-center gap-1.5 text-[#fd79a8] font-medium">
          <Heart size={14} className="fill-[#fd79a8] animate-pulse" /> {lastMessage.content || 'Battement de cœur'}
        </span>
      );
    } else if (lastMessage.type === 'image') {
      contentNode = (
        <span className="flex items-center gap-1.5 text-[#a29bfe]">
          <Image size={14} className="text-[#00b894]" /> Photo {lastMessage.content ? `• ${lastMessage.content}` : ''}
        </span>
      );
    } else if (lastMessage.type === 'video') {
      contentNode = (
        <span className="flex items-center gap-1.5 text-[#a29bfe]">
          <Video size={14} className="text-[#00b894]" /> Vidéo {lastMessage.content ? `• ${lastMessage.content}` : ''}
        </span>
      );
    } else if (lastMessage.type === 'audio') {
      contentNode = (
        <span className="flex items-center gap-1.5 text-[#a29bfe]">
          <Mic size={14} className="text-[#00b894]" /> Message vocal ({lastMessage.audioDuration || 0}s)
        </span>
      );
    } else if (lastMessage.type === 'poll') {
      contentNode = (
        <span className="flex items-center gap-1.5 text-[#a29bfe]">
          <BarChart2 size={14} className="text-[#6c5ce7]" /> Sondage: {lastMessage.pollData?.question}
        </span>
      );
    } else if (lastMessage.type === 'event') {
      contentNode = (
        <span className="flex items-center gap-1.5 text-[#a29bfe]">
          <Calendar size={14} className="text-[#ffeaa7]" /> {lastMessage.eventData?.title}
        </span>
      );
    } else if (lastMessage.type === 'location') {
      contentNode = (
        <span className="flex items-center gap-1.5 text-[#a29bfe]">
          <MapPin size={14} className="text-[#ff7675]" /> Position intime
        </span>
      );
    } else if (lastMessage.type === 'coupon') {
      contentNode = (
        <span className="flex items-center gap-1.5 text-[#ffeaa7]">
          <Ticket size={14} className="text-[#fdcb6e]" /> Bon Duo: {lastMessage.content}
        </span>
      );
    } else if (lastMessage.type === 'blind_quiz') {
      contentNode = (
        <span className="flex items-center gap-1.5 text-[#a29bfe]">
          <HelpCircle size={14} className="text-[#6c5ce7]" /> Quiz Double Aveugle
        </span>
      );
    } else if (lastMessage.type === 'digital_touch') {
      contentNode = (
        <span className="flex items-center gap-1.5 text-[#fd79a8]">
          <Sparkles size={14} className="text-[#fd79a8]" /> Toucher Lumineux ✨
        </span>
      );
    } else if (lastMessage.type === 'scratch_card') {
      contentNode = (
        <span className="flex items-center gap-1.5 text-[#ffeaa7]">
          <Gift size={14} className="text-[#ffeaa7]" /> Message Secret à Gratter 🎁
        </span>
      );
    }

    return (
      <div className="flex items-center gap-1.5 text-xs text-[#a29bfe] truncate">
        {renderTicks()}
        <span className="truncate">{contentNode}</span>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#130f26] flex flex-col relative select-none">
      {/* Intimate Quick Access Shortcuts Banner */}
      <div className="px-3.5 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-[#2d2254] bg-[#171230]/50 shrink-0">
        <button
          onClick={() => {
            triggerHaptic(20);
            soundEffects.playTap();
            onOpenVault();
          }}
          className="flex items-center gap-1.5 bg-[#1e173e] hover:bg-[#281e4b] active:scale-95 border border-[#372863] text-[#55efc4] text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all shadow-sm cursor-pointer"
        >
          <Lock size={13} className="text-[#00b894]" />
          <span>Coffre-Fort</span>
        </button>

        {onOpenLoveTimer && (
          <button
            onClick={() => {
              triggerHaptic(20);
              soundEffects.playTap();
              onOpenLoveTimer();
            }}
            className="flex items-center gap-1.5 bg-[#1e173e] hover:bg-[#281e4b] active:scale-95 border border-[#372863] text-[#fd79a8] text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all shadow-sm cursor-pointer"
          >
            <Heart size={13} className="text-[#fd79a8]" />
            <span>Love Timer</span>
          </button>
        )}

        <button
          onClick={() => {
            triggerHaptic(20);
            soundEffects.playTap();
            onOpenWishlist();
          }}
          className="flex items-center gap-1.5 bg-[#1e173e] hover:bg-[#281e4b] active:scale-95 border border-[#372863] text-[#fd79a8] text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all shadow-sm cursor-pointer"
        >
          <Sparkles size={13} className="text-[#fd79a8]" />
          <span>Wishlist</span>
        </button>

        {onOpenCoupons && (
          <button
            onClick={() => {
              triggerHaptic(20);
              soundEffects.playTap();
              onOpenCoupons();
            }}
            className="flex items-center gap-1.5 bg-[#1e173e] hover:bg-[#281e4b] active:scale-95 border border-[#372863] text-[#ffeaa7] text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all shadow-sm cursor-pointer"
          >
            <Ticket size={13} className="text-[#ffeaa7]" />
            <span>Bons Duo</span>
          </button>
        )}

        <button
          onClick={() => {
            triggerHaptic(20);
            soundEffects.playTap();
            onOpenGames();
          }}
          className="flex items-center gap-1.5 bg-[#1e173e] hover:bg-[#281e4b] active:scale-95 border border-[#372863] text-[#a29bfe] text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all shadow-sm cursor-pointer"
        >
          <Dices size={13} className="text-[#a29bfe]" />
          <span>Roue & Jeux</span>
        </button>

        {onOpenCalendar && (
          <button
            onClick={() => {
              triggerHaptic(20);
              soundEffects.playTap();
              onOpenCalendar();
            }}
            className="flex items-center gap-1.5 bg-[#1e173e] hover:bg-[#281e4b] active:scale-95 border border-[#372863] text-[#74b9ff] text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all shadow-sm cursor-pointer"
          >
            <Calendar size={13} className="text-[#74b9ff]" />
            <span>Calendrier</span>
          </button>
        )}
      </div>

      {/* Main Couple Conversation Row */}
      {matchesSearch ? (
        <div
          onClick={handleChatClick}
          className="flex items-center px-4 py-4 cursor-pointer bg-[#1b1435] hover:bg-[#231a44] active:bg-[#171230] transition-colors border-b border-[#2d2254]/70 min-h-[76px] group"
        >
          {/* Avatar with Emerald Online Ring */}
          <div className="relative shrink-0 mr-3.5">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-[#1e173e] overflow-hidden border-2 border-[#6c5ce7]/50 shadow-md group-hover:scale-105 transition-transform flex items-center justify-center">
              {partnerProfile?.avatar_url || partnerUser.avatar ? (
                <img
                  src={partnerProfile?.avatar_url || partnerUser.avatar}
                  alt={partnerName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon size={24} className="text-[#a29bfe]/40" />
              )}
            </div>
            {isPartnerOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#00b894] border-2 border-[#171230] rounded-full shadow-sm animate-pulse" />
            )}
          </div>

          {/* Contact & Message Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-bold text-sm sm:text-base text-[#f1f2f6] truncate">
                  {partnerName}
                </span>
                <span className="text-[10px] text-[#55efc4] bg-[#00b894]/20 border border-[#00b894]/30 px-1.5 py-0.2 rounded-full font-semibold shrink-0">
                  Duo
                </span>
              </div>
              <span className={`text-[11px] shrink-0 ml-2 ${unreadMessagesCount > 0 ? 'text-[#00b894] font-bold' : 'text-[#a29bfe]/60'}`}>
                {lastMessage ? formatTime(lastMessage.timestamp) : '12:00'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-[#a29bfe]">
              <div className="flex-1 truncate pr-2">
                {renderLastMessageSnippet()}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Pin size={13} className="text-[#00b894] rotate-45" />
                {unreadMessagesCount > 0 && (
                  <span className="bg-[#00b894] text-[#130f26] text-[10px] font-extrabold px-1.5 py-0.2 rounded-full min-w-4 h-4 flex items-center justify-center shadow-sm">
                    {unreadMessagesCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-[#a29bfe] p-8 text-center">
          <p className="text-sm font-semibold">Aucun message trouvé pour « {searchQuery} »</p>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => {
          triggerHaptic(20);
          soundEffects.playTap();
          onOpenNewChat();
        }}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-2xl bg-[#00b894] hover:bg-[#00a884] active:scale-95 text-[#130f26] shadow-2xl flex items-center justify-center transition-all hover:scale-105 z-10 cursor-pointer border-2 border-[#55efc4]/30"
        title="Sanctuaire / Scanner QR"
      >
        <MessageSquarePlus size={24} className="stroke-[2.5]" />
      </button>
    </div>
  );
};
