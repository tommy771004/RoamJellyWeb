import type { ItineraryPlannerForm } from "../types/workflow";

/** Builds a default AI-planner form, seeded from an optional saved user profile. */
export function buildDefaultPlannerForm(
  destination: string,
  days: number,
  profile?: any,
): ItineraryPlannerForm {
  return {
    days,
    departureFrom: profile?.departure || "台北",
    arrivalTo: destination,
    flightDate: "2026-06-15",
    countries: [],
    mustVisitSpots: [],
    mustEatFoods: [],
    autoFlightSegments: [],
    notes: "",
    travelFactsContext: "",
    companions: profile?.companions || "",
    vibes: Array.isArray(profile?.vibes)
      ? [...profile.vibes]
      : ([] as string[]),
    interests: Array.isArray(profile?.interests)
      ? [...profile.interests]
      : ([] as string[]),
    budget: profile?.budget || "",
    dietary: Array.isArray(profile?.dietary)
      ? [...profile.dietary]
      : ([] as string[]),
    transport: Array.isArray(profile?.transport)
      ? [...profile.transport]
      : ([] as string[]),
    pace: profile?.pace || "",
    accommodation: Array.isArray(profile?.accommodation)
      ? [...profile.accommodation]
      : ([] as string[]),
  } as any;
}
