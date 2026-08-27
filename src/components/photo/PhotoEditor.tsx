import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  Sliders,
  Sparkles,
  Crop as CropIcon,
  Rotate3d,
  Check,
  RotateCcw as ResetIcon,
  Sun,
  Contrast,
  Palette,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Square,
  Smartphone,
  Tv,
  Loader2,
  AlertCircle,
  Paintbrush,
  EyeOff,
  Type,
  Heart,
  Undo2,
  Redo2,
  Trash2
} from 'lucide-react';
import {
  AspectRatioType,
  FilterType,
  EditorTab,
  TextColor,
  TextSize,
  TextItem,
  StickerType,
  StickerItem,
  DrawColor,
  DrawThickness,
  DrawMode,
  DrawStroke,
  BlurIntensity,
  BlurBrushSize,
  BlurMode,
  BlurStroke,
  EditorSnapshot
} from './types';
import { DrawingTool } from './DrawingTool';
import { BlurTool } from './BlurTool';
import { TextTool } from './TextTool';
import { StickerTool } from './StickerTool';

interface PhotoEditorProps {
  isOpen: boolean;
  file: File | null;
  onClose: () => void;
  onComplete: (editedFile: File) => void;
}

interface FilterOption {
  id: FilterType;
  label: string;
  description: string;
  cssFilter: string;
}

const FILTERS: FilterOption[] = [
  {
    id: 'normal',
    label: 'Normal',
    description: 'Rendu naturel sans filtre',
    cssFilter: 'none'
  },
  {
    id: 'bw',
    label: 'Noir & Blanc',
    description: 'Classique & intemporel',
    cssFilter: 'grayscale(100%) contrast(110%)'
  },
  {
    id: 'warm',
    label: 'Chaud',
    description: 'Tons dorés et atmosphère intime',
    cssFilter: 'sepia(30%) saturate(130%) brightness(102%) hue-rotate(-10deg)'
  },
  {
    id: 'cool',
    label: 'Froid',
    description: 'Tons bleutés et ambiance moderne',
    cssFilter: 'saturate(95%) hue-rotate(15deg) contrast(105%)'
  }
];

const ASPECT_RATIOS: { id: AspectRatioType; label: string; icon: React.FC<{ size?: number; className?: string }>; ratio: number | null }[] = [
  { id: 'free', label: 'Libre', icon: Maximize2, ratio: null },
  { id: '1:1', label: '1:1', icon: Square, ratio: 1 },
  { id: '4:5', label: '4:5', icon: Smartphone, ratio: 4 / 5 },
  { id: '9:16', label: '9:16', icon: Smartphone, ratio: 9 / 16 },
  { id: '16:9', label: '16:9', icon: Tv, ratio: 16 / 9 }
];

