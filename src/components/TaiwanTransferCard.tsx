import { lazy, Suspense, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { taiwanTransferBooking } from '../data/bookingBasics';
import { CategoryIcon } from './Icon';
const BookingDetails = lazy(()=>import('./BookingDetails'));

export function TaiwanTransferCard() {
  const [open,setOpen] = useState(false);
  return <div className="timeline-stop" id="stop-taiwan-transfer">
    <div className="timeline-rail"><span className="timeline-dot"><CategoryIcon category="接駁" size={15} /></span></div>
    <article className="stop-card">
      <button className="stop-toggle" aria-expanded={open} aria-controls="detail-taiwan-transfer" onClick={()=>setOpen(!open)}>
        <span className="stop-overview"><span className="stop-time"><span className="stay">抵台後 · 台灣時間</span></span><span className="stop-title">桃園機場 → 台北住處</span></span>
        <span className={`expand-icon ${open ? 'is-open' : ''}`}><ChevronDown size={17} aria-hidden="true" /></span>
      </button>
      {open && <div className="stop-detail" id="detail-taiwan-transfer"><Suspense fallback={<p className="small muted" role="status">載入訂單資料…</p>}><BookingDetails booking={taiwanTransferBooking} documents={[]} /></Suspense></div>}
    </article>
  </div>;
}
