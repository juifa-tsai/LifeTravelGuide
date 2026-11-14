import { BedDouble, Check, Clock3, Info, LocateFixed, MapPin, MapPinned } from 'lucide-react';
import type { Place } from '../lib/types';
import { hasCoordinates } from '../lib/mapPoints';
import { distanceKm, formatDistance } from '../lib/distances';
import { todayHours } from '../lib/placeHours';
import { shortDate } from '../lib/data';
import { ExternalLink } from './ExternalLink';

// One detail layout for the collection and daily timeline, without a second photo.
export function PlaceDetails({ place, hotel, date, visited, onVisit, onFocus }: {
  place:Place; hotel?:Place; date?:string; visited?:boolean; onVisit?:(checked:boolean) => void;
  onFocus:(id:string, returnToMap:boolean) => void;
}) {
  const fromHotel = formatDistance(hasCoordinates(place) && hasCoordinates(hotel) ? distanceKm(hotel,place) : null);
  const diet = place.dietText?.split(' 奶素可乳製品；')[0];
  const source = place.detailSourceUrls?.[0] || place.sourceUrl || place.website;
  return <div className="place-details">
    <p className="collection-hotel-distance"><BedDouble size={15} aria-hidden="true" />距飯店 <strong>{fromHotel}</strong></p>
    <p className="collection-description">{place.foodDescription || place.summary}</p>
    {place.nameJa !== place.nameZh && <p className="collection-japanese" lang="ja">{place.nameJa}</p>}
    {date && <p className="detail-meta"><Clock3 size={15} aria-hidden="true" /><span>{shortDate(date)}：{todayHours(place,date).replace('今日','當日')}</span></p>}
    <p className="collection-address"><MapPin size={15} aria-hidden="true" /><span>{place.address}</span></p>
    {(place.hoursNote || place.closedText) && <p className="collection-hours">{place.hoursNote || `休業：${place.closedText}`}</p>}
    {diet && <p className="diet-note">{diet}</p>}
    <div className="collection-actions"><div className="collection-links">
      <ExternalLink href={place.mapsUrl} className="collection-icon-action" label={`在 Google Maps 開啟 ${place.nameZh}`}><MapPinned size={20} aria-hidden="true" /><span className="sr-only">Google Maps</span></ExternalLink>
      {hasCoordinates(place) && <button type="button" className="collection-icon-action" onClick={() => onFocus(place.id,true)} aria-label={`在地圖查看 ${place.nameZh}`}><LocateFixed size={20} aria-hidden="true" /></button>}
      {source && <ExternalLink href={source} className="collection-icon-action" label={`${place.nameZh} 的資料來源`}><Info size={19} aria-hidden="true" /><span className="sr-only">資料來源</span></ExternalLink>}
    </div>{onVisit && <label className={`visited-checkbox ${visited ? 'checked' : ''}`}><input type="checkbox" checked={!!visited} onChange={event => onVisit(event.target.checked)} aria-label={`${place.nameZh} 已造訪`} /><span className="checkbox-visual">{visited && <Check size={12} />}</span>{visited ? '已造訪' : '標記造訪'}</label>}</div>
  </div>;
}
