import { useState } from 'react';
import type { Place } from '../lib/types';
import { CategoryIcon } from './Icon';
export function PlaceImage({ place, compact = false, credit = true }: { place: Place; compact?: boolean; credit?: boolean }) {
  const [failed, setFailed] = useState(false);
  const src = place.imageUrl?.startsWith('images/') ? `${import.meta.env.BASE_URL}${place.imageUrl}` : place.imageUrl;
  return <span className={`place-image ${compact ? 'compact' : ''} category-${place.id}`}>
    {src && !failed ? <><img src={src} alt={place.imageAlt || place.nameZh} loading="lazy" decoding="async" width={compact ? 88 : 960} height={compact ? 88 : 600} onError={() => setFailed(true)} />
      {place.imageKind === 'illustration' && <span className="image-kind">示意</span>}
      {credit && place.imageAttribution && <a className="image-credit" href={place.imageSourceUrl || undefined} target="_blank" rel="noopener noreferrer" title={place.imageAttribution} aria-label={`照片來源：${place.imageAttribution}`}>{place.imageAttribution}</a>}
    </>
    : <span className="image-placeholder" aria-label={`${place.nameZh}，照片暫時無法顯示`}><CategoryIcon category={place.category} size={compact ? 27 : 34} /></span>}
  </span>;
}
