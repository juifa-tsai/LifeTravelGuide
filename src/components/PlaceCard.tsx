import { ChevronDown, Clock3, MapPin, MapPinned, ArrowUpRight } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import type { Place, Stop, TravelDocument } from '../lib/types';
import { bookingForStop } from '../data/bookingBasics';
import { hasCoordinates, stopId } from '../lib/data';
import { CategoryIcon } from './Icon';
import { ExternalLink } from './ExternalLink';
import { PlaceImage } from './PlaceImage';
import { PlaceDetails } from './PlaceDetails';
import { durationHours } from '../lib/timeline';
const BookingDetails = lazy(()=>import('./BookingDetails'));
export function PlaceCard({ stop, place, hotel, documents, checkInTime, selected, onFocus }: {
  stop: Stop; place?: Place; hotel?: Place; documents:TravelDocument[]; checkInTime?:string; selected: boolean; onFocus: (placeId: string, returnToMap?: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const flexible = /彈性|待選|候選用餐|可選/.test(stop.displayStatus);
  const flight = stop.displayStatus === '固定航班';
  const duration = durationHours(stop.stayMinutes);
  const booking = bookingForStop(stop);
  const title = booking?.kind === 'flight' ? `${booking.from.airport} ${booking.from.terminal} → ${booking.to.airport} ${booking.to.terminal}` : stop.displayStatus === '固定航班' || stop.summary.includes('返回飯店') || stop.summary.includes('退房') || stop.category === '接駁' || stop.category === '航班' ? stop.summary : stop.title;
  return <div className="timeline-stop" id={`stop-${stopId(stop)}`}>
    <div className="timeline-rail"><span className={`timeline-dot ${flexible ? 'flexible' : ''}`}>
      <CategoryIcon category={stop.category} size={15} /></span></div>
    <article className={`stop-card ${selected ? 'selected' : ''} ${flexible ? 'flexible-card' : ''}`}>
      <button className="stop-toggle" aria-expanded={open} aria-controls={`detail-${stopId(stop)}`} onClick={() => { setOpen(!open); if (place && hasCoordinates(place)) onFocus(place.id); }}>
        <span className="stop-overview"><span className="stop-time">
          {flight ? <><time>{stop.arrivalTime}</time><span className="stay">{stop.timezone === 'Asia/Taipei' ? '台灣時間' : '日本時間'}</span></> : duration ? <span className="stop-duration">{duration}</span> : <span className="stay">時間彈性</span>}
          {stop.displayStatus !== '正式行程' && <span className={`badge ${flexible ? 'badge-flexible' : ''}`}>{stop.displayStatus}</span>}</span>
          <span className="stop-title">{title}</span>
          {booking && <span className="booking-caption">{booking.kind === 'flight' ? `${booking.key} · ${booking.cabin}` : `${booking.room.split(' · ')[0]} · 3 晚`}</span>}
          {checkInTime && <span className="booking-caption">{checkInTime} 登機報到 · 日本時間</span>}
          {place?.diningType && <span className={`dining-badge ${place.diningType === '素食餐廳' ? 'vegetarian' : ''}`}>{place.diningType}</span>}
        </span>{place && <PlaceImage place={place} compact linked={false} />}<span className={`expand-icon ${open ? 'is-open' : ''}`}><ChevronDown size={17} /></span>
      </button>
      {open && <div id={`detail-${stopId(stop)}`} className="stop-detail">
        {stop.category === '接駁' && stop.displayStatus === '已預訂' && <p className="stop-booking-time"><Clock3 size={15} aria-hidden="true" /><span>預約接機 <time>{stop.arrivalTime}</time> · 日本時間</span></p>}
        {booking ? <Suspense fallback={<p className="small muted" role="status">載入預訂資料…</p>}><BookingDetails booking={booking} documents={documents} place={place} /></Suspense> : place?.category === '住宿' ? <><p className="detail-meta"><MapPin size={15} aria-hidden="true" /><span>{place.address}</span></p><div className="collection-links"><ExternalLink href={place.mapsUrl} className="collection-icon-action" label={`在 Google Maps 開啟 ${place.nameZh}`}><MapPinned size={20} aria-hidden="true" /></ExternalLink></div></> : place && !place.virtual ? <PlaceDetails place={place} hotel={hotel} date={stop.date} onFocus={onFocus} /> : <>
          <p className="stop-summary">{stop.summary}</p>
          {place?.hoursText && <p className="detail-meta"><Clock3 size={14} /><span>{place.hoursText}</span></p>}
          {place?.dietText && <p className="diet-note">{place.dietText}</p>}
          <div className="card-actions"><ExternalLink href={stop.mapsUrl} className="button button-outline"><MapPin size={15} />Google Maps<ArrowUpRight size={14} /></ExternalLink></div>
        </>}
        {booking?.kind !== 'flight' && stop.note && /預約|不確定|僅預估|末點|末班|核對|核實|μticket|台灣時間|含在住宿|含11|天守閣|退房|可略過|直接回|不喝酒|指定|奶素|Vegan|臨休|售罄|供餐/.test(stop.note) && <p className="note">{stop.note}</p>}
      </div>}
    </article>
  </div>;
}
