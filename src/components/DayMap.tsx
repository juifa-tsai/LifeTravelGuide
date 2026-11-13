import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Polyline, Popup, Tooltip, CircleMarker } from 'react-leaflet';
import { LocateFixed, MapPin, Maximize2, Route, Check } from 'lucide-react';
import type { Place, Stop, Layers, Layer } from '../lib/types';
import { hasCoordinates, isCityPlace } from '../lib/data';
import { useStoredState } from '../lib/storage';
import { useOnline } from '../lib/connectivity';
import { CategoryIcon } from './Icon';
import { ExternalLink } from './ExternalLink';
import { PlaceImage } from './PlaceImage';

const layerConfig = [
  { key:'素食餐廳' as Layer, label:'素食', color:'#81916F', className:'vegan', path:'M5 20C5 10 10 5 20 5c0 10-5 15-15 15ZM5 20l11-11' },
  { key:'咖啡廳' as Layer, label:'咖啡', color:'#AA8B70', className:'coffee', path:'M4 9h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5ZM16 10h2a3 3 0 0 1 0 6h-2M8 3v3M12 3v3' },
  { key:'酒吧' as Layer, label:'酒吧', color:'#9A7889', className:'bar', path:'M4 4h16l-8 9ZM12 13v7M8 20h8' },
];
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
export function DayMap({ stops, places, selected, onSelect }: {
  stops:Stop[]; places:Place[]; selected:string | null; onSelect:(pin:MapPinData) => void;
}) {
  const map = useRef<L.Map | null>(null);
  const online = useOnline();
  const pins = useMemo(() => dayPins(stops, places), [stops, places]);
  const [layers, setLayers] = useStoredState<Layers>('map-layers', { '素食餐廳':true, '咖啡廳':true, '酒吧':true });
  const [all, setAll] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [location, setLocation] = useState<L.LatLngTuple | null>(null);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState('');
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const candidates = useMemo(() => places.filter(p => hasCoordinates(p) && layerConfig.some(c => c.key === p.category)), [places]);
  const visibleCandidates = candidates.filter(p => layers[p.category as Layer]);
  // Only adjacent known, distinct places are connected; unknown meal slots break the line.
  const segments = useMemo(() => stops.slice(1).flatMap((stop,i) => {
    const from = places.find(p => p.id === stops[i].placeId);
    const to = places.find(p => p.id === stop.placeId);
    return hasCoordinates(from) && hasCoordinates(to) && from.id !== to.id && from.id !== 'tpe' && to.id !== 'tpe'
      ? [[[from.lat, from.lng], [to.lat, to.lng]] as L.LatLngTuple[]] : [];
  }), [stops, places]);
  function fit(showAll: boolean) {
    if (!map.current) return;
    const city = pins.filter(p => isCityPlace(p.place));
    const points = showAll ? [...pins.map(p => p.place), ...visibleCandidates.filter(hasCoordinates)] : (city.length ? city.map(p => p.place) : candidates.filter(isCityPlace));
    if (points.length) map.current.fitBounds(L.latLngBounds(points.map(p => [p.lat!, p.lng!])), { padding:[42,48], maxZoom:showAll ? 15 : 16, animate:false });
    setAll(showAll);
  }
  useEffect(() => { fit(false); /* MapContainer creates the map synchronously before this effect. */ }, []);
  useEffect(() => {
    const pin = pins.find(p => p.place.id === selected);
    if (pin) map.current?.flyTo([pin.place.lat,pin.place.lng], Math.max(map.current.getZoom(),15), { duration:.5 });
  }, [selected, pins]);
  function locate() {
    if (!navigator.geolocation) { setMessage('此瀏覽器不支援定位，仍可自行瀏覽地圖。'); return; }
    setLocating(true); setMessage('瀏覽器將詢問定位權限，僅取得這一次的位置。');
    navigator.geolocation.getCurrentPosition(result => {
      if (!alive.current) return;
      const point:L.LatLngTuple = [result.coords.latitude,result.coords.longitude];
      setLocation(point); setLocating(false); setMessage('已顯示這一次的位置，不會持續追蹤。'); map.current?.flyTo(point,15);
    }, () => {
      if (!alive.current) return;
      setLocating(false); setMessage('無法取得位置或未授權，仍可自行瀏覽地圖。');
    }, { enableHighAccuracy:false, timeout:10000, maximumAge:0 });
  }
  return <section className="day-map-section" aria-label="當日互動地圖" id="day-map">
    <div className="map-frame">
      <MapContainer ref={map} center={[35.168,136.904]} zoom={14} zoomControl={false} scrollWheelZoom={false} className="day-map">
        {online && <TileLayer className="grayscale-tiles" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'} eventHandlers={{ tileerror:() => setTileError(true) }} />}
        {segments.map((points,i) => <Polyline key={i} positions={points} pathOptions={{ color:'#A8452B', weight:2, dashArray:'5 7', opacity:.65 }} />)}
        {visibleCandidates.filter(hasCoordinates).map(place => {
          const config = layerConfig.find(c => c.key === place.category)!;
          const icon = L.divIcon({ className:`poi-pin ${config.className}`, iconSize:[30,30], iconAnchor:[15,15], html:`<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${config.path}"/></svg>` });
          return <Marker key={place.id} position={[place.lat,place.lng]} icon={icon} title={`${place.nameZh} · 候選`} zIndexOffset={-50}>
            <Tooltip>{place.nameZh} · 候選</Tooltip><Popup><div className="poi-popup"><PlaceImage place={place} compact /><div><span className="eyebrow">{config.label} · 收藏地點</span><strong>{place.nameZh}</strong><span lang="ja">{place.nameJa}</span></div></div>
              {place.dietText && <p className="small">{place.dietText}</p>}{place.id === 'barns' && <p className="note">11/17 為第三個週二，可能休業，請核對。</p>}
              <ExternalLink href={place.mapsUrl} className="text-action">Google Maps ↗</ExternalLink></Popup>
          </Marker>;
        })}
        {pins.map(pin => <Marker key={pin.place.id} position={[pin.place.lat,pin.place.lng]} title={`${pin.number}. ${pin.place.nameZh}`} zIndexOffset={pin.place.id === selected ? 1000 : 100}
          icon={L.divIcon({ className:`itinerary-pin ${pin.place.id === selected ? 'pin-selected' : ''}`, html:`<span>${pin.number}</span>`, iconSize:[30,30], iconAnchor:[15,15] })}
          eventHandlers={{ click:() => onSelect(pin) }}><Tooltip>{pin.place.nameZh}</Tooltip></Marker>)}
        {location && <CircleMarker center={location} radius={8} pathOptions={{ color:'#fff', fillColor:'#4479ab', fillOpacity:1, weight:3 }}><Tooltip>你的位置（單次定位）</Tooltip></CircleMarker>}
      </MapContainer>
      <div className="map-toolbar"><div className="map-views"><button className={!all ? 'active' : ''} onClick={() => fit(false)}><Route size={14} />當日行程</button><button className={all ? 'active' : ''} onClick={() => fit(true)}><Maximize2 size={13} />全部顯示</button></div>
        <button className={`locate-button ${locating ? 'locating' : ''}`} aria-label="定位我的位置（單次）" disabled={locating} onClick={locate}><LocateFixed size={20} /></button></div>
      <div className="map-zoom"><button aria-label="放大地圖" onClick={() => map.current?.zoomIn()}>+</button><button aria-label="縮小地圖" onClick={() => map.current?.zoomOut()}>−</button></div>
      {!online && <div className="offline-map"><MapPin size={21} /><span>離線地圖<span>站點仍可查看，底圖需要網路連線</span></span></div>}
    </div>
    <div className="map-layer-row"><span className="small muted">收藏圖層</span><div className="map-layers">{layerConfig.map(config => <button key={config.key} className={`layer-toggle ${config.className} ${layers[config.key] ? 'is-active' : ''}`} aria-pressed={!!layers[config.key]} onClick={() => setLayers(previous => ({ ...previous, [config.key]:!previous[config.key] }))}>
      <CategoryIcon category={config.key} size={15} />{config.label}{layers[config.key] && <Check size={12} />}</button>)}</div></div>
    <p className="map-caption">虛線僅示意方向，非實際交通路線。<span>地圖標記可點選查看行程。</span></p>
    <p className="coordinate-note">點位依國土地理院地址／設施資料，街區參考點非入口定位。</p>
    {tileError && online && <p className="note" role="status">部分地圖圖磚無法載入；仍可點選站點或開啟 Google Maps。</p>}
    {message && <p className="map-message" role="status">{message}</p>}
  </section>;
}
