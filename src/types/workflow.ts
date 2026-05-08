export interface SearchItem {
  id: string;
  emoji: string;
  provider: string;
  title: string;
  currency: string;
  price: number;
  affiliate_url: string;
  type?: 'flight' | 'ticket' | 'other';
  details?: {
    airline?: string;
    departure?: string;
    arrival?: string;
    duration?: string;
    stops?: number;
  };
}

export interface TrackClickOutBody {
  user_id: string | null;
  item_id: string;
  provider: string;
  timestamp: string;
  affiliate_url?: string;
}

export type TabName = 'home' | 'itinerary' | 'tools';

export interface TripInfo {
  id: string;
  name: string;
  destination: string;
  days: number;
  startDate?: string;
  endDate?: string;
}

export interface WeatherData {
  temp_current: number;
  temp_min: number;
  temp_max: number;
  rain_prob: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface Settlement {
  id: string;
  from: string;
  to: string;
  amount: number;
  currency: string;
}

export interface Collaborator {
  id: string;
  name: string;
  avatar: string;
}

export interface FavoriteSpot {
  id: string;
  title: string;
  emoji: string;
  lat: number;
  lng: number;
}

export interface ItineraryNode {
  node_id: string;
  day: number;
  time: string;
  timestamp?: string;
  title: string;
  emoji: string;
  category: string;
  description?: string;
  notes?: string;
  source: 'local' | 'remote';
  lat?: number;
  lng?: number;
}

export interface ItineraryPlannerForm {
  days: number;
  departureFrom: string;
  arrivalTo: string;
  flightDate: string;
  countries: string[];
  mustVisitSpots: string[];
  mustEatFoods: string[];
  autoFlightSegments: string[];
  notes: string;
}

export interface SyncItineraryPayload {
  trip_id: string;
  action: 'add_node' | 'remove_node';
  payload: ItineraryNode | { node_id: string };
}
