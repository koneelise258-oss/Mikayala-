import React from 'react';
import { MessageSquareHeart, PhoneCall } from 'lucide-react';

export type ActiveTab = 'discussions' | 'appels';

interface TabsNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  unreadCount?: number;
  missedCallsCount?: number;
}

export const TabsNav: React.FC<TabsNavProps> = ({
  activeTab,
  onTabChange,
  unreadCount = 0,
  missedCallsCount = 0
}) => {
  return (
    <nav 
      className="h-[52px] px-3 select-none flex items-center gap-2 shrink-0 border-b border-white/5 relative z-20 transition-colors bg-[#151924]/90 backdrop-blur-md"
      style={{
        backgroundColor: 'var(--mk-tabs-bg, #151924)'
      }}
    >
      {/* Discussions Tab */}
      <button
        onClick={() => onTabChange('discussions')}
        className={`flex-1 py-2 px-3 rounded-full flex items-center justify-center gap-2 text-xs font-bold tracking-tight transition-all cursor-pointer group ${
          activeTab === 'discussions'
            ? 'bg-[#1e2333] text-white shadow-md border border-white/10 ring-1 ring-[#6c5ce7]/30'
            : 'text-[#8e95a5] hover:text-white hover:bg-white/5'
        }`}
      >
        <MessageSquareHeart 
          size={16} 
          strokeWidth={activeTab === 'discussions' ? 2.4 : 1.8}
          className={`transition-transform duration-200 ${activeTab === 'discussions' ? 'scale-110 text-[#a29bfe]' : 'text-[#8e95a5]'}`}
        />
        <span>Discussions</span>
        {unreadCount > 0 && (
          <span 
            className="bg-[#6c5ce7] text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full min-w-4 h-4 flex items-center justify-center shadow-md animate-pulse"
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* Appels Tab */}
      <button
        onClick={() => onTabChange('appels')}
        className={`flex-1 py-2 px-3 rounded-full flex items-center justify-center gap-2 text-xs font-bold tracking-tight transition-all cursor-pointer group ${
          activeTab === 'appels'
            ? 'bg-[#1e2333] text-white shadow-md border border-white/10 ring-1 ring-[#6c5ce7]/30'
            : 'text-[#8e95a5] hover:text-white hover:bg-white/5'
        }`}
      >
        <PhoneCall 
          size={16} 
          strokeWidth={activeTab === 'appels' ? 2.4 : 1.8}
          className={`transition-transform duration-200 ${activeTab === 'appels' ? 'scale-110 text-[#fd79a8]' : 'text-[#8e95a5]'}`}
        />
        <span>Appels Intimes</span>
        {missedCallsCount > 0 && (
          <span className="bg-[#ff7675] text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full min-w-4 h-4 flex items-center justify-center shadow-md animate-bounce">
            {missedCallsCount}
          </span>
        )}
      </button>
    </nav>
  );
};

