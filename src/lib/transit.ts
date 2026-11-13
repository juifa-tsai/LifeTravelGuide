import type { Leg, Place } from './types';
import { durationHours } from './timeline';

export function transitTime(minutes:number | null): string | null {
  if (minutes === null || !Number.isFinite(minutes) || minutes <= 0) return null;
  return minutes < 60 ? `~ ${Math.ceil(minutes)} 分` : durationHours(minutes);
}

export function walkingDistance(meters:number | undefined): string | null {
  if (meters === undefined || !Number.isFinite(meters) || meters <= 0) return null;
  return meters < 1000 ? `~ ${Math.max(50,Math.round(meters/50)*50)} m` : `~ ${(meters/1000).toFixed(1)} km`;
}

export function legView(leg:Leg, from?:Place, to?:Place) {
  // An unselected meal does not have a real route, distance or station pair.
  if (!from || !to || from.virtual || to.virtual) return null;
  const walking = leg.mode === '步行';
  const foot = leg.navigation?.walking;
  const checkedFoot = walking && foot && [
    [from,foot.fromCoordinates],[to,foot.toCoordinates],
  ].every(([place,checked]) => place.lat === checked.lat && place.lng === checked.lng) ? foot : undefined;
  const steps = leg.navigation?.steps ?? [];
  const time = transitTime(checkedFoot ? checkedFoot.durationSeconds/60 : leg.minutesEstimate);
  const mode = walking ? '步行' : steps.length ? (leg.mode.includes('名鐵') ? '名鐵' : '地鐵') : leg.mode;
  return {
    walking, mode, time, steps,
    distance:checkedFoot ? walkingDistance(checkedFoot.distanceMeters) : null,
    title:steps.length ? `${steps[0].fromStation} → ${steps[steps.length-1].toStation}` : `${from.nameZh} → ${to.nameZh}`,
    lines:[...new Set(steps.map(step => step.line))].join(' → '),
    note:leg.navigation?.note ?? (leg.mode === '航班' || leg.mode.includes('專車') ? leg.details.replace(/(^|[^預])約(?=\s*\d)/g,'$1~ ') : null),
  };
}
