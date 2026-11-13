import { useMemo } from 'react';
import type { Place, Stop } from '../lib/types';
import { dayPins,dailyMapPoints,dailySegments,type MapPinData } from '../lib/mapPoints';
import { TravelMap } from './TravelMap';
export { dayPins,type MapPinData } from '../lib/mapPoints';
export function DayMap({ stops,places,selected,onSelect,onReset,onFavoriteSelect,focusVersion }: {
  stops:Stop[]; places:Place[]; selected:string | null; onSelect:(pin:MapPinData) => void; onReset:() => void; onFavoriteSelect:(id:string) => void; focusVersion:number;
}) {
  const pins = useMemo(() => dayPins(stops,places),[stops,places]);
  const points = useMemo(() => dailyMapPoints(stops,places),[stops,places]);
  const segments = useMemo(() => dailySegments(stops,places),[stops,places]);
  return <TravelMap id="day-map" label="當日行程與收藏地圖" points={points} focusIds={pins.map(pin => pin.place.id)} selected={selected} onReset={onReset} segments={segments} focusVersion={focusVersion} onSelect={id => {
    const pin = pins.find(pin => pin.place.id === id);
    if (pin) onSelect(pin); else onFavoriteSelect(id);
  }} />;
}
