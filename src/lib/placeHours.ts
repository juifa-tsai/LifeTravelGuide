import type { Place } from './types';

import { japanDate } from './entryDay';
export { japanDate } from './entryDay';
const weekdays = '日一二三四五六';

export function todayHours(place: Place, date = japanDate()): string {
  if (place.eventPeriod && (date < place.eventPeriod.start || date > place.eventPeriod.end)) return '非活動期間';
  if (place.dateHours && Object.prototype.hasOwnProperty.call(place.dateHours,date)) return place.dateHours[date] || (place.category === '夜間活動' ? '當日無場次' : '今日公休');
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  const closed = (place.closedText || '').replace(/第([1-5])[與、]第([1-5])週([日一二三四五六])/g,'第$1週$3、第$2週$3');
  const ordinal = Math.ceil(Number(date.slice(8)) / 7);
  const nthDay = [...closed.matchAll(/第([1-5])週([日一二三四五六])/g)];
  const nthClosed = !place.dateHours && nthDay.some(match => Number(match[1]) === ordinal && match[2] === weekdays[day]);
  if (nthClosed) return /可能|部分/.test(closed) ? '今日可能公休' : '今日公休';
  if (place.weeklyHours) {
    const hours = place.weeklyHours[String(day)];
    return hours === null ? '今日公休' : hours || '今日時段待確認';
  }
  // Workbook schedules are often for a particular itinerary day. Never reuse
  // that weekday's hours for a different day, even if the numeric time looks valid.
  const regular = closed.replace(/第[1-5]週[日一二三四五六]/g, '');
  const weekdayClosed = [...regular.matchAll(/週([日一二三四五六])/g)].some(match => match[1] === weekdays[day]);
  if (nthClosed || weekdayClosed) return /可能|部分/.test(closed) ? '今日可能公休' : '今日公休';
  const text = place.hoursText || '';
  if (place.category === '住宿') return '入住15:00／退房10:00';
  if (text === '24h') return '24 小時';
  if (text === '戶外') return '戶外開放';
  if (/各店不同|依現場/.test(text)) return text;
  const specified = [...text.matchAll(/週([日一二三四五六])/g)];
  if (specified.length && !specified.some(match => match[1] === weekdays[day])) return '今日時段待確認';
  const periods = text.match(/\d{2}:\d{2}[–~～-](?:翌日?|隔日)?\d{2}:\d{2}/g);
  if (!periods) return '今日時段待確認';
  const suffix = /不定|待核實|待確認/.test(closed) ? '（待確認）' : '';
  return periods.join('／').replace(/[~～〜]/g,'–') + suffix;
}

export function todayCaption(date = japanDate()): string {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return `${Number(date.slice(5,7))}/${Number(date.slice(8))}（${weekdays[day]}）日本時間`;
}

export type OpeningState = 'open' | 'closed' | 'unknown';
export interface OpeningInfo { state:OpeningState; hoursText:string }
export const openingLabels:Record<OpeningState,string> = {open:'營業中',closed:'未營業',unknown:'營業狀態待確認'};
const japanClock = new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});

function openingRanges(text:string):[number,number][] | null {
  if (/待確認|待核實|未確認|可能|各店|依現場|戶外|入住/.test(text)) return null;
  if (['今日公休','非活動期間','當日無場次'].includes(text)) return [];
  if (/^(24\s*小時|24h)$/i.test(text)) return [[0,1440]];
  const ranges:[number,number][] = [];
  for (const match of text.normalize('NFKC').matchAll(/(\d{1,2}):([0-5]\d)\s*[–—~～〜-]\s*(翌日?|隔日)?\s*(\d{1,2}):([0-5]\d)/g)) {
    const start = Number(match[1])*60+Number(match[2]);
    let end = Number(match[4])*60+Number(match[5]);
    if (start >= 1440 || end > 2880 || (start === end && !match[3])) return null;
    if ((match[3] && end < 1440) || end < start) end += 1440;
    ranges.push([start,end]);
  }
  return ranges.length ? ranges : null;
}

// This is a schedule estimate, not a live report from the business. Use both
// calendar days so yesterday's late service can remain open on a closed day.
export function openingInfo(place:Place, now = new Date()):OpeningInfo {
  if (!Number.isFinite(now.getTime())) return {state:'unknown',hoursText:'時段待確認'};
  const date = japanDate(now);
  const hoursText = todayHours(place,date);
  if (/營業狀態待確認|營業狀態未確認/.test(place.hoursNote || '')) return {state:'unknown',hoursText:'營業狀態待確認'};
  const [hour,minute] = japanClock.format(now).split(':').map(Number);
  const minutes = hour*60+minute;
  const today = openingRanges(hoursText);
  if (today?.some(([start,end])=>minutes >= start && minutes < end)) return {state:'open',hoursText};
  const previousDate = new Date(Date.parse(`${date}T00:00:00Z`)-86400000).toISOString().slice(0,10);
  const overnight = openingRanges(todayHours(place,previousDate))?.find(([start,end])=>minutes+1440 >= start && minutes+1440 < end);
  if (overnight) {
    const end = overnight[1]%1440;
    return {state:'open',hoursText:`跨日營業至 ${String(Math.floor(end/60)).padStart(2,'0')}:${String(end%60).padStart(2,'0')}`};
  }
  return {state:today === null ? 'unknown' : 'closed',hoursText};
}
