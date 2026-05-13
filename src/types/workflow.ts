export interface SearchItem {
  id: string;
  emoji: string;
  provider: string;
  title: string;
  currency: string;
  price: number;
  affiliate_url: string;
  bookingUrl?: string;
  type?: 'flight' | 'ticket' | 'other';
  tripType?: 'oneway' | 'roundtrip';
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
  /** Populated only when tripType === 'roundtrip' */
  returnLeg?: {
    airline?: string;
    departure?: string;
    arrival?: string;
    stops?: number;
    duration?: string;
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
  coverImage?: string;
  isPublic?: boolean;
  forkCount?: number;
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
  daily?: any[];
}

export type ChecklistCategory = 'documents' | 'electronics' | 'clothing' | 'toiletries' | 'other';

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  category?: ChecklistCategory;
}

export interface Settlement {
  id: string;
  from: string;
  to: string;
  amount: number;
  currency: string;
}

export interface SettlementHistoryEntry {
  date: string;
  clearedAt: string;
  count: number;
  payers: string[];
  currencyTotals: Record<string, number>;
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
  wiki_desc?: string;
  wiki_url?: string;
  thumbnail?: string;
}

export interface ItineraryAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
}

export interface ItineraryNode {
  node_id: string;
  day: number;
  date?: string;
  time: string;
  timestamp?: string;
  sort_order?: number;
  title: string;
  emoji: string;
  category: string;
  description?: string;
  ai_note?: string;
  intensity?: 'chill' | 'moderate' | 'hardcore';
  is_visited?: boolean;
  notes?: string;
  source: 'local' | 'remote';
  lat?: number;
  lng?: number;
  transport_to_next?: string;
  image_url?: string;
  linkedFactId?: string;
  linked_fact_id?: string;
  attachments?: ItineraryAttachment[];
}

export interface ItineraryNodePatchChanges {
  day?: number;
  date?: string | null;
  time?: string;
  timestamp?: string | null;
  sort_order?: number;
  title?: string;
  emoji?: string;
  category?: string;
  description?: string;
  ai_note?: string | null;
  intensity?: ItineraryNode['intensity'] | null;
  is_visited?: boolean;
  lat?: number | null;
  lng?: number | null;
  transport_to_next?: string;
  image_url?: string;
  attachments?: ItineraryAttachment[];
  linkedFactId?: string;
}

export interface FetchItineraryOptions {
  day?: number;
}

export interface SyncItineraryPatchPayload {
  node_id: string;
  changes: ItineraryNodePatchChanges;
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
  companions?: string;        // 旅伴類型: 獨行俠/情侶蜜遊/親子同遊/好友出遊/銀髮樂齡
  vibes?: string[];           // 旅遊節奏: 特種兵式/睡到自然醒/隨興漫遊/在地深度/網美打卡
  interests?: string[];       // 興趣偏好: 大自然/歷史文化/購物血拼/主題樂園/在地美食/戶外刺激
  budget?: string;            // 預算等級: 窮遊背包客/小資精打細算/舒適中等/奢華享受
  dietary?: string[];         // 飲食需求: 無限制/純素/蛋奶素/無麩質/不吃海鮮
  transport?: string[];       // 交通偏好: 大眾運輸/自駕租車/包車/徒步為主
}

export interface AiPreferenceProfile {
  departure?: string;
  companions?: string;
  vibes?: string[];
  interests?: string[];
  dietary?: string[];
  transport?: string[];
  budget?: string;
}

export interface UserPreferencesResponse {
  saved_items: string[];
  tracked_prices: string[];
  ai_profile: AiPreferenceProfile | null;
}

export type TravelFactType = 'flight_outbound' | 'flight_inbound' | 'stay';
export type TravelFactSource = 'imported_search' | 'manual' | 'ai_inferred';

export interface TravelFactMetadata {
  airline?: string;
  flightNumber?: string;
  depCode?: string;
  arrCode?: string;
  provider?: string;
  bookingUrl?: string;
  price?: number;
  currency?: string;
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
  action: 'add_node' | 'remove_node' | 'patch_node';
  payload: ItineraryNode | { node_id: string } | SyncItineraryPatchPayload;
}
