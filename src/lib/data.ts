import type { TravelData, Day, Place, Stop } from './types';
import { readStored } from './storage';
export async function loadData(): Promise<TravelData> {
  const names = ['trip','places','itinerary','legs','documents'] as const;
  const values = await Promise.all(names.map(async name => {
    const response = await fetch(`${import.meta.env.BASE_URL}data/${name}.json`);
    if (!response.ok) throw new Error('行程資料暫時無法載入');
    return response.json();
  }));
  const data = Object.fromEntries(names.map((name, i) => [name, values[i]])) as unknown as TravelData;
  if (!Array.isArray(data.trip?.days) || !data.trip.days.length || !names.slice(1).every(name => Array.isArray(data[name]))) throw new Error('行程資料格式有誤');
  return data;
}
export function defaultDay(days: Day[]): string {
  const last = readStored<string>('last-day', '');
  if (days.some(day => day.date === last)) return last;
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
  return days.find(day => day.date >= today)?.date ?? days[days.length - 1].date;
}
export const hasCoordinates = (place: Place | undefined): place is Place & { lat: number; lng: number } =>
  !!place && !place.virtual && typeof place.lat === 'number' && typeof place.lng === 'number';
export const stopId = (stop: Stop) => `${stop.date}-${stop.sequence}`;
export const shortDate = (date: string) => `${Number(date.slice(5,7))}/${Number(date.slice(8))}`;
export const isCityPlace = (place: Place) => hasCoordinates(place) && place.lat > 35 && place.lat < 35.3 && place.lng > 136.7 && place.lng < 137.1;
export const categoryGroup = (category: string) => ({ '古蹟':'古蹟／歷史', '商圈':'古蹟／歷史', '美術館':'美術館／公園', '公園':'美術館／公園', '機場':'交通' }[category] || category);
