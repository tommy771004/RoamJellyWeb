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
    depCode?: string;
    arrCode?: string;
    flightNumber?: string;
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
  startDate?: string | null;
  endDate?: string | null;
}

export interface TripSummary {
  tripId: string;
  name: string;
  destination: string;
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
  travelFactsContext: string;
  notes: string;
}

export type TravelFactType = 'flight_outbound' | 'flight_inbound' | 'stay';
export type TravelFactSource = 'imported_search' | 'manual' | 'ai_inferred';

export interface TravelFactMetadata {
  airline?: string;
  flightNumber?: string;
  depCode?: string;
  arrCode?: string;
  provider?: string;
  address?: string;
  checkInTime?: string;
  checkOutTime?: string;
}

export interface TravelFact {
  id: string;
  tripId: string;
  factType: TravelFactType;
  source: TravelFactSource;
  title: string;
  startAt?: string | null;
  endAt?: string | null;
  locationName?: string | null;
  lat?: number | null;
  lng?: number | null;
  referenceCode?: string | null;
  metadata?: TravelFactMetadata | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TravelFactsSummary {
  items: TravelFact[];
  missingAnchors: Array<'flight_outbound' | 'stay'>;
  hasCompleteAiAnchors: boolean;
}

export interface UpsertTravelFactBody {
  factType: TravelFactType;
  source?: TravelFactSource;
  title: string;
  startAt?: string | null;
  endAt?: string | null;
  locationName?: string | null;
  lat?: number | null;
  lng?: number | null;
  referenceCode?: string | null;
  metadata?: TravelFactMetadata | null;
}

export interface SyncItineraryPayload {
  trip_id: string;
  action: 'add_node' | 'remove_node';
  payload: ItineraryNode | { node_id: string };
}
