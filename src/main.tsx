import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Polyfill pour ResizeObserver sur Android 7/8
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  import('resize-observer-polyfill').then((module) => {
    (window as any).ResizeObserver = module.default;
  });
}

// Polyfill minimal pour crypto.randomUUID sur Android 7/8
if (typeof window !== 'undefined') {
  if (!window.crypto) {
    (window as any).crypto = {} as any;
  }
  if (!window.crypto.randomUUID) {
    window.crypto.randomUUID = () => {
      return (([1e7] as any) + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c: any) =>
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
      );
    };
  }
}

// Register Service Worker for PWA (Production & PWA install without destructive reload loops)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Only register in production or standalone PWA mode to avoid dev server interference
    if (import.meta.env.PROD || window.matchMedia('(display-mode: standalone)').matches) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((reg) => {
          console.log('[SW] Service Worker registered cleanly:', reg.scope);
        })
        .catch((err) => {
          console.warn('[SW] Service Worker registration skipped/failed:', err);
        });
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
