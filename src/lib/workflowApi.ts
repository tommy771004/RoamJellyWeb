import type {
  AiPreferenceProfile,
  FetchItineraryOptions,
  SearchItem,
  TrackClickOutBody,
  UserPreferencesResponse,
} from '../types/workflow';

export class SearchTimeoutError extends Error {}
export class SearchServiceUnavailableError extends Error {}

const ACCESS_TOKEN_KEY = 'access_token';
const USER_ID_KEY = 'user_id';
const LAST_ACTIVITY_KEY = 'last_activity';

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

async function parseApiError(res: Response, fallback: string): Promise<Error> {
  try {
    const data = await res.json();
    const message = String(data?.message ?? fallback).trim() || fallback;
    return new Error(message);
  } catch {
    return new Error(fallback);
  }
}

export async function geocodeSpot(title: string, city = ''): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(title);
    const c = encodeURIComponent(city);
    const url = `/api/geocode?q=${q}&city=${c}`;
    const token = getStoredToken();
    const apiRes = await fetch(url, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
    });
    if (!apiRes.ok) return null;
    const data = await apiRes.json();
    if (data && typeof data.lat === 'number' && typeof data.lng === 'number') {
      return { lat: data.lat, lng: data.lng };
    }
  } catch {
    return null;
  }
  return null;
}

export async function getDealsFeed({ query = '' }: { query?: string } = {}) {
  try {
    const token = getStoredToken();
    if (!token) return [];
    const url = query ? `/api/deals/feed?q=${encodeURIComponent(query)}` : '/api/deals/feed';
    const res = await fetch(url, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
    });
    if (!res.ok) {
      throw await parseApiError(res, 'Failed to fetch deals feed');
    }
    const data = await res.json();
    return data.data || [];
  } catch (err) {
    console.error('getDealsFeed error:', err);
    return [];
  }
}

export async function getDestinationAlerts() {
  try {
    const token = getStoredToken();
    if (!token) return [];
    const res = await fetch('/api/destinations/alerts', {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
    });
    if (!res.ok) {
      throw await parseApiError(res, 'Failed to fetch destination alerts');
    }
    const data = await res.json();
    return data.data || [];
  } catch (err) {
    console.error('getDestinationAlerts error:', err);
    return [];
  }
}

export async function geocodeSpotWithAI(title: string, destination: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const token = getStoredToken();
    const response = await fetch('/api/generate/geocode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ title, destination }),
    });
    if (!response.ok) return null;
    const body = await response.json();
    if (body.status === 'success' && body.data) {
      const { lat, lng } = body.data;
      if (typeof lat === 'number' && typeof lng === 'number') {
        return { lat, lng };
      }
    }
  } catch (err) {
    console.error('AI Geocoding error:', err);
  }
  return null;
}

export async function fetchDirections(lng1: number, lat1: number, lng2: number, lat2: number): Promise<number | null> {
  try {
    const coords = encodeURIComponent(`${lng1},${lat1};${lng2},${lat2}`);
    const url = `/api/directions?coords=${coords}`;
    const token = getStoredToken();
    const apiRes = await fetch(url, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
    });
    if (!apiRes.ok) return null;
    const data = await apiRes.json();
    if (data && typeof data.duration === 'number') {
      return data.duration;
    }
  } catch {
    return null;
  }
  return null;
}

export function getNativeMapUrl(lat: number, lng: number, title: string, isIOS: boolean): string {
  const q = title ? encodeURIComponent(title) : `${lat},${lng}`;
  if (isIOS) {
    return `maps://?q=${q}&ll=${lat},${lng}`;
  } else {
    const query = title ? encodeURIComponent(title) : `${lat},${lng}`;
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }
}

export function openNativeMap(lat: number, lng: number, title?: string) {
  window.dispatchEvent(new CustomEvent('open-map', { detail: { lat, lng, title: title || '' } }));
}

export function getStoredToken(): string | null {
  const sessionStorage = getSessionStorage();
  const localStorage = getLocalStorage();

  const sessionToken = sessionStorage?.getItem(ACCESS_TOKEN_KEY)?.trim();
  if (sessionToken) return sessionToken;

  const legacyToken = localStorage?.getItem(ACCESS_TOKEN_KEY)?.trim();
  if (legacyToken) {
    sessionStorage?.setItem(ACCESS_TOKEN_KEY, legacyToken);
    localStorage?.removeItem(ACCESS_TOKEN_KEY);
    return legacyToken;
  }

  return null;
}

