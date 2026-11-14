import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Polyline, Popup, Tooltip, CircleMarker, useMap } from 'react-leaflet';
import { BedDouble, LocateFixed, MapPin, Route, Clock3, MapPinned } from 'lucide-react';
import { useOnline } from '../lib/connectivity';
import { isCityPlace, type MapPoint } from '../lib/mapPoints';
import { categoryMarkerSvg } from './Icon';
import { PlaceImage } from './PlaceImage';
import { ExternalLink } from './ExternalLink';
import { compactHours } from '../lib/hours';
import { ReservationBadge } from './ReservationBadge';
import type { Coordinates } from '../lib/distances';

const categoryStyle = {
  '素食餐廳':{ className:'vegan' },
  '咖啡廳':{ className:'coffee' },
  '酒吧':{ className:'bar' },
};
function icon(point:MapPoint, selected:boolean) {
  const style = categoryStyle[point.place.category as keyof typeof categoryStyle];
  const lodging = point.place.category === '住宿';
  const content = `<span data-place-id="${point.place.id}" data-favorite="${point.favorite}" data-lodging="${lodging}">${categoryMarkerSvg(point.place.category)}</span>`;
  return L.divIcon({ className:`travel-marker ${lodging ? 'lodging-marker' : style?.className ?? 'place-marker'} ${selected ? 'marker-selected' : ''}`, html:content, iconSize:[32,32], iconAnchor:[16,16] });
}
function MapViewport({ points, focusIds, selected, reset,focusVersion }: { points:MapPoint[]; focusIds:string[]; selected:string | null; reset:number; focusVersion:number }) {
  const map = useMap();
  const city = points.filter(point => isCityPlace(point.place));
  const focus = city.filter(point => focusIds.includes(point.place.id));
  const targets = focus.length ? focus : city.length ? city : points;
  const signature = targets.map(point => `${point.place.id}:${point.place.lat},${point.place.lng}`).join('|');
  useEffect(() => {
    map.stop();
    map.closePopup();
    if (targets.length) map.fitBounds(L.latLngBounds(targets.map(point => [point.place.lat,point.place.lng])),{ padding:[34,34],maxZoom:15,animate:false });
  },[map,signature]);
  useEffect(() => {
    if (!reset) return;
    // Overview covers every marker in the current layer, including lodging.
    // Stop flyTo and popup auto-pan before fitting so they cannot override it.
    map.stop();
    map.closePopup();
    map.invalidateSize({ pan:false });
    if (points.length) map.fitBounds(L.latLngBounds(points.map(point => [point.place.lat,point.place.lng])),{ padding:[34,34],maxZoom:15,animate:false });
  },[map,reset]);
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
      <MapContainer ref={map} center={[35.168,136.904]} zoom={14} scrollWheelZoom={false} zoomControl={false} zoomAnimation={false} className="travel-map">
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
          <Tooltip>{point.place.nameZh}</Tooltip><Popup className="place-popup"><div className="map-popup"><PlaceImage place={point.place} compact /><div><strong>{point.place.nameZh}</strong><span lang="ja">{point.place.nameJa}</span><span>{point.place.category}</span><ReservationBadge place={point.place} /></div>
            <ExternalLink href={point.place.mapsUrl} className="map-popup-link" label={`在 Google Maps 開啟 ${point.place.nameZh}`}><MapPinned size={18} aria-hidden="true" /><span className="sr-only">Google Maps</span></ExternalLink></div>
            <p className="map-popup-hours"><Clock3 size={13} aria-hidden="true" /><span>{compactHours(point.place)}</span></p>
            {(point.place.dateHours ? point.place.hoursNote : point.place.closedText) && <p className="map-popup-closed">{point.place.dateHours ? point.place.hoursNote : `休業：${point.place.closedText}`}</p>}
          </Popup>
        </Marker>)}
        {location && <CircleMarker center={location} radius={8} pathOptions={{ color:'#fff',weight:3,fillColor:'#4479AB',fillOpacity:1 }}><Tooltip>你的位置</Tooltip></CircleMarker>}
      </MapContainer>
      <div className="map-zoom"><button aria-label="放大地圖" onClick={() => map.current?.zoomIn()}>+</button><button aria-label="縮小地圖" onClick={() => map.current?.zoomOut()}>−</button></div>
      {!online && <div className="offline-map map-offline-banner"><MapPin size={17} /><span>離線地圖 · 底圖需連線</span></div>}
    </div>
    <div className="map-tools"><button className="text-action" onClick={() => { onReset(); setReset(previous => previous+1); }}><Route size={16} />地圖總覽</button>{lodging && <button className="text-action lodging-action" title={lodging.place.nameZh} onClick={() => onFocusPlace(lodging.place.id)}><BedDouble size={17} />回到住宿</button>}<button className="text-action" aria-label="定位我的位置" disabled={locating} onClick={locate}><LocateFixed size={17} />{locating ? '定位中' : '我的位置'}</button></div>
    {tileError && online && <p className="map-message" role="status">部分底圖暫時無法載入，仍可點選地點標記。</p>}
    {message && <p className="map-message" role="status">{message}</p>}
  </section>;
}
