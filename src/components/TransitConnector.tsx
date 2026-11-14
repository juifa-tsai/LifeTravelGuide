import { ArrowUpRight, ChevronDown } from 'lucide-react';
import { lazy, Suspense } from 'react';
import type { Leg, Place, TravelDocument } from '../lib/types';
import { CategoryIcon } from './Icon';
import { ExternalLink } from './ExternalLink';
import { directions } from '../lib/mapLinks';
import { legView } from '../lib/transit';
import { bookingForTransfer } from '../data/bookingBasics';
const BookingDetails = lazy(()=>import('./BookingDetails'));

export function TransitConnector({ leg, from, to, pickupTime, documents = [] }: { leg:Leg; from?:Place; to?:Place; pickupTime?:string; documents?:TravelDocument[] }) {
  const view = legView(leg,from,to);
  if (!view || !from || !to) return null;
  const href = directions(from,to,leg.mode);
  const label = `${from.nameZh}至${to.nameZh}的路線`;
  if (view.walking) return <ExternalLink href={href} label={label} className="transit transit-walk">
    <CategoryIcon category="步行" size={17} /><span>步行</span><span>{[view.distance,view.time].filter(Boolean).join(' · ')}</span><ArrowUpRight size={15} aria-hidden="true" />
  </ExternalLink>;

  const booking = bookingForTransfer(leg);
  const category = leg.mode.includes('專車') ? '預約專車' : leg.mode === '航班' ? '航班' : '交通';
  const overview = <><CategoryIcon category={category} size={17} /><span className="transit-label"><strong className="transit-route">{view.title}</strong><span className="transit-meta">{[pickupTime ? `預約接機 ${pickupTime}` : null,view.lines || view.mode,view.time].filter(Boolean).join(' · ')}</span></span></>;
  if (!booking && !view.note && view.steps.length <= 1) return <ExternalLink href={href} label={label} className="transit transit-direct">{overview}<ArrowUpRight size={15} aria-hidden="true" /></ExternalLink>;
  return <details className="transit"><summary>{overview}<ChevronDown className="chevron" size={15} /></summary>
    <div className="transit-details">
      {view.steps.length > 1 && <ol className="transit-steps">{view.steps.map((step,index) => <li key={index}><span>{step.line}</span><strong>{step.fromStation} → {step.toStation}</strong></li>)}</ol>}
      {pickupTime && <p className="transit-note">日本時間 · 上車時間依入境與司機通知調整。</p>}
      {view.note && <p className="transit-note">{view.note}</p>}
      {booking && <Suspense fallback={<p className="small muted" role="status">載入訂單資料…</p>}><BookingDetails booking={booking} documents={documents} /></Suspense>}
      {leg.mode !== '航班' && <ExternalLink href={href} className="text-action" label={label}>路線導航<ArrowUpRight size={15} /></ExternalLink>}
    </div>
  </details>;
}
