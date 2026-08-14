import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n';
import { registerSW } from 'virtual:pwa-register';

// Register the PWA service worker in prompt mode so an update never reloads the
// page while a user is filling a form. App.tsx surfaces the update action.
if ('serviceWorker' in navigator) {
  const updateSW = registerSW({
    onNeedRefresh() {
      window.dispatchEvent(new CustomEvent('pwa-update-available'));
    },
    onOfflineReady() {
      // PWA ready for offline use.
    },
    onRegisterError(error) {
      // Log but do not rethrow — a failed SW registration must not break the app.
      console.warn('[PWA] Service worker registration failed:', error);
    },
  });

  window.addEventListener('pwa-apply-update', () => {
    void updateSW(true).catch((error) => {
      console.warn('[PWA] Failed to apply service worker update:', error);
    });
  });
}

// iOS (Safari + the WKWebView the native app wraps us in) only delivers `:active`
// to elements while a touch listener exists somewhere on the document. Without
// this no-op listener every `ios-press` / `active:` press state in the app is
// silently dead on iOS — taps land with zero visual feedback. Passive so it
// never blocks scrolling.
document.addEventListener('touchstart', () => {}, { passive: true });

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
