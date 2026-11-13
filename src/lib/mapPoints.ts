import type { Place, Stop } from './types';

export const favoriteCategories = ['素食餐廳','咖啡廳','酒吧'] as const;
export type CoordinatePlace = Place & { lat:number; lng:number };
export interface MapPoint { place:CoordinatePlace; favorite:boolean; number?:number }
export interface MapPinData { place:CoordinatePlace; stop:Stop; number:number }
export function hasCoordinates(place:Place | undefined): place is CoordinatePlace {
  return !!place && !place.virtual && typeof place.lat === 'number' && typeof place.lng === 'number' && Number.isFinite(place.lat) && Number.isFinite(place.lng);
}
export const isCityPlace = (place:Place) => hasCoordinates(place) && place.lat > 35 && place.lat < 35.3 && place.lng > 136.7 && place.lng < 137.1;
export const isFavorite = (place:Place) => favoriteCategories.some(category => category === place.category);
export const favorites = (places:Place[]) => places.filter((place): place is CoordinatePlace => hasCoordinates(place) && isFavorite(place));
export function dayPins(stops:Stop[], places:Place[]): MapPinData[] {
  const seen = new Set<string>();
  return stops.flatMap(stop => {
    const place = places.find(p => p.id === stop.placeId);
    if (!hasCoordinates(place) || place.id === 'tpe' || seen.has(place.id)) return [];
    seen.add(place.id);
    return [{ place,stop,number:seen.size }];
  });
}
function mergePoints(places:Place[], primary:MapPoint[], includeFavorites = true): MapPoint[] {
  const fixed = places.filter((place): place is CoordinatePlace => hasCoordinates(place) && (place.category === '住宿' || (includeFavorites && isFavorite(place))));
  const points = new Map(fixed.map(place => [place.id,{ place,favorite:isFavorite(place) } as MapPoint]));
  for (const point of primary) points.set(point.place.id,{ ...point,favorite:isFavorite(point.place) });
  return [...points.values()];
}
export const dailyMapPoints = (stops:Stop[], places:Place[]) => mergePoints(places,dayPins(stops,places).map(pin => ({ place:pin.place,number:pin.number,favorite:isFavorite(pin.place) })));
export const collectionMapPoints = (places:Place[], visible:Place[]) => mergePoints(places,visible.filter((place): place is CoordinatePlace => hasCoordinates(place) && place.id !== 'tpe').map(place => ({ place,favorite:isFavorite(place) })),false);
export function dailySegments(stops:Stop[], places:Place[]): [number,number][][] {
  return stops.slice(1).flatMap((stop,i) => {
    const from = places.find(place => place.id === stops[i].placeId);
    const to = places.find(place => place.id === stop.placeId);
    return hasCoordinates(from) && hasCoordinates(to) && from.id !== to.id && from.id !== 'tpe' && to.id !== 'tpe'
      ? [[[from.lat,from.lng],[to.lat,to.lng]]] : [];
  });
}
