import React from 'react';
import {
  Paintbrush,
  Eraser,
  Trash2
} from 'lucide-react';
import { DrawColor, DrawThickness, DrawMode } from './types';

interface DrawingToolProps {
  currentColor: DrawColor;
  onColorChange: (color: DrawColor) => void;
  currentThickness: DrawThickness;
  onThicknessChange: (thickness: DrawThickness) => void;
  currentMode: DrawMode;
  onModeChange: (mode: DrawMode) => void;
  onClearAll: () => void;
  hasDrawings: boolean;
}

const DRAW_COLORS: { color: DrawColor; label: string }[] = [
  { color: '#ffffff', label: 'Blanc' },
  { color: '#000000', label: 'Noir' },
  { color: '#ff4757', label: 'Rouge' },
  { color: '#fd79a8', label: 'Rose' },
  { color: '#00cec9', label: 'Turquoise' },
  { color: '#ffeaa7', label: 'Jaune' },
  { color: '#a29bfe', label: 'Violet' }
];

const THICKNESS_OPTIONS: { id: DrawThickness; label: string; size: number }[] = [
  { id: 'thin', label: 'Fin', size: 4 },
  { id: 'medium', label: 'Moyen', size: 8 },
  { id: 'thick', label: 'Épais', size: 16 }
];

export const DrawingTool: React.FC<DrawingToolProps> = ({
  currentColor,
  onColorChange,
  currentThickness,
  onThicknessChange,
  currentMode,
  onModeChange,
  onClearAll,
  hasDrawings
}) => {
  return (
    <div className="space-y-2.5 max-w-lg mx-auto">
      {/* Top row: Mode (Brush vs Eraser) + Clear All */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 bg-[#181135] p-1 rounded-xl border border-[#2d2254]">
          <button
            type="button"
            onClick={() => onModeChange('brush')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentMode === 'brush'
                ? 'bg-[#00b894] text-[#0f0c20] shadow-sm'
                : 'text-[#a29bfe] hover:text-white'
            }`}
            aria-label="Mode pinceau"
          >
            <Paintbrush size={14} />
            <span>Pinceau</span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange('eraser')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentMode === 'eraser'
                ? 'bg-[#e17055] text-white shadow-sm'
                : 'text-[#a29bfe] hover:text-white'
            }`}
            aria-label="Mode gomme"
          >
            <Eraser size={14} />
            <span>Gomme</span>
          </button>
        </div>

        {/* Thickness selector */}
        <div className="flex items-center gap-1 bg-[#181135] p-1 rounded-xl border border-[#2d2254]">
          {THICKNESS_OPTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onThicknessChange(item.id)}
              className={`p-1.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                currentThickness === item.id
                  ? 'bg-[#6c5ce7] text-white'
                  : 'text-[#a29bfe] hover:text-white'
              }`}
              title={`Épaisseur: ${item.label}`}
              aria-label={`Épaisseur ${item.label}`}
            >
              <div
                className="rounded-full bg-current"
                style={{ width: item.size + 4, height: item.size + 4 }}
              />
            </button>
          ))}
        </div>

        {/* Clear drawing */}
        <button
          type="button"
          onClick={onClearAll}
          disabled={!hasDrawings}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#181135] hover:bg-[#ff7675]/20 text-[#a29bfe] hover:text-[#ff7675] border border-[#2d2254] text-xs font-medium transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          title="Effacer tout le dessin"
          aria-label="Effacer tout le dessin"
        >
          <Trash2 size={14} />
          <span className="hidden sm:inline">Effacer</span>
        </button>
      </div>

      {/* Colors row (only visible in brush mode) */}
      {currentMode === 'brush' && (
        <div className="flex items-center justify-center gap-2 pt-1 overflow-x-auto pb-1">
          {DRAW_COLORS.map((item) => {
            const isSelected = currentColor === item.color;
            return (
              <button
                key={item.color}
                type="button"
                onClick={() => onColorChange(item.color)}
                className={`w-7 h-7 rounded-full transition-transform cursor-pointer shrink-0 border-2 ${
                  isSelected
                    ? 'scale-115 border-white shadow-md shadow-white/30'
                    : 'border-white/20 hover:scale-105'
                }`}
                style={{ backgroundColor: item.color }}
                title={item.label}
                aria-label={`Couleur ${item.label}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
