import { useState } from 'react';
import type { Place } from '../lib/types';
import { CategoryIcon } from './Icon';
export function PlaceImage({ place, compact = false }: { place: Place; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  const src = place.imageUrl?.startsWith('images/') ? `${import.meta.env.BASE_URL}${place.imageUrl}` : place.imageUrl;
  return <figure className={`place-image ${compact ? 'compact' : ''} category-${place.id}`}>
    {src && !failed ? <><img src={src} alt={place.nameZh} loading="lazy" onError={() => setFailed(true)} />{place.imageAttribution && <figcaption>{place.imageAttribution}</figcaption>}</>
    : <div className="image-placeholder" aria-label={`${place.nameZh}，照片待補`}><CategoryIcon category={place.category} size={compact ? 27 : 34} />{!compact && <span>{place.category} · NAGOYA</span>}</div>}
  </figure>;
}
