import type { Stop } from './types';

// Keep the workbook's exact minutes, independent of rounded display durations
// and estimated routing times. Flights and the last stop need no invented time.
export function plannedDeparture(stop:Stop, next?:Stop):{time:string;daysLater:number;zone:string} | null {
  if (!next || next.date !== stop.date || next.sequence <= stop.sequence || stop.displayStatus === '固定航班'
    || stop.stayMinutes === null || !Number.isFinite(stop.stayMinutes) || stop.stayMinutes <= 0) return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(stop.arrivalTime);
  if (!match) return null;
  const total = Number(match[1])*60+Number(match[2])+stop.stayMinutes;
  const minutes = total%1440;
  return {time:`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(Math.floor(minutes%60)).padStart(2,'0')}`,
    daysLater:Math.floor(total/1440),zone:stop.timezone === 'Asia/Taipei' ? '台灣時間' : '日本時間'};
}
