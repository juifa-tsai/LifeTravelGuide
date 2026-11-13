import { ChevronDown, Clock3 } from 'lucide-react';
import type { Place } from '../lib/types';
import { hasCoordinates } from '../lib/mapPoints';
import { todayHours } from '../lib/placeHours';
import { distanceKm, formatDistance, type Coordinates } from '../lib/distances';
import { PlaceImage } from './PlaceImage';
import { PlaceDetails } from './PlaceDetails';

export function CollectionCard({ place, date, position, hotel, visited, selected, onVisit, onFocus }: {
  place: Place; date: string; position: Coordinates | null; hotel: Place | undefined; visited: boolean; selected: boolean;
  onVisit: (checked: boolean) => void; onFocus: (id: string, returnToMap: boolean) => void;
}) {
  const fromHere = formatDistance(hasCoordinates(place) ? distanceKm(position,place) : null);
  const foodType = place.diningType || place.category;
  return <article id={`place-${place.id}`} className={`collection-card ${visited ? 'is-visited' : ''} ${selected ? 'selected' : ''}`}>
    <details className="collection-details">
      <summary className="collection-toggle"><PlaceImage place={place} compact /><div className="collection-heading">
        <h2>{place.nameZh}</h2>
        <p className="collection-today"><Clock3 size={12} aria-hidden="true" /><span>{todayHours(place,date)}</span></p>
        <span className={`dining-badge ${foodType === '素食餐廳' ? 'vegetarian' : ''}`}>{foodType}</span>
      </div><span className="collection-distance" aria-label={`距目前位置 ${fromHere}`}><small>目前</small><strong>{fromHere}</strong></span><ChevronDown className="collection-chevron" size={17} aria-hidden="true" /></summary>
      <div className="collection-body"><PlaceDetails place={place} hotel={hotel} visited={visited} onVisit={onVisit} onFocus={onFocus} /></div>
    </details>
  </article>;
}
