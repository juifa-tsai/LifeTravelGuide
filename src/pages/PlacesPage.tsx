import { useEffect, useMemo, useState } from 'react';
import { MapPin, LayoutGrid } from 'lucide-react';
import type { TravelData } from '../lib/types';
import { categoryGroup } from '../lib/data';
import { CategoryIcon } from '../components/Icon';
import { CollectionCard } from '../components/CollectionCard';
import { japanDate, todayCaption } from '../lib/placeHours';
import { isInNagoya, type Coordinates } from '../lib/distances';
import { TravelMap } from '../components/TravelMap';
import { collectionMapPoints } from '../lib/mapPoints';
const categories = ['老件店','古蹟／歷史','美術館／公園','素食餐廳','咖啡廳','酒吧','交通'];
export function PlacesPage({ data, visited, setVisited }: { data:TravelData; visited:Record<string,boolean>; setVisited:(value:Record<string,boolean> | ((previous:Record<string,boolean>) => Record<string,boolean>)) => void }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()),60000); return () => window.clearInterval(timer); }, []);
  const date = japanDate(now);
  const [position,setPosition] = useState<Coordinates | null>(null);
  const currentPosition = isInNagoya(position) ? position : null;
  const hotel = data.places.find(place => place.category === '住宿');
  useEffect(() => {
    let active = true;
    // Reuse an existing permission; the map button handles the first permission request.
    async function refreshPosition() {
      setPosition(null);
      if (!navigator.geolocation || !navigator.permissions) return;
      try {
        const permission = await navigator.permissions.query({ name:'geolocation' });
        if (active && permission.state === 'granted') navigator.geolocation.getCurrentPosition(
          result => { if (active) setPosition({ lat:result.coords.latitude,lng:result.coords.longitude }); },
          () => { if (active) setPosition(null); },
          { enableHighAccuracy:false,timeout:10000,maximumAge:0 },
        );
      } catch { /* Keep distances unknown until the user taps My Location. */ }
    }
    const onVisible = () => { if (document.visibilityState === 'visible') void refreshPosition(); };
    void refreshPosition();
    document.addEventListener('visibilitychange',onVisible);
    return () => { active = false; document.removeEventListener('visibilitychange',onVisible); };
  }, []);
  function onLocation(point:Coordinates | null) { setPosition(point); return isInNagoya(point); }
  const [filter, setFilter] = useState('');
  const [selected,setSelected] = useState<string | null>(null);
  const [focusVersion,setFocusVersion] = useState(0);
  const places = useMemo(() => data.places.filter(p => !p.virtual && !['機場','住宿'].includes(p.category)), [data.places]);
  const visible = useMemo(() => places.filter(p => !filter || filter === categoryGroup(p.category)),[places,filter]);
  const mapPoints = useMemo(() => collectionMapPoints(data.places,visible),[data.places,visible]);
  function selectPlace(id:string) {
    setSelected(id);
    setFocusVersion(previous => previous+1);
  }
  function focusPlace(id:string,returnToMap = false) {
    selectPlace(id);
    const target = document.getElementById(returnToMap ? 'places-map' : `place-${id}`);
    const details = target?.querySelector('details');
    if (!returnToMap && details) details.open = true;
    target?.scrollIntoView({ behavior:'smooth',block:returnToMap ? 'start' : 'center' });
  }
  return <>
    <header className="page-heading"><h1>踩點清單<span className="place-count">{visible.length} 筆</span></h1><p>{todayCaption(date)}</p></header>
    <div className="places-layout"><aside className="places-controls">
      <fieldset className="category-filter" aria-label="地點分類篩選"><legend className="sr-only">分類（單選）</legend>{['',...categories].map(category => <label key={category} className={`category-option ${filter === category ? 'active' : ''}`} title={category || '全部分類'}><input type="radio" name="place-category" value={category} checked={filter === category} onChange={() => { setFilter(category); setSelected(null); }} aria-label={category || '全部分類'} />{category ? <CategoryIcon category={category} size={20} /> : <LayoutGrid size={20} strokeWidth={1.7} aria-hidden="true" />}</label>)}</fieldset>
    </aside><section className="places-results" aria-label="地點清單"><TravelMap id="places-map" label="踩點與收藏地圖" points={mapPoints} focusIds={visible.map(place => place.id)} selected={selected} onSelect={id => focusPlace(id)} onFocusPlace={selectPlace} onReset={() => setSelected(null)} focusVersion={focusVersion} onLocation={onLocation} /><div className="section-heading"><h2 aria-live="polite">{filter ? <CategoryIcon category={filter} size={20} /> : <LayoutGrid size={20} aria-hidden="true" />}{filter || '旅行收藏'}<span className="place-count">{visible.length} 筆</span></h2></div>
      <div className="places-list">{visible.map(place => <CollectionCard key={place.id} place={place} date={date} position={currentPosition} hotel={hotel} visited={!!visited[place.id]} selected={selected === place.id}
        onVisit={checked => setVisited(previous => ({ ...previous, [place.id]:checked }))} onFocus={focusPlace} />)}</div>
      <p className="places-hours-note">一般營業時段供參考；距離為直線估算。名古屋市外顯示—。</p>
      {!visible.length && <div className="empty-state"><MapPin size={28} /><h2>沒有符合的地點</h2><button className="button button-outline" onClick={() => setFilter('')}>清除篩選</button></div>}
    </section></div>
  </>;
}
