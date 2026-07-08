import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker.
// autoUpdate mode: the SW calls skipWaiting() internally; workbox-window sends a
// SKIP_WAITING message and waits for acknowledgement. If the page reloads before
// the acknowledgement arrives Chrome logs "message channel closed" — catch it here
// so it doesn't surface as an unhandled promise rejection.
if ('serviceWorker' in navigator) {
  registerSW({
    onNeedRefresh() {
      // New version available; autoUpdate reloads automatically — nothing to do.
    },
    onOfflineReady() {
      // PWA ready for offline use.
    },
    onRegisterError(error) {
      // Log but do not rethrow — a failed SW registration must not break the app.
      console.warn('[PWA] Service worker registration failed:', error);
    },
  });
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
