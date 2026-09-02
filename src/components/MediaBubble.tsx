import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
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
  onTogglePlay
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(storagePath));
  const [hasError, setHasError] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  
  // Audio state & refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const webAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const webAudioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const webAudioStartTimeRef = useRef<number>(0);

  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(audioDuration);
  const [hasAudioError, setHasAudioError] = useState<boolean>(false);
  const [isWebAudioMode, setIsWebAudioMode] = useState<boolean>(false);

  const stopWebAudio = useCallback(() => {
    if (webAudioSourceRef.current) {
      try { webAudioSourceRef.current.stop(); } catch (_) {}
      webAudioSourceRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsAudioPlaying(false);
  }, []);

  useEffect(() => {
    return () => {
      stopWebAudio();
      if (webAudioCtxRef.current && webAudioCtxRef.current.state !== 'closed') {
        webAudioCtxRef.current.close().catch(() => {});
      }
    };
  }, [stopWebAudio]);

  const playWebAudioFallback = async () => {
    if (!signedUrl) return;
    try {
      stopWebAudio();
      const res = await fetch(signedUrl);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) throw new Error("Web Audio API non supportée");

      if (!webAudioCtxRef.current || webAudioCtxRef.current.state === 'closed') {
        webAudioCtxRef.current = new AudioCtxClass();
      }
      if (webAudioCtxRef.current.state === 'suspended') {
        await webAudioCtxRef.current.resume();
      }

      const buffer = await webAudioCtxRef.current.decodeAudioData(arrayBuffer);
      setTotalDuration(Math.round(buffer.duration));

      const source = webAudioCtxRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(webAudioCtxRef.current.destination);

      webAudioStartTimeRef.current = webAudioCtxRef.current.currentTime;
      source.onended = () => {
        setIsAudioPlaying(false);
        setCurrentTime(0);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };

      source.start(0);
      webAudioSourceRef.current = source;
      setIsAudioPlaying(true);
      setIsWebAudioMode(true);
      setHasAudioError(false);

      const updateProgress = () => {
        if (webAudioCtxRef.current && webAudioSourceRef.current) {
          const elapsed = webAudioCtxRef.current.currentTime - webAudioStartTimeRef.current;
          setCurrentTime(Math.min(buffer.duration, elapsed));
          if (elapsed < buffer.duration) {
            animFrameRef.current = requestAnimationFrame(updateProgress);
          }
        }
      };
      animFrameRef.current = requestAnimationFrame(updateProgress);
    } catch (err) {
      console.error('[MediaBubble] Web Audio fallback decode error:', err);
      setHasAudioError(true);
      setIsAudioPlaying(false);
    }
  };

  const loadMedia = useCallback(async () => {
    if (storagePath) {
      setIsLoading(true);
      setHasError(false);
      setHasAudioError(false);
      setIsWebAudioMode(false);
      try {
        const url = await obtenirSignedUrl(storagePath);
        if (typeof url === 'string' && url.trim() !== '') {
          setSignedUrl(url);
        } else {
          setHasError(true);
        }
      } catch (err) {
        console.error('[MediaBubble] Error fetching signed URL:', err);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (mediaUrl && (typeof mediaUrl === 'string') && (mediaUrl.startsWith('blob:') || mediaUrl.startsWith('data:') || mediaUrl.startsWith('http'))) {
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

  const handleAudioPlayPause = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!signedUrl) return;

    if (isWebAudioMode) {
      if (isAudioPlaying) {
        stopWebAudio();
      } else {
        await playWebAudioFallback();
      }
      return;
    }

    if (!audioRef.current) return;

    try {
      if (isAudioPlaying) {
        audioRef.current.pause();
      } else {
        await audioRef.current.play();
      }
    } catch (err: any) {
      console.warn('[MediaBubble] Native play failed, trying Web Audio API fallback:', err);
      await playWebAudioFallback();
    }
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
      <div className="relative rounded-xl overflow-hidden bg-black/20 max-w-[280px]">
        {hasError || !signedUrl ? (
          <div className="p-3 flex items-center gap-2 text-xs text-[#ff7675] bg-black/40 rounded-xl">
            <AlertCircle size={16} />
            <span>Vidéo non disponible</span>
          </div>
        ) : (
          <video
            ref={videoRef}
            src={signedUrl}
            controls
            preload="metadata"
            playsInline
            className="w-full max-h-72 object-contain rounded-xl bg-black"
            onLoadedMetadata={(e) => {
              const video = e.currentTarget;
              console.log('[MediaBubble Video Metadata]', {
                durationSeconds: video.duration,
                width: video.videoWidth,
                height: video.videoHeight,
                src: signedUrl
              });
            }}
            onError={(e) => {
              const err = e.currentTarget.error;
              console.error('[MediaBubble Video Error]', {
                code: err?.code,
                message: err?.message,
                src: signedUrl
              });
              setHasError(true);
            }}
          />
        )}
      </div>
    );
  }

  // Audio rendering logic
  const effectiveDuration = totalDuration || audioDuration || 1;
  const currentProgressRatio = Math.min(1, Math.max(0, currentTime / effectiveDuration));

  return (
    <div className="flex items-center gap-3 py-1 min-w-[200px] sm:min-w-[240px]">
      <audio
        ref={audioRef}
        src={signedUrl}
        preload="metadata"
        className="hidden"
        onPlay={() => setIsAudioPlaying(true)}
        onPause={() => {
          if (!isWebAudioMode) setIsAudioPlaying(false);
        }}
        onEnded={() => {
          if (!isWebAudioMode) {
            setCurrentTime(0);
            setIsAudioPlaying(false);
          }
        }}
        onTimeUpdate={() => {
          if (!isWebAudioMode && audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (!isWebAudioMode && audioRef.current?.duration && !isNaN(audioRef.current.duration) && isFinite(audioRef.current.duration)) {
            setTotalDuration(Math.round(audioRef.current.duration));
          }
        }}
        onError={(event) => {
          const audioError = event.currentTarget.error;
          console.warn('[MediaBubble] Native audio element error (code ' + audioError?.code + '). Falling back if user plays.');
          // Don't mark as unplayable immediately, allow Web Audio fallback on click
        }}
      />

      {hasAudioError ? (
        <div className="flex items-center gap-1.5 text-xs text-[#ff7675]">
          <AlertCircle size={16} />
          <span>Lecture impossible</span>
        </div>
      ) : (
        <>
          <button
            onClick={handleAudioPlayPause}
            className="w-10 h-10 rounded-full bg-[#00b894] text-[#130f26] flex items-center justify-center shrink-0 shadow-md hover:scale-105 transition-transform cursor-pointer"
          >
            {isAudioPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
          </button>

          <div className="flex-1 flex flex-col justify-center gap-1.5">
            {/* Waveform / Progress bar calculated from currentTime */}
            <div className="flex items-end gap-0.5 h-6">
              {(waveform.length > 0 ? waveform : [30, 60, 40, 90, 70, 50, 80, 40, 60, 30, 90, 70, 40, 60]).map((h, barIdx, arr) => {
                const totalBars = arr.length;
                const isBarActive = (barIdx / totalBars) <= currentProgressRatio;

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
                {isAudioPlaying || currentTime > 0
                  ? formatDuration(Math.floor(currentTime))
                  : formatDuration(effectiveDuration)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
