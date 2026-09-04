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
      className="h-[64px] border-t border-white/5 flex items-center justify-around px-3 relative z-30 select-none shrink-0 shadow-[0_-8px_32px_rgba(0,0,0,0.4)] transition-colors backdrop-blur-2xl bg-[#11141d]/95"
      style={{
        backgroundColor: 'var(--mk-bottom-nav-bg, #11141d)'
      }}
    >
      {/* 1. Chat (Discussions) */}
      <button
        onClick={() => handleNav('chat')}
        className={`flex-1 flex flex-col items-center justify-center py-1 gap-1 transition-all duration-200 cursor-pointer relative group ${
          activeTab === 'chat'
            ? 'text-white'
            : 'text-[#8e95a5] hover:text-white'
        }`}
      >
        <div className="relative flex items-center justify-center">
          <div className={`p-1.5 rounded-2xl transition-all duration-200 ${
            activeTab === 'chat' 
              ? 'bg-[#6c5ce7]/20 text-[#a29bfe] border border-[#6c5ce7]/40 shadow-sm shadow-[#6c5ce7]/30' 
              : 'group-hover:bg-white/5'
          }`}>
            <MessageSquareHeart 
              size={20} 
              strokeWidth={activeTab === 'chat' ? 2.4 : 1.8}
              className={`transition-transform duration-200 ${activeTab === 'chat' ? 'scale-110 text-[#a29bfe]' : 'text-[#8e95a5]'}`}
            />
          </div>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1.5 bg-[#6c5ce7] text-white font-extrabold text-[9px] px-1.5 rounded-full min-w-4 h-4 flex items-center justify-center shadow-md animate-pulse">
              {unreadCount}
            </span>
          )}
        </div>
        <span className={`text-[10px] font-semibold tracking-tight transition-all ${activeTab === 'chat' ? 'font-bold text-white' : 'text-[#8e95a5]'}`}>
          Discussions
        </span>
      </button>

      {/* 2. Coffre-Fort (Vault) */}
      <button
        onClick={() => handleNav('vault')}
        className={`flex-1 flex flex-col items-center justify-center py-1 gap-1 transition-all duration-200 cursor-pointer relative group ${
          activeTab === 'vault'
            ? 'text-white'
            : 'text-[#8e95a5] hover:text-white'
        }`}
      >
        <div className="relative flex items-center justify-center">
          <div className={`p-1.5 rounded-2xl transition-all duration-200 ${
            activeTab === 'vault' 
              ? 'bg-[#6c5ce7]/20 text-[#a29bfe] border border-[#6c5ce7]/40 shadow-sm shadow-[#6c5ce7]/30' 
              : 'group-hover:bg-white/5'
          }`}>
            <ShieldCheck 
              size={20} 
              strokeWidth={activeTab === 'vault' ? 2.4 : 1.8}
              className={`transition-transform duration-200 ${activeTab === 'vault' ? 'scale-110 text-[#a29bfe]' : 'text-[#8e95a5]'}`}
            />
          </div>
          {isVaultLocked && (
            <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-[#fd79a8] ring-1 ring-[#11141d]" />
          )}
        </div>
        <span className={`text-[10px] font-semibold tracking-tight transition-all ${activeTab === 'vault' ? 'font-bold text-white' : 'text-[#8e95a5]'}`}>
          Coffre-Fort
        </span>
      </button>

      {/* 3. Espace Couple (Bons/Quiz/Timer/Wishlist/Jeux) */}
      <button
        onClick={() => handleNav('games')}
        className={`flex-1 flex flex-col items-center justify-center py-1 gap-1 transition-all duration-200 cursor-pointer relative group ${
          activeTab === 'games'
            ? 'text-white'
            : 'text-[#8e95a5] hover:text-white'
        }`}
      >
        <div className="relative flex items-center justify-center">
          <div className={`p-1.5 rounded-2xl transition-all duration-200 ${
            activeTab === 'games' 
              ? 'bg-[#fd79a8]/20 text-[#fd79a8] border border-[#fd79a8]/40 shadow-sm shadow-[#fd79a8]/30' 
              : 'group-hover:bg-white/5'
          }`}>
            <Sparkles 
              size={20} 
              strokeWidth={activeTab === 'games' ? 2.4 : 1.8}
              className={`transition-transform duration-200 ${activeTab === 'games' ? 'scale-110 text-[#fd79a8]' : 'text-[#8e95a5]'}`}
            />
          </div>
        </div>
        <span className={`text-[10px] font-semibold tracking-tight transition-all ${activeTab === 'games' ? 'font-bold text-[#fd79a8]' : 'text-[#8e95a5]'}`}>
          Espace Couple
        </span>
      </button>

      {/* 4. Paramètres (Design & Biométrie) */}
      <button
        onClick={() => handleNav('settings')}
        className={`flex-1 flex flex-col items-center justify-center py-1 gap-1 transition-all duration-200 cursor-pointer relative group ${
          activeTab === 'settings'
            ? 'text-white'
            : 'text-[#8e95a5] hover:text-white'
        }`}
      >
        <div className="relative flex items-center justify-center">
          <div className={`p-1.5 rounded-2xl transition-all duration-200 ${
            activeTab === 'settings' 
              ? 'bg-[#ffeaa7]/20 text-[#ffeaa7] border border-[#ffeaa7]/40 shadow-sm shadow-[#ffeaa7]/30' 
              : 'group-hover:bg-white/5'
          }`}>
            <SlidersHorizontal 
              size={20} 
              strokeWidth={activeTab === 'settings' ? 2.4 : 1.8}
              className={`transition-transform duration-200 ${activeTab === 'settings' ? 'scale-110 text-[#ffeaa7]' : 'text-[#8e95a5]'}`}
            />
          </div>
        </div>
        <span className={`text-[10px] font-semibold tracking-tight transition-all ${activeTab === 'settings' ? 'font-bold text-[#ffeaa7]' : 'text-[#8e95a5]'}`}>
          Paramètres
        </span>
      </button>
    </nav>
  );
};
export default BottomCoupleNav;
