import type { Day } from './types';

export const japanDate = (now = new Date()) => new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Tokyo'}).format(now);

export function defaultDay(days:Day[], now = new Date()):string {
  const today = japanDate(now);
  return days.find(day=>day.date === today)?.date ?? days[0].date;
}

// A restored itinerary URL starts on today's trip day. Keep explicit utility
// links and private import parameters usable without changing in-app navigation.
export function launchHash(hash:string, days:Day[], now = new Date()):string {
  const path = hash.replace(/^#/,'').split('?')[0];
  if (path && path !== '/' && !/^\/day(?:\/|$)/.test(path)) return hash;
  const query = hash.indexOf('?');
  return `#/day/${defaultDay(days,now)}${query < 0 ? '' : hash.slice(query)}`;
}
