import React, { useRef, useState, useEffect } from 'react';
import { Sparkles, Eye, Lock, Check } from 'lucide-react';
import { ScratchCardData } from '../types';
import { triggerHaptic } from '../utils/security';
import { soundEffects } from '../utils/audio';

interface ScratchCardBubbleProps {
  data: ScratchCardData;
  onFullyScratched?: () => void;
  isSender?: boolean;
}

export const ScratchCardBubble: React.FC<ScratchCardBubbleProps> = ({
  data,
  onFullyScratched,
  isSender = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isScratched, setIsScratched] = useState(Boolean(data.isScratched));
  const [isDrawing, setIsDrawing] = useState(false);
  const [scratchProgress, setScratchProgress] = useState(data.scratchProgress || 0);

  useEffect(() => {
    if (isScratched) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Generate metallic glitter gradient
    const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    if (data.scratchColor === 'silver') {
      gradient.addColorStop(0, '#bdc3c7');
      gradient.addColorStop(0.5, '#ecf0f1');
      gradient.addColorStop(1, '#95a5a6');
    } else if (data.scratchColor === 'ruby') {
      gradient.addColorStop(0, '#e84393');
      gradient.addColorStop(0.5, '#fd79a8');
      gradient.addColorStop(1, '#d63031');
    } else if (data.scratchColor === 'emerald') {
      gradient.addColorStop(0, '#00b894');
      gradient.addColorStop(0.5, '#55efc4');
      gradient.addColorStop(1, '#00cec9');
    } else {
      // Gold default
      gradient.addColorStop(0, '#d4af37');
      gradient.addColorStop(0.3, '#f9ca24');
      gradient.addColorStop(0.7, '#f6e58d');
      gradient.addColorStop(1, '#c59b27');
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Add metallic pattern dots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * rect.width;
      const y = Math.random() * rect.height;
      const radius = Math.random() * 2 + 1;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Centered label
    ctx.fillStyle = '#130f26';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✨ Grattez pour révéler ✨', rect.width / 2, rect.height / 2);
  }, [isScratched, data.scratchColor]);

  const scratch = (clientX: number, clientY: number) => {
    if (isScratched) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    // Check scratch progress occasionally
    if (Math.random() < 0.25) {
      calculateProgress(ctx, canvas.width, canvas.height);
    }
  };

  const calculateProgress = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    try {
      const imageData = ctx.getImageData(0, 0, width, height);
      const pixels = imageData.data;
      let transparentCount = 0;
      const step = 32; // sampling step for high performance

      for (let i = 3; i < pixels.length; i += step * 4) {
        if (pixels[i] < 128) {
          transparentCount++;
        }
      }

      const totalSamples = pixels.length / (step * 4);
      const ratio = transparentCount / totalSamples;
      const percent = Math.min(100, Math.round(ratio * 100));
      setScratchProgress(percent);

      if (percent >= 38 && !isScratched) {
        setIsScratched(true);
        triggerHaptic([60, 40, 120]);
        soundEffects.playReaction();
        if (onFullyScratched) onFullyScratched();
      }
    } catch {}
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDrawing(true);
    const touch = e.touches[0];
    scratch(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDrawing) return;
    const touch = e.touches[0];
    scratch(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    setIsDrawing(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDrawing(true);
    scratch(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    scratch(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  return (
    <div className="relative rounded-2xl overflow-hidden bg-[#171230] border border-[#2d2254] shadow-lg max-w-xs w-full select-none">
      
      {/* Header */}
      <div className="p-2.5 bg-[#1b1435] border-b border-[#2d2254] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles size={14} className="text-[#ffeaa7]" />
          <span className="text-xs font-bold text-white truncate">{data.title || 'Message à Gratter'}</span>
        </div>
        {isScratched ? (
          <span className="text-[10px] text-[#55efc4] font-semibold flex items-center gap-1">
            <Check size={12} />
            <span>Révélé</span>
          </span>
        ) : (
          <span className="text-[10px] text-[#ffeaa7] font-semibold flex items-center gap-1">
            <Lock size={12} />
            <span>{scratchProgress}% gratté</span>
          </span>
        )}
      </div>

      {/* Secret Content Area */}
      <div className="relative min-h-[140px] flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[#1b1435] to-[#130f26]">
        
        {/* Hidden media if any */}
        {data.secretMediaUrl && (
          <img
            src={data.secretMediaUrl}
            alt="Secret"
            className="w-full h-36 object-cover rounded-xl mb-2 shadow-inner"
          />
        )}

        {/* Hidden secret text */}
        <p className="text-xs text-white font-medium text-center leading-relaxed italic">
          "{data.secretContent}"
        </p>

        {/* Scratchable Canvas Overlay */}
        {!isScratched && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full cursor-pointer touch-none z-10"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        )}
      </div>

      {/* Bottom info */}
      <div className="p-2 bg-[#130f26] border-t border-[#2d2254] text-center text-[10px] text-[#a29bfe]">
        {isScratched ? '✨ Secret intime déverrouillé' : 'Utilisez votre doigt pour gratter le vernis'}
      </div>

    </div>
  );
};
