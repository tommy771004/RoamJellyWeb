// src/server/seo/types.ts

export interface MonthlyDemand {
  month: number;  // 1–12
  count: number;
}

export interface RouteData {
  slug: string;        // "tpe-nrt"
  fromCode: string;    // "TPE"
  toCode: string;      // "NRT"
  fromDisplay: string; // "台北"
  toDisplay: string;   // "東京"
  monthly: MonthlyDemand[];
  totalSearches: number;
  peakMonth: number | null;   // month with highest count, null if no data
  lowMonth: number | null;    // month with lowest count, null if no data
  destinationSlug: string;
}

export interface TripNode {
  day: number;
  time: string | null;
  title: string;
  category: string | null;
  description: string | null;
}

export interface PublicTrip {
  id: string;
  name: string;
  forkCount: number;
  nodes: TripNode[];
}

export interface DestinationData {
  slug: string;        // "tokyo"
  displayName: string; // "東京"
  trips: PublicTrip[];
  popularSpots: string[]; // top-5 unique node titles across all trips
}
