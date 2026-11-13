import boundary from '../data/nagoyaBoundary.json';

export interface Coordinates { lat: number; lng: number }
const valid = (point: Coordinates | null | undefined): point is Coordinates => !!point && Number.isFinite(point.lat) && Number.isFinite(point.lng) && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180;

function inRing(point: Coordinates, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length-1; i < ring.length; j = i++) {
    const [x,y] = ring[i], [previousX,previousY] = ring[j];
    if ((y > point.lat) !== (previousY > point.lat) && point.lng < (previousX-x)*(point.lat-y)/(previousY-y)+x) inside = !inside;
  }
  return inside;
}
export function isInNagoya(point: Coordinates | null | undefined): point is Coordinates {
  if (!valid(point) || point.lat < 34.8 || point.lat > 35.4 || point.lng < 136.6 || point.lng > 137.3) return false;
  return boundary.coordinates.some(polygon => inRing(point,polygon[0]) && !polygon.slice(1).some(hole => inRing(point,hole)));
}
export function distanceKm(from: Coordinates | null | undefined, to: Coordinates | null | undefined): number | null {
  if (!valid(from) || !valid(to)) return null;
  const rad = (degrees: number) => degrees*Math.PI/180;
  const dLat = rad(to.lat-from.lat), dLng = rad(to.lng-from.lng);
  const a = Math.sin(dLat/2)**2 + Math.cos(rad(from.lat))*Math.cos(rad(to.lat))*Math.sin(dLng/2)**2;
  return 6371.0088*2*Math.asin(Math.sqrt(Math.min(1,Math.max(0,a))));
}
export const formatDistance = (value: number | null) => value === null ? '—' : `${value.toFixed(1)} km`;
