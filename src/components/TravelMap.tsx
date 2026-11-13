import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Polyline, Popup, Tooltip, CircleMarker, useMap } from 'react-leaflet';
import { BedDouble, LocateFixed, MapPin, Route, Clock3, MapPinned } from 'lucide-react';
import { useOnline } from '../lib/connectivity';
import { isCityPlace, type MapPoint } from '../lib/mapPoints';
import { CategoryIcon } from './Icon';
import { PlaceImage } from './PlaceImage';
import { ExternalLink } from './ExternalLink';
import { compactHours } from '../lib/hours';
import type { Coordinates } from '../lib/distances';

const categoryStyle = {
  '素食餐廳':{ className:'vegan',label:'素食',path:'M5 20C5 10 10 5 20 5c0 10-5 15-15 15ZM5 20l11-11' },
  '咖啡廳':{ className:'coffee',label:'咖啡',path:'M4 9h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5ZM16 10h2a3 3 0 0 1 0 6h-2M8 3v3M12 3v3' },
  '酒吧':{ className:'bar',label:'酒吧',path:'M4 4h16l-8 9ZM12 13v7M8 20h8' },
};
function icon(point:MapPoint, selected:boolean) {
  const style = categoryStyle[point.place.category as keyof typeof categoryStyle];
  const lodging = point.place.category === '住宿';
  const path = lodging ? 'M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 15h18M5 9V5h14v4M8 9V7h3v2M13 9V7h3v2' : style?.path ?? 'M12 21s-7-6-7-12a7 7 0 0 1 14 0c0 6-7 12-7 12ZM12 6v6M9 9h6';
  const content = point.number && !lodging ? String(point.number) : `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>${lodging && point.number ? `<small class="lodging-number">${point.number}</small>` : ''}`;
  return L.divIcon({ className:`travel-marker ${lodging ? 'lodging-marker' : point.number ? 'formal-marker' : style?.className ?? 'place-marker'} ${selected ? 'marker-selected' : ''}`, html:`<span data-place-id="${point.place.id}" data-favorite="${point.favorite}" data-lodging="${lodging}">${content}</span>`, iconSize:[32,32], iconAnchor:[16,16] });
}
function MapViewport({ points, focusIds, selected, reset,focusVersion }: { points:MapPoint[]; focusIds:string[]; selected:string | null; reset:number; focusVersion:number }) {
  const map = useMap();
  const city = points.filter(point => isCityPlace(point.place));
  const focus = city.filter(point => focusIds.includes(point.place.id));
  const targets = focus.length ? focus : city.length ? city : points;
  const signature = targets.map(point => `${point.place.id}:${point.place.lat},${point.place.lng}`).join('|');
  useEffect(() => {
    if (targets.length) map.fitBounds(L.latLngBounds(targets.map(point => [point.place.lat,point.place.lng])),{ padding:[34,34],maxZoom:15,animate:false });
  },[map,signature,reset]);
  const active = points.find(point => point.place.id === selected);
  useEffect(() => {
    if (active) map.flyTo([active.place.lat,active.place.lng],Math.max(map.getZoom(),active.place.category === '住宿' ? 16 : 15),{ duration:.4 });
  },[map,active?.place.id,focusVersion]);
  return null;
}
export function TravelMap({ id,label,points,focusIds,selected,onSelect,onFocusPlace,onReset,onLocation,segments = [],focusVersion = 0 }: {
  id:string; label:string; points:MapPoint[]; focusIds:string[]; selected:string | null;
  onSelect:(id:string) => void; onFocusPlace:(id:string) => void; onReset:() => void; segments?:[number,number][][]; focusVersion?:number; onLocation?:(point:Coordinates | null) => boolean | void;
}) {
  const online = useOnline();
  const map = useRef<L.Map | null>(null);
  const alive = useRef(true);
  const [reset,setReset] = useState(0);
  const [location,setLocation] = useState<L.LatLngTuple | null>(null);
  const [locating,setLocating] = useState(false);
  const [message,setMessage] = useState('');
  const [tileError,setTileError] = useState(false);
  const lodging = points.find(point => point.place.category === '住宿');
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; },[]);
  const markerIcons = useMemo(() => new Map(points.map(point => [point.place.id,icon(point,point.place.id === selected)])),[points,selected]);
  function locate() {
    if (!navigator.geolocation) { onLocation?.(null); setMessage('此瀏覽器不支援定位。'); return; }
    setLocating(true); setMessage('正在取得位置…');
    navigator.geolocation.getCurrentPosition(result => {
      if (!alive.current) return;
      const position:L.LatLngTuple = [result.coords.latitude,result.coords.longitude];
      const accepted = onLocation?.({ lat:position[0],lng:position[1] });
      setLocation(accepted === false ? null : position); setLocating(false); setMessage('');
      if (accepted !== false) map.current?.flyTo(position,15);
    },() => {
      if (!alive.current) return;
      onLocation?.(null); setLocating(false); setMessage('無法取得位置，請確認瀏覽器定位權限。');
    },{ enableHighAccuracy:false,timeout:10000,maximumAge:0 });
  }
  return <section className="travel-map-section" id={id} aria-label={label}>
    <div className="map-frame">
      <MapContainer ref={map} center={[35.168,136.904]} zoom={14} scrollWheelZoom={false} zoomControl={false} className="travel-map">
        {online && <TileLayer className="muted-map-tiles" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'} eventHandlers={{ tileerror:() => setTileError(true) }} />}
        <MapViewport points={points} focusIds={focusIds} selected={selected} reset={reset} focusVersion={focusVersion} />
        {segments.map((positions,index) => <Polyline key={index} positions={positions} pathOptions={{ color:'#A8452B',weight:2,dashArray:'5 7',opacity:.7 }} />)}
        {points.map(point => <Marker key={point.place.id} position={[point.place.lat,point.place.lng]} icon={markerIcons.get(point.place.id)} title={point.place.nameZh} zIndexOffset={point.place.id === selected ? 1000 : point.number ? 100 : 0}
          eventHandlers={{
            add:event => event.target.getElement()?.setAttribute('aria-label',point.place.nameZh),
            click:() => onSelect(point.place.id),
            keydown:event => {
              if (event.originalEvent.key === 'Enter' || event.originalEvent.key === ' ') {
                event.originalEvent.preventDefault();
                event.target.openPopup();
                onSelect(point.place.id);
              }
            },
          }}>
          <Tooltip>{point.place.nameZh}</Tooltip><Popup className="place-popup"><div className="map-popup"><PlaceImage place={point.place} compact /><div><strong>{point.place.nameZh}</strong><span lang="ja">{point.place.nameJa}</span><span>{point.place.category}</span></div>
            <ExternalLink href={point.place.mapsUrl} className="map-popup-link" label={`在 Google Maps 開啟 ${point.place.nameZh}`}><MapPinned size={18} aria-hidden="true" /><span className="sr-only">Google Maps</span></ExternalLink></div>
            <p className="map-popup-hours"><Clock3 size={13} aria-hidden="true" /><span>{compactHours(point.place)}</span></p>
            {point.place.closedText && <p className="map-popup-closed">休業：{point.place.closedText}</p>}
            {point.place.id === 'barns' && <p className="note">11/17 可能休業，請核對。</p>}
          </Popup>
        </Marker>)}
        {location && <CircleMarker center={location} radius={8} pathOptions={{ color:'#fff',weight:3,fillColor:'#4479AB',fillOpacity:1 }}><Tooltip>你的位置</Tooltip></CircleMarker>}
      </MapContainer>
      <div className="map-zoom"><button aria-label="放大地圖" onClick={() => map.current?.zoomIn()}>+</button><button aria-label="縮小地圖" onClick={() => map.current?.zoomOut()}>−</button></div>
      {!online && <div className="offline-map map-offline-banner"><MapPin size={17} /><span>離線地圖 · 底圖需連線</span></div>}
    </div>
    <div className="map-tools"><button className="text-action" onClick={() => { onReset(); setReset(previous => previous+1); }}><Route size={16} />地圖總覽</button>{lodging && <button className="text-action lodging-action" title={lodging.place.nameZh} onClick={() => onFocusPlace(lodging.place.id)}><BedDouble size={17} />回到住宿</button>}<button className="text-action" aria-label="定位我的位置" disabled={locating} onClick={locate}><LocateFixed size={17} />{locating ? '定位中' : '我的位置'}</button></div>
    <div className="map-legend" aria-label="地點圖例">{lodging && <span className="lodging-legend"><BedDouble size={14} />住宿</span>}{Object.entries(categoryStyle).filter(([category]) => points.some(point => point.place.category === category)).map(([category,style]) => <span key={category} className={style.className}><CategoryIcon category={category} size={14} />{style.label}</span>)}{segments.length > 0 && <small>虛線為行程示意</small>}</div>
    {tileError && online && <p className="map-message" role="status">部分底圖暫時無法載入，仍可點選地點標記。</p>}
    {message && <p className="map-message" role="status">{message}</p>}
  </section>;
}
