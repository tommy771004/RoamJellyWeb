import { refreshAppSession } from '../features/auth/authClient';
import { createAuthRefreshingFetch } from './authRefresh';
import { getStoredToken, setClientAccessToken } from './workflowApi';

/** Wraps window.fetch so expired access tokens are refreshed and the request replayed. See authRefresh.ts. */
export function installAuthRefresh(): void {
  if (typeof window === 'undefined' || (window.fetch as any).__roamjellyAuthRefresh) return;

  const baseFetch = window.fetch.bind(window);
  const locks = (navigator as Navigator & { locks?: LockManager }).locks;

  const wrapped = createAuthRefreshingFetch({
    baseFetch,
    origin: window.location.origin,
    getToken: getStoredToken,
    withLock: locks
      ? <T,>(fn: () => Promise<T>) => locks.request('roamjelly-auth-refresh', fn) as Promise<T>
      : undefined,
    refresh: async () => {
      const session = await refreshAppSession();
      const token = session?.accessToken || session?.access_token;
      if (!token) return null;
      setClientAccessToken(token);
      try {
        window.localStorage.setItem('last_activity', Date.now().toString());
      } catch {
        // Storage unavailable: the new token still works for this tab.
      }
      return token;
    },
  });
  (wrapped as any).__roamjellyAuthRefresh = true;
  window.fetch = wrapped;
}
