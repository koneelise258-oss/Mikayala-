import React, { useRef, useState, useEffect } from 'react';
import { 
  X, Heart, Sparkles, Send, RotateCcw, Paintbrush, 
  HandMetal, CircleDot, Zap
} from 'lucide-react';
import { triggerHaptic } from '../utils/security';
import { soundEffects } from '../utils/audio';

interface DigitalTouchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendDigitalTouch: (touchData: {
    previewUrl: string;
    pathsCount: number;
    tapsCount: number;
  }) => void;
}

const NEON_COLORS = [
  { id: 'emerald', hex: '#00b894', glow: 'rgba(0, 184, 148, 0.8)' },
  { id: 'pink', hex: '#fd79a8', glow: 'rgba(253, 121, 168, 0.8)' },
  { id: 'violet', hex: '#a29bfe', glow: 'rgba(162, 155, 254, 0.8)' },
  { id: 'gold', hex: '#ffeaa7', glow: 'rgba(255, 234, 167, 0.8)' },
  { id: 'white', hex: '#ffffff', glow: 'rgba(255, 255, 255, 0.9)' }
];

export const DigitalTouchModal: React.FC<DigitalTouchModalProps> = ({
  isOpen,
  onClose,
  onSendDigitalTouch
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedColor, setSelectedColor] = useState(NEON_COLORS[0]);
  const [brushSize, setBrushSize] = useState(6);
  const [mode, setMode] = useState<'draw' | 'heartbeat'>('draw');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [tapsCount, setTapsCount] = useState(0);
  const [pathsCount, setPathsCount] = useState(0);

  // Animated visual pulses for heartbeat taps
  const [activeRipples, setActiveRipples] = useState<Array<{ id: number; x: number; y: number; color: string }>>([]);

  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // Initial dark textured background
    ctx.fillStyle = '#130f26';
    ctx.fillRect(0, 0, rect.width, rect.height);
    
    // Draw subtle grid dots
    ctx.fillStyle = 'rgba(108, 92, 231, 0.15)';
    for (let x = 20; x < rect.width; x += 30) {
      for (let y = 20; y < rect.height; y += 30) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const playHeartTone = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      }
    } catch {}
  };

  const addRipple = (x: number, y: number, color: string) => {
    const id = Date.now() + Math.random();
    setActiveRipples(prev => [...prev, { id, x, y, color }]);
    setTimeout(() => {
      setActiveRipples(prev => prev.filter(r => r.id !== id));
    }, 1000);
  };

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top
    };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getCanvasCoords(e);

    if (mode === 'heartbeat') {
      playHeartTone();
      triggerHaptic([40, 30, 80]);
      addRipple(x, y, selectedColor.hex);
      setTapsCount(prev => prev + 1);
      setHasContent(true);

      // Draw glowing heart symbol on canvas
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.shadowColor = selectedColor.glow;
        ctx.shadowBlur = 15;
        ctx.fillStyle = selectedColor.hex;
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('❤️', x, y);
        ctx.restore();
      }
      return;
    }

    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = selectedColor.hex;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = selectedColor.glow;
    ctx.shadowBlur = 12;
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || mode === 'heartbeat') return;
    const { x, y } = getCanvasCoords(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasContent(true);
  };

  const handleEnd = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setPathsCount(prev => prev + 1);
      triggerHaptic(20);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#130f26';
    ctx.fillRect(0, 0, rect.width, rect.height);
    
    // Draw subtle grid dots
    ctx.fillStyle = 'rgba(108, 92, 231, 0.15)';
    for (let x = 20; x < rect.width; x += 30) {
      for (let y = 20; y < rect.height; y += 30) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    setHasContent(false);
    setTapsCount(0);
    setPathsCount(0);
    triggerHaptic(30);
  };

  const handleSend = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const previewUrl = canvas.toDataURL('image/png');
    onSendDigitalTouch({
      previewUrl,
      pathsCount,
      tapsCount
    });

    triggerHaptic([50, 50, 100]);
    soundEffects.playSent();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0e0b1c]/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-[#171230] text-[#f1f2f6] rounded-3xl w-full max-w-md border border-[#2d2254] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-[#2d2254] flex items-center justify-between shrink-0 bg-[#1b1435]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#00b894] to-[#fd79a8] flex items-center justify-center text-white shadow-lg">
              <Zap size={22} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-1.5">
                Digital Touch & Dessin Live
              </h3>
              <p className="text-xs text-[#a29bfe]">Dessinez des vibrations lumineuses en temps réel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#a29bfe] hover:text-white rounded-full hover:bg-[#281e4b] transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Selector & Palette */}
        <div className="p-3 bg-[#130f26] border-b border-[#2d2254] flex items-center justify-between gap-2">
          {/* Modes */}
          <div className="flex items-center gap-1 bg-[#1b1435] p-1 rounded-xl border border-[#2d2254]">
            <button
              onClick={() => setMode('draw')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                mode === 'draw'
                  ? 'bg-[#6c5ce7] text-white shadow-sm'
                  : 'text-[#a29bfe] hover:text-white'
              }`}
            >
              <Paintbrush size={13} />
              <span>Dessin Néon</span>
            </button>
            <button
              onClick={() => setMode('heartbeat')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                mode === 'heartbeat'
                  ? 'bg-[#fd79a8] text-[#130f26] shadow-sm'
                  : 'text-[#a29bfe] hover:text-white'
              }`}
            >
              <Heart size={13} />
              <span>Pouls Cœur</span>
            </button>
          </div>

          {/* Colors */}
          <div className="flex items-center gap-1.5">
            {NEON_COLORS.map(col => (
              <button
                key={col.id}
                onClick={() => {
                  setSelectedColor(col);
                  triggerHaptic(15);
                }}
                className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                  selectedColor.id === col.id ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#130f26]' : 'opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: col.hex, boxShadow: `0 0 8px ${col.glow}` }}
              />
            ))}
          </div>
        </div>

        {/* Canvas Workspace */}
        <div className="relative flex-1 bg-[#130f26] min-h-[320px] max-h-[400px] flex items-center justify-center overflow-hidden touch-none">
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair"
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
          />

          {/* Ripple Visuals for Heartbeat mode */}
          {activeRipples.map(r => (
            <div
              key={r.id}
              className="absolute pointer-events-none rounded-full -translate-x-1/2 -translate-y-1/2 animate-ping"
              style={{
                left: r.x,
                top: r.y,
                width: 60,
                height: 60,
                border: `3px solid ${r.color}`,
                boxShadow: `0 0 20px ${r.color}`
              }}
            />
          ))}

          {/* Helper hint */}
          {!hasContent && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-center p-4 text-[#a29bfe]/60 space-y-2">
              {mode === 'draw' ? (
                <>
                  <Sparkles size={32} className="animate-pulse text-[#55efc4]" />
                  <p className="text-xs">Tracez des lignes de lumière avec le doigt ou la souris</p>
                </>
              ) : (
                <>
                  <Heart size={32} className="animate-bounce text-[#fd79a8]" />
                  <p className="text-xs">Touchez l'écran pour envoyer des battements de cœur tactiles</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Toolbar & Send Actions */}
        <div className="p-4 bg-[#1b1435] border-t border-[#2d2254] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleClear}
              disabled={!hasContent}
              className="px-3 py-2 rounded-xl bg-[#130f26] hover:bg-[#281e4b] disabled:opacity-40 text-xs text-[#a29bfe] hover:text-white flex items-center gap-1.5 border border-[#2d2254] transition-colors cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Effacer</span>
            </button>

            {mode === 'draw' && (
              <div className="flex items-center gap-1 bg-[#130f26] px-2 py-1.5 rounded-xl border border-[#2d2254]">
                {[4, 8, 14].map(sz => (
                  <button
                    key={sz}
                    onClick={() => setBrushSize(sz)}
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-xs cursor-pointer ${
                      brushSize === sz ? 'bg-[#6c5ce7] text-white' : 'text-[#a29bfe]'
                    }`}
                  >
                    <CircleDot size={sz === 4 ? 8 : sz === 8 ? 12 : 16} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleSend}
            disabled={!hasContent}
            className="px-5 py-2.5 bg-[#00b894] disabled:opacity-40 hover:bg-[#00a884] text-[#130f26] font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <Send size={15} />
            <span>Envoyer le Toucher</span>
          </button>
        </div>

      </div>
    </div>
  );
};
