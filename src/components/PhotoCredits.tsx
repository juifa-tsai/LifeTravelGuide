import type { Place, TravelDocument } from '../lib/types';
import { ExternalLink } from './ExternalLink';
import { ChevronDown } from 'lucide-react';
export function PhotoCredits({places,documents}:{places:Place[];documents:TravelDocument[]}) {
  const photos=[...new Map(places.filter(place=>place.imageUrl && place.imageAttribution).map(place=>[place.imageUrl,place])).values()];
  return <details className="photo-credits"><summary>圖片授權<ChevronDown size={14} aria-hidden="true" /></summary><p>照片已縮放及轉為 WebP，原作者與截圖來源的權利保留。詳細處理方式見 <a href={`${import.meta.env.BASE_URL}images/credits.json`} target="_blank" rel="noopener noreferrer">照片紀錄</a>、<a href={`${import.meta.env.BASE_URL}transport/credits.json`} target="_blank" rel="noopener noreferrer">交通圖紀錄</a>。</p><ul>{photos.map(place=><li key={place.imageUrl}><strong>{place.imageAlt || place.nameZh}</strong><span><ExternalLink href={place.imageSourceUrl!}>{place.imageAttribution}</ExternalLink> · <ExternalLink href={place.imageLicenseUrl!}>{place.imageRights === 'original-rights' ? '使用條款' : '授權'}</ExternalLink></span></li>)}{documents.filter(document=>document.preview).map(document=><li key={document.id}><strong>{document.title}</strong><ExternalLink href={document.url}>{document.preview!.attribution}</ExternalLink></li>)}</ul></details>;
}
