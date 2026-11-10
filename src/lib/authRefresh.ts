/**
 * Keeps signed-in sessions alive past the 15-minute access token.
 *
 * Signed-in users get a 15-minute access token plus an httpOnly refresh cookie
 * (`/api/auth/session/refresh`). Without this, every API call returned 401 once
 * the access token expired, until the page was reloaded. Components attach the
 * Bearer token themselves in many places, so the fix sits on `fetch`: a 401 from
 * our own API is answered by refreshing the session once and replaying the
 * request with the new token.
 *
 * The refresh token is single-use and the server revokes the whole session if
 * an old one is presented again, so concurrent refreshes must not race:
 * - within a tab, all 401s share one refresh;
 * - across tabs, the refresh runs under a Web Lock, so a second tab waits and
 *   then sends the already-rotated cookie instead of the consumed one.
 *   (The page-load restore in App.tsx refreshes outside this lock, so a tab
 *   opened at the exact moment another tab refreshes can still collide.)
 */

type FetchFn = typeof fetch;

export type AuthRefreshDeps = {
  baseFetch: FetchFn;
  getToken: () => string | null;
  /** Exchanges the refresh cookie for a new access token; null when that is not possible. */
  refresh: () => Promise<string | null>;
  /** Runs `fn` exclusively across tabs when the browser supports it. */
  withLock?: <T>(fn: () => Promise<T>) => Promise<T>;
  origin?: string;
};

function requestUrl(input: RequestInfo | URL, origin: string): URL | null {
  try {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    return new URL(raw, origin);
  } catch {
    return null;
  }
}

function bearerOf(input: RequestInfo | URL, init?: RequestInit): string | null {
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  const value = headers.get('Authorization');
  return value?.startsWith('Bearer ') ? value.slice('Bearer '.length).trim() || null : null;
}

const REFRESH_PATH = '/api/auth/session/refresh';

/**
 * True for our own API. Login/guest calls carry no Bearer token and are skipped
 * before this; the refresh endpoint itself is excluded so a failed refresh
 * cannot trigger another refresh.
 */
function isRefreshableApiCall(url: URL | null, origin: string): boolean {
  return Boolean(url && url.origin === origin && url.pathname.startsWith('/api/') && url.pathname !== REFRESH_PATH);
}

export function createAuthRefreshingFetch(deps: AuthRefreshDeps): FetchFn {
  const origin = deps.origin ?? 'http://localhost';
  const withLock = deps.withLock ?? (<T,>(fn: () => Promise<T>) => fn());
  let inFlight: Promise<string | null> | null = null;

  /** New token for a request that was sent with `staleToken`, or null. */
  const freshToken = (staleToken: string): Promise<string | null> => {
    const current = deps.getToken();
    if (current && current !== staleToken) return Promise.resolve(current); // already refreshed
    if (!inFlight) {
      inFlight = withLock(async () => {
        // Another tab may have refreshed while we waited for the lock; our
        // token is per-tab, so we still need our own exchange — the cookie the
        // browser sends now is the rotated one.
        const latest = deps.getToken();
        if (latest && latest !== staleToken) return latest;
        return deps.refresh();
      })
        .catch(() => null)
        .finally(() => { inFlight = null; });
    }
    return inFlight;
  };

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await deps.baseFetch(input, init);
    if (response.status !== 401) return response;

    const url = requestUrl(input, origin);
    const sentToken = bearerOf(input, init);
    if (!sentToken || !isRefreshableApiCall(url, origin)) return response;
    // A Request object's body can be read only once; replay only what we can rebuild.
    if (input instanceof Request && input.body !== null && !init?.body) return response;

    const token = await freshToken(sentToken);
    if (!token || token === sentToken) return response;

    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    headers.set('Authorization', `Bearer ${token}`);
    return deps.baseFetch(input, { ...init, headers });
  };
}
