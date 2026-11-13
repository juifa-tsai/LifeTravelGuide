import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Bookmark, ArrowRight, Sunrise, Sun, Moon } from 'lucide-react';
import type { TravelData, Day } from '../lib/types';
import { stopId, shortDate } from '../lib/data';
import { writeStored } from '../lib/storage';
import { DaySelector } from '../components/DaySelector';
import { DayMap, type MapPinData } from '../components/DayMap';
import { PlaceCard } from '../components/PlaceCard';
import { TransitConnector } from '../components/TransitConnector';
import { PlaceImage } from '../components/PlaceImage';
import { ExternalLink } from '../components/ExternalLink';
import { groupTimeline, periodLabels } from '../lib/timeline';
const periodIcons = { morning:Sunrise, afternoon:Sun, evening:Moon };
export function DayPage({ data, day }: { data:TravelData; day:Day }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [focusVersion,setFocusVersion] = useState(0);
  const [highlightedStop, setHighlightedStop] = useState<string | null>(null);
  const stops = useMemo(() => data.itinerary.filter(s => s.date === day.date).sort((a,b) => a.sequence-b.sequence), [data, day.date]);
  const periods = useMemo(() => groupTimeline(stops), [stops]);
  useEffect(() => { writeStored('last-day',day.date); }, [day.date]);
  function select(pin:MapPinData) {
    setSelected(pin.place.id); setHighlightedStop(stopId(pin.stop));
    document.getElementById(`stop-${stopId(pin.stop)}`)?.scrollIntoView({ behavior:'smooth', block:'center' });
  }
  function focus(placeId:string, returnToMap = false) {
    setSelected(placeId);
    setFocusVersion(previous => previous+1);
    if (returnToMap) document.getElementById('day-map')?.scrollIntoView({ behavior:'smooth', block:'start' });
  }
  const arrivalDinner = day.date === '2026-11-15';
  const candidateIds = arrivalDinner ? ['molnoda','coco_fushimi','nine_cafe_fushimi','kazan','durbar_sakae','anzu'] : day.date === '2026-11-16' ? ['le_jardin'] : day.date === '2026-11-17' ? ['cereza','recit','barns'] : [];
  return <>
    <header className="page-heading">
      <h1>{shortDate(day.date)}<span className="heading-weekday">（{day.weekday}）</span>{day.title}</h1>
      <p>日本時間</p>
    </header>
    <DaySelector days={data.trip.days} />
    <div className="day-layout"><div className="map-column"><DayMap key={day.date} stops={stops} places={data.places} selected={selected} onSelect={select} onReset={() => setSelected(null)} onFavoriteSelect={id => focus(id)} focusVersion={focusVersion} />

    </div>
    <div className="timeline-column"><div className="section-heading"><h2>今天的行程</h2><span className="small muted">{stops.length} 個安排</span></div>
      <section className="timeline" aria-label="正式行程時間軸">{periods.map(period => {
        const PeriodIcon = periodIcons[period.period];
        return <section className="timeline-period" key={period.id} aria-labelledby={`period-${period.id}`}>
          <h3 className="timeline-period-heading" id={`period-${period.id}`}><PeriodIcon size={17} aria-hidden="true" /><span>{periodLabels[period.period]}</span></h3>
          <div className="timeline-items">{period.stops.map(stop => {
            const i = stops.indexOf(stop);
            const place = data.places.find(p => p.id === stop.placeId);
            const next = stops[i+1];
            const leg = next && next.placeId !== stop.placeId ? data.legs.find(l => l.date === day.date && l.fromPlaceId === stop.placeId && l.toPlaceId === next.placeId) : undefined;
            return <div className="timeline-item" key={stopId(stop)}>
              <PlaceCard stop={stop} place={place} hotel={data.places.find(p => p.category === '住宿')} selected={highlightedStop === stopId(stop)} onFocus={focus} />
              {leg && <div className="transit-offset"><TransitConnector leg={leg} from={place} to={data.places.find(p => p.id === next.placeId)} /></div>}
            </div>;
          })}</div></section>;
      })}</section>
      {candidateIds.length > 0 && <section className="candidates"><div className="section-heading"><h2><Bookmark size={17} />{arrivalDinner ? '今晚晚餐候選' : '口袋候選'}</h2><Link to="/places" className="text-action">全部收藏<ArrowUpRight size={14} /></Link></div>
        {arrivalDinner && <p className="small muted">依抵達時間彈性選擇，出發前確認營業與奶素供餐。</p>}
        {candidateIds.map(id => {
          const place = data.places.find(p => p.id === id)!;
          return <div className="candidate-row" key={id}><PlaceImage place={place} compact />
            <div><strong>{place.nameZh}</strong>{arrivalDinner && <p className="small muted">{place.hoursText?.split(' 一般週日資訊')[0]}</p>}<p className={id === 'barns' || id === 'anzu' ? 'candidate-warning' : 'muted'}>{id === 'barns' ? '11/17 第三個週二，可能休業 · 需核對' : id === 'anzu' ? '早到時備選 · 週日末點約21:30，通常不適合21:45後抵達；奶素料理、醬汁與高湯需確認。' : arrivalDinner ? `奶素：${place.dietText?.split(' 奶素可乳製品；')[0]}` : place.dietText || place.hoursText}</p></div>
            <ExternalLink href={place.mapsUrl} className="candidate-link" label={`在 Google Maps 開啟 ${place.nameZh}`}><ArrowUpRight size={19} /></ExternalLink></div>;
        })}</section>}
      <div className="day-end">{data.trip.days[day.number] && <Link to={`/day/${data.trip.days[day.number].date}`} className="text-action">下一天<ArrowRight size={16} /></Link>}</div>
    </div></div>
  </>;
}
