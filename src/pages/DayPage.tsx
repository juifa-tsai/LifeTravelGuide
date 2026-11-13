import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Bookmark, ArrowRight } from 'lucide-react';
import type { TravelData, Day } from '../lib/types';
import { stopId, shortDate } from '../lib/data';
import { writeStored } from '../lib/storage';
import { DaySelector } from '../components/DaySelector';
import { DayMap, dayPins, type MapPinData } from '../components/DayMap';
import { PlaceCard } from '../components/PlaceCard';
import { TransitConnector } from '../components/TransitConnector';
import { CategoryIcon } from '../components/Icon';
import { ExternalLink } from '../components/ExternalLink';
export function DayPage({ data, day }: { data:TravelData; day:Day }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [highlightedStop, setHighlightedStop] = useState<string | null>(null);
  const stops = useMemo(() => data.itinerary.filter(s => s.date === day.date).sort((a,b) => a.sequence-b.sequence), [data, day.date]);
  const pins = useMemo(() => dayPins(stops, data.places), [stops, data.places]);
  useEffect(() => { writeStored('last-day',day.date); }, [day.date]);
  function select(pin:MapPinData) {
    setSelected(pin.place.id); setHighlightedStop(stopId(pin.stop));
    document.getElementById(`stop-${stopId(pin.stop)}`)?.scrollIntoView({ behavior:'smooth', block:'center' });
  }
  function focus(placeId:string, returnToMap = false) {
    setSelected(placeId);
    if (returnToMap) document.getElementById('day-map')?.scrollIntoView({ behavior:'smooth', block:'start' });
  }
  const candidateIds = day.date === '2026-11-15' ? ['anzu'] : day.date === '2026-11-16' ? ['le_jardin'] : day.date === '2026-11-17' ? ['cereza','recit','barns'] : [];
  return <>
    <header className="page-heading"><div className="heading-kicker"><span>NAGOYA · DAY {day.number} / 4</span><span>日本時間 JST</span></div>
      <h1>{shortDate(day.date)}<span className="heading-weekday">（{day.weekday}）</span>{day.title}</h1><p>{day.description}</p>
    </header>
    <DaySelector days={data.trip.days} />
    <div className="day-layout"><div className="map-column"><DayMap key={day.date} stops={stops} places={data.places} selected={selected} onSelect={select} />
      <aside className="day-note"><span className="eyebrow">A LITTLE REMINDER</span><p>{day.date === '2026-11-15' ? '接機專車已預訂。晚餐依入境、接駁與入住時間彈性調整。' : day.date === '2026-11-16' ? '今天留給古蹟與老件。名古屋市美術館週一休館，安排在明天。' : day.date === '2026-11-17' ? '咖啡與酒吧是口袋候選。奶素餐點請再次確認配料與高湯。' : '12:05 的回程航班，先預留機場報到時間。μSKY 另需指定席券。'}</p></aside>
    </div>
    <div className="timeline-column"><div className="section-heading"><h2>今天的行程<span>THE ITINERARY</span></h2><span className="small muted">{stops.length} 個安排 · 時間供參考</span></div>
      <section className="timeline" aria-label="正式行程時間軸">{stops.map((stop,i) => {
        const place = data.places.find(p => p.id === stop.placeId);
        const next = stops[i+1];
        const leg = next && next.placeId !== stop.placeId ? data.legs.find(l => l.date === day.date && l.fromPlaceId === stop.placeId && l.toPlaceId === next.placeId) : undefined;
        return <div className="timeline-item" key={stopId(stop)}>
          <PlaceCard stop={stop} place={place} selected={highlightedStop === stopId(stop)} number={pins.find(p => p.place.id === stop.placeId)?.number} onFocus={focus} />
          {leg && <div className="transit-offset"><TransitConnector leg={leg} from={place} to={data.places.find(p => p.id === next.placeId)} /></div>}
        </div>;
      })}</section>
      {candidateIds.length > 0 && <section className="candidates"><div className="section-heading"><h2><Bookmark size={17} />口袋候選</h2><Link to="/places" className="text-action">全部收藏<ArrowUpRight size={14} /></Link></div>
        <p className="small muted">留一點隨興，不在正式時間軸內。</p>
        {candidateIds.map(id => {
          const place = data.places.find(p => p.id === id)!;
          return <div className="candidate-row" key={id}><span className={`candidate-icon ${place.category === '酒吧' ? 'bar' : place.category === '咖啡廳' ? 'coffee' : 'vegan'}`}><CategoryIcon category={place.category} /></span>
            <div><strong>{place.nameZh}</strong><p className={id === 'barns' || id === 'anzu' ? 'candidate-warning' : 'muted'}>{id === 'barns' ? '11/17 第三個週二，可能休業 · 需核對' : id === 'anzu' ? '早到時備選 · 週日餐點末點約21:30' : place.dietText || place.hoursText}</p></div>
            <ExternalLink href={place.mapsUrl} className="candidate-link" label={`在 Google Maps 開啟 ${place.nameZh}`}><ArrowUpRight size={19} /></ExternalLink></div>;
        })}</section>}
      <div className="day-end"><span>慢慢走，留一點空白給旅途。</span>{data.trip.days[day.number] && <Link to={`/day/${data.trip.days[day.number].date}`} className="text-action">下一天<ArrowRight size={16} /></Link>}</div>
    </div></div>
  </>;
}
