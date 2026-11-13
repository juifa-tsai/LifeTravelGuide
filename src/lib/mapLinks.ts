import type { Place } from './types';
export function directions(from: Place, to: Place, mode: string) {
  const params = new URLSearchParams({ api:'1', origin:`${from.nameJa} ${from.address}`, destination:`${to.nameJa} ${to.address}` });
  if (mode === '步行') params.set('travelmode','walking');
  else if (mode.includes('專車')) params.set('travelmode','driving');
  else if (mode.includes('地鐵') || mode.includes('名鐵')) params.set('travelmode','transit');
  return `https://www.google.com/maps/dir/?${params}`;
}
