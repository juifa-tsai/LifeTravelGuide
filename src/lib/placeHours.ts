import type { Place } from './types';

import { japanDate } from './entryDay';
export { japanDate } from './entryDay';
const weekdays = '日一二三四五六';

export function todayHours(place: Place, date = japanDate()): string {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  const closed = (place.closedText || '').replace(/第([1-5])[與、]第([1-5])週([日一二三四五六])/g,'第$1週$3、第$2週$3');
  const ordinal = Math.ceil(Number(date.slice(8)) / 7);
  const nthDay = [...closed.matchAll(/第([1-5])週([日一二三四五六])/g)];
  const nthClosed = nthDay.some(match => Number(match[1]) === ordinal && match[2] === weekdays[day]);
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
