import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Polyfill pour ResizeObserver sur Android 7/8
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  import('resize-observer-polyfill').then((module) => {
    (window as any).ResizeObserver = module.default;
  });
}

// Polyfill minimal pour crypto.randomUUID sur Android 7/8
if (typeof crypto !== 'undefined' && !crypto.randomUUID) {
  crypto.randomUUID = () => {
    return (([1e7] as any) + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c: any) =>
      (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
    );
  };
}

// Register Service Worker for PWA with update detection
const updateSW = registerSW({
  onNeedRefresh() {
    // Dispatch custom event for app update
    window.dispatchEvent(new CustomEvent('mikayala_app_update_available'));
  },
  onOfflineReady() {
    console.log('App is ready for offline use');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
