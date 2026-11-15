import type { Stop } from './types';

export function plannedArrival(stop:Stop):{time:string;zone:string | null} | null {
  if (stop.displayStatus === '固定航班' || (stop.category === '接駁' && stop.displayStatus === '已預訂')
    || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(stop.arrivalTime)) return null;
  return {time:stop.arrivalTime,zone:stop.timezone === 'Asia/Taipei' ? '台灣時間' : null};
}
