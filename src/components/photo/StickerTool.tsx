import React from 'react';
import { Heart, Sparkles, Tag } from 'lucide-react';
import { StickerType } from './types';

interface StickerToolProps {
  onAddSticker: (type: StickerType, content: string) => void;
  stickersCount: number;
  maxCount?: number;
}

const EMOJI_STICKERS = [
  '❤️', '💕', '💖', '💋', '🌹', '✨', 
  '🥰', '😘', '🔥', '🌙', '💌', '💍', 
  '🧸', '🍫', '🕊️', '🥂', '🌸', '💐'
];

const ROMANTIC_LABELS = [
  "Je t'aime",
  "Mon cœur",
  "Pour toi",
  "Bisous",
  "Toujours nous",
  "Mon amour",
  "Ensemble",
  "Pour la vie"
];

export const StickerTool: React.FC<StickerToolProps> = ({
  onAddSticker,
  stickersCount,
  maxCount = 20
}) => {
  return (
    <div className="space-y-2.5 max-w-lg mx-auto">
      {/* Header with counter */}
      <div className="flex items-center justify-between text-xs text-[#a29bfe]">
        <span className="font-semibold text-white flex items-center gap-1.5">
          <Heart size={14} className="text-[#fd79a8]" />
          Stickers romantiques
        </span>
        <span className="text-[11px] opacity-70">
          ({stickersCount}/{maxCount})
        </span>
      </div>

      {/* Romantic Labels Pills */}
      <div className="space-y-1">
        <span className="text-[10px] uppercase font-bold tracking-wider text-[#a29bfe]/60 flex items-center gap-1">
          <Tag size={10} />
          Messages d'amour
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {ROMANTIC_LABELS.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => onAddSticker('label', label)}
              disabled={stickersCount >= maxCount}
              className="shrink-0 px-3 py-1.5 rounded-full bg-[#1e153d] hover:bg-[#6c5ce7] border border-[#2d2254] hover:border-[#a29bfe] text-white text-xs font-semibold shadow-xs active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              aria-label={`Ajouter le sticker ${label}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Emojis Grid */}
      <div className="space-y-1">
        <span className="text-[10px] uppercase font-bold tracking-wider text-[#a29bfe]/60 flex items-center gap-1">
          <Sparkles size={10} />
          Icônes & Émojis
        </span>
        <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5 max-h-24 overflow-y-auto pr-1">
          {EMOJI_STICKERS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onAddSticker('emoji', emoji)}
              disabled={stickersCount >= maxCount}
              className="h-10 rounded-xl bg-[#181135] hover:bg-[#281c52] border border-[#2d2254] hover:border-[#fd79a8] text-xl flex items-center justify-center active:scale-90 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              aria-label={`Ajouter le sticker émoji ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
