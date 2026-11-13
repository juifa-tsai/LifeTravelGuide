export interface Day {
  date: string; weekday: string; title: string; description: string; label: string; number: number;
}
export interface Trip {
  title: string; startDate: string; endDate: string; timezone: string; updatedAt: string;
  days: Day[]; overview: { title: string; value: string; note: string }[];
}
export interface Place {
  id: string; category: string; nameZh: string; nameJa: string; address: string;
  hoursText: string | null; closedText: string | null; priority: string;
  dietText: string | null; summary: string; mapsUrl: string; website: string | null;
  imageUrl: string | null; imageAttribution: string | null; lat: number | null; lng: number | null;
  imageSourceUrl: string | null; imageLicenseUrl: string | null; imageKind: 'place' | 'illustration' | null; imageAlt: string | null;
  virtual: boolean; verification: string; sourceUrl: string | null; coordinateSource: string | null;
  coordinateLabel: string | null; coordinateAddress: string | null;
  foodDescription?: string; diningType?: string;
  weeklyHours?: Partial<Record<string, string | null>>;
  hoursNote?: string; detailSourceUrls?: string[]; detailsCheckedAt?: string;
}
export interface Stop {
  date: string; sequence: number; arrivalTime: string; stayMinutes: number | null;
  placeId: string; title: string; category: string; displayStatus: string;
  summary: string; note: string | null; mapsUrl: string; sourceUrl: string | null; timezone: string;
}
export interface Leg {
  date: string; fromPlaceId: string; toPlaceId: string; mode: string; summary: string;
  details: string; minutesEstimate: number | null; fareJpyEstimate: number | null;
  certainty: string; sourceUrl: string | null;
  navigation?: {
    steps?: { line:string; fromStation:string; toStation:string }[];
    walking?: { distanceMeters:number; durationSeconds:number; fromCoordinates:{lat:number;lng:number}; toCoordinates:{lat:number;lng:number} };
    note?: string; sources:string[]; checkedAt:string;
  };
}
export interface TravelDocument {
  id: string; category: string; title: string; url: string; access: string; dates: string; description: string;
  preview?: { imageUrl: string; alt: string; width: number; height: number; attribution: string };
}
export interface TravelData { trip: Trip; places: Place[]; itinerary: Stop[]; legs: Leg[]; documents: TravelDocument[] }
