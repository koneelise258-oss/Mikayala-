import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Loader2, Video as VideoIcon, RefreshCw } from 'lucide-react';
import { obtenirSignedUrl } from '../services/messageService';
import { formatDuration } from '../utils/formatters';

interface MediaBubbleProps {
  storagePath?: string | null;
  mediaUrl?: string | null;
  type: 'audio' | 'video';
  audioDuration?: number;
  waveform?: number[];
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  progress?: number;
}

export const MediaBubble: React.FC<MediaBubbleProps> = ({
  storagePath,
  mediaUrl,
  type,
  audioDuration = 0,
  waveform = [],
  isPlaying = false,
  onTogglePlay,
  progress = 0
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(storagePath));
  const [hasError, setHasError] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const loadMedia = useCallback(async () => {
    if (storagePath) {
      setIsLoading(true);
      setHasError(false);
      try {
        const url = await obtenirSignedUrl(storagePath);
        if (url) {
          setSignedUrl(url);
        } else {
          setHasError(true);
        }
      } catch (err) {
        console.error('[MediaBubble] Error:', err);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (mediaUrl && (mediaUrl.startsWith('blob:') || mediaUrl.startsWith('data:'))) {
      setSignedUrl(mediaUrl);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setHasError(true);
  }, [storagePath, mediaUrl]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia, retryCount]);

  useEffect(() => {
    if (type === 'video' && videoRef.current) {
      if (isPlaying) videoRef.current.play().catch(() => {});
      else videoRef.current.pause();
    }
  }, [isPlaying, type]);

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRetryCount(c => c + 1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 py-2 min-w-[200px]">
        <Loader2 size={20} className="animate-spin text-[#00b894]" />
        <span className="text-xs text-[#a29bfe]">Chargement...</span>
      </div>
    );
  }

  if (hasError || !signedUrl) {
    return (
      <div onClick={handleRetry} className="flex items-center gap-2 py-2 text-[#ff7675] cursor-pointer hover:underline text-xs">
        <RefreshCw size={14} />
        <span>Erreur de chargement média</span>
      </div>
    );
  }

  if (type === 'video') {
    return (
      <div className="relative rounded-xl overflow-hidden bg-black/20 max-w-[240px]">
        <video
          ref={videoRef}
          src={signedUrl}
          className="w-full aspect-square object-cover"
          loop
          muted
          playsInline
          onClick={onTogglePlay}
        />
        {!isPlaying && (
          <div onClick={onTogglePlay} className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer">
            <Play size={40} className="text-white fill-white opacity-80" />
          </div>
        )}
      </div>
    );
  }

  // Audio rendering logic (simplified and moved here)
  return (
    <div className="flex items-center gap-3 py-1 min-w-[200px] sm:min-w-[240px]">
      <audio src={signedUrl} className="hidden" />
      <button
        onClick={onTogglePlay}
        className="w-10 h-10 rounded-full bg-[#00b894] text-[#130f26] flex items-center justify-center shrink-0 shadow-md hover:scale-105 transition-transform cursor-pointer"
      >
        {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
      </button>

      <div className="flex-1 flex flex-col justify-center gap-1.5">
        <div className="flex items-end gap-0.5 h-6">
          {(waveform.length > 0 ? waveform : [30, 60, 40, 90, 70, 50, 80, 40, 60, 30, 90, 70, 40, 60]).map((h, barIdx) => {
            const totalBars = waveform.length || 14;
            const currentProgressRatio = progress / (audioDuration * 10);
            const isBarActive = barIdx / totalBars <= currentProgressRatio;

            return (
              <div
                key={barIdx}
                style={{ height: `${h}%` }}
                className={`flex-1 rounded-full transition-colors ${
                  isBarActive ? 'bg-[#00b894]' : 'bg-[#a29bfe]/40'
                }`}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[10px] text-[#a29bfe]">
          <span>
            {isPlaying
              ? formatDuration(Math.floor(progress / 10))
              : formatDuration(audioDuration)}
          </span>
        </div>
      </div>
    </div>
  );
};
