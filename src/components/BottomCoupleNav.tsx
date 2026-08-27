import React from 'react';
import { 
  MessageSquareHeart, 
  Lock, 
  Sparkles, 
  Settings
} from 'lucide-react';
import { triggerHaptic } from '../utils/security';
import { soundEffects } from '../utils/audio';
import { AppIcon } from './AppIcon';

export type BottomNavTab = 'chat' | 'vault' | 'games' | 'settings';

interface BottomCoupleNavProps {
  activeTab: BottomNavTab;
  onSelectTab: (tab: BottomNavTab) => void;
  unreadCount?: number;
  isVaultLocked?: boolean;
}

export const BottomCoupleNav: React.FC<BottomCoupleNavProps> = ({
  activeTab,
  onSelectTab,
  unreadCount = 0,
  isVaultLocked = true
}) => {
  const handleNav = (tab: BottomNavTab) => {
    triggerHaptic(20);
    soundEffects.playTap();
    onSelectTab(tab);
  };

  return (
    <nav 
      className="h-[60px] border-t border-[#2d2254] flex items-center justify-around px-2 relative z-30 select-none shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] transition-colors"
      style={{
        backgroundColor: 'var(--mk-bottom-nav-bg)'
      }}
    >
      {/* 1. Chat (Discussions) */}
      <button
        onClick={() => handleNav('chat')}
        className={`flex-1 flex flex-col items-center justify-center py-1 gap-1 transition-all cursor-pointer relative ${
          activeTab === 'chat'
            ? 'text-[#00b894]'
            : 'text-[#a29bfe]/60 hover:text-[#a29bfe]'
        }`}
      >
        <div className="relative">
          <AppIcon 
            icon={MessageSquareHeart} 
            name="MessageSquareHeart" 
            iosEmoji="💌" 
            size={20} 
            className={activeTab === 'chat' ? 'scale-110 transition-transform' : ''} 
          />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-2.5 bg-[#00b894] text-[#130f26] font-extrabold text-[9px] px-1 rounded-full min-w-3.5 h-3.5 flex items-center justify-center shadow-sm">
              {unreadCount}
            </span>
          )}
        </div>
        <span className="text-[10px] font-semibold tracking-tight">Chat</span>
      </button>

      {/* 2. Coffre-Fort (Vault) */}
      <button
        onClick={() => handleNav('vault')}
        className={`flex-1 flex flex-col items-center justify-center py-1 gap-1 transition-all cursor-pointer relative ${
          activeTab === 'vault'
            ? 'text-[#6c5ce7]'
            : 'text-[#a29bfe]/60 hover:text-[#a29bfe]'
        }`}
      >
        <div className="relative">
          <AppIcon 
            icon={Lock} 
            name="Lock" 
            iosEmoji="🔒" 
            size={20} 
            className={activeTab === 'vault' ? 'scale-110 transition-transform text-[#a29bfe]' : ''} 
          />
          {isVaultLocked && (
            <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-[#fd79a8] ring-1 ring-[#110d24]" />
          )}
        </div>
        <span className="text-[10px] font-semibold tracking-tight">Coffre-Fort</span>
      </button>

      {/* 3. Espace Couple (Bons/Quiz/Timer/Wishlist/Jeux) */}
      <button
        onClick={() => handleNav('games')}
        className={`flex-1 flex flex-col items-center justify-center py-1 gap-1 transition-all cursor-pointer relative ${
          activeTab === 'games'
            ? 'text-[#fd79a8]'
            : 'text-[#a29bfe]/60 hover:text-[#a29bfe]'
        }`}
      >
        <div className="relative">
          <AppIcon 
            icon={Sparkles} 
            name="Sparkles" 
            iosEmoji="✨" 
            size={20} 
            className={activeTab === 'games' ? 'scale-110 transition-transform' : ''} 
          />
        </div>
        <span className="text-[10px] font-semibold tracking-tight">Espace Couple</span>
      </button>

      {/* 4. Paramètres (Design & Biométrie) */}
      <button
        onClick={() => handleNav('settings')}
        className={`flex-1 flex flex-col items-center justify-center py-1 gap-1 transition-all cursor-pointer relative ${
          activeTab === 'settings'
            ? 'text-[#ffeaa7]'
            : 'text-[#a29bfe]/60 hover:text-[#a29bfe]'
        }`}
      >
        <div className="relative">
          <AppIcon 
            icon={Settings} 
            name="Settings" 
            iosEmoji="⚙️" 
            size={20} 
            className={activeTab === 'settings' ? 'scale-110 transition-transform' : ''} 
          />
        </div>
        <span className="text-[10px] font-semibold tracking-tight">Paramètres</span>
      </button>
    </nav>
  );
};
export default BottomCoupleNav;
