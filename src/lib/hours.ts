import type { Place } from './types';

// Keep weekday, last-order and overnight details; remove only the repeated disclaimer.
export function compactHours(place: Pick<Place, 'hoursText'>): string {
  return place.hoursText?.split(' 一般週日資訊')[0].trim() || '開放時間待確認';
}
