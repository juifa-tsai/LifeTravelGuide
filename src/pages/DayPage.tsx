import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Bookmark, ArrowRight, Sunrise, Sun, Moon } from 'lucide-react';
import type { TravelData, Day } from '../lib/types';
import { stopId, shortDate } from '../lib/data';
import { DaySelector } from '../components/DaySelector';
import { DayMap, type MapPinData } from '../components/DayMap';
import { ReservationBadge } from '../components/ReservationBadge';
import { PlaceCard } from '../components/PlaceCard';
import { TaiwanTransferCard } from '../components/TaiwanTransferCard';
import { taiwanTransferBooking } from '../data/bookingBasics';
import { TransitConnector } from '../components/TransitConnector';
import { PlaceImage } from '../components/PlaceImage';
import { ExternalLink } from '../components/ExternalLink';
import { compactTimeline, groupTimeline, periodLabels, type TimelineTransfer } from '../lib/timeline';
import { todayHours } from '../lib/placeHours';
const periodIcons = { morning:Sunrise, afternoon:Sun, evening:Moon };
export function DayPage({ data, day, onSelectDay }: { data:TravelData; day:Day; onSelectDay:(date:string)=>void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [focusVersion,setFocusVersion] = useState(0);
  const [highlightedStop, setHighlightedStop] = useState<string | null>(null);
  const stops = useMemo(() => data.itinerary.filter(s => s.date === day.date).sort((a,b) => a.sequence-b.sequence), [data, day.date]);
  const {entries,leadingTransfers} = useMemo(() => compactTimeline(stops,data.legs), [stops,data.legs]);
  const periods = useMemo(() => groupTimeline(entries.map(entry=>entry.stop)), [entries]);
  const hotel = data.places.find(place=>place.category === '住宿');
  const mapStops = stops.filter(stop=>stop.category !== '早餐');
  function select(pin:MapPinData) {
    const target = entries.find(entry=>entry.sourceStops.includes(pin.stop))?.stop;
    setSelected(pin.place.id); setHighlightedStop(target ? stopId(target) : null);
    if (target) document.getElementById(`stop-${stopId(target)}`)?.scrollIntoView({ behavior:'smooth', block:'center' });
  }
  function focus(placeId:string, returnToMap = false) {
    setSelected(placeId);
    setFocusVersion(previous => previous+1);
    if (returnToMap) document.getElementById('day-map')?.scrollIntoView({ behavior:'smooth', block:'start' });
  }
  function transfer(transfer:TimelineTransfer) {
    const leg = transfer.leg;
    return <TransitConnector key={`${leg.date}-${leg.fromPlaceId}-${leg.toPlaceId}`} leg={leg} from={data.places.find(place=>place.id === leg.fromPlaceId)} to={data.places.find(place=>place.id === leg.toPlaceId)} pickupTime={transfer.pickupTime} documents={data.documents} />;
  }
  const arrivalDinner = day.date === '2026-11-15';
  const returnTransfer = day.date === taiwanTransferBooking.date;
  const candidateIds = arrivalDinner ? ['molnoda','coco_fushimi','nine_cafe_fushimi','kazan','durbar_sakae','anzu'] : day.candidateIds ?? (day.date === '2026-11-16' ? ['le_jardin'] : day.date === '2026-11-17' ? ['cereza','recit'] : []);
  return <>
    <header className="page-heading">
      <h1>{shortDate(day.date)}<span className="heading-weekday">（{day.weekday}）</span>{day.title}</h1>
      <p>{returnTransfer ? '日本／台灣時間' : '日本時間'}</p>
    </header>
    <DaySelector days={data.trip.days} onSelect={onSelectDay} />
    <div className="day-layout"><div className="map-column"><DayMap key={day.date} stops={mapStops} places={data.places} selected={selected} onSelect={select} onReset={() => setSelected(null)} onFavoriteSelect={id => focus(id)} focusVersion={focusVersion} />

    </div>
    <div className="timeline-column"><div className="section-heading"><h2>今天的行程</h2><span className="small muted">{entries.length + Number(returnTransfer)} 個安排</span></div>
      {leadingTransfers.length > 0 && <div className="timeline-leading-transfers transit-offset">{leadingTransfers.map(transfer)}</div>}
      <section className="timeline" aria-label="正式行程時間軸">{periods.map(period => {
        const PeriodIcon = periodIcons[period.period];
        return <section className="timeline-period" key={period.id} aria-labelledby={`period-${period.id}`}>
          <h3 className="timeline-period-heading" id={`period-${period.id}`}><PeriodIcon size={17} aria-hidden="true" /><span>{periodLabels[period.period]}</span></h3>
          <div className="timeline-items">{period.stops.map(stop => {
            const entry = entries.find(entry=>entry.stop === stop)!;
            const place = data.places.find(p => p.id === stop.placeId);
            return <div className="timeline-item" key={stopId(stop)}>
              <PlaceCard stop={stop} place={place} hotel={hotel} checkInTime={entry.checkInTime} documents={data.documents} selected={highlightedStop === stopId(stop)} onFocus={focus} />
              {entry.transfers.length > 0 && <div className="transit-offset">{entry.transfers.map(transfer)}</div>}
            </div>;
          })}{returnTransfer && period === periods.at(-1) && <div className="timeline-item"><TaiwanTransferCard /></div>}</div></section>;
      })}</section>
      {candidateIds.length > 0 && <section className="candidates"><div className="section-heading"><h2><Bookmark size={17} />{arrivalDinner ? '今晚晚餐候選' : '口袋候選'}</h2><Link to="/places" className="text-action">全部收藏<ArrowUpRight size={14} /></Link></div>
        {arrivalDinner && <p className="small muted">依抵達時間彈性選擇，出發前確認營業與奶素供餐。</p>}
        {candidateIds.map(id => {
          const place = data.places.find(p => p.id === id)!;
          return <div className="candidate-row" key={id}><PlaceImage place={place} compact />
            <div><strong>{place.nameZh}</strong><ReservationBadge place={place} /><p className="small muted">{arrivalDinner ? place.hoursText?.split(' 一般週日資訊')[0] : todayHours(place,day.date).replace('今日','當日')}</p><p className={id === 'anzu' ? 'candidate-warning' : 'muted'}>{id === 'anzu' ? '早到時備選 · 週日末點約21:30，通常不適合21:45後抵達；奶素料理、醬汁與高湯需確認。' : arrivalDinner ? `奶素：${place.dietText?.split(' 奶素可乳製品；')[0]}` : place.hoursNote || place.dietText}</p></div>
            <ExternalLink href={place.mapsUrl} className="candidate-link" label={`在 Google Maps 開啟 ${place.nameZh}`}><ArrowUpRight size={19} /></ExternalLink></div>;
        })}</section>}
      <div className="day-end">{data.trip.days[day.number] && <Link to={`/day/${data.trip.days[day.number].date}`} className="text-action">下一天<ArrowRight size={16} /></Link>}</div>
    </div></div>
  </>;
}
