import React from 'react';

export type AspectRatioType = 'free' | '1:1' | '4:5' | '9:16' | '16:9';
export type FilterType = 'normal' | 'bw' | 'warm' | 'cool';
export type EditorTab = 'crop' | 'transform' | 'adjust' | 'filters' | 'draw' | 'blur' | 'text' | 'stickers';

export type TextColor = '#ffffff' | '#000000' | '#ff4757' | '#fd79a8' | '#00cec9' | '#ffeaa7';
export type TextSize = 'small' | 'medium' | 'large';

export interface TextItem {
  id: string;
  text: string;
  x: number; // percentage (0 to 100) or pixel relative to crop box
  y: number;
  color: TextColor;
  size: TextSize;
  hasBackground: boolean;
  rotation: number;
}

export type StickerType = 'emoji' | 'label';

export interface StickerItem {
  id: string;
  type: StickerType;
  content: string;
  x: number; // percentage (0 to 100) or pixel relative to crop box
  y: number;
  scale: number;
  rotation: number;
}

export type DrawColor = '#ffffff' | '#000000' | '#ff4757' | '#fd79a8' | '#00cec9' | '#ffeaa7' | '#a29bfe';
export type DrawThickness = 'thin' | 'medium' | 'thick';
export type DrawMode = 'brush' | 'eraser';

export interface DrawPoint {
  x: number;
  y: number;
}

export interface DrawStroke {
  id: string;
  points: DrawPoint[];
  color: DrawColor;
  thickness: DrawThickness;
  mode: DrawMode;
}

export type BlurIntensity = 'light' | 'medium' | 'strong';
export type BlurBrushSize = 'small' | 'medium' | 'large';
export type BlurMode = 'blur' | 'eraser';

export interface BlurPoint {
  x: number;
  y: number;
}

export interface BlurStroke {
  id: string;
  points: BlurPoint[];
  intensity: BlurIntensity;
  size: BlurBrushSize;
  mode: BlurMode;
}

export interface EditorSnapshot {
  rotation: number;
  flipH: boolean;
  cropRatio: AspectRatioType;
  zoom: number;
  pan: { x: number; y: number };
  brightness: number;
  contrastVal: number;
  saturation: number;
  selectedFilter: FilterType;
  drawStrokes: DrawStroke[];
  blurStrokes: BlurStroke[];
  textItems: TextItem[];
  stickers: StickerItem[];
}