export const PhotoEditor: React.FC<PhotoEditorProps> = ({
  isOpen,
  file,
  onClose,
  onComplete
}) => {
  // Navigation & Active Tab
  const [activeTab, setActiveTab] = useState<EditorTab>('crop');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Original image reference & loading state
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [imageNaturalSize, setImageNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Transformations State
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [flipH, setFlipH] = useState<boolean>(false);
  const [cropRatio, setCropRatio] = useState<AspectRatioType>('free');
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [brightness, setBrightness] = useState<number>(100);
  const [contrastVal, setContrastVal] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('normal');

  // Creative Layers State
  const [drawStrokes, setDrawStrokes] = useState<DrawStroke[]>([]);
  const [drawColor, setDrawColor] = useState<DrawColor>('#ffffff');
  const [drawThickness, setDrawThickness] = useState<DrawThickness>('medium');
  const [drawMode, setDrawMode] = useState<DrawMode>('brush');

  const [blurStrokes, setBlurStrokes] = useState<BlurStroke[]>([]);
  const [blurIntensity, setBlurIntensity] = useState<BlurIntensity>('medium');
  const [blurBrushSize, setBlurBrushSize] = useState<BlurBrushSize>('medium');
  const [blurMode, setBlurMode] = useState<BlurMode>('blur');

  const [textItems, setTextItems] = useState<TextItem[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);

  // History Stack
  const [history, setHistory] = useState<EditorSnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isInternalHistoryChange = useRef<boolean>(false);

  // Modals & UI state
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [showClearDrawConfirm, setShowClearDrawConfirm] = useState<boolean>(false);
  const [showClearBlurConfirm, setShowClearBlurConfirm] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Canvas Stage & Layers References
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const stageBoxRef = useRef<HTMLDivElement>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const blurCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);

  // Responsive dimensions
  const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number }>({ width: 400, height: 400 });

  // In-progress painting / pan dragging refs
  const isPaintingRef = useRef<boolean>(false);
  const isBlurringRef = useRef<boolean>(false);
  const activeStrokePointsRef = useRef<{ x: number; y: number }[]>([]);
  const currentDrawStrokeRef = useRef<DrawStroke | null>(null);
  const currentBlurStrokeRef = useRef<BlurStroke | null>(null);

  // Pan dragging state in crop tab
  const isDraggingPanRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Draggable overlay item ref
  const draggingItemRef = useRef<{ id: string; type: 'text' | 'sticker'; startX: number; startY: number; itemStartX: number; itemStartY: number } | null>(null);

  // Filter string helper
  const getCombinedCssFilter = useCallback(() => {
    const filterObj = FILTERS.find((f) => f.id === selectedFilter) || FILTERS[0];
    const baseFilter = filterObj.cssFilter === 'none' ? '' : filterObj.cssFilter;
    const adjustFilter = `brightness(${brightness}%) contrast(${contrastVal}%) saturate(${saturation}%)`;
    return [baseFilter, adjustFilter].filter(Boolean).join(' ');
  }, [selectedFilter, brightness, contrastVal, saturation]);

  // Current snapshot helper
  const getCurrentSnapshot = useCallback((): EditorSnapshot => {
    return {
      rotation,
      flipH,
      cropRatio,
      zoom,
      pan: { ...pan },
      brightness,
      contrastVal,
      saturation,
      selectedFilter,
      drawStrokes: [...drawStrokes],
      blurStrokes: [...blurStrokes],
      textItems: [...textItems],
      stickers: [...stickers]
    };
  }, [
    rotation,
    flipH,
    cropRatio,
    zoom,
    pan,
    brightness,
    contrastVal,
    saturation,
    selectedFilter,
    drawStrokes,
    blurStrokes,
    textItems,
    stickers
  ]);

  const pushHistorySnapshot = useCallback(() => {
    if (isInternalHistoryChange.current) return;
    const snap = getCurrentSnapshot();
    setHistory((prev) => {
      const truncated = prev.slice(0, historyIndex + 1);
      return [...truncated, snap];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [getCurrentSnapshot, historyIndex]);

  // Reset helper
  const resetAllToDefault = useCallback(() => {
    setRotation(0);
    setFlipH(false);
    setCropRatio('free');
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setBrightness(100);
    setContrastVal(100);
    setSaturation(100);
    setSelectedFilter('normal');
    setDrawStrokes([]);
    setBlurStrokes([]);
    setTextItems([]);
    setStickers([]);
    setSelectedTextId(null);
    setSelectedStickerId(null);
    setErrorMessage(null);

    const initialSnapshot: EditorSnapshot = {
      rotation: 0,
      flipH: false,
      cropRatio: 'free',
      zoom: 1,
      pan: { x: 0, y: 0 },
      brightness: 100,
      contrastVal: 100,
      saturation: 100,
      selectedFilter: 'normal',
      drawStrokes: [],
      blurStrokes: [],
      textItems: [],
      stickers: []
    };

    setHistory([initialSnapshot]);
    setHistoryIndex(0);
  }, []);

  // Load image when file changes
  useEffect(() => {
    if (!file) {
      setImageUrl(null);
      originalImageRef.current = null;
      setImageLoaded(false);
      setImageNaturalSize({ width: 0, height: 0 });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setImageUrl(objectUrl);
    setErrorMessage(null);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        originalImageRef.current = img;
        setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
        setImageLoaded(true);
      } else {
        setErrorMessage("L'image sélectionnée possède des dimensions invalides.");
        setImageLoaded(false);
      }
    };
    img.onerror = () => {
      setErrorMessage("Impossible de charger l'image source.");
      setImageLoaded(false);
    };
    img.src = objectUrl;

    resetAllToDefault();

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file, resetAllToDefault]);

  // Monitor preview container size
  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setContainerDimensions({
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        });
      }
    };

    updateSize();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateSize();
      });
      resizeObserver.observe(container);
    }

    window.addEventListener('resize', updateSize);
    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Calculate layout dimensions
  const stageLayout = useMemo(() => {
    const origW = imageNaturalSize.width || 400;
    const origH = imageNaturalSize.height || 400;

    const isRotated90or270 = rotation === 90 || rotation === 270;
    const orientedW = isRotated90or270 ? origH : origW;
    const orientedH = isRotated90or270 ? origW : origH;
    const orientedAspect = orientedW / orientedH;

    const ratioObj = ASPECT_RATIOS.find((r) => r.id === cropRatio);
    const targetAspect = ratioObj?.ratio !== null && ratioObj?.ratio !== undefined ? ratioObj.ratio : orientedAspect;

    const maxAvailableW = Math.min(containerDimensions.width - 24, 480);
    const maxAvailableH = Math.min(containerDimensions.height - 24, 480);

    let displayW = maxAvailableW;
    let displayH = Math.round(displayW / targetAspect);

    if (displayH > maxAvailableH) {
      displayH = maxAvailableH;
      displayW = Math.round(displayH * targetAspect);
    }

    displayW = Math.max(120, displayW);
    displayH = Math.max(120, displayH);

    return {
      orientedW,
      orientedH,
      orientedAspect,
      targetAspect,
      displayW,
      displayH
    };
  }, [imageNaturalSize, rotation, cropRatio, containerDimensions]);

  // ----------------------------------------------------
  // RENDER CANVAS LAYERS
  // ----------------------------------------------------

  // 1. Render Base Transformed Image Canvas
  const renderBaseCanvas = useCallback(() => {
    const canvas = baseCanvasRef.current;
    const img = originalImageRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const origW = img.naturalWidth;
    const origH = img.naturalHeight;
    if (!origW || !origH || !img.complete) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const targetW = Math.max(1, Math.round(stageLayout.displayW * dpr));
    const targetH = Math.max(1, Math.round(stageLayout.displayH * dpr));

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    // Step 1: Reset transformation
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Step 2: Clear Canvas
    ctx.clearRect(0, 0, targetW, targetH);
    // Step 3: Save state
    ctx.save();

    try {
      const { orientedW, orientedH, targetAspect } = stageLayout;

      let cropW0 = orientedW;
      let cropH0 = orientedH;
      const currentOrientedAspect = orientedW / orientedH;

      if (currentOrientedAspect > targetAspect) {
        cropH0 = orientedH;
        cropW0 = orientedH * targetAspect;
      } else {
        cropW0 = orientedW;
        cropH0 = orientedW / targetAspect;
      }

      const effectiveCropW = Math.max(1, cropW0 / zoom);
      const effectiveCropH = Math.max(1, cropH0 / zoom);

      const panScale = orientedW / Math.max(stageLayout.displayW, 1);
      const panOffsetX = -pan.x * panScale;
      const panOffsetY = -pan.y * panScale;

      let cropX = (orientedW - effectiveCropW) / 2 + panOffsetX;
      let cropY = (orientedH - effectiveCropH) / 2 + panOffsetY;

      cropX = Math.max(0, Math.min(cropX, Math.max(0, orientedW - effectiveCropW)));
      cropY = Math.max(0, Math.min(cropY, Math.max(0, orientedH - effectiveCropH)));

      // Step 4: Apply filter safely
      const filterStr = getCombinedCssFilter();
      if (filterStr) {
        try {
          ctx.filter = filterStr;
        } catch {
          ctx.filter = 'none';
        }
      }

      // Step 5: Draw Image with Transform
      ctx.scale(targetW / effectiveCropW, targetH / effectiveCropH);
      ctx.translate(-cropX, -cropY);
      ctx.translate(orientedW / 2, orientedH / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      if (flipH) {
        ctx.scale(-1, 1);
      }
      ctx.drawImage(img, -origW / 2, -origH / 2, origW, origH);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[PhotoEditor] Erreur de rendu de base:', {
          canvasDims: { w: targetW, h: targetH },
          dpr,
          activeTab,
          error: err
        });
      }
    } finally {
      // Step 6: Reset filter, globalCompositeOperation and restore
      try {
        ctx.filter = 'none';
      } catch {}
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    }
  }, [stageLayout, rotation, flipH, zoom, pan, getCombinedCssFilter, imageLoaded, activeTab]);

  // 2. Render Drawing Canvas Layer
  const renderDrawCanvas = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const targetW = Math.max(1, Math.round(stageLayout.displayW * dpr));
    const targetH = Math.max(1, Math.round(stageLayout.displayH * dpr));

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, targetW, targetH);
    ctx.save();

    try {
      drawStrokes.forEach((stroke) => {
        if (!stroke.points || stroke.points.length === 0) return;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (stroke.mode === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = stroke.color;
        }

        const baseThickness = stroke.thickness === 'thin' ? 4 : stroke.thickness === 'medium' ? 8 : 16;
        const scaleFactor = targetW / 400;
        ctx.lineWidth = Math.max(1, baseThickness * scaleFactor);

        ctx.beginPath();
        const first = stroke.points[0];
        ctx.moveTo(first.x * targetW, first.y * targetH);

        if (stroke.points.length === 1) {
          ctx.lineTo(first.x * targetW + 0.1, first.y * targetH);
        } else {
          for (let i = 1; i < stroke.points.length; i++) {
            const pt = stroke.points[i];
            ctx.lineTo(pt.x * targetW, pt.y * targetH);
          }
        }
        ctx.stroke();
        ctx.restore();
      });
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[PhotoEditor] Erreur de rendu de dessin:', {
          canvasDims: { w: targetW, h: targetH },
          dpr,
          activeTab,
          error: err
        });
      }
    } finally {
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    }
  }, [drawStrokes, stageLayout.displayW, stageLayout.displayH, activeTab]);

  // 3. Render Blur Canvas Layer
  const renderBlurCanvas = useCallback(() => {
    const canvas = blurCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const targetW = Math.max(1, Math.round(stageLayout.displayW * dpr));
    const targetH = Math.max(1, Math.round(stageLayout.displayH * dpr));

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, targetW, targetH);

    if (blurStrokes.length === 0) return;

    ctx.save();
    try {
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = targetW;
      maskCanvas.height = targetH;
      const mCtx = maskCanvas.getContext('2d');

      if (mCtx) {
        blurStrokes.forEach((stroke) => {
          if (!stroke.points || stroke.points.length === 0) return;
          mCtx.save();
          mCtx.lineCap = 'round';
          mCtx.lineJoin = 'round';

          if (stroke.mode === 'eraser') {
            mCtx.globalCompositeOperation = 'destination-out';
          } else {
            mCtx.globalCompositeOperation = 'source-over';
          }

          const baseSize = stroke.size === 'small' ? 14 : stroke.size === 'medium' ? 28 : 50;
          const scaleFactor = targetW / 400;
          mCtx.lineWidth = Math.max(4, baseSize * scaleFactor);
          mCtx.strokeStyle = 'white';

          mCtx.beginPath();
          const first = stroke.points[0];
          mCtx.moveTo(first.x * targetW, first.y * targetH);
          for (let i = 1; i < stroke.points.length; i++) {
            mCtx.lineTo(stroke.points[i].x * targetW, stroke.points[i].y * targetH);
          }
          mCtx.stroke();
          mCtx.restore();
        });

        const baseCanvas = baseCanvasRef.current;
        if (baseCanvas && baseCanvas.width > 0 && baseCanvas.height > 0) {
          const blurredCanvas = document.createElement('canvas');
          blurredCanvas.width = targetW;
          blurredCanvas.height = targetH;
          const bCtx = blurredCanvas.getContext('2d');

          if (bCtx) {
            bCtx.save();
            bCtx.filter = 'blur(16px) saturate(85%)';
            bCtx.drawImage(baseCanvas, 0, 0, targetW, targetH);
            bCtx.restore();

            bCtx.globalCompositeOperation = 'destination-in';
            bCtx.drawImage(maskCanvas, 0, 0);

            ctx.drawImage(blurredCanvas, 0, 0);
          }
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[PhotoEditor] Erreur de rendu de flou:', {
          canvasDims: { w: targetW, h: targetH },
          dpr,
          activeTab,
          error: err
        });
      }
    } finally {
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    }
  }, [blurStrokes, stageLayout.displayW, stageLayout.displayH, activeTab]);

  // Synchronize layers when state changes
  useEffect(() => {
    renderBaseCanvas();
  }, [renderBaseCanvas]);

  useEffect(() => {
    renderDrawCanvas();
  }, [renderDrawCanvas]);

  useEffect(() => {
    renderBlurCanvas();
  }, [renderBlurCanvas]);

  // ----------------------------------------------------
  // DRAWING CANVAS POINTER HANDLERS
  // ----------------------------------------------------

  const handleDrawPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[PhotoEditor] setPointerCapture error on DrawCanvas:', err);
      }
    }

    const canvasX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const canvasY = (e.clientY - rect.top) * (canvas.height / rect.height);
    const normX = Math.max(0, Math.min(1, canvasX / canvas.width));
    const normY = Math.max(0, Math.min(1, canvasY / canvas.height));

    const startPoint = { x: normX, y: normY };
    isPaintingRef.current = true;
    activeStrokePointsRef.current = [startPoint];

    const newStroke: DrawStroke = {
      id: `draw_${Date.now()}_${Math.random()}`,
      points: [startPoint],
      color: drawColor,
      thickness: drawThickness,
      mode: drawMode
    };
    currentDrawStrokeRef.current = newStroke;
    setDrawStrokes((prev) => [...prev, newStroke]);
  };

  const handleDrawPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPaintingRef.current || !currentDrawStrokeRef.current) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const canvasX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const canvasY = (e.clientY - rect.top) * (canvas.height / rect.height);
    const normX = Math.max(0, Math.min(1, canvasX / canvas.width));
    const normY = Math.max(0, Math.min(1, canvasY / canvas.height));

    const newPoint = { x: normX, y: normY };
    activeStrokePointsRef.current.push(newPoint);
    currentDrawStrokeRef.current.points.push(newPoint);

    setDrawStrokes((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      next[next.length - 1] = {
        ...currentDrawStrokeRef.current!,
        points: [...activeStrokePointsRef.current]
      };
      return next;
    });
  };

  const handleDrawPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPaintingRef.current) return;
    isPaintingRef.current = false;
    activeStrokePointsRef.current = [];
    currentDrawStrokeRef.current = null;

    const canvas = drawCanvasRef.current;
    if (canvas) {
      try {
        if (canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
      } catch {}
    }

    pushHistorySnapshot();
  };

  // ----------------------------------------------------
  // BLUR CANVAS POINTER HANDLERS
  // ----------------------------------------------------

  const handleBlurPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const canvas = blurCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[PhotoEditor] setPointerCapture error on BlurCanvas:', err);
      }
    }

    const canvasX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const canvasY = (e.clientY - rect.top) * (canvas.height / rect.height);
    const normX = Math.max(0, Math.min(1, canvasX / canvas.width));
    const normY = Math.max(0, Math.min(1, canvasY / canvas.height));

    const startPoint = { x: normX, y: normY };
    isBlurringRef.current = true;
    activeStrokePointsRef.current = [startPoint];

    const newStroke: BlurStroke = {
      id: `blur_${Date.now()}_${Math.random()}`,
      points: [startPoint],
      intensity: blurIntensity,
      size: blurBrushSize,
      mode: blurMode
    };
    currentBlurStrokeRef.current = newStroke;
    setBlurStrokes((prev) => [...prev, newStroke]);
  };

  const handleBlurPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isBlurringRef.current || !currentBlurStrokeRef.current) return;
    const canvas = blurCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const canvasX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const canvasY = (e.clientY - rect.top) * (canvas.height / rect.height);
    const normX = Math.max(0, Math.min(1, canvasX / canvas.width));
    const normY = Math.max(0, Math.min(1, canvasY / canvas.height));

    const newPoint = { x: normX, y: normY };
    activeStrokePointsRef.current.push(newPoint);
    currentBlurStrokeRef.current.points.push(newPoint);

    setBlurStrokes((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      next[next.length - 1] = {
        ...currentBlurStrokeRef.current!,
        points: [...activeStrokePointsRef.current]
      };
      return next;
    });
  };

  const handleBlurPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isBlurringRef.current) return;
    isBlurringRef.current = false;
    activeStrokePointsRef.current = [];
    currentBlurStrokeRef.current = null;

    const canvas = blurCanvasRef.current;
    if (canvas) {
      try {
        if (canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
      } catch {}
    }

    pushHistorySnapshot();
  };

  // ----------------------------------------------------
  // PANNING HANDLERS IN CROP MODE
  // ----------------------------------------------------

  const handleCropPanPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTab !== 'crop' || (zoom <= 1 && cropRatio === 'free')) return;
    isDraggingPanRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleCropPanPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingPanRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy
    });
  };

  const handleCropPanPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingPanRef.current) return;
    isDraggingPanRef.current = false;
    try {
      if ((e.target as HTMLElement).hasPointerCapture(e.pointerId)) {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      }
    } catch {}
    pushHistorySnapshot();
  };

  // ----------------------------------------------------
  // UNDO / REDO / ROTATE / FLIP
  // ----------------------------------------------------

  const handleUndo = () => {
    if (historyIndex <= 0) return;
    const targetIndex = historyIndex - 1;
    const snap = history[targetIndex];
    if (!snap) return;

    isInternalHistoryChange.current = true;
    setRotation(snap.rotation);
    setFlipH(snap.flipH);
    setCropRatio(snap.cropRatio);
    setZoom(snap.zoom);
    setPan(snap.pan);
    setBrightness(snap.brightness);
    setContrastVal(snap.contrastVal);
    setSaturation(snap.saturation);
    setSelectedFilter(snap.selectedFilter);
    setDrawStrokes(snap.drawStrokes);
    setBlurStrokes(snap.blurStrokes);
    setTextItems(snap.textItems);
    setStickers(snap.stickers);
    setHistoryIndex(targetIndex);
    setTimeout(() => {
      isInternalHistoryChange.current = false;
    }, 50);
  };

  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return;
    const targetIndex = historyIndex + 1;
    const snap = history[targetIndex];
    if (!snap) return;

    isInternalHistoryChange.current = true;
    setRotation(snap.rotation);
    setFlipH(snap.flipH);
    setCropRatio(snap.cropRatio);
    setZoom(snap.zoom);
    setPan(snap.pan);
    setBrightness(snap.brightness);
    setContrastVal(snap.contrastVal);
    setSaturation(snap.saturation);
    setSelectedFilter(snap.selectedFilter);
    setDrawStrokes(snap.drawStrokes);
    setBlurStrokes(snap.blurStrokes);
    setTextItems(snap.textItems);
    setStickers(snap.stickers);
    setHistoryIndex(targetIndex);
    setTimeout(() => {
      isInternalHistoryChange.current = false;
    }, 50);
  };

  const handleRotateCw = () => {
    setRotation((prev) => (prev + 90) % 360);
    setTimeout(pushHistorySnapshot, 20);
  };

  const handleRotateCcw = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
    setTimeout(pushHistorySnapshot, 20);
  };

  const handleToggleFlip = () => {
    setFlipH((prev) => !prev);
    setTimeout(pushHistorySnapshot, 20);
  };

  // ----------------------------------------------------
  // TEXT & STICKER HANDLERS
  // ----------------------------------------------------

  const handleItemPointerDown = (
    e: React.PointerEvent,
    id: string,
    type: 'text' | 'sticker'
  ) => {
    e.stopPropagation();
    if (type === 'text') {
      setSelectedTextId(id);
      setSelectedStickerId(null);
      const item = textItems.find((t) => t.id === id);
      if (item) {
        draggingItemRef.current = {
          id,
          type,
          startX: e.clientX,
          startY: e.clientY,
          itemStartX: item.x,
          itemStartY: item.y
        };
      }
    } else {
      setSelectedStickerId(id);
      setSelectedTextId(null);
      const item = stickers.find((s) => s.id === id);
      if (item) {
        draggingItemRef.current = {
          id,
          type,
          startX: e.clientX,
          startY: e.clientY,
          itemStartX: item.x,
          itemStartY: item.y
        };
      }
    }
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleItemPointerMove = (e: React.PointerEvent) => {
    if (!draggingItemRef.current || !stageBoxRef.current) return;
    const rect = stageBoxRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dxPercent = ((e.clientX - draggingItemRef.current.startX) / rect.width) * 100;
    const dyPercent = ((e.clientY - draggingItemRef.current.startY) / rect.height) * 100;

    const newX = Math.max(5, Math.min(95, draggingItemRef.current.itemStartX + dxPercent));
    const newY = Math.max(5, Math.min(95, draggingItemRef.current.itemStartY + dyPercent));

    if (draggingItemRef.current.type === 'text') {
      setTextItems((prev) =>
        prev.map((t) => (t.id === draggingItemRef.current!.id ? { ...t, x: newX, y: newY } : t))
      );
    } else {
      setStickers((prev) =>
        prev.map((s) => (s.id === draggingItemRef.current!.id ? { ...s, x: newX, y: newY } : s))
      );
    }
  };

  const handleItemPointerUp = (e: React.PointerEvent) => {
    if (draggingItemRef.current) {
      draggingItemRef.current = null;
      try {
        if ((e.target as HTMLElement).hasPointerCapture(e.pointerId)) {
          (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        }
      } catch {}
      pushHistorySnapshot();
    }
  };

  const handleAddText = (text: string, color: TextColor, size: TextSize, hasBackground: boolean) => {
    if (textItems.length >= 10) return;
    const newItem: TextItem = {
      id: `text_${Date.now()}_${Math.random()}`,
      text,
      x: 50,
      y: 50,
      color,
      size,
      hasBackground,
      rotation: 0
    };
    setTextItems((prev) => [...prev, newItem]);
    setSelectedTextId(newItem.id);
    setTimeout(pushHistorySnapshot, 20);
  };

  const handleDeleteText = (id: string) => {
    setTextItems((prev) => prev.filter((t) => t.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
    setTimeout(pushHistorySnapshot, 20);
  };

  const handleAddSticker = (type: StickerType, content: string) => {
    if (stickers.length >= 20) return;
    const newItem: StickerItem = {
      id: `sticker_${Date.now()}_${Math.random()}`,
      type,
      content,
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0
    };
    setStickers((prev) => [...prev, newItem]);
    setSelectedStickerId(newItem.id);
    setTimeout(pushHistorySnapshot, 20);
  };

  const handleDeleteSticker = (id: string) => {
    setStickers((prev) => prev.filter((s) => s.id !== id));
    if (selectedStickerId === id) setSelectedStickerId(null);
    setTimeout(pushHistorySnapshot, 20);
  };

  const handleModifyStickerScale = (id: string, delta: number) => {
    setStickers((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, scale: Math.max(0.5, Math.min(2.5, s.scale + delta)) } : s
      )
    );
    setTimeout(pushHistorySnapshot, 20);
  };

  const handleModifyStickerRotation = (id: string, deltaDeg: number) => {
    setStickers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, rotation: (s.rotation + deltaDeg + 360) % 360 } : s))
    );
    setTimeout(pushHistorySnapshot, 20);
  };

  // ----------------------------------------------------
  // HIGH-RES WEBP EXPORT PIPELINE
  // ----------------------------------------------------

  const handleValidateAndExport = async () => {
    const img = originalImageRef.current;
    if (!file || !img || !imageLoaded) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const origW = img.naturalWidth;
      const origH = img.naturalHeight;

      if (!origW || !origH || !img.complete) {
        throw new Error("Dimensions de l'image source introuvables.");
      }

      const isRotated90or270 = rotation === 90 || rotation === 270;
      const orientedW = isRotated90or270 ? origH : origW;
      const orientedH = isRotated90or270 ? origW : origH;

      const targetAspect = stageLayout.targetAspect;
      let cropW0 = orientedW;
      let cropH0 = orientedH;
      const currentOrientedAspect = orientedW / orientedH;

      if (currentOrientedAspect > targetAspect) {
        cropH0 = orientedH;
        cropW0 = orientedH * targetAspect;
      } else {
        cropW0 = orientedW;
        cropH0 = orientedW / targetAspect;
      }

      const effectiveCropW = Math.max(1, cropW0 / zoom);
      const effectiveCropH = Math.max(1, cropH0 / zoom);

      const panScale = orientedW / Math.max(stageLayout.displayW, 1);
      const panOffsetX = -pan.x * panScale;
      const panOffsetY = -pan.y * panScale;

      let cropX = (orientedW - effectiveCropW) / 2 + panOffsetX;
      let cropY = (orientedH - effectiveCropH) / 2 + panOffsetY;

      cropX = Math.max(0, Math.min(cropX, Math.max(0, orientedW - effectiveCropW)));
      cropY = Math.max(0, Math.min(cropY, Math.max(0, orientedH - effectiveCropH)));

      const MAX_EXPORT_DIM = 1920;
      let outW = Math.round(effectiveCropW);
      let outH = Math.round(effectiveCropH);

      if (outW > MAX_EXPORT_DIM || outH > MAX_EXPORT_DIM) {
        if (outW > outH) {
          outH = Math.round((outH * MAX_EXPORT_DIM) / outW);
          outW = MAX_EXPORT_DIM;
        } else {
          outW = Math.round((outW * MAX_EXPORT_DIM) / outH);
          outH = MAX_EXPORT_DIM;
        }
      }

      outW = Math.max(1, outW);
      outH = Math.max(1, outH);

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = outW;
      exportCanvas.height = outH;
      const expCtx = exportCanvas.getContext('2d');
      if (!expCtx) throw new Error("Échec d'initialisation du rendu Canvas final.");

      // 1. Draw Base Filtered Transformed Image
      expCtx.setTransform(1, 0, 0, 1, 0, 0);
      expCtx.clearRect(0, 0, outW, outH);
      expCtx.save();

      const combinedFilter = getCombinedCssFilter();
      if (combinedFilter) {
        try {
          expCtx.filter = combinedFilter;
        } catch {
          expCtx.filter = 'none';
        }
      }

      expCtx.scale(outW / effectiveCropW, outH / effectiveCropH);
      expCtx.translate(-cropX, -cropY);
      expCtx.translate(orientedW / 2, orientedH / 2);
      expCtx.rotate((rotation * Math.PI) / 180);
      if (flipH) {
        expCtx.scale(-1, 1);
      }
      expCtx.drawImage(img, -origW / 2, -origH / 2, origW, origH);
      expCtx.restore();

      try {
        expCtx.filter = 'none';
      } catch {}
      expCtx.setTransform(1, 0, 0, 1, 0, 0);

      // 2. Draw Localized Blur Layer
      if (blurStrokes.length > 0) {
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = outW;
        maskCanvas.height = outH;
        const mCtx = maskCanvas.getContext('2d');

        if (mCtx) {
          blurStrokes.forEach((stroke) => {
            if (!stroke.points || stroke.points.length === 0) return;
            mCtx.save();
            mCtx.lineCap = 'round';
            mCtx.lineJoin = 'round';

            if (stroke.mode === 'eraser') {
              mCtx.globalCompositeOperation = 'destination-out';
            } else {
              mCtx.globalCompositeOperation = 'source-over';
            }

            const sizeMultiplier = outW / 400;
            const baseSize = stroke.size === 'small' ? 14 : stroke.size === 'medium' ? 28 : 50;
            mCtx.lineWidth = Math.max(4, baseSize * sizeMultiplier);
            mCtx.strokeStyle = 'white';

            mCtx.beginPath();
            const first = stroke.points[0];
            mCtx.moveTo(first.x * outW, first.y * outH);
            for (let i = 1; i < stroke.points.length; i++) {
              mCtx.lineTo(stroke.points[i].x * outW, stroke.points[i].y * outH);
            }
            mCtx.stroke();
            mCtx.restore();
          });

          const blurCopy = document.createElement('canvas');
          blurCopy.width = outW;
          blurCopy.height = outH;
          const bcCtx = blurCopy.getContext('2d');
          if (bcCtx) {
            bcCtx.filter = 'blur(28px) saturate(85%)';
            bcCtx.drawImage(exportCanvas, 0, 0);

            bcCtx.globalCompositeOperation = 'destination-in';
            bcCtx.drawImage(maskCanvas, 0, 0);

            expCtx.drawImage(blurCopy, 0, 0);
          }
        }
      }

      // 3. Draw Free Drawing Strokes
      if (drawStrokes.length > 0) {
        const drawLayer = document.createElement('canvas');
        drawLayer.width = outW;
        drawLayer.height = outH;
        const dCtx = drawLayer.getContext('2d');

        if (dCtx) {
          drawStrokes.forEach((stroke) => {
            if (!stroke.points || stroke.points.length === 0) return;
            dCtx.save();
            dCtx.lineCap = 'round';
            dCtx.lineJoin = 'round';

            if (stroke.mode === 'eraser') {
              dCtx.globalCompositeOperation = 'destination-out';
              dCtx.strokeStyle = 'rgba(0,0,0,1)';
            } else {
              dCtx.globalCompositeOperation = 'source-over';
              dCtx.strokeStyle = stroke.color;
            }

            const sizeMultiplier = outW / 400;
            const baseThickness = stroke.thickness === 'thin' ? 4 : stroke.thickness === 'medium' ? 8 : 16;
            dCtx.lineWidth = Math.max(1, baseThickness * sizeMultiplier);

            dCtx.beginPath();
            const first = stroke.points[0];
            dCtx.moveTo(first.x * outW, first.y * outH);
            for (let i = 1; i < stroke.points.length; i++) {
              dCtx.lineTo(stroke.points[i].x * outW, stroke.points[i].y * outH);
            }
            if (stroke.points.length === 1) {
              dCtx.lineTo(first.x * outW + 0.1, first.y * outH);
            }
            dCtx.stroke();
            dCtx.restore();
          });

          expCtx.drawImage(drawLayer, 0, 0);
        }
      }

      // 4. Draw Stickers
      stickers.forEach((sticker) => {
        expCtx.save();
        const posX = (sticker.x / 100) * outW;
        const posY = (sticker.y / 100) * outH;
        expCtx.translate(posX, posY);
        if (sticker.rotation) {
          expCtx.rotate((sticker.rotation * Math.PI) / 180);
        }

        const baseScale = (outW / 400) * sticker.scale;

        if (sticker.type === 'emoji') {
          const fontSize = Math.round(42 * baseScale);
          expCtx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
          expCtx.textAlign = 'center';
          expCtx.textBaseline = 'middle';
          expCtx.fillText(sticker.content, 0, 0);
        } else {
          const fontSize = Math.round(18 * baseScale);
          expCtx.font = `bold ${fontSize}px sans-serif`;
          expCtx.textAlign = 'center';
          expCtx.textBaseline = 'middle';

          const textMetrics = expCtx.measureText(sticker.content);
          const paddingX = 16 * baseScale;
          const paddingY = 8 * baseScale;
          const badgeW = textMetrics.width + paddingX * 2;
          const badgeH = fontSize + paddingY * 2;
          const radius = badgeH / 2;

          expCtx.fillStyle = 'rgba(24, 17, 53, 0.92)';
          expCtx.strokeStyle = 'rgba(162, 155, 254, 0.8)';
          expCtx.lineWidth = 2 * baseScale;

          expCtx.beginPath();
          expCtx.roundRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH, radius);
          expCtx.fill();
          expCtx.stroke();

          expCtx.fillStyle = '#ffffff';
          expCtx.fillText(sticker.content, 0, 1);
        }
        expCtx.restore();
      });

      // 5. Draw Text Items
      textItems.forEach((item) => {
        expCtx.save();
        const posX = (item.x / 100) * outW;
        const posY = (item.y / 100) * outH;
        expCtx.translate(posX, posY);

        const baseScale = outW / 400;
        const fontPx = item.size === 'small' ? 18 : item.size === 'medium' ? 26 : 38;
        const scaledFont = Math.round(fontPx * baseScale);

        expCtx.font = `bold ${scaledFont}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        expCtx.textAlign = 'center';
        expCtx.textBaseline = 'middle';

        const lines = item.text.split('\n');
        const lineHeight = scaledFont * 1.3;
        const totalHeight = lines.length * lineHeight;

        if (item.hasBackground) {
          let maxLineWidth = 0;
          lines.forEach((l) => {
            const w = expCtx.measureText(l).width;
            if (w > maxLineWidth) maxLineWidth = w;
          });

          const padX = 14 * baseScale;
          const padY = 8 * baseScale;
          const pillW = maxLineWidth + padX * 2;
          const pillH = totalHeight + padY * 2;

          expCtx.fillStyle = 'rgba(15, 12, 32, 0.78)';
          expCtx.beginPath();
          expCtx.roundRect(-pillW / 2, -pillH / 2, pillW, pillH, 12 * baseScale);
          expCtx.fill();
        } else {
          expCtx.shadowColor = 'rgba(0,0,0,0.85)';
          expCtx.shadowBlur = 6 * baseScale;
          expCtx.shadowOffsetX = 0;
          expCtx.shadowOffsetY = 2 * baseScale;
        }

        expCtx.fillStyle = item.color;
        lines.forEach((line, idx) => {
          const lineY = -totalHeight / 2 + (idx + 0.5) * lineHeight;
          expCtx.fillText(line, 0, lineY);
        });

        expCtx.restore();
      });

      // Step 4: Export to WebP
      const blob = await new Promise<Blob | null>((resolve) => {
        exportCanvas.toBlob(
          (b) => {
            if (b) {
              resolve(b);
            } else {
              exportCanvas.toBlob((fallbackBlob) => resolve(fallbackBlob), 'image/jpeg', 0.85);
            }
          },
          'image/webp',
          0.85
        );
      });

      if (!blob) {
        throw new Error("L'exportation de la photo a échoué.");
      }

      const ext = blob.type.includes('webp') ? 'webp' : 'jpg';
      const cleanFileName = `mikayala_edited_${Date.now()}.${ext}`;
      const finalEditedFile = new File([blob], cleanFileName, {
        type: blob.type || 'image/webp',
        lastModified: Date.now()
      });

      onComplete(finalEditedFile);
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[PhotoEditor] Erreur export final:', err);
      }
      setErrorMessage(err?.message || "Une erreur est survenue lors de l'édition de la photo.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !file || !imageUrl) return null;

  return (
    <div
      id="mikayala-photo-editor"
      className="fixed inset-0 z-50 bg-[#0a0716] text-white flex flex-col justify-between select-none overflow-hidden animate-in fade-in duration-200"
    >
      {/* Header */}
      <header className="h-14 px-2 sm:px-4 bg-[#130d2a]/95 border-b border-[#2d2254]/80 flex items-center justify-between z-30 shrink-0 backdrop-blur-md">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 rounded-xl text-[#a29bfe] hover:text-white hover:bg-[#201642] transition-colors disabled:opacity-50 cursor-pointer"
            title="Annuler"
            aria-label="Annuler et fermer l'éditeur photo"
          >
            <X size={20} />
          </button>

          {/* Undo / Redo */}
          <div className="flex items-center gap-1 bg-[#1e153d] p-0.5 rounded-xl border border-[#2d2254]">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0 || isProcessing}
              className="p-1.5 rounded-lg text-[#a29bfe] hover:text-white hover:bg-[#281c52] transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              title="Annuler la dernière action"
              aria-label="Annuler la dernière action"
            >
              <Undo2 size={16} />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1 || isProcessing}
              className="p-1.5 rounded-lg text-[#a29bfe] hover:text-white hover:bg-[#281c52] transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              title="Rétablir l'action"
              aria-label="Rétablir l'action"
            >
              <Redo2 size={16} />
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="font-bold text-xs sm:text-sm tracking-wide bg-gradient-to-r from-white via-[#a29bfe] to-[#fd79a8] bg-clip-text text-transparent">
          Éditeur Photo
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            disabled={isProcessing}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg text-[#a29bfe] hover:text-white hover:bg-[#201642] border border-[#2d2254] transition-colors disabled:opacity-50 cursor-pointer"
            title="Réinitialiser toutes les modifications"
            aria-label="Réinitialiser toutes les modifications"
          >
            <ResetIcon size={14} />
            <span className="hidden md:inline">Réinitialiser</span>
          </button>

          <button
            type="button"
            onClick={handleValidateAndExport}
            disabled={isProcessing}
            className="flex items-center gap-1.5 text-xs font-bold px-3 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#00b894] to-[#55efc4] text-[#0f0c20] hover:brightness-110 active:scale-95 shadow-md shadow-[#00b894]/20 transition-all disabled:opacity-50 cursor-pointer"
            title="Valider et continuer"
            aria-label="Valider les modifications et continuer"
          >
            {isProcessing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Traitement…</span>
              </>
            ) : (
              <>
                <Check size={16} className="stroke-[3]" />
                <span>Valider</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Interactive Stage Area */}
      <main
        ref={previewContainerRef}
        className="flex-1 relative overflow-hidden bg-[#07050f] flex items-center justify-center p-2 sm:p-4 select-none"
        onClick={() => {
          setSelectedTextId(null);
          setSelectedStickerId(null);
        }}
      >
        {/* Error notification */}
        {errorMessage && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-[#ff7675]/90 border border-[#ff7675] text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xl backdrop-blur-md animate-in fade-in">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Stage Container */}
        <div
          ref={stageBoxRef}
          className={`relative overflow-hidden rounded-2xl border-2 transition-colors select-none ${
            activeTab === 'crop'
              ? 'border-[#00b894] shadow-[0_0_25px_rgba(0,184,148,0.25)]'
              : activeTab === 'draw'
              ? 'border-[#6c5ce7] shadow-[0_0_25px_rgba(108,92,231,0.25)]'
              : activeTab === 'blur'
              ? 'border-[#00cec9] shadow-[0_0_25px_rgba(0,206,201,0.25)]'
              : 'border-[#2d2254]'
          }`}
          style={{
            width: `${stageLayout.displayW}px`,
            height: `${stageLayout.displayH}px`
          }}
        >
          {/* Layer 1: Base Image Canvas */}
          <canvas
            ref={baseCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none block z-0"
            style={{ width: '100%', height: '100%' }}
          />

          {/* Layer 2: Local Blur Canvas */}
          <canvas
            ref={blurCanvasRef}
            className="absolute inset-0 w-full h-full block z-10"
            style={{
              width: '100%',
              height: '100%',
              touchAction: activeTab === 'blur' ? 'none' : 'auto',
              pointerEvents: activeTab === 'blur' ? 'auto' : 'none',
              cursor: activeTab === 'blur' ? 'crosshair' : 'default'
            }}
            onPointerDown={handleBlurPointerDown}
            onPointerMove={handleBlurPointerMove}
            onPointerUp={handleBlurPointerUp}
            onPointerCancel={handleBlurPointerUp}
          />

          {/* Layer 3: Free Drawing Canvas */}
          <canvas
            ref={drawCanvasRef}
            className="absolute inset-0 w-full h-full block z-20"
            style={{
              width: '100%',
              height: '100%',
              touchAction: activeTab === 'draw' ? 'none' : 'auto',
              pointerEvents: activeTab === 'draw' ? 'auto' : 'none',
              cursor: activeTab === 'draw' ? (drawMode === 'eraser' ? 'cell' : 'crosshair') : 'default'
            }}
            onPointerDown={handleDrawPointerDown}
            onPointerMove={handleDrawPointerMove}
            onPointerUp={handleDrawPointerUp}
            onPointerCancel={handleDrawPointerUp}
          />

          {/* Crop Mode Pan Layer */}
          {activeTab === 'crop' && (
            <div
              className={`absolute inset-0 z-25 ${
                zoom > 1 || cropRatio !== 'free' ? 'cursor-grab active:cursor-grabbing touch-none' : 'pointer-events-none'
              }`}
              onPointerDown={handleCropPanPointerDown}
              onPointerMove={handleCropPanPointerMove}
              onPointerUp={handleCropPanPointerUp}
              onPointerCancel={handleCropPanPointerUp}
            >
              {/* Rule of thirds grid */}
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-40">
                <div className="border-r border-b border-white/40" />
                <div className="border-r border-b border-white/40" />
                <div className="border-b border-white/40" />
                <div className="border-r border-b border-white/40" />
                <div className="border-r border-b border-white/40" />
                <div className="border-b border-white/40" />
                <div className="border-r border-b border-white/40" />
                <div className="border-r border-b border-white/40" />
                <div className="" />
              </div>
            </div>
          )}

          {/* Layer 4: Interactive Stickers */}
          {stickers.map((sticker) => {
            const isSelected = selectedStickerId === sticker.id;
            return (
              <div
                key={sticker.id}
                onPointerDown={(e) => handleItemPointerDown(e, sticker.id, 'sticker')}
                onPointerMove={handleItemPointerMove}
                onPointerUp={handleItemPointerUp}
                onPointerCancel={handleItemPointerUp}
                className="absolute z-30 -translate-x-1/2 -translate-y-1/2 touch-none cursor-move select-none"
                style={{
                  left: `${sticker.x}%`,
                  top: `${sticker.y}%`,
                  transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg) scale(${sticker.scale})`
                }}
              >
                <div
                  className={`relative p-1 rounded-xl transition-all ${
                    isSelected
                      ? 'ring-2 ring-[#fd79a8] ring-offset-2 ring-offset-black/50 shadow-xl'
                      : ''
                  }`}
                >
                  {sticker.type === 'emoji' ? (
                    <span className="text-3xl sm:text-4xl block select-none pointer-events-none">
                      {sticker.content}
                    </span>
                  ) : (
                    <div className="px-3 py-1.5 rounded-full bg-[#181135]/95 border border-[#a29bfe]/80 text-white font-bold text-xs shadow-lg whitespace-nowrap">
                      {sticker.content}
                    </div>
                  )}

                  {/* Actions on selection */}
                  {isSelected && (
                    <div
                      className="absolute -top-7 -right-7 flex items-center gap-1 bg-[#130d2a] border border-[#2d2254] p-1 rounded-xl shadow-2xl z-40"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleModifyStickerScale(sticker.id, -0.2)}
                        className="p-1 rounded-md text-[#a29bfe] hover:text-white hover:bg-[#201642] cursor-pointer"
                        title="Réduire"
                        aria-label="Réduire"
                      >
                        <ZoomOut size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleModifyStickerScale(sticker.id, 0.2)}
                        className="p-1 rounded-md text-[#a29bfe] hover:text-white hover:bg-[#201642] cursor-pointer"
                        title="Agrandir"
                        aria-label="Agrandir"
                      >
                        <ZoomIn size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleModifyStickerRotation(sticker.id, 45)}
                        className="p-1 rounded-md text-[#00cec9] hover:text-white hover:bg-[#201642] cursor-pointer"
                        title="Pivoter 45°"
                        aria-label="Pivoter 45 degrés"
                      >
                        <RotateCw size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSticker(sticker.id)}
                        className="p-1 rounded-md text-[#ff7675] hover:text-white hover:bg-[#ff7675] cursor-pointer"
                        title="Supprimer"
                        aria-label="Supprimer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Layer 5: Interactive Text Items */}
          {textItems.map((item) => {
            const isSelected = selectedTextId === item.id;
            const fontClass =
              item.size === 'small'
                ? 'text-sm font-semibold'
                : item.size === 'medium'
                ? 'text-lg font-bold'
                : 'text-2xl font-black';

            return (
              <div
                key={item.id}
                onPointerDown={(e) => handleItemPointerDown(e, item.id, 'text')}
                onPointerMove={handleItemPointerMove}
                onPointerUp={handleItemPointerUp}
                onPointerCancel={handleItemPointerUp}
                className="absolute z-35 -translate-x-1/2 -translate-y-1/2 touch-none cursor-move select-none max-w-[85%]"
                style={{
                  left: `${item.x}%`,
                  top: `${item.y}%`
                }}
              >
                <div
                  className={`relative transition-all ${
                    item.hasBackground
                      ? 'px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-xs'
                      : 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]'
                  } ${
                    isSelected
                      ? 'ring-2 ring-[#00b894] ring-offset-2 ring-offset-black/50 shadow-2xl'
                      : ''
                  }`}
                >
                  <p
                    className={`${fontClass} whitespace-pre-wrap break-words text-center leading-tight`}
                    style={{ color: item.color }}
                  >
                    {item.text}
                  </p>

                  {isSelected && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteText(item.id);
                      }}
                      className="absolute -top-3 -right-3 p-1 rounded-full bg-[#ff7675] text-white shadow-lg hover:scale-110 transition-transform cursor-pointer"
                      title="Supprimer le texte"
                      aria-label="Supprimer le texte"
                    >
                      <X size={12} className="stroke-[3]" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Processing Spinner Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-[#090616]/85 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-50 text-center p-4">
            <Loader2 size={36} className="animate-spin text-[#00b894]" />
            <div className="space-y-1">
              <p className="font-bold text-sm text-white">Rendu haute résolution…</p>
              <p className="text-xs text-[#a29bfe]">Application des filtres, calques et compression WebP</p>
            </div>
          </div>
        )}
      </main>

      {/* Control Drawer / Panel */}
      <section className="bg-[#130d2a] border-t border-[#2d2254] px-3 sm:px-4 py-2.5 shrink-0 min-h-[108px] flex flex-col justify-center">
        {/* Tab 1: Crop */}
        {activeTab === 'crop' && (
          <div className="space-y-2.5 max-w-lg mx-auto">
            <div className="flex items-center justify-between text-xs text-[#a29bfe] font-medium">
              <span>Ratio de recadrage</span>
              <div className="flex items-center gap-2">
                <ZoomOut
                  size={14}
                  className="cursor-pointer hover:text-white"
                  onClick={() => setZoom((z) => Math.max(1, Number((z - 0.2).toFixed(1))))}
                />
                <span className="text-[11px] font-mono">{Math.round(zoom * 100)}%</span>
                <ZoomIn
                  size={14}
                  className="cursor-pointer hover:text-white"
                  onClick={() => setZoom((z) => Math.min(3, Number((z + 0.2).toFixed(1))))}
                />
              </div>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {ASPECT_RATIOS.map((item) => {
                const IconComp = item.icon;
                const isSelected = cropRatio === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setCropRatio(item.id);
                      setPan({ x: 0, y: 0 });
                      setTimeout(pushHistorySnapshot, 20);
                    }}
                    className={`py-1.5 sm:py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#00b894] text-[#0f0c20] font-bold shadow-md shadow-[#00b894]/20'
                        : 'bg-[#1e153d] text-[#a29bfe] hover:text-white hover:bg-[#281c52]'
                    }`}
                  >
                    <IconComp size={16} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Transformations */}
        {activeTab === 'transform' && (
          <div className="flex items-center justify-center gap-3 max-w-md mx-auto py-1">
            <button
              type="button"
              onClick={handleRotateCcw}
              className="flex-1 py-2.5 px-3 rounded-xl bg-[#1e153d] hover:bg-[#281c52] text-[#a29bfe] hover:text-white border border-[#2d2254] flex items-center justify-center gap-2 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw size={16} className="text-[#a29bfe]" />
              <span>-90°</span>
            </button>

            <button
              type="button"
              onClick={handleRotateCw}
              className="flex-1 py-2.5 px-3 rounded-xl bg-[#1e153d] hover:bg-[#281c52] text-[#a29bfe] hover:text-white border border-[#2d2254] flex items-center justify-center gap-2 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCw size={16} className="text-[#00b894]" />
              <span>+90°</span>
            </button>

            <button
              type="button"
              onClick={handleToggleFlip}
              className={`flex-1 py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-colors cursor-pointer ${
                flipH
                  ? 'bg-[#6c5ce7] text-white border-[#a29bfe]'
                  : 'bg-[#1e153d] hover:bg-[#281c52] text-[#a29bfe] hover:text-white border-[#2d2254]'
              }`}
            >
              <FlipHorizontal size={16} />
              <span>Miroir</span>
            </button>
          </div>
        )}

        {/* Tab 3: Adjustments */}
        {activeTab === 'adjust' && (
          <div className="space-y-2 max-w-md mx-auto">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-[#a29bfe]">
                <span className="flex items-center gap-1.5">
                  <Sun size={13} className="text-[#fdcb6e]" />
                  Luminosité
                </span>
                <span className="font-mono text-[10px]">{brightness}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="160"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                onPointerUp={pushHistorySnapshot}
                className="w-full accent-[#00b894] h-1.5 bg-[#201642] rounded-lg cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-[#a29bfe]">
                <span className="flex items-center gap-1.5">
                  <Contrast size={13} className="text-[#00cec9]" />
                  Contraste
                </span>
                <span className="font-mono text-[10px]">{contrastVal}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="160"
                value={contrastVal}
                onChange={(e) => setContrastVal(Number(e.target.value))}
                onPointerUp={pushHistorySnapshot}
                className="w-full accent-[#00b894] h-1.5 bg-[#201642] rounded-lg cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-[#a29bfe]">
                <span className="flex items-center gap-1.5">
                  <Palette size={13} className="text-[#fd79a8]" />
                  Saturation
                </span>
                <span className="font-mono text-[10px]">{saturation}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={saturation}
                onChange={(e) => setSaturation(Number(e.target.value))}
                onPointerUp={pushHistorySnapshot}
                className="w-full accent-[#00b894] h-1.5 bg-[#201642] rounded-lg cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Tab 4: Filters */}
        {activeTab === 'filters' && (
          <div className="grid grid-cols-4 gap-2 max-w-lg mx-auto">
            {FILTERS.map((f) => {
              const isSelected = selectedFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setSelectedFilter(f.id);
                    setTimeout(pushHistorySnapshot, 20);
                  }}
                  className={`p-2 rounded-xl flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#201642] border-[#00b894] shadow-md shadow-[#00b894]/20'
                      : 'bg-[#181135] border-[#2d2254] hover:border-[#6c5ce7]'
                  }`}
                >
                  <div
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden border border-white/20 bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${imageUrl})`,
                      filter: f.cssFilter
                    }}
                  />
                  <span className={`text-[11px] truncate ${isSelected ? 'text-[#00b894] font-bold' : 'text-[#a29bfe]'}`}>
                    {f.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Tab 5: Drawing Tool */}
        {activeTab === 'draw' && (
          <DrawingTool
            currentColor={drawColor}
            onColorChange={setDrawColor}
            currentThickness={drawThickness}
            onThicknessChange={setDrawThickness}
            currentMode={drawMode}
            onModeChange={setDrawMode}
            onClearAll={() => setShowClearDrawConfirm(true)}
            hasDrawings={drawStrokes.length > 0}
          />
        )}

        {/* Tab 6: Local Blur Tool */}
        {activeTab === 'blur' && (
          <BlurTool
            currentIntensity={blurIntensity}
            onIntensityChange={setBlurIntensity}
            currentBrushSize={blurBrushSize}
            onBrushSizeChange={setBlurBrushSize}
            currentMode={blurMode}
            onModeChange={setBlurMode}
            onClearAll={() => setShowClearBlurConfirm(true)}
            hasBlur={blurStrokes.length > 0}
          />
        )}

        {/* Tab 7: Text Tool */}
        {activeTab === 'text' && (
          <TextTool
            onAddText={handleAddText}
            textItemsCount={textItems.length}
            maxCount={10}
          />
        )}

        {/* Tab 8: Sticker Tool */}
        {activeTab === 'stickers' && (
          <StickerTool
            onAddSticker={handleAddSticker}
            stickersCount={stickers.length}
            maxCount={20}
          />
        )}
      </section>

      {/* Bottom Navigation Tabs */}
      <nav className="h-16 px-1.5 sm:px-3 bg-[#0d091e] border-t border-[#201642] flex items-center justify-between sm:justify-around overflow-x-auto no-scrollbar z-30 shrink-0 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('crop')}
          className={`flex flex-col items-center justify-center gap-1 min-w-[52px] py-1 text-[11px] sm:text-xs transition-colors cursor-pointer shrink-0 ${
            activeTab === 'crop' ? 'text-[#00b894] font-bold' : 'text-[#a29bfe]/70 hover:text-white'
          }`}
          aria-label="Outil Recadrer"
        >
          <CropIcon size={17} />
          <span>Recadrer</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('transform')}
          className={`flex flex-col items-center justify-center gap-1 min-w-[52px] py-1 text-[11px] sm:text-xs transition-colors cursor-pointer shrink-0 ${
            activeTab === 'transform' ? 'text-[#00b894] font-bold' : 'text-[#a29bfe]/70 hover:text-white'
          }`}
          aria-label="Outil Pivoter"
        >
          <Rotate3d size={17} />
          <span>Pivoter</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('adjust')}
          className={`flex flex-col items-center justify-center gap-1 min-w-[52px] py-1 text-[11px] sm:text-xs transition-colors cursor-pointer shrink-0 ${
            activeTab === 'adjust' ? 'text-[#00b894] font-bold' : 'text-[#a29bfe]/70 hover:text-white'
          }`}
          aria-label="Outil Ajuster"
        >
          <Sliders size={17} />
          <span>Ajuster</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('filters')}
          className={`flex flex-col items-center justify-center gap-1 min-w-[52px] py-1 text-[11px] sm:text-xs transition-colors cursor-pointer shrink-0 ${
            activeTab === 'filters' ? 'text-[#00b894] font-bold' : 'text-[#a29bfe]/70 hover:text-white'
          }`}
          aria-label="Outil Filtres"
        >
          <Sparkles size={17} />
          <span>Filtres</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('draw')}
          className={`flex flex-col items-center justify-center gap-1 min-w-[52px] py-1 text-[11px] sm:text-xs transition-colors cursor-pointer shrink-0 ${
            activeTab === 'draw' ? 'text-[#00b894] font-bold' : 'text-[#a29bfe]/70 hover:text-white'
          }`}
          aria-label="Outil Dessiner"
        >
          <Paintbrush size={17} />
          <span>Dessin</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('blur')}
          className={`flex flex-col items-center justify-center gap-1 min-w-[52px] py-1 text-[11px] sm:text-xs transition-colors cursor-pointer shrink-0 ${
            activeTab === 'blur' ? 'text-[#00b894] font-bold' : 'text-[#a29bfe]/70 hover:text-white'
          }`}
          aria-label="Outil Flou local"
        >
          <EyeOff size={17} />
          <span>Flou</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('text')}
          className={`flex flex-col items-center justify-center gap-1 min-w-[52px] py-1 text-[11px] sm:text-xs transition-colors cursor-pointer shrink-0 ${
            activeTab === 'text' ? 'text-[#00b894] font-bold' : 'text-[#a29bfe]/70 hover:text-white'
          }`}
          aria-label="Outil Texte"
        >
          <Type size={17} />
          <span>Texte</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('stickers')}
          className={`flex flex-col items-center justify-center gap-1 min-w-[52px] py-1 text-[11px] sm:text-xs transition-colors cursor-pointer shrink-0 ${
            activeTab === 'stickers' ? 'text-[#00b894] font-bold' : 'text-[#a29bfe]/70 hover:text-white'
          }`}
          aria-label="Outil Stickers"
        >
          <Heart size={17} />
          <span>Stickers</span>
        </button>
      </nav>

      {/* Confirmation Modal: Reset All */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            className="w-full max-w-xs bg-[#181135] border border-[#2d2254] rounded-2xl p-4 text-center space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-[#ff7675]/20 text-[#ff7675] flex items-center justify-center mx-auto">
              <ResetIcon size={20} />
            </div>
            <h3 className="font-bold text-sm text-white">Réinitialiser la photo ?</h3>
            <p className="text-xs text-[#a29bfe]">
              Supprimer toutes les modifications (recadrage, dessin, flou, texte, stickers) de cette photo ?
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="py-2 rounded-xl bg-[#201642] text-[#a29bfe] hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  resetAllToDefault();
                  setShowResetConfirm(false);
                }}
                className="py-2 rounded-xl bg-[#ff7675] text-white text-xs font-bold shadow-md hover:bg-[#d63031] transition-colors cursor-pointer"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Clear Drawing */}
      {showClearDrawConfirm && (
        <div
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowClearDrawConfirm(false)}
        >
          <div
            className="w-full max-w-xs bg-[#181135] border border-[#2d2254] rounded-2xl p-4 text-center space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-[#e17055]/20 text-[#e17055] flex items-center justify-center mx-auto">
              <Trash2 size={20} />
            </div>
            <h3 className="font-bold text-sm text-white">Effacer le dessin ?</h3>
            <p className="text-xs text-[#a29bfe]">
              Tout le tracé libre sera supprimé de cette photo.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowClearDrawConfirm(false)}
                className="py-2 rounded-xl bg-[#201642] text-[#a29bfe] hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setDrawStrokes([]);
                  setShowClearDrawConfirm(false);
                  setTimeout(pushHistorySnapshot, 20);
                }}
                className="py-2 rounded-xl bg-[#e17055] text-white text-xs font-bold shadow-md hover:bg-[#d63031] transition-colors cursor-pointer"
              >
                Effacer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Clear Blur */}
      {showClearBlurConfirm && (
        <div
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowClearBlurConfirm(false)}
        >
          <div
            className="w-full max-w-xs bg-[#181135] border border-[#2d2254] rounded-2xl p-4 text-center space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-[#00cec9]/20 text-[#00cec9] flex items-center justify-center mx-auto">
              <Trash2 size={20} />
            </div>
            <h3 className="font-bold text-sm text-white">Effacer le flou ?</h3>
            <p className="text-xs text-[#a29bfe]">
              Toutes les zones floutées seront supprimées.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowClearBlurConfirm(false)}
                className="py-2 rounded-xl bg-[#201642] text-[#a29bfe] hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setBlurStrokes([]);
                  setShowClearBlurConfirm(false);
                  setTimeout(pushHistorySnapshot, 20);
                }}
                className="py-2 rounded-xl bg-[#00cec9] text-[#0f0c20] text-xs font-bold shadow-md hover:brightness-110 transition-colors cursor-pointer"
              >
                Effacer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoEditor;