export async function createGuestSession(displayName?: string): Promise<{ token: string; user_id: string }> {
  const res = await fetch('/api/auth/guest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_name: displayName?.trim() || undefined }),
  });

  if (!res.ok) {
    throw await parseApiError(res, '無法建立訪客身分，請稍後再試。');
  }

  const data = await res.json();
  const token = String(data?.token ?? '').trim();
  const userId = String(data?.user_id ?? '').trim();

  if (!token || !userId) {
    throw new Error('訪客登入失敗，請稍後再試。');
  }

  setClientAccessToken(token);
  getLocalStorage()?.setItem(USER_ID_KEY, userId);
  getLocalStorage()?.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  return { token, user_id: userId };
}

function shouldAttemptDevTokenBootstrap(): boolean {
  const autoLogin = ((import.meta as any).env?.VITE_DEV_AUTO_LOGIN ?? 'false').trim().toLowerCase();
  return Boolean((import.meta as any).env?.DEV) && autoLogin === 'true';
}

export async function ensureClientAccessToken(): Promise<string> {
  const token = getStoredToken();
  if (token) return token;
  
  if (shouldAttemptDevTokenBootstrap()) {
    try {
      const res = await fetch('/api/auth/dev-token', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          setClientAccessToken(data.token);
          return data.token;
        }
      }
    } catch (error) {
      console.error('Failed to get dev-token', error);
    }
  }

  const guest = await createGuestSession().catch(() => null);
  if (guest?.token) {
    return guest.token;
  }

  throw new Error('No access token available. Please log in.');
}

export function setClientAccessToken(token: string) {
  const sessionStorage = getSessionStorage();
  const localStorage = getLocalStorage();
  if (sessionStorage) {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    localStorage?.removeItem(ACCESS_TOKEN_KEY);
    return;
  }
  localStorage?.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearClientSession() {
  const sessionStorage = getSessionStorage();
  const localStorage = getLocalStorage();
  sessionStorage?.removeItem(ACCESS_TOKEN_KEY);
  localStorage?.removeItem(ACCESS_TOKEN_KEY);
  localStorage?.removeItem(USER_ID_KEY);
  localStorage?.removeItem(LAST_ACTIVITY_KEY);
}

export async function loginUser(username: string, password: string): Promise<any> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Login failed');
  }
  return data;
}

export async function registerUser(username: string, password: string, display_name: string, avatar?: string): Promise<any> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, display_name, avatar })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Registration failed');
  }
  return data;
}

