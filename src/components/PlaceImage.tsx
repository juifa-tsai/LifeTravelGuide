import { useState } from 'react';
import type { Place } from '../lib/types';
import { CategoryIcon } from './Icon';
import { MapPinned } from 'lucide-react';
export function PlaceImage({ place, compact = false, linked = true }: { place: Place; compact?: boolean; linked?: boolean }) {
  const [failed, setFailed] = useState(false);
  const src = place.imageUrl?.startsWith('images/') ? `${import.meta.env.BASE_URL}${place.imageUrl}` : place.imageUrl;
  const image = src && !failed ? <><img src={src} alt={place.imageAlt || place.nameZh} loading="lazy" decoding="async" width={compact ? 88 : 960} height={compact ? 88 : 600} onError={() => setFailed(true)} />
      {place.imageKind === 'illustration' && <span className="image-kind">示意</span>}
    </>
    : <span className="image-placeholder" aria-label={`${place.nameZh}，照片暫時無法顯示`}><CategoryIcon category={place.category} size={compact ? 27 : 34} /></span>;
  return <span className={`place-image ${compact ? 'compact' : ''} category-${place.id}`}>
    {linked ? <a className="place-image-link" href={place.mapsUrl} target="_blank" rel="noopener noreferrer" aria-label={`在 Google Maps 開啟 ${place.nameZh}（圖片）`}>{image}<span className="image-map-link-icon"><MapPinned size={12} aria-hidden="true" /></span></a> : image}
  </span>;
}
