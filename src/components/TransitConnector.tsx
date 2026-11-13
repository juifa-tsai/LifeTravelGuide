import { ArrowUpRight, ChevronDown } from 'lucide-react';
import type { Leg, Place } from '../lib/types';
import { CategoryIcon } from './Icon';
import { ExternalLink } from './ExternalLink';
import { directions } from '../lib/mapLinks';
import { durationHours } from '../lib/timeline';
export function TransitConnector({ leg, from, to }: { leg: Leg; from?: Place; to?: Place }) {
  return <details className="transit"><summary><CategoryIcon category={leg.mode === '步行' ? '步行' : leg.mode.includes('專車') ? '預約專車' : leg.mode === '航班' ? '航班' : '交通'} size={17} />
    <span className="transit-label">{leg.mode}<span> · {durationHours(leg.minutesEstimate) ?? '時間待確認'}</span></span><ChevronDown className="chevron" size={15} /></summary>
    <div className="transit-details"><p><strong>{leg.summary}</strong><br />{leg.details}</p><dl>
      <dt>預估時間</dt><dd>{leg.minutesEstimate === null ? '待確認' : `約 ${leg.minutesEstimate} 分鐘`}</dd>
      <dt>預估車資</dt><dd>{leg.mode === '步行' ? '步行無車資' : leg.fareJpyEstimate === null ? '待確認' : `約 ¥${leg.fareJpyEstimate}`}</dd>
      <dt>核實程度</dt><dd>{leg.certainty}</dd>
      <dt>資料來源</dt><dd>{leg.sourceUrl ? <ExternalLink href={leg.sourceUrl}>查看依據 ↗</ExternalLink> : '行前估算，非即時導航'}</dd>
    </dl>{from && to && !from.virtual && !to.virtual && leg.mode !== '航班' && <ExternalLink href={directions(from, to, leg.mode)} className="text-action">在 Google Maps 規劃路線 <ArrowUpRight size={15} /></ExternalLink>}</div>
  </details>;
}
