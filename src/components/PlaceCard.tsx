import { ChevronDown, Clock3, MapPin, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import type { Place, Stop } from '../lib/types';
import { hasCoordinates, stopId } from '../lib/data';
import { CategoryIcon } from './Icon';
import { ExternalLink } from './ExternalLink';
import { PlaceImage } from './PlaceImage';
export function PlaceCard({ stop, place, selected, number, onFocus }: {
  stop: Stop; place?: Place; selected: boolean; number?: number; onFocus: (placeId: string, returnToMap?: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const flexible = ['彈性','待選','候選用餐','可選'].includes(stop.displayStatus);
  const title = stop.displayStatus === '固定航班' || stop.category === '早餐' || stop.summary.includes('返回飯店') || stop.summary.includes('退房') || stop.category === '接駁' || stop.category === '航班' ? stop.summary : stop.title;
  return <div className="timeline-stop" id={`stop-${stopId(stop)}`}>
    <div className="timeline-rail"><span className={`timeline-dot ${flexible ? 'flexible' : ''}`}>
      {number ? <span>{number}</span> : <CategoryIcon category={stop.category} size={15} />}</span></div>
    <article className={`stop-card ${selected ? 'selected' : ''} ${flexible ? 'flexible-card' : ''}`}>
      <button className="stop-toggle" aria-expanded={open} aria-controls={`detail-${stopId(stop)}`} onClick={() => { setOpen(!open); if (place && hasCoordinates(place)) onFocus(place.id); }}>
        <span className="stop-overview"><span className="stop-time"><time>{stop.arrivalTime}</time>
          <span className="stay">{stop.timezone === 'Asia/Taipei' ? '台灣時間' : stop.stayMinutes ? `約 ${stop.stayMinutes} 分` : '日本時間'}</span>
          {stop.displayStatus !== '正式行程' && <span className={`badge ${flexible ? 'badge-flexible' : ''}`}>{stop.displayStatus}</span>}</span>
          <span className="stop-title">{title}</span><span className="japanese" lang="ja">{place?.nameJa ?? '地點資訊待補'}</span>
          {flexible && <span className="flexible-caption">參考時間 · 依當天狀況調整</span>}
        </span><span className={`expand-icon ${open ? 'is-open' : ''}`}><ChevronDown size={17} /></span>
      </button>
      {open && <div id={`detail-${stopId(stop)}`} className="stop-detail">
        {place && !place.virtual && <PlaceImage place={place} />}
        <p className="stop-summary">{stop.summary}</p>
        {place?.hoursText && <p className="detail-meta"><Clock3 size={14} /><span>{place.hoursText}<small>行前資料，出發前請複核</small></span></p>}
        {place && !place.virtual && <p className="detail-meta"><MapPin size={14} /><span>{place.address}</span></p>}
        {stop.note && <p className="note">{stop.note}</p>}
        {place?.dietText && <p className="diet-note">奶素確認 · {place.dietText}；請確認無肉、魚、蛋及動物高湯。</p>}
        {place?.id === 'toraya' && <p className="note">週一營業仍需於出發前複核。</p>}
        {place?.virtual && <p className="note">現場尋找可確認奶素餐點{place.id === 'late_dinner' ? '的晚間輕食；杏ZU僅為早到候選，週日餐點末點約21:30。' : '；候選店家不代表已確定用餐。'}</p>}
        <div className="card-actions"><ExternalLink href={stop.mapsUrl} className="button button-outline"><MapPin size={15} />Google Maps<ArrowUpRight size={14} /></ExternalLink>
          {hasCoordinates(place) ? <button className="text-action" onClick={() => onFocus(place.id, true)}>在地圖查看</button> : <span className="small muted">{place?.virtual ? '彈性區塊，不設地圖標記' : '座標待確認'}</span>}</div>
      </div>}
    </article>
  </div>;
}
