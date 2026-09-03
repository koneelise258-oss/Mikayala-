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
      className="h-[48px] text-[#a29bfe] select-none flex text-xs font-bold uppercase tracking-wider shrink-0 border-b border-[#2d2254] relative z-20 transition-colors bg-[#130f26]"
      style={{
        backgroundColor: 'var(--mk-tabs-bg, #130f26)'
      }}
    >
      {/* Discussions Tab */}
      <button
        onClick={() => onTabChange('discussions')}
        style={{
          borderBottomColor: activeTab === 'discussions' ? 'var(--mk-tabs-active, #00b894)' : 'transparent',
          color: activeTab === 'discussions' ? 'var(--mk-tabs-active, #00b894)' : undefined
        }}
        className={`flex-1 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer group ${
          activeTab === 'discussions'
            ? 'bg-[#1a1435]/60 font-black'
            : 'border-transparent text-[#a29bfe]/70 hover:text-[#f1f2f6]'
        }`}
      >
        <MessageSquareHeart 
          size={16} 
          strokeWidth={activeTab === 'discussions' ? 2.4 : 1.8}
          className={`transition-transform duration-200 ${activeTab === 'discussions' ? 'scale-110' : ''}`}
        />
        <span>Discussions</span>
        {unreadCount > 0 && (
          <span 
            style={{ backgroundColor: 'var(--mk-accent, #00b894)' }}
            className="text-[#130f26] font-extrabold text-[10px] px-1.5 py-0.5 rounded-full min-w-4 h-4 flex items-center justify-center shadow-sm animate-pulse"
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* Appels Tab */}
      <button
        onClick={() => onTabChange('appels')}
        style={{
          borderBottomColor: activeTab === 'appels' ? 'var(--mk-tabs-active, #00b894)' : 'transparent',
          color: activeTab === 'appels' ? 'var(--mk-tabs-active, #00b894)' : undefined
        }}
        className={`flex-1 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer group ${
          activeTab === 'appels'
            ? 'bg-[#1a1435]/60 font-black'
            : 'border-transparent text-[#a29bfe]/70 hover:text-[#f1f2f6]'
        }`}
      >
        <PhoneCall 
          size={16} 
          strokeWidth={activeTab === 'appels' ? 2.4 : 1.8}
          className={`transition-transform duration-200 ${activeTab === 'appels' ? 'scale-110' : ''}`}
        />
        <span>Appels Intimes</span>
        {missedCallsCount > 0 && (
          <span className="bg-[#ff7675] text-white font-extrabold text-[10px] px-1.5 py-0.5 rounded-full min-w-4 h-4 flex items-center justify-center shadow-sm animate-bounce">
            {missedCallsCount}
          </span>
        )}
      </button>
    </nav>
  );
};

