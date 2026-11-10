import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n';
import { registerSW } from 'virtual:pwa-register';
import { installAuthRefresh } from './lib/installAuthRefresh';
import { bootHeroShown } from './lib/bootHero';

// Refresh expired 15-minute access tokens transparently (before any request runs).
installAuthRefresh();

// Register the PWA service worker in prompt mode so an update never reloads the
// page while a user is filling a form. App.tsx surfaces the update action.
if ('serviceWorker' in navigator) {
  // An update found right after launch — before the user has typed or tapped
  // anything — is applied immediately: nothing can be lost yet, and otherwise
  // the waiting worker only activates once every tab is closed, which on iOS
  // can take days. After the first interaction we fall back to the prompt.
  const bootedAt = Date.now();
  let userHasInteracted = false;
  const markInteracted = () => { userHasInteracted = true; };
  window.addEventListener('pointerdown', markInteracted, { once: true, capture: true });
  window.addEventListener('keydown', markInteracted, { once: true, capture: true });
  // Never reload mid-flow: the OAuth callback consumes a one-time ticket and the
  // password pages carry one-time tokens in the URL.
  const isOneTimeFlowPage = /^\/(auth\/callback|forgot-password|reset-password)\/?$/.test(window.location.pathname);
  const isSafeToAutoApply = () => !isOneTimeFlowPage && !userHasInteracted && Date.now() - bootedAt < 15_000;

  const updateSW = registerSW({
    onNeedRefresh() {
      if (isSafeToAutoApply()) {
        void updateSW(true).catch(() => {
          window.dispatchEvent(new CustomEvent('pwa-update-available'));
        });
        return;
      }
      window.dispatchEvent(new CustomEvent('pwa-update-available'));
    },
    onOfflineReady() {
      // PWA ready for offline use.
    },
    // Browsers only re-check sw.js on a full navigation, and iOS keeps tabs and
    // home-screen apps alive for days without one — users stayed on old builds
    // long after a deploy. Re-check whenever the app returns to the foreground,
    // and hourly while it stays open.
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      const checkForUpdate = () => {
        if (!navigator.onLine) return;
        void registration.update().catch(() => {
          // Offline or transient network error: try again on the next trigger.
        });
      };
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate();
      });
      window.setInterval(checkForUpdate, 60 * 60 * 1000);
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

const mount = () => createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// index.html's static hero is the LCP element only if it is actually presented
// on screen before React replaces it. On a fast connection the bundle is ready
// before the first frame is shown (a rAF is not enough: Chrome presented the
// first frame ~50ms after it), so React swapped it out unseen and LCP waited
// for the bundle again. Mount once the browser reports the hero's LCP entry;
// `buffered` delivers it at once if it already painted (the usual case on a
// slow network). Browsers without LCP (Safari) don't measure it, so mount at
// once there. The timer covers tabs that never paint (background, prerender).
const lcpSupported =
  typeof PerformanceObserver !== 'undefined' &&
  (PerformanceObserver.supportedEntryTypes ?? []).includes('largest-contentful-paint');

if (bootHeroShown && lcpSupported) {
  let mounted = false;
  const observer = new PerformanceObserver((list) => {
    if (list.getEntries().some((entry) => (entry as PerformanceEntry & { element?: Element | null }).element?.closest('#boot-hero'))) {
      mountOnce();
    }
  });
  const timer = window.setTimeout(() => mountOnce(), 300);
  function mountOnce() {
    if (mounted) return;
    mounted = true;
    observer.disconnect();
    window.clearTimeout(timer);
    mount();
  }
  observer.observe({ type: 'largest-contentful-paint', buffered: true });
} else {
  mount();
}
