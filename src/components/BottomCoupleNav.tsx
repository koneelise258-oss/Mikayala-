import React from 'react';
import { 
  MessageSquareHeart, 
  ShieldCheck, 
  Sparkles, 
  SlidersHorizontal 
} from 'lucide-react';
import { triggerHaptic } from '../utils/security';
import { soundEffects } from '../utils/audio';

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
      className="h-[62px] border-t border-[#2d2254] flex items-center justify-around px-2 relative z-30 select-none shrink-0 shadow-[0_-4px_25px_rgba(0,0,0,0.35)] transition-colors backdrop-blur-md"
      style={{
        backgroundColor: 'var(--mk-bottom-nav-bg, #130f26)'
      }}
    >
      {/* 1. Chat (Discussions) */}
      <button
        onClick={() => handleNav('chat')}
        className={`flex-1 flex flex-col items-center justify-center py-1 gap-1 transition-all duration-200 cursor-pointer relative group ${
          activeTab === 'chat'
            ? 'text-[#00b894]'
            : 'text-[#a29bfe]/60 hover:text-[#a29bfe]'
        }`}
      >
        <div className="relative flex items-center justify-center">
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'chat' ? 'bg-[#00b894]/15 shadow-sm shadow-[#00b894]/20' : 'group-hover:bg-[#1f1742]/40'}`}>
            <MessageSquareHeart 
              size={20} 
              strokeWidth={activeTab === 'chat' ? 2.4 : 1.8}
              className={`transition-transform duration-200 ${activeTab === 'chat' ? 'scale-110 text-[#00b894]' : ''}`}
            />
          </div>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-1 bg-[#00b894] text-[#130f26] font-extrabold text-[9px] px-1.5 rounded-full min-w-4 h-4 flex items-center justify-center shadow-md animate-pulse">
              {unreadCount}
            </span>
          )}
        </div>
        <span className={`text-[10px] font-semibold tracking-tight transition-all ${activeTab === 'chat' ? 'font-bold text-[#00b894]' : ''}`}>
          Discussions
        </span>
      </button>

      {/* 2. Coffre-Fort (Vault) */}
      <button
        onClick={() => handleNav('vault')}
        className={`flex-1 flex flex-col items-center justify-center py-1 gap-1 transition-all duration-200 cursor-pointer relative group ${
          activeTab === 'vault'
            ? 'text-[#6c5ce7]'
            : 'text-[#a29bfe]/60 hover:text-[#a29bfe]'
        }`}
      >
        <div className="relative flex items-center justify-center">
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'vault' ? 'bg-[#6c5ce7]/15 shadow-sm shadow-[#6c5ce7]/20' : 'group-hover:bg-[#1f1742]/40'}`}>
            <ShieldCheck 
              size={20} 
              strokeWidth={activeTab === 'vault' ? 2.4 : 1.8}
              className={`transition-transform duration-200 ${activeTab === 'vault' ? 'scale-110 text-[#a29bfe]' : ''}`}
            />
          </div>
          {isVaultLocked && (
            <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-[#fd79a8] ring-1 ring-[#130f26]" />
          )}
        </div>
        <span className={`text-[10px] font-semibold tracking-tight transition-all ${activeTab === 'vault' ? 'font-bold text-[#a29bfe]' : ''}`}>
          Coffre-Fort
        </span>
      </button>

      {/* 3. Espace Couple (Bons/Quiz/Timer/Wishlist/Jeux) */}
      <button
        onClick={() => handleNav('games')}
        className={`flex-1 flex flex-col items-center justify-center py-1 gap-1 transition-all duration-200 cursor-pointer relative group ${
          activeTab === 'games'
            ? 'text-[#fd79a8]'
            : 'text-[#a29bfe]/60 hover:text-[#a29bfe]'
        }`}
      >
        <div className="relative flex items-center justify-center">
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'games' ? 'bg-[#fd79a8]/15 shadow-sm shadow-[#fd79a8]/20' : 'group-hover:bg-[#1f1742]/40'}`}>
            <Sparkles 
              size={20} 
              strokeWidth={activeTab === 'games' ? 2.4 : 1.8}
              className={`transition-transform duration-200 ${activeTab === 'games' ? 'scale-110 text-[#fd79a8]' : ''}`}
            />
          </div>
        </div>
        <span className={`text-[10px] font-semibold tracking-tight transition-all ${activeTab === 'games' ? 'font-bold text-[#fd79a8]' : ''}`}>
          Espace Couple
        </span>
      </button>

      {/* 4. Paramètres (Design & Biométrie) */}
      <button
        onClick={() => handleNav('settings')}
        className={`flex-1 flex flex-col items-center justify-center py-1 gap-1 transition-all duration-200 cursor-pointer relative group ${
          activeTab === 'settings'
            ? 'text-[#ffeaa7]'
            : 'text-[#a29bfe]/60 hover:text-[#a29bfe]'
        }`}
      >
        <div className="relative flex items-center justify-center">
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-[#ffeaa7]/15 shadow-sm shadow-[#ffeaa7]/20' : 'group-hover:bg-[#1f1742]/40'}`}>
            <SlidersHorizontal 
              size={20} 
              strokeWidth={activeTab === 'settings' ? 2.4 : 1.8}
              className={`transition-transform duration-200 ${activeTab === 'settings' ? 'scale-110 text-[#ffeaa7]' : ''}`}
            />
          </div>
        </div>
        <span className={`text-[10px] font-semibold tracking-tight transition-all ${activeTab === 'settings' ? 'font-bold text-[#ffeaa7]' : ''}`}>
          Paramètres
        </span>
      </button>
    </nav>
  );
};
export default BottomCoupleNav;
