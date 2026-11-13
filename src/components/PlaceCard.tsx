import { ChevronDown, Clock3, MapPin, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import type { Place, Stop } from '../lib/types';
import { hasCoordinates, stopId } from '../lib/data';
import { CategoryIcon } from './Icon';
import { ExternalLink } from './ExternalLink';
import { PlaceImage } from './PlaceImage';
import { PlaceDetails } from './PlaceDetails';
export function PlaceCard({ stop, place, hotel, selected, onFocus }: {
  stop: Stop; place?: Place; hotel?: Place; selected: boolean; onFocus: (placeId: string, returnToMap?: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const flexible = ['彈性','待選','候選用餐','可選'].includes(stop.displayStatus);
  const title = stop.displayStatus === '固定航班' || stop.category === '早餐' || stop.summary.includes('返回飯店') || stop.summary.includes('退房') || stop.category === '接駁' || stop.category === '航班' ? stop.summary : stop.title;
  return <div className="timeline-stop" id={`stop-${stopId(stop)}`}>
    <div className="timeline-rail"><span className={`timeline-dot ${flexible ? 'flexible' : ''}`}>
      <CategoryIcon category={stop.category} size={15} /></span></div>
    <article className={`stop-card ${selected ? 'selected' : ''} ${flexible ? 'flexible-card' : ''}`}>
      <button className="stop-toggle" aria-expanded={open} aria-controls={`detail-${stopId(stop)}`} onClick={() => { setOpen(!open); if (place && hasCoordinates(place)) onFocus(place.id); }}>
        <span className="stop-overview"><span className="stop-time"><time>{stop.arrivalTime}</time>
          <span className="stay">{stop.timezone === 'Asia/Taipei' ? '台灣時間' : stop.stayMinutes ? `約 ${stop.stayMinutes} 分` : '日本時間'}</span>
          {stop.displayStatus !== '正式行程' && <span className={`badge ${flexible ? 'badge-flexible' : ''}`}>{stop.displayStatus}</span>}</span>
          <span className="stop-title">{title}</span>
          {place?.diningType && <span className={`dining-badge ${place.diningType === '素食餐廳' ? 'vegetarian' : ''}`}>{place.diningType}</span>}
        </span>{place && <PlaceImage place={place} compact credit={false} />}<span className={`expand-icon ${open ? 'is-open' : ''}`}><ChevronDown size={17} /></span>
      </button>
      {open && <div id={`detail-${stopId(stop)}`} className="stop-detail">
        {place && !place.virtual ? <PlaceDetails place={place} hotel={hotel} date={stop.date} onFocus={onFocus} /> : <>
          <p className="stop-summary">{stop.summary}</p>
          {place?.hoursText && <p className="detail-meta"><Clock3 size={14} /><span>{place.hoursText}</span></p>}
          {place?.dietText && <p className="diet-note">{place.dietText}</p>}
          <div className="card-actions"><ExternalLink href={stop.mapsUrl} className="button button-outline"><MapPin size={15} />Google Maps<ArrowUpRight size={14} /></ExternalLink></div>
        </>}
        {stop.note && /預約|不確定|僅預估|末點|末班|核對|μticket|台灣時間|含在住宿|含11|天守閣/.test(stop.note) && <p className="note">{stop.note}</p>}
      </div>}
    </article>
  </div>;
}
