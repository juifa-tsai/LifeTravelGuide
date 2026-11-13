import { BedDouble, Check, ChevronDown, Clock3, Info, LocateFixed, MapPin, MapPinned } from 'lucide-react';
import type { Place } from '../lib/types';
import { hasCoordinates } from '../lib/mapPoints';
import { todayHours } from '../lib/placeHours';
import { distanceKm, formatDistance, type Coordinates } from '../lib/distances';
import { PlaceImage } from './PlaceImage';
import { ExternalLink } from './ExternalLink';

export function CollectionCard({ place, date, position, hotel, visited, selected, onVisit, onFocus }: {
  place: Place; date: string; position: Coordinates | null; hotel: Place | undefined; visited: boolean; selected: boolean;
  onVisit: (checked: boolean) => void; onFocus: (id: string, returnToMap: boolean) => void;
}) {
  const fromHere = formatDistance(hasCoordinates(place) ? distanceKm(position,place) : null);
  const fromHotel = formatDistance(hasCoordinates(place) && hasCoordinates(hotel) ? distanceKm(hotel,place) : null);
  const foodType = place.diningType || place.category;
  const diet = place.dietText?.split(' 奶素可乳製品；')[0];
  const source = place.detailSourceUrls?.[0] || place.sourceUrl || place.website;
  return <article id={`place-${place.id}`} className={`collection-card ${visited ? 'is-visited' : ''} ${selected ? 'selected' : ''}`}>
    <details className="collection-details">
      <summary className="collection-toggle"><PlaceImage place={place} compact /><div className="collection-heading">
        <h2>{place.nameZh}</h2>
        <p className="collection-today"><Clock3 size={12} aria-hidden="true" /><span>{todayHours(place,date)}</span></p>
        <span className={`dining-badge ${foodType === '素食餐廳' ? 'vegetarian' : ''}`}>{foodType}</span>
      </div><span className="collection-distance" aria-label={`距目前位置 ${fromHere}`}><small>目前</small><strong>{fromHere}</strong></span><ChevronDown className="collection-chevron" size={17} aria-hidden="true" /></summary>
      <div className="collection-body">
        <p className="collection-hotel-distance"><BedDouble size={13} aria-hidden="true" />距飯店 <strong>{fromHotel}</strong></p>
        <p className="collection-description">{place.foodDescription || place.summary}</p>
        {place.nameJa !== place.nameZh && <p className="collection-japanese" lang="ja">{place.nameJa}</p>}
        <p className="collection-address"><MapPin size={13} aria-hidden="true" /><span>{place.address}</span></p>
        {(place.hoursNote || place.closedText) && <p className="collection-hours">{place.hoursNote || `休業：${place.closedText}`}</p>}
        {diet && <p className="diet-note">{diet}</p>}
        <div className="collection-actions"><div className="collection-links">
          <ExternalLink href={place.mapsUrl} className="collection-icon-action" label={`在 Google Maps 開啟 ${place.nameZh}`}><MapPinned size={18} aria-hidden="true" /><span className="sr-only">Google Maps</span></ExternalLink>
          {hasCoordinates(place) && <button type="button" className="collection-icon-action" onClick={() => onFocus(place.id,true)} aria-label={`在地圖查看 ${place.nameZh}`}><LocateFixed size={18} aria-hidden="true" /></button>}
          {source && <ExternalLink href={source} className="collection-icon-action" label={`${place.nameZh} 的資料來源`}><Info size={17} aria-hidden="true" /><span className="sr-only">資料來源</span></ExternalLink>}
        </div><label className={`visited-checkbox ${visited ? 'checked' : ''}`}><input type="checkbox" checked={visited} onChange={event => onVisit(event.target.checked)} aria-label={`${place.nameZh} 已造訪`} /><span className="checkbox-visual">{visited && <Check size={12} />}</span>{visited ? '已造訪' : '標記造訪'}</label></div>
      </div>
    </details>
  </article>;
}
