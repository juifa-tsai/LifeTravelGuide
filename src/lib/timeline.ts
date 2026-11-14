import type { Leg, Stop } from './types';

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

export interface TimelineTransfer { leg:Leg; pickupTime?:string }
export interface TimelineEntry { stop:Stop; sourceStops:Stop[]; transfers:TimelineTransfer[]; checkInTime?:string }

// Keep the workbook intact. One flight card carries both endpoints; transport
// waypoints become route connections rather than repeating destination photos.
export function compactTimeline(source:Stop[], legs:Leg[]) {
  const stops = [...source].sort((a,b)=>a.sequence-b.sequence);
  const departure = stops.find(stop=>stop.displayStatus === '固定航班' && stop.summary.includes('起飛'));
  const arrival = stops.find(stop=>stop.displayStatus === '固定航班' && stop.summary.includes('抵達'));
  const flightPlace = departure?.timezone === 'Asia/Taipei' && arrival ? arrival : departure;
  const entries:TimelineEntry[] = stops.filter(stop=> {
    if (stop.category === '早餐') return false;
    if (stop.displayStatus === '固定航班') return !departure || stop === departure;
    if (stop.category === '接駁') return !legs.some(leg=>leg.date === stop.date && leg.fromPlaceId === stop.placeId && leg.mode.includes('專車'));
    if (stop.category === '交通') return !legs.some(leg=>leg.date === stop.date && leg.toPlaceId === stop.placeId && leg.mode !== '航班');
    return true;
  }).map(stop=>({stop:stop === departure ? {...stop,category:'航班',placeId:flightPlace!.placeId,mapsUrl:flightPlace!.mapsUrl} : stop,sourceStops:[stop],transfers:[]}));
  const flight = entries.find(entry=>entry.sourceStops[0] === departure);
  const checkIn = stops.find(stop=>stop.displayStatus === '固定航班' && stop.summary.includes('報到'));
  if (flight && checkIn) flight.checkInTime = checkIn.arrivalTime;
  for (const stop of stops) {
    if (entries.some(entry=>entry.sourceStops.includes(stop))) continue;
    const target = flight && (stop.displayStatus === '固定航班' || stop.category === '接駁') ? flight
      : entries.find(entry=>entry.stop.sequence > stop.sequence) ?? entries.at(-1);
    target?.sourceStops.push(stop);
  }
  const leadingTransfers:TimelineTransfer[] = [];
  for (let index = 0; index < stops.length-1; index++) {
    const from = stops[index], to = stops[index+1];
    if (from.placeId === to.placeId) continue;
    const leg = legs.find(leg=>leg.date === from.date && leg.fromPlaceId === from.placeId && leg.toPlaceId === to.placeId && leg.mode !== '航班');
    if (!leg) continue;
    const transfer:TimelineTransfer = {leg,...(from.category === '接駁' ? {pickupTime:from.arrivalTime} : {})};
    const previous = [...entries].reverse().find(entry=>entry.stop.sequence <= from.sequence);
    (previous?.transfers ?? leadingTransfers).push(transfer);
  }
  return {entries,leadingTransfers};
}
