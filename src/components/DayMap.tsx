import { useEffect, useMemo, useRef, useState } from 'react';
import { LocateFixed, MapPin, Route } from 'lucide-react';
import type { Place, Stop } from '../lib/types';
import { hasCoordinates, isCityPlace } from '../lib/data';
import { useOnline } from '../lib/connectivity';

export interface MapPinData { place: Place & { lat:number; lng:number }; stop: Stop; number: number }
export function dayPins(stops: Stop[], places: Place[]): MapPinData[] {
  const seen = new Set<string>();
  return stops.flatMap(stop => {
    const place = places.find(p => p.id === stop.placeId);
    if (!hasCoordinates(place) || place.id === 'tpe' || seen.has(place.id)) return [];
    seen.add(place.id);
    return [{ place, stop, number:seen.size }];
  });
}
export function DayMap({ stops, places, selected, onSelect, onReset }: {
  stops:Stop[]; places:Place[]; selected:string | null; onSelect:(pin:MapPinData) => void; onReset:() => void;
}) {
  const online = useOnline();
  const pins = useMemo(() => dayPins(stops, places), [stops, places]);
  const [overview, setOverview] = useState(true);
  const [location, setLocation] = useState<[number,number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState('');
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { if (selected) { setOverview(false); setLocation(null); } }, [selected]);
  const cityPins = pins.filter(pin => isCityPlace(pin.place));
  const initial = cityPins[0] ?? pins[0];
  const active = !overview && !location ? pins.find(pin => pin.place.id === selected) : undefined;
  const query = location ? location.join(',') : active ? `${active.place.nameJa} ${active.place.address}` : initial ? `${initial.place.lat},${initial.place.lng}` : 'Nagoya, Japan';
  const mapUrl = `https://www.google.com/maps?${new URLSearchParams({ q:query, z:overview ? '13' : '16', hl:'zh-TW', output:'embed' })}`;
  function locate() {
    if (!navigator.geolocation) { setMessage('此瀏覽器不支援定位。'); return; }
    setLocating(true); setMessage('正在取得位置…');
    navigator.geolocation.getCurrentPosition(result => {
      if (!alive.current) return;
      setLocation([result.coords.latitude,result.coords.longitude]); setOverview(false); setLocating(false); setMessage('');
    }, () => {
      if (!alive.current) return;
      setLocating(false); setMessage('無法取得位置，請確認瀏覽器定位權限。');
    }, { enableHighAccuracy:false, timeout:10000, maximumAge:0 });
  }
  return <section className="day-map-section" aria-label="當日 Google 地圖" id="day-map">
    <div className="map-frame google-map-frame">
      {online ? <iframe className="google-map" title={active ? `${active.place.nameZh} Google 地圖` : '名古屋當日 Google 地圖'} src={mapUrl} referrerPolicy="strict-origin-when-cross-origin" allowFullScreen loading="eager" />
        : <div className="offline-map"><MapPin size={21} /><span>地圖需要網路連線</span></div>}
    </div>
    <div className="google-map-tools"><button className="text-action" onClick={() => { setOverview(true); setLocation(null); onReset(); }}><Route size={16} />當日總覽</button><button className="text-action" aria-label="定位我的位置" disabled={locating} onClick={locate}><LocateFixed size={17} />{locating ? '定位中' : '我的位置'}</button></div>
    <div className="map-stops" aria-label="地圖站點">{pins.map(pin => <button key={pin.place.id} className={active?.place.id === pin.place.id ? 'active' : ''} aria-pressed={active?.place.id === pin.place.id} onClick={() => { setOverview(false); setLocation(null); onSelect(pin); }}><span>{pin.number}</span>{pin.place.nameZh}</button>)}</div>
    {message && <p className="map-message" role="status">{message}</p>}
  </section>;
}