export async function fetchCollaborators(tripId: string): Promise<any> {
  if (!tripId) return [];
  try {
    const url = `/api/collaborators?trip_id=${encodeURIComponent(tripId)}`;
    const token = getStoredToken();
    const res = await fetch(url, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.collaborators || []);
  } catch (error) {
    console.error('fetchCollaborators failed', error);
    return [];
  }
}
export async function fetchFavorites(tripId?: string): Promise<any> {
  const url = tripId ? `/api/favorites?trip_id=${encodeURIComponent(tripId)}` : '/api/favorites';
  try {
    const token = getStoredToken();
    const res = await fetch(url, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchItinerary(tripId?: string, options?: FetchItineraryOptions): Promise<any> {
  const params = new URLSearchParams();
  if (tripId) params.set('trip_id', tripId);
  if (Number.isFinite(Number(options?.day)) && Number(options?.day) > 0) {
    params.set('day', String(Number(options?.day)));
  }
  const queryString = params.toString();
  const url = queryString ? `/api/itinerary?${queryString}` : '/api/itinerary';
  try {
    const token = getStoredToken();
    const res = await fetch(url, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
export async function fetchTripInfo(tripId: string): Promise<any> {
  if (!tripId) return null;
  const url = `/api/trips/${encodeURIComponent(tripId)}`;
  const token = getStoredToken();
  const res = await fetch(url, {
    headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
  });
  if (!res.ok) throw new Error('Trip not found');
  const data = await res.json();
  return data;
}
export async function shareText(text: string): Promise<any> { 
  if (navigator.share) {
    return navigator.share({ text }).catch(() => false);
  }
  return false; 
}
export async function syncItinerary(payload: any): Promise<any> { 
  const token = getStoredToken();
  const res = await fetch('/api/itinerary/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw await parseApiError(res, '行程同步失敗');
  }
  return true;
}
export async function deleteItineraryNode(nodeId: string): Promise<any> { 
  const token = getStoredToken();
  const res = await fetch(`/api/itinerary/${nodeId}`, {
    method: 'DELETE',
    headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
  });
  if (!res.ok) {
    throw await parseApiError(res, '刪除行程失敗');
  }
  return true;
}
export async function addFavorite(tripId: string, title: string, emoji: string): Promise<{ spot?: any; error?: string } | null> {
  try {
    const token = getStoredToken();
    const res = await fetch(`/api/favorites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      body: JSON.stringify({ trip_id: tripId, title, emoji }),
    });
    if (res.ok) return { spot: await res.json() };
    if (res.status === 404) return { error: '找不到此景點，請確認名稱是否正確。' };
    if (res.status === 422) return { error: '景點名稱無法定位，請嘗試更具體的地名。' };
    return { error: `新增失敗（${res.status}），請稍後再試。` };
  } catch {
    return { error: '網路連線失敗，請確認網路後再試。' };
  }
}
export async function deleteFavorite(id: string): Promise<any> { 
  try {
    const token = getStoredToken();
    await fetch(`/api/user/saves/${id}`, {
      method: 'DELETE',
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
    });
  } catch {}
  return true; 
}
export async function fetchChecklist(tripId: string): Promise<any> { 
  if (!tripId) return [];
  const token = getStoredToken();
  const res = await fetch(`/api/checklist?trip_id=${tripId}`, {
    headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
  });
  if (!res.ok) return [];
  return res.json();
}
export async function fetchSettlements(tripId: string): Promise<any> { 
  if (!tripId) return [];
  const token = getStoredToken();
  const res = await fetch(`/api/settlements?trip_id=${tripId}`, {
    headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
  });
  if (!res.ok) return [];
  return res.json();
}
export async function fetchUserTrips(): Promise<any> { 
  const token = getStoredToken();
  const res = await fetch('/api/user/trips', {
    headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : (data.trips || []);
}

export async function deleteTripApi(tripId: string): Promise<boolean> {
  const token = getStoredToken();
  const res = await fetch(`/api/trips/${encodeURIComponent(tripId)}`, {
    method: 'DELETE',
    headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
  });
  return res.ok;
}

export async function fetchUserPreferences(): Promise<UserPreferencesResponse | null> {
  const token = getStoredToken();
  if (!token) return null;

  const res = await fetch('/api/user/preferences', {
    headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
  });

  if (!res.ok) {
    if (res.status === 401) return null;
    throw await parseApiError(res, '讀取使用者偏好失敗');
  }

  const data = await res.json();
  return {
    saved_items: Array.isArray(data?.saved_items) ? data.saved_items : [],
    tracked_prices: Array.isArray(data?.tracked_prices) ? data.tracked_prices : [],
    ai_profile: data?.ai_profile && typeof data.ai_profile === 'object' ? data.ai_profile : null,
  };
}

export async function updateUserAiProfile(profile: AiPreferenceProfile): Promise<AiPreferenceProfile> {
  const token = getStoredToken();
  const res = await fetch('/api/user/preferences/profile', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(profile),
  });

  if (!res.ok) {
    throw await parseApiError(res, '儲存 AI 偏好失敗');
  }

  return await res.json();
}

export async function fetchWeather(city: string): Promise<any> { 
  if (!city || city === '您的目的地' || city === '指定地點') return null;
  const token = getStoredToken();
  const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`, {
    headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
  });
  if (!res.ok) return null;
  return res.json();
}
export async function fetchHandbooks(): Promise<any[]> {
  try {
    const token = getStoredToken();
    const res = await fetch('/api/handbooks', {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    });
    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    console.error('fetchHandbooks failed', error);
    return [];
  }
}

export async function fetchLedgerExpenses(tripId: string, cleared = false): Promise<any[]> {
  const token = getStoredToken();
  const res = await fetch(`/api/ledger/expenses?trip_id=${tripId}&cleared=${cleared}`, {
    headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
  });
  if (!res.ok) {
    throw await parseApiError(res, '取得花費紀錄失敗');
  }
  return await res.json();
}
export async function clearSettlement(tripId: string, from_name?: string, to_name?: string, currency?: string): Promise<any> { 
  const token = getStoredToken();
  const res = await fetch('/api/settlements/clear', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
    body: JSON.stringify({ trip_id: tripId, from_name, to_name, currency })
  });
  if (!res.ok) {
    throw await parseApiError(res, '結清失敗');
  }
  return await res.json();
}
export async function submitLedgerExpense(tripId: string, expense: any): Promise<any> { 
  const token = getStoredToken();
  const payload = {
    trip_id: tripId,
    ...expense,
    split_with: expense?.split_with ?? expense?.splitWith ?? [],
  };
  const res = await fetch('/api/ledger/expense', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw await parseApiError(res, '分帳送出失敗');
  }
  return await res.json();
}
export async function updateChecklist(payload: any): Promise<any> { 
  const token = getStoredToken();
  const res = await fetch('/api/checklist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw await parseApiError(res, '清單同步失敗');
  }
  return await res.json();
}
export interface TripSummary {}

export async function fetchTripPreview(id: string): Promise<any> {
  const token = getStoredToken();
  const res = await fetch(`/api/trips/${id}/preview`, {
    headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
  });
  if (!res.ok) {
    throw await parseApiError(res, '無法載入旅程資訊');
  }
  return await res.json();
}

export async function joinTrip(id: string): Promise<any> {
  const token = getStoredToken();
  const res = await fetch(`/api/trips/${id}/join`, {
    method: 'POST',
    headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
  });
  if (!res.ok) {
    throw await parseApiError(res, '加入旅程失敗');
  }
  return await res.json();
}

export async function fetchTripFlights(tripId: string) {
  try {
    const res = await fetch(`/api/trips/${tripId}/flights`);
    if (!res.ok) return [];
    const data = await res.json();
    return data;
  } catch {
    return [];
  }
}

export async function fetchTripActivities(tripId: string) {
  try {
    const res = await fetch(`/api/trips/${tripId}/activities`);
    if (!res.ok) return [];
    const data = await res.json();
    return data;
  } catch {
    return [];
  }
}
export async function fetchTripFacts(tripId: string): Promise<any> {
  const token = getStoredToken();
  const res = await fetch(`/api/trips/${tripId}/facts`, {
    headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
  });
  if (!res.ok) return [];
  return res.json();
}

export async function createTripFact(tripId: string, body: any): Promise<any> {
  const token = getStoredToken();
  const res = await fetch(`/api/trips/${tripId}/facts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('Create fact failed');
  return res.json();
}

export async function updateTripFact(tripId: string, factId: string, body: any): Promise<any> {
  const token = getStoredToken();
  const res = await fetch(`/api/trips/${tripId}/facts/${factId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('Update fact failed');
  return res.json();
}

export async function deleteTripFact(tripId: string, factId: string): Promise<boolean> {
  const token = getStoredToken();
  const res = await fetch(`/api/trips/${tripId}/facts/${factId}`, {
    method: 'DELETE',
    headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
  });
  return res.ok;
}

export async function createTrip(body: { name: string; destination: string }): Promise<any> {
  const token = getStoredToken();
  const res = await fetch('/api/trips', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('Create trip failed');
  return res.json();
}

export async function cloneTrip(tripId: string): Promise<any> {
  const token = getStoredToken();
  const res = await fetch(`/api/trips/${tripId}/clone`, {
    method: 'POST',
    headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
  });
  if (!res.ok) throw new Error('Clone trip failed');
  return res.json();
}

export async function updateTripPublicState(tripId: string, isPublic: boolean): Promise<any> {
  const token = getStoredToken();
  const res = await fetch(`/api/trips/${tripId}/public`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ isPublic }),
  });
  if (!res.ok) {
    throw await parseApiError(res, '更新行程狀態失敗');
  }
  return res.json();
}
export async function trackClickOut(body: TrackClickOutBody): Promise<void> {
  try {
    const token = getStoredToken();
    await fetch('/api/track/clickout', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(body)
    });
  } catch (error) {
    console.error('Failed to track clickout', error);
  }
}

export async function searchOffers(form: any): Promise<SearchItem[]> {
  const params = new URLSearchParams();
  if (form.from) params.append('from', String(form.from).trim());
  if (form.to) params.append('to', String(form.to).trim());
  if (form.date) params.append('date', String(form.date).trim());
  if (form.tripType === 'roundtrip' && form.returnDate) {
    params.append('tripType', 'roundtrip');
    params.append('returnDate', String(form.returnDate).trim());
  }

  const queryString = params.toString();
  const url = queryString ? `/api/search?${queryString}` : '/api/search';

  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 504) throw new SearchTimeoutError('Search timed out');
      throw new SearchServiceUnavailableError(`Search service returned ${res.status}`);
    }
    const data = await res.json();
    const items = Array.isArray(data?.data) ? data.data : [];
    return items.map((item: any) => ({
      ...item,
      bookingUrl: typeof item?.bookingUrl === 'string' && item.bookingUrl.trim()
        ? item.bookingUrl.trim()
        : typeof item?.affiliate_url === 'string'
          ? item.affiliate_url.trim()
          : '',
    }));
  } catch (error: any) {
    if (error instanceof SearchTimeoutError || error instanceof SearchServiceUnavailableError) {
      throw error;
    }
    
    // Check for specific browser errors
    const errorMessage = error?.message || String(error);
    console.error('Search failed detailed error:', {
      message: errorMessage,
      url,
      stack: error?.stack
    });

    if (errorMessage.includes('pattern') || errorMessage.includes('pattern')) {
       // This might be a browser specific error related to URL or Headers
       throw new SearchServiceUnavailableError('目前連線不穩定，請重新整理頁面後再試一次。');
    }

    throw new SearchServiceUnavailableError('搜尋服務暫時無法使用，請稍後再試。');
  }
}

export async function regenerateItinerarySpot(params: {
  trip_id: string;
  node_id: string;
  destination: string;
  day: number;
  current_date?: string;
  current_time: string;
  current_title: string;
  current_category?: string;
  notes?: string;
  preserve_time_window?: boolean;
  previous_node?: {
    time?: string;
    title?: string;
    category?: string;
  };
  next_node?: {
    time?: string;
    title?: string;
    category?: string;
  };
  travel_facts_context?: string;
}): Promise<{
  time: string;
  title: string;
  emoji: string;
  category: string;
  ai_note: string;
  transport_to_next?: string;
  lat?: number;
  lng?: number;
  linkedFactId?: string;
}> {
  const token = getStoredToken();
  const res = await fetch('/api/itinerary/regenerate-spot', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message ?? 'AI 換景點失敗，請稍後再試');
  }
  const data = await res.json();
  return data.data;
}

export async function fetchSettlementHistory(tripId: string): Promise<any[]> {
  try {
    const token = getStoredToken();
    const res = await fetch(`/api/settlements/history?trip_id=${encodeURIComponent(tripId)}`, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}



export async function fetchUserSubscriptions(): Promise<any[]> {
  try {
    const token = getStoredToken();
    const res = await fetch('/api/user/subscriptions', {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.status === 'success' && Array.isArray(json.data) ? json.data : [];
  } catch (err) {
    console.error('fetchUserSubscriptions failed', err);
    return [];
  }
}

export async function toggleUserSubscription(destination: string, channel: string): Promise<any> {
  const token = getStoredToken();
  const res = await fetch('/api/user/subscriptions/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
    body: JSON.stringify({ destination, channel })
  });
  if (!res.ok) {
    throw new Error('切換訂閱失敗');
  }
  return res.json();
}

export async function fetchSpotEnrichment(name: string): Promise<{ description?: string; wiki_url?: string; thumbnail?: string }> {
  try {
    const token = getStoredToken();
    const res = await fetch(`/api/spots/enrich?name=${encodeURIComponent(name)}`, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
    });
    if (res.ok) return res.json();
  } catch { /* ignore */ }
  return {};
}
