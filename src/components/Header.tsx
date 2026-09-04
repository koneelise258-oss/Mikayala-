import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Search, 
  MoreVertical, 
  Star, 
  Settings, 
  ShieldCheck, 
  RefreshCw,
  Sparkles,
  Globe,
  MessageSquare,
  Radio,
  Bluetooth,
  Calculator,
  ChevronDown,
  User as UserIcon
} from 'lucide-react';
import { User, NetworkState, UserProfile } from '../types';
import { triggerHaptic } from '../utils/security';
import { formatLastSeen } from '../services/presenceService';

interface HeaderProps {
  currentUser: User;
  myProfile?: UserProfile | null;
  partnerUser: User;
  partnerProfile?: UserProfile | null;
  partnerNickname?: string | null;
  networkState: NetworkState;
  onOpenNetworkModal: () => void;
  onOpenSettings: () => void;
  onOpenQRCode: () => void;
  onOpenCamera: () => void;
  onOpenStarred: () => void;
  onOpenThemeCustomizer?: () => void;
  onSearchToggle: () => void;
  isSearching: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isOnline: boolean;
  pendingSyncCount: number;
  isPartnerOnline?: boolean;
  isPartnerTyping?: boolean;
  partnerLastSeen?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  myProfile,
  partnerUser,
  partnerProfile,
  partnerNickname,
  networkState,
  onOpenNetworkModal,
  onOpenSettings,
  onOpenQRCode,
  onOpenCamera,
  onOpenStarred,
  onOpenThemeCustomizer,
  onSearchToggle,
  isSearching,
  searchQuery,
  onSearchChange,
  isOnline,
  pendingSyncCount: _pendingSyncCount,
  isPartnerOnline = false,
  isPartnerTyping = false,
  partnerLastSeen = null
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [titleTapCount, setTitleTapCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTitleTap = () => {
  };

  const getNetworkBadge = () => {
    switch (networkState?.mode) {
      case 'sms':
        return {
          label: 'SMS Direct',
          icon: MessageSquare,
          color: 'bg-[#ff7675]/20 text-[#ff7675] border-[#ff7675]/40 hover:bg-[#ff7675]/30',
          dotColor: 'bg-[#ff7675]'
        };
      case 'proximity':
        return {
          label: 'Proximité',
          icon: Bluetooth,
          color: 'bg-[#6c5ce7]/20 text-[#a29bfe] border-[#6c5ce7]/40 hover:bg-[#6c5ce7]/30',
          dotColor: 'bg-[#a29bfe]'
        };
      case 'cloud':
      default:
        return {
          label: isOnline ? 'Cloud' : 'Offline',
          icon: Globe,
          color: isOnline 
            ? 'bg-[#00b894]/20 text-[#55efc4] border-[#00b894]/40 hover:bg-[#00b894]/30'
            : 'bg-[#ffeaa7]/20 text-[#ffeaa7] border-[#ffeaa7]/40 hover:bg-[#ffeaa7]/30',
          dotColor: isOnline ? 'bg-[#55efc4]' : 'bg-[#ffeaa7]'
        };
    }
  };

  const badge = getNetworkBadge();
  const BadgeIcon = badge.icon;

  return (
    <header 
      className="h-[58px] px-3 select-none flex items-center justify-between shadow-lg relative z-30 shrink-0 border-b border-white/5 transition-colors bg-[#11141d]/95 backdrop-blur-xl"
      style={{
        backgroundColor: 'var(--mk-header-bg, #11141d)',
        color: 'var(--mk-header-text, #ffffff)'
      }}
    >
      {isSearching ? (
        <div className="flex items-center w-full bg-[#181b26] rounded-full px-3.5 py-1.5 transition-all border border-white/10 shadow-inner">
          <Search size={16} className="text-[#8e95a5] mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Rechercher un message, média..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-white placeholder-[#8e95a5] text-xs focus:outline-none"
          />
          <button
            onClick={onSearchToggle}
            className="text-xs text-[#6c5ce7] hover:text-[#a29bfe] font-semibold ml-2 px-1 hover:underline cursor-pointer transition-colors"
          >
            Fermer
          </button>
        </div>
      ) : (
        <>
          {/* Left: Brand Title & Dynamic Network Badge */}
          <div className="flex items-center gap-2 min-w-0 shrink">
            {/* Title with 3-tap secret shortcut to camouflage */}
            <div 
              onClick={handleTitleTap}
              title="Tapez 3 fois rapidement pour activer le mode Camouflage Fausse Calculatrice"
              className="flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform shrink-0"
            >
              <span className="font-extrabold text-lg tracking-tight text-[var(--mk-header-text,#ffffff)] bg-gradient-to-r from-white via-slate-100 to-[#a29bfe] bg-clip-text text-transparent">
                Mikayla
              </span>
            </div>

            {/* Dynamic Network Mode Selector Badge */}
            <button
              onClick={onOpenNetworkModal}
              className={`flex items-center gap-1 sm:gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all active:scale-95 cursor-pointer whitespace-nowrap shadow-sm ${badge.color}`}
              title="Changer de mode : Cloud / SMS 0-Data / Proximité Direct"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor} animate-pulse shrink-0`} />
              <BadgeIcon size={11} className="shrink-0" />
              <span className="truncate max-w-[70px] sm:max-w-none">{badge.label}</span>
              <ChevronDown size={10} className="opacity-70 shrink-0" />
            </button>
          </div>

          {/* Right: Camera, Search & 3-dots Menu */}
          <div className="flex items-center space-x-1 text-[#8e95a5] shrink-0">
            {/* Partner Identity & Status Pill */}
            {partnerUser.id && (
              <div 
                onClick={onOpenSettings}
                className="flex items-center gap-2 bg-[#181b26]/90 border border-white/5 text-[10px] px-2 py-1 rounded-full text-[#8e95a5] select-none cursor-pointer hover:bg-[#1f2433] hover:border-white/10 transition-all shadow-sm"
                title={isPartnerOnline ? 'Partenaire en ligne' : 'Partenaire hors ligne'}
              >
                <div className="relative shrink-0">
                  <div className="w-5 h-5 rounded-full p-[1px] bg-gradient-to-tr from-[#fd79a8] via-[#a29bfe] to-[#6c5ce7]">
                    {partnerUser.avatar ? (
                      <img 
                        src={partnerUser.avatar} 
                        className="w-full h-full rounded-full object-cover"
                        alt=""
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-[#1b202d] flex items-center justify-center">
                        <UserIcon size={10} className="text-[#a29bfe]" />
                      </div>
                    )}
                  </div>
                  <span className={`w-1.5 h-1.5 rounded-full absolute -top-0.5 -right-0.5 border border-[#11141d] ${isPartnerOnline ? 'bg-[#00b894] animate-pulse' : 'bg-slate-500'}`} />
                </div>
                
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-white truncate max-w-[60px] sm:max-w-[100px] leading-none">
                    {partnerNickname || partnerProfile?.display_name || partnerUser.name}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    {isPartnerTyping ? (
                      <span className="text-[#55efc4] font-medium italic animate-pulse">écrit…</span>
                    ) : isPartnerOnline ? (
                      <span className="text-[#00b894] font-medium">En ligne</span>
                    ) : partnerLastSeen ? (
                      <span className="text-[#8e95a5]">{formatLastSeen(partnerLastSeen)}</span>
                    ) : (
                      <span className="text-[#8e95a5]/70">Off</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Authenticated Identity Pill */}
            <div 
              title={`Connecté en tant que : ${myProfile?.display_name || currentUser.name}`}
              className="flex items-center gap-1.5 bg-[#181b26]/70 border border-white/5 text-[10px] px-2 py-1 rounded-full text-[#8e95a5] select-none"
            >
              <div className="shrink-0">
                {currentUser.avatar ? (
                  <img 
                    src={currentUser.avatar} 
                    className="w-4 h-4 rounded-full object-cover border border-white/10"
                    alt=""
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-[#1b202d] flex items-center justify-center border border-white/10">
                    <UserIcon size={8} className="text-[#a29bfe]" />
                  </div>
                )}
              </div>
              <span className="font-semibold text-white/90 truncate max-w-[45px] sm:max-w-[70px]">
                {(myProfile?.display_name || currentUser.name).split(' ')[0]}
              </span>
            </div>

            {/* Camera Button */}
            <button
              onClick={onOpenCamera}
              className="text-[#8e95a5] hover:text-white p-2 rounded-full hover:bg-white/5 transition-all cursor-pointer active:scale-95"
              title="Prendre une photo ou vidéo instantanée"
            >
              <Camera size={17} />
            </button>

            {/* Search Button */}
            <button
              onClick={onSearchToggle}
              className="text-[#8e95a5] hover:text-white p-2 rounded-full hover:bg-white/5 transition-all cursor-pointer active:scale-95"
              title="Rechercher"
            >
              <Search size={17} />
            </button>

            {/* 3-dots Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="text-[#8e95a5] hover:text-white p-2 rounded-full hover:bg-white/5 transition-all cursor-pointer active:scale-95"
                title="Options et Sécurité"
              >
                <MoreVertical size={17} />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-[#171b26] rounded-2xl shadow-2xl py-2 z-50 border border-white/10 text-xs animate-in fade-in zoom-in-95 duration-100 max-h-[80vh] overflow-y-auto backdrop-blur-2xl">
                  <div className="px-3.5 py-2.5 border-b border-white/5 mb-1 bg-[#11141d]/80">
                    <p className="text-[9px] uppercase tracking-wider text-[#8e95a5] font-bold">Sanctuaire Mikayla</p>
                    <p className="text-xs font-bold text-white truncate">{currentUser.name} & {partnerUser.name}</p>
                    <p className="text-[10px] text-[#55efc4] flex items-center gap-1 mt-0.5">
                      <ShieldCheck size={11} /> 100% Chiffré & Privé
                    </p>
                  </div>

                  {/* 1. 📱 Appareils connectés */}
                  <button
                    onClick={() => {
                      onOpenQRCode();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-white/5 flex items-center space-x-2.5 text-white transition-colors cursor-pointer"
                  >
                    <div className="p-1.5 rounded-lg bg-[#6c5ce7]/20 text-[#a29bfe]">
                      <Radio size={15} />
                    </div>
                    <div>
                      <span className="font-semibold block">Appareils connectés</span>
                      <span className="text-[10px] text-[#8e95a5]">P2P, Clés & QR Appairage</span>
                    </div>
                  </button>

                  {/* 2. ⭐ Messages importants */}
                  <button
                    onClick={() => {
                      onOpenStarred();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-white/5 flex items-center space-x-2.5 text-white transition-colors cursor-pointer"
                  >
                    <div className="p-1.5 rounded-lg bg-[#ffeaa7]/20 text-[#ffeaa7]">
                      <Star size={15} />
                    </div>
                    <div>
                      <span className="font-semibold block">Messages importants</span>
                      <span className="text-[10px] text-[#8e95a5]">Favoris & Médias épinglés</span>
                    </div>
                  </button>

                  <div className="h-px bg-white/5 my-1" />

                  {/* 4. 🎨 Personnalisation & Thèmes */}
                  <button
                    onClick={() => {
                      if (onOpenThemeCustomizer) {
                        onOpenThemeCustomizer();
                      } else {
                        onOpenSettings();
                      }
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-white/5 flex items-center space-x-2.5 text-white transition-colors cursor-pointer"
                  >
                    <div className="p-1.5 rounded-lg bg-[#fd79a8]/20 text-[#fd79a8]">
                      <Sparkles size={15} />
                    </div>
                    <div>
                      <span className="font-semibold block">Personnalisation & Thèmes</span>
                      <span className="text-[10px] text-[#8e95a5]">Couleurs, fonds & ambiance</span>
                    </div>
                  </button>

                  {/* 5. 🔒 Paramètres de Sécurité & Profil */}
                  <button
                    onClick={() => {
                      onOpenSettings();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-white/5 flex items-center space-x-2.5 text-[#a29bfe] transition-colors cursor-pointer"
                  >
                    <div className="p-1.5 rounded-lg bg-[#00b894]/20 text-[#55efc4]">
                      <Settings size={15} />
                    </div>
                    <div>
                      <span className="font-semibold block text-[#55efc4]">Sécurité & Profil</span>
                      <span className="text-[10px] text-[#8e95a5]">Biométrie, Code PIN & Alertes</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
};
