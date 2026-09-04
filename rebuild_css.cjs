const fs = require('fs');

const originalCss = `@import "tailwindcss";

@layer base {
  :root {
    /* MIKAYLA DEFAULT THEME: Emerald Night */
    --mk-bg: #0e0b1c;
    --mk-surface: #130f26;
    --mk-surface-elevated: #171230;
    --mk-accent: #00b894;
    --mk-accent-light: #55efc4;
    --mk-accent-hover: #00a884;
    --mk-text-primary: #f1f2f6;
    --mk-text-secondary: #a29bfe;
    
    /* System & Mood Colors */
    --mk-heart-pink: #fd79a8;
    --mk-heart-red: #ff7675;
    --mk-warning: #fdcb6e;
    
    /* Dynamic Chat Bubbles */
    --mk-bubble-sent-bg: #00b894;
    --mk-bubble-sent-text: #130f26;
    --mk-bubble-recv-bg: #1c1538;
    --mk-bubble-recv-text: #f1f2f6;

    /* Typographic Variables */
    --mk-title-font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Plus Jakarta Sans", Roboto, sans-serif;
    --mk-body-font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Plus Jakarta Sans", Roboto, sans-serif;
    --mk-msg-font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Plus Jakarta Sans", Roboto, sans-serif;
    --mk-bubble-radius: 16px;
  }

  /* LIGHT THEME ROOT VARIABLES & UNIFIED SURFACE SYSTEM */
  :root.light,
  :root[data-theme-mode="light"] {
    color-scheme: light;
    --mikayala-bg: #f8fafc;
    --mikayala-surface: #ffffff;
    --mikayala-accent: #00b894;
    --mikayala-accent-light: #10b981;
    --mikayala-violet: #6c5ce7;
    --mikayala-rose: #f43f5e;
  }

  :root.light body,
  :root[data-theme-mode="light"] body {
    background-color: #f1f5f9;
    color: #0f172a;
  }

  /* Light mode scrollbar */
  :root.light ::-webkit-scrollbar-thumb,
  :root[data-theme-mode="light"] ::-webkit-scrollbar-thumb {
    background: rgba(100, 116, 139, 0.25);
  }
  :root.light ::-webkit-scrollbar-thumb:hover,
  :root[data-theme-mode="light"] ::-webkit-scrollbar-thumb:hover {
    background: rgba(100, 116, 139, 0.45);
  }

__LIGHT_OVERRIDES__

  body {
    background-color: #0e0b1c;
    color: #f1f2f6;
    font-family: -apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
    padding-top: env(safe-area-inset-top, 0px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
    padding-left: env(safe-area-inset-left, 0px);
    padding-right: env(safe-area-inset-right, 0px);
  }

  @media (prefers-reduced-motion: reduce) {
    *, ::before, ::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  /* Custom Mikayla Dark Scrollbar */
  ::-webkit-scrollbar {
    width: 5px;
    height: 5px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: rgba(108, 92, 231, 0.25);
    border-radius: 9999px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 184, 148, 0.45);
  }
}

/* Mikayla Intimate Starry & Radial Pattern (Dark Doodle) */
.mikayala-chat-bg,
.wallpaper-doodle-dark {
  background-image: 
    radial-gradient(rgba(108, 92, 231, 0.35) 1.5px, transparent 1.5px),
    radial-gradient(rgba(0, 184, 148, 0.3) 1.5px, transparent 1.5px);
  background-size: 24px 24px;
  background-position: 0 0, 12px 12px;
}

/* Light WhatsApp Doodle */
.wallpaper-doodle-light {
  background-color: #e5ddd5;
  background-image: 
    radial-gradient(rgba(0, 0, 0, 0.15) 1.5px, transparent 1.5px),
    radial-gradient(rgba(0, 92, 75, 0.14) 1.5px, transparent 1.5px);
  background-size: 24px 24px;
  background-position: 0 0, 12px 12px;
}

/* Romantic & Dark Gradients */
.wallpaper-gradient-neon {
  background: radial-gradient(circle at 10% 20%, rgba(168, 85, 247, 0.25) 0%, transparent 50%),
              radial-gradient(circle at 90% 80%, rgba(6, 182, 212, 0.22) 0%, transparent 50%),
              #0d081e;
}
.wallpaper-gradient-rose {
  background: radial-gradient(circle at 80% 20%, rgba(253, 121, 168, 0.28) 0%, transparent 50%),
              radial-gradient(circle at 20% 85%, rgba(232, 67, 147, 0.22) 0%, transparent 50%),
              #1d0e1c;
}
.wallpaper-gradient-emerald {
  background: radial-gradient(circle at 50% 15%, rgba(16, 185, 129, 0.22) 0%, transparent 55%),
              radial-gradient(circle at 50% 85%, rgba(6, 78, 59, 0.35) 0%, transparent 60%),
              #0a1413;
}
.wallpaper-gradient-slate {
  background: radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.22) 0%, transparent 50%),
              radial-gradient(circle at 80% 70%, rgba(56, 189, 248, 0.18) 0%, transparent 50%),
              #0b1120;
}

/* Bubble Shape Styles */
.bubble-shape-comic-sent {
  position: relative;
}
.bubble-shape-comic-sent::after {
  content: '';
  position: absolute;
  top: 8px;
  right: -8px;
  width: 0;
  height: 0;
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
  border-left: 8px solid var(--mk-bubble-sent-bg);
}

.bubble-shape-comic-recv {
  position: relative;
}
.bubble-shape-comic-recv::after {
  content: '';
  position: absolute;
  top: 8px;
  left: -8px;
  width: 0;
  height: 0;
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
  border-right: 8px solid var(--mk-bubble-recv-bg);
}

/* Frosted Privacy Blur Effect */
.privacy-blur-active {
  filter: blur(24px) brightness(0.6);
  pointer-events: none;
  transition: filter 0.2s ease-out;
}

/* Pulsing Heartbeat Keyframes */
@keyframes heart-thump {
  0% {
    transform: scale(1);
    filter: drop-shadow(0 0 10px rgba(253, 121, 168, 0.6));
  }
  14% {
    transform: scale(1.3);
    filter: drop-shadow(0 0 35px rgba(253, 121, 168, 0.95)) drop-shadow(0 0 60px rgba(0, 184, 148, 0.8));
  }
  28% {
    transform: scale(1.1);
    filter: drop-shadow(0 0 15px rgba(253, 121, 168, 0.7));
  }
  42% {
    transform: scale(1.38);
    filter: drop-shadow(0 0 45px rgba(253, 121, 168, 1)) drop-shadow(0 0 75px rgba(0, 184, 148, 0.9));
  }
  70% {
    transform: scale(1);
    filter: drop-shadow(0 0 10px rgba(253, 121, 168, 0.5));
  }
  100% {
    transform: scale(1);
    filter: drop-shadow(0 0 10px rgba(253, 121, 168, 0.5));
  }
}

.animate-heart-thump {
  animation: heart-thump 1.4s infinite ease-in-out;
}

/* Soft ambient glow */
@keyframes ambient-glow {
  0%, 100% {
    opacity: 0.35;
  }
  50% {
    opacity: 0.75;
  }
}
.animate-ambient-glow {
  animation: ambient-glow 4s infinite ease-in-out;
}

/* Recording Pulse */
@keyframes pulse-record {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.12);
    opacity: 0.75;
  }
}
.animate-pulse-record {
  animation: pulse-record 1.2s infinite ease-in-out;
}

/* ==========================================================================
   LOW-END DEVICE & MOBILE PERFORMANCE OPTIMIZATIONS
   ========================================================================== */

/* Fast touch scrolling and overscroll behavior */
.overflow-y-auto,
.overflow-x-auto,
.overflow-auto {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
}

/* GPU hardware acceleration and isolation for chat bubbles */
.message-bubble {
  transform: translateZ(0);
  backface-visibility: hidden;
  contain: layout style;
}

/* Skip layout calculation of off-screen message cards for buttery 60fps scrolling */
.message-item-container {
  content-visibility: auto;
  contain-intrinsic-size: 0 54px;
}

/* Relieve low-end GPU fill-rate on mobile screens */
@media (max-width: 768px) {
  .backdrop-blur-2xl,
  .backdrop-blur-xl {
    backdrop-filter: blur(8px) !important;
    -webkit-backdrop-filter: blur(8px) !important;
  }
}
`;

const overrides = fs.readFileSync('light_overrides.css', 'utf8');
const finalCss = originalCss.replace('__LIGHT_OVERRIDES__', overrides);
fs.writeFileSync('src/index.css', finalCss);
