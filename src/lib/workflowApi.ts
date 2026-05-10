import type { SearchItem, TrackClickOutBody } from '../types/workflow';

export class SearchTimeoutError extends Error {}
export class SearchServiceUnavailableError extends Error {}

export async function geocodeSpot(title: string, city = ''): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${title} ${city}`);
    const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&accept-language=ja`;
    const apiRes = await fetch(url);
    if (!apiRes.ok) return null;
    const items = await apiRes.json();
    if (items && items.length > 0) {
      return { lat: parseFloat(items[0].lat), lng: parseFloat(items[0].lon) };
    }
  } catch {
    return null;
  }
  return null;
}

export function getStoredToken(): string | null {
  return localStorage.getItem('access_token');
}

export async function ensureClientAccessToken(): Promise<string> {
  const token = getStoredToken();
  if (token) return token;
  
  try {
    const res = await fetch('/api/auth/dev-token', { method: 'POST' });
    const data = await res.json();
    if (res.ok && data.token) {
      setClientAccessToken(data.token);
      return data.token;
    }
  } catch (error) {
    console.error('Failed to get dev-token', error);
  }

  const dummyToken = 'dummy_token';
  setClientAccessToken(dummyToken);
  return dummyToken;
}

export function setClientAccessToken(token: string) {
  localStorage.setItem('access_token', token);
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

export async function registerUser(username: string, password: string, display_name: string): Promise<any> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, display_name })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Registration failed');
  }
  return data;
}

export async function fetchCollaborators(tripId: string): Promise<any> {
  try {
    const url = `/api/collaborators?trip_id=${encodeURIComponent(tripId)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.collaborators || [];
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

export async function fetchItinerary(tripId?: string): Promise<any> {
  const url = tripId ? `/api/itinerary?trip_id=${encodeURIComponent(tripId)}` : '/api/itinerary';
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
  return res.ok;
}
export async function deleteItineraryNode(nodeId: string): Promise<any> { 
  const token = getStoredToken();
  const res = await fetch(`/api/itinerary/${nodeId}`, {
    method: 'DELETE',
    headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
  });
  return res.ok;
}
export async function addFavorite(tripId: string, title: string, emoji: string): Promise<any> { 
  try {
    const token = getStoredToken();
    const payload = {
      trip_id: tripId,
      title: title,
      emoji: emoji,
    };
    
    const res = await fetch(`/api/favorites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
        return await res.json();
    }
  } catch (error) {
    console.error('addFavorite failed', error);
  }
  return { id: `fav_${Date.now()}`, title: title, emoji: emoji, lat: 35.6895, lng: 139.6917 }; 
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
  const res = await fetch(`/api/checklist?trip_id=${tripId}`);
  if (!res.ok) return [];
  return res.json();
}
export async function fetchSettlements(tripId: string): Promise<any> { 
  const res = await fetch(`/api/settlements?trip_id=${tripId}`);
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
export async function fetchWeather(city: string): Promise<any> { 
  const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
  if (!res.ok) return { currentTemp: 22, condition: 'Sunny' };
  return res.json();
}
export async function fetchHandbooks(): Promise<any[]> {
  try {
    const res = await fetch('/api/handbooks');
    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    console.error('fetchHandbooks failed', error);
    return [];
  }
}
export async function clearSettlement(tripId: string, from_name?: string, to_name?: string, currency?: string): Promise<any> { 
  const token = getStoredToken();
  const res = await fetch('/api/settlements/clear', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
    body: JSON.stringify({ trip_id: tripId, from_name, to_name, currency })
  });
  return res.ok;
}
export async function submitLedgerExpense(tripId: string, expense: any): Promise<any> { 
  const token = getStoredToken();
  const res = await fetch('/api/ledger/expense', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
    body: JSON.stringify({ trip_id: tripId, ...expense })
  });
  return res.ok;
}
export async function updateChecklist(payload: any): Promise<any> { 
  const token = getStoredToken();
  const res = await fetch('/api/checklist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload)
  });
  return res.ok;
}
export interface TripSummary {}

export async function fetchTripPreview(id: string): Promise<any> {
    try {
        const token = getStoredToken();
        const res = await fetch(`/api/trips/${id}/preview`, {
            headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
        });
        if (res.ok) {
            return await res.json();
        }
    } catch (e) {
        console.error('fetchTripPreview error', e);
    }
    return null;
}

export async function joinTrip(id: string): Promise<any> {
    try {
        const token = getStoredToken();
        const res = await fetch(`/api/trips/${id}/join`, {
            method: 'POST',
            headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
        });
        if (res.ok) {
            return await res.json();
        }
    } catch (e) {
        console.error('joinTrip error', e);
    }
    return null;
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

  const queryString = params.toString();
  const url = queryString ? `/api/search?${queryString}` : '/api/search';

  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 504) throw new SearchTimeoutError('Search timed out');
      throw new SearchServiceUnavailableError(`Search service returned ${res.status}`);
    }
    const data = await res.json();
    return data.data || [];
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
  current_time: string;
  current_title: string;
  notes?: string;
}): Promise<{
  time: string;
  title: string;
  emoji: string;
  category: string;
  ai_note: string;
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
