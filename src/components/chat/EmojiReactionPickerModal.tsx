import React, { useState } from 'react';
import { X, Search, Sparkles, Heart, Smile, Flame, ThumbsUp, Coffee } from 'lucide-react';
import { triggerHaptic } from '../../utils/security';
import { soundEffects } from '../../utils/audio';

interface EmojiReactionPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  currentReaction?: string;
}

const EMOJI_CATEGORIES = [
  {
    id: 'love',
    name: 'Amour & Passion',
    icon: Heart,
    emojis: ['❤️', '💖', '💕', '💓', '💗', '💞', '💘', '💌', '💋', '🥰', '😍', '😻', '😘', '😚', '🌹', '💐', '🍫', '💍', '🔥']
  },
  {
    id: 'flirt',
    name: 'Complices & Désir',
    icon: Flame,
    emojis: ['🫦', '🤤', '🥵', '😈', '👀', '🫣', '🤫', '😏', '🫂', '✨', '⭐', '💫', '💎', '👑', '🍑', '🍒', '🍓', '🍷', '🥂']
  },
  {
    id: 'fun',
    name: 'Émotions & Rires',
    icon: Smile,
    emojis: ['😂', '🤣', '🥹', '🥺', '🤩', '🥳', '😎', '😜', '😋', '🤭', '🤗', '😁', '😆', '😇', '🫠', '🤪', '💀', '🤡', '🎉']
  },
  {
    id: 'gestures',
    name: 'Gestes & Cœurs',
    icon: ThumbsUp,
    emojis: ['🫶', '👍', '👏', '🙌', '🙏', '✌️', '🤞', '👌', '🤝', '💪', '🫡', '💯', '🎯', '👋', '👊', '🤛', '🤜', '🫰']
  },
  {
    id: 'care',
    name: 'Douceur & Soin',
    icon: Coffee,
    emojis: ['🥺', '🧸', '☕', '🩹', '🌸', '😴', '🤕', '🛋️', '🌙', '☁️', '🌧️', '🫧', '🕯️', '🍵', '🧋', '🍰', '🧁']
  }
];

export const EmojiReactionPickerModal: React.FC<EmojiReactionPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectEmoji,
  currentReaction
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('love');
  const [customEmojiInput, setCustomEmojiInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const handleSelect = (emoji: string) => {
    triggerHaptic(40);
    soundEffects.playReaction();
    onSelectEmoji(emoji);
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customEmojiInput.trim();
    if (clean) {
      handleSelect(clean);
      setCustomEmojiInput('');
    }
  };

  const filteredEmojis = searchQuery.trim()
    ? EMOJI_CATEGORIES.flatMap(c => c.emojis).filter(e => e.includes(searchQuery.trim()))
    : null;

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-[#17122b] border-t sm:border border-[#2d2254] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#2d2254] flex items-center justify-between bg-[#1f183a]">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-[#6c5ce7]/20 text-[#a29bfe]">
              <Sparkles size={18} />
            </span>
            <div>
              <h3 className="text-sm font-black text-white">Réagir au message</h3>
              <p className="text-[11px] text-[#a29bfe]">Choisissez ou collez n'importe quel émoji système</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-[#a29bfe] hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Custom Emoji Input from system keyboard */}
        <form onSubmit={handleCustomSubmit} className="p-3 border-b border-[#2d2254] bg-[#140f24] flex items-center gap-2">
          <input
            type="text"
            value={customEmojiInput}
            onChange={(e) => setCustomEmojiInput(e.target.value)}
            placeholder="Tapez ou collez un émoji système (ex: 🌺, 🥂)..."
            className="flex-1 bg-[#1d1635] border border-[#2d2254] focus:border-[#fd79a8] rounded-xl px-3 py-2 text-sm text-white placeholder:text-[#6c5ce7]/60 outline-none"
          />
          <button
            type="submit"
            disabled={!customEmojiInput.trim()}
            className="px-3.5 py-2 bg-gradient-to-r from-[#fd79a8] to-[#e84393] text-white font-bold text-xs rounded-xl hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer shadow-md shrink-0"
          >
            Réagir
          </button>
        </form>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 p-2 bg-[#1b1435] border-b border-[#2d2254] overflow-x-auto scrollbar-none">
          {EMOJI_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  triggerHaptic(15);
                  setActiveCategory(cat.id);
                  setSearchQuery('');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-[#6c5ce7] text-white shadow-md' 
                    : 'text-[#a29bfe] hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={14} />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Emojis Grid */}
        <div className="p-4 overflow-y-auto flex-1 max-h-[320px]">
          {filteredEmojis ? (
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2.5">
              {filteredEmojis.map((emoji, idx) => (
                <button
                  key={`${emoji}-${idx}`}
                  onClick={() => handleSelect(emoji)}
                  className={`h-11 rounded-2xl flex items-center justify-center text-2xl hover:scale-125 active:scale-95 transition-transform cursor-pointer ${
                    currentReaction === emoji ? 'bg-[#fd79a8]/30 border border-[#fd79a8]' : 'hover:bg-white/10'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : (
            <div>
              {EMOJI_CATEGORIES.filter(c => c.id === activeCategory).map(cat => (
                <div key={cat.id} className="grid grid-cols-6 sm:grid-cols-8 gap-2.5">
                  {cat.emojis.map((emoji, idx) => (
                    <button
                      key={`${emoji}-${idx}`}
                      onClick={() => handleSelect(emoji)}
                      className={`h-11 rounded-2xl flex items-center justify-center text-2xl hover:scale-125 active:scale-95 transition-transform cursor-pointer ${
                        currentReaction === emoji ? 'bg-[#fd79a8]/30 border border-[#fd79a8]' : 'hover:bg-white/10'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer tip */}
        <div className="p-3 bg-[#130e23] border-t border-[#2d2254] flex items-center justify-between text-[11px] text-[#a29bfe]">
          <span>Appuyez sur un émoji pour réagir instantanément</span>
          {currentReaction && (
            <button
              onClick={() => handleSelect(currentReaction)}
              className="text-[#ff7675] hover:underline font-semibold cursor-pointer"
            >
              Retirer ma réaction ({currentReaction})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
