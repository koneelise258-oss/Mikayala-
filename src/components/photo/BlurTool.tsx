import React from 'react';
import {
  EyeOff,
  Eraser,
  Trash2,
  Sparkles
} from 'lucide-react';
import { BlurIntensity, BlurBrushSize, BlurMode } from './types';

interface BlurToolProps {
  currentIntensity: BlurIntensity;
  onIntensityChange: (intensity: BlurIntensity) => void;
  currentBrushSize: BlurBrushSize;
  onBrushSizeChange: (size: BlurBrushSize) => void;
  currentMode: BlurMode;
  onModeChange: (mode: BlurMode) => void;
  onClearAll: () => void;
  hasBlur: boolean;
}

const BRUSH_SIZES: { id: BlurBrushSize; label: string; size: number }[] = [
  { id: 'small', label: 'Fin', size: 16 },
  { id: 'medium', label: 'Moyen', size: 32 },
  { id: 'large', label: 'Large', size: 54 }
];

const INTENSITY_OPTIONS: { id: BlurIntensity; label: string; blurRadius: number }[] = [
  { id: 'light', label: 'Léger', blurRadius: 6 },
  { id: 'medium', label: 'Moyen', blurRadius: 14 },
  { id: 'strong', label: 'Fort', blurRadius: 26 }
];

export const BlurTool: React.FC<BlurToolProps> = ({
  currentIntensity,
  onIntensityChange,
  currentBrushSize,
  onBrushSizeChange,
  currentMode,
  onModeChange,
  onClearAll,
  hasBlur
}) => {
  return (
    <div className="space-y-2.5 max-w-lg mx-auto">
      {/* Top row: Mode (Blur vs Eraser) + Clear All */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 bg-[#181135] p-1 rounded-xl border border-[#2d2254]">
          <button
            type="button"
            onClick={() => onModeChange('blur')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentMode === 'blur'
                ? 'bg-[#00b894] text-[#0f0c20] shadow-sm'
                : 'text-[#a29bfe] hover:text-white'
            }`}
            aria-label="Mode floutage"
          >
            <EyeOff size={14} />
            <span>Pinceau Flou</span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange('eraser')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentMode === 'eraser'
                ? 'bg-[#e17055] text-white shadow-sm'
                : 'text-[#a29bfe] hover:text-white'
            }`}
            aria-label="Mode gomme flou"
          >
            <Eraser size={14} />
            <span>Gomme</span>
          </button>
        </div>

        {/* Brush size selector */}
        <div className="flex items-center gap-1 bg-[#181135] p-1 rounded-xl border border-[#2d2254]">
          {BRUSH_SIZES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onBrushSizeChange(item.id)}
              className={`p-1.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                currentBrushSize === item.id
                  ? 'bg-[#6c5ce7] text-white'
                  : 'text-[#a29bfe] hover:text-white'
              }`}
              title={`Taille du pinceau : ${item.label}`}
              aria-label={`Taille du pinceau ${item.label}`}
            >
              <div
                className="rounded-full bg-current"
                style={{ width: (item.size / 4) + 4, height: (item.size / 4) + 4 }}
              />
            </button>
          ))}
        </div>

        {/* Clear blur */}
        <button
          type="button"
          onClick={onClearAll}
          disabled={!hasBlur}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#181135] hover:bg-[#ff7675]/20 text-[#a29bfe] hover:text-[#ff7675] border border-[#2d2254] text-xs font-medium transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          title="Effacer tout le flou"
          aria-label="Effacer tout le flou"
        >
          <Trash2 size={14} />
          <span className="hidden sm:inline">Effacer</span>
        </button>
      </div>

      {/* Intensity selector (visible in blur mode) */}
      {currentMode === 'blur' && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-[11px] text-[#a29bfe] flex items-center gap-1">
            <Sparkles size={12} className="text-[#00cec9]" />
            Intensité :
          </span>
          <div className="grid grid-cols-3 gap-1.5 flex-1 max-w-xs">
            {INTENSITY_OPTIONS.map((item) => {
              const isSelected = currentIntensity === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onIntensityChange(item.id)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all text-center cursor-pointer ${
                    isSelected
                      ? 'bg-[#201642] text-[#00b894] border border-[#00b894] font-bold shadow-xs'
                      : 'bg-[#181135] text-[#a29bfe] border border-[#2d2254] hover:text-white'
                  }`}
                  aria-label={`Intensité de flou ${item.label}`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
