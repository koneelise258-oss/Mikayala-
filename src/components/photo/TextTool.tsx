import React, { useState } from 'react';
import {
  Plus,
  Type,
  Check,
  X,
  Sparkles
} from 'lucide-react';
import { TextColor, TextSize, TextItem } from './types';

interface TextToolProps {
  onAddText: (text: string, color: TextColor, size: TextSize, hasBackground: boolean) => void;
  textItemsCount: number;
  maxCount?: number;
}

const TEXT_COLORS: { color: TextColor; label: string }[] = [
  { color: '#ffffff', label: 'Blanc' },
  { color: '#000000', label: 'Noir' },
  { color: '#ff4757', label: 'Rouge' },
  { color: '#fd79a8', label: 'Rose' },
  { color: '#00cec9', label: 'Turquoise' },
  { color: '#ffeaa7', label: 'Jaune' }
];

const TEXT_SIZES: { id: TextSize; label: string }[] = [
  { id: 'small', label: 'S' },
  { id: 'medium', label: 'M' },
  { id: 'large', label: 'L' }
];

export const TextTool: React.FC<TextToolProps> = ({
  onAddText,
  textItemsCount,
  maxCount = 10
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<TextColor>('#ffffff');
  const [selectedSize, setSelectedSize] = useState<TextSize>('medium');
  const [hasBackground, setHasBackground] = useState<boolean>(true);

  const handleOpenDialog = () => {
    if (textItemsCount >= maxCount) return;
    setInputText('');
    setIsDialogOpen(true);
  };

  const handleConfirm = () => {
    if (!inputText.trim()) return;
    onAddText(inputText.trim(), selectedColor, selectedSize, hasBackground);
    setInputText('');
    setIsDialogOpen(false);
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Primary Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-[#a29bfe]">
          <span className="font-semibold text-white">Zone de texte</span>
          <span className="ml-1 text-[11px] opacity-70">
            ({textItemsCount}/{maxCount})
          </span>
        </div>

        <button
          type="button"
          onClick={handleOpenDialog}
          disabled={textItemsCount >= maxCount}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] text-white text-xs font-bold shadow-md shadow-[#6c5ce7]/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          aria-label="Ajouter un texte"
        >
          <Plus size={16} />
          <span>Ajouter du texte</span>
        </button>
      </div>

      <p className="text-[11px] text-[#a29bfe]/70 mt-2">
        Touchez ou glissez le texte sur l'image pour le positionner à votre guise.
      </p>

      {/* Modal / Dialog for creating text */}
      {isDialogOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsDialogOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-[#181135] border border-[#2d2254] rounded-2xl p-4 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <Type size={16} className="text-[#a29bfe]" />
                Ajouter un texte
              </span>
              <button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="p-1 rounded-lg text-[#a29bfe] hover:text-white hover:bg-[#201642] transition-colors cursor-pointer"
                aria-label="Fermer la boîte de texte"
              >
                <X size={18} />
              </button>
            </div>

            {/* Input area with char limit */}
            <div className="space-y-1">
              <div className="relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value.slice(0, 120))}
                  placeholder="Écrivez votre message ou vos emojis…"
                  rows={2}
                  maxLength={120}
                  autoFocus
                  className="w-full bg-[#0e0a22] border border-[#2d2254] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#a29bfe] resize-none"
                />
              </div>
              <div className="flex justify-end text-[10px] text-[#a29bfe]">
                {inputText.length}/120
              </div>
            </div>

            {/* Color palette */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-[#a29bfe] font-medium">Couleur</span>
              <div className="flex items-center gap-2">
                {TEXT_COLORS.map((item) => {
                  const isSelected = selectedColor === item.color;
                  return (
                    <button
                      key={item.color}
                      type="button"
                      onClick={() => setSelectedColor(item.color)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer shrink-0 ${
                        isSelected
                          ? 'scale-115 border-white shadow-md shadow-white/30'
                          : 'border-white/20 hover:scale-105'
                      }`}
                      style={{ backgroundColor: item.color }}
                      title={item.label}
                      aria-label={`Couleur de texte ${item.label}`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Size & Background pills */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <span className="text-[11px] text-[#a29bfe] font-medium">Taille</span>
                <div className="flex items-center gap-1 bg-[#0e0a22] p-1 rounded-xl border border-[#2d2254]">
                  {TEXT_SIZES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedSize(item.id)}
                      className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        selectedSize === item.id
                          ? 'bg-[#6c5ce7] text-white'
                          : 'text-[#a29bfe] hover:text-white'
                      }`}
                      aria-label={`Taille ${item.label}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-[#a29bfe] font-medium">Style fond</span>
                <button
                  type="button"
                  onClick={() => setHasBackground((prev) => !prev)}
                  className={`w-full py-2 px-2.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                    hasBackground
                      ? 'bg-[#201642] text-[#00b894] border-[#00b894]'
                      : 'bg-[#0e0a22] text-[#a29bfe] border-[#2d2254]'
                  }`}
                  aria-label="Fond transparent ou discret"
                >
                  {hasBackground ? 'Fond discret' : 'Transparent'}
                </button>
              </div>
            </div>

            {/* Confirm action */}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!inputText.trim()}
              className="w-full py-2.5 rounded-xl bg-[#00b894] text-[#0f0c20] font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#00b894]/20 hover:brightness-110 active:scale-98 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              aria-label="Valider l'ajout du texte"
            >
              <Check size={16} className="stroke-[3]" />
              <span>Insérer sur la photo</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
