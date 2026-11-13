import type { Place } from './types';

// Keep weekday, last-order and overnight details; remove only the repeated disclaimer.
export function compactHours(place: Pick<Place, 'hoursText' | 'hoursNote'>): string {
  if (/營業狀態待確認|營業狀態未確認/.test(place.hoursNote || '')) return '營業狀態待確認';
  return place.hoursText?.split(' 一般週日資訊')[0].trim().replace(/[~～〜]/g,'–') || '開放時間待確認';
}
