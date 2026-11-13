import type { Stop } from './types';

export type DayPeriod = 'morning' | 'afternoon' | 'evening';
export const periodLabels:Record<DayPeriod,string> = { morning:'早上', afternoon:'下午', evening:'晚上' };

export function durationHours(minutes:number | null): string | null {
  if (minutes === null || !Number.isFinite(minutes) || minutes <= 0) return null;
  return `${Math.max(0.5,Math.round(minutes / 30) / 2)} hr`;
}

export function dayPeriod(stop:Pick<Stop,'arrivalTime' | 'timezone'>): DayPeriod {
  const [hour,minute] = stop.arrivalTime.split(':').map(Number);
  // The itinerary uses Japan time; Taiwan flight events are one hour behind.
  const japanMinutes = (hour * 60 + minute + (stop.timezone === 'Asia/Taipei' ? 60 : 0)) % 1440;
  return japanMinutes < 720 ? 'morning' : japanMinutes < 1080 ? 'afternoon' : 'evening';
}

export function groupTimeline(stops:Stop[]) {
  const groups:{ id:string; period:DayPeriod; stops:Stop[] }[] = [];
  for (const stop of stops) {
    const period = dayPeriod(stop);
    const previous = groups.at(-1);
    if (previous?.period === period) previous.stops.push(stop);
    else groups.push({ id:`${period}-${stop.sequence}`, period, stops:[stop] });
  }
  return groups;
}
