import type { SearchItem, TrackClickOutBody } from '../types/workflow';

export class SearchTimeoutError extends Error {}
export class SearchServiceUnavailableError extends Error {}

export function getStoredToken(): string | null {
  return localStorage.getItem('access_token');
}

export async function ensureClientAccessToken(): Promise<string> {
  return 'dummy_token';
}

export async function fetchCollaborators(...args: any[]): Promise<any> { return []; }
export async function fetchFavorites(...args: any[]): Promise<any> { return []; }
export async function fetchItinerary(...args: any[]): Promise<any> { return []; }
export async function fetchTripInfo(...args: any[]): Promise<any> { 
  return { id: 'dummy', name: '預設行程', destination: '東京', days: 5 }; 
}
export async function shareText(...args: any[]): Promise<any> { return true; }
export async function syncItinerary(...args: any[]): Promise<any> { return true; }
export async function deleteItineraryNode(...args: any[]): Promise<any> { return true; }
export async function addFavorite(...args: any[]): Promise<any> { 
  return { id: `fav_${Date.now()}`, title: args[1], emoji: args[2], lat: 35.6895, lng: 139.6917 }; 
}
export async function deleteFavorite(...args: any[]): Promise<any> { return true; }

export async function fetchChecklist(...args: any[]): Promise<any> { return []; }
export async function fetchSettlements(...args: any[]): Promise<any> { return []; }
export async function fetchUserTrips(...args: any[]): Promise<any> { return []; }
export async function fetchWeather(...args: any[]): Promise<any> { return { currentTemp: 22, condition: 'Sunny' }; }
export async function clearSettlement(...args: any[]): Promise<any> { return true; }
export async function submitLedgerExpense(...args: any[]): Promise<any> { return true; }
export async function updateChecklist(...args: any[]): Promise<any> { return true; }
export interface TripSummary {}

export async function loginUser(...args: any[]): Promise<any> { return { user: { id: '1' }, access_token: 'dummy' }; }
export async function registerUser(...args: any[]): Promise<any> { return { user: { id: '1' }, access_token: 'dummy' }; }
export function setClientAccessToken(token: string) {}
export async function fetchTripPreview(id: string): Promise<any> {}
export async function joinTrip(...args: any[]): Promise<any> {}

// Add other missing exports from ItineraryTab and ToolsTab
export async function getTripsForUser(...args: any[]): Promise<any> {}
export async function removeActivity(...args: any[]): Promise<any> {}
// We can just define a proxy or just the ones needed.
export async function addActivity(...args: any[]): Promise<any> {}
export async function updateActivity(...args: any[]): Promise<any> {}
export async function reorderActivities(...args: any[]): Promise<any> {}
export async function deleteTrip(...args: any[]): Promise<any> {}
export async function createTrip(...args: any[]): Promise<any> {}
export async function createTemplateFromTrip(...args: any[]): Promise<any> {}
export async function submitReceipt(...args: any[]): Promise<any> {}
export async function getTripMembers(...args: any[]): Promise<any> {}
export async function getSettlements(...args: any[]): Promise<any> {}
export async function trackClickOut(body: TrackClickOutBody): Promise<void> {}

export async function searchOffers(form: any): Promise<SearchItem[]> {
  // dummy delay
  await new Promise(r => setTimeout(r, 1000));
  
  // mock items
  return [
    {
      id: 'mock-1',
      emoji: '✈️',
      provider: 'Trip.com',
      title: `${form.from || form.region} 到 ${form.to || form.destination || form.query}`,
      currency: 'TWD',
      price: 5999,
      affiliate_url: 'https://tw.trip.com/'
    },
    {
      id: 'mock-2',
      emoji: '🌍',
      provider: 'Agoda',
      title: '豪華雙人房',
      currency: 'TWD',
      price: 2490,
      affiliate_url: 'https://www.agoda.com/'
    }
  ];
}
