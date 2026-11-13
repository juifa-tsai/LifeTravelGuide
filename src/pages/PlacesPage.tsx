import { useMemo, useState } from 'react';
import { Check, MapPin, ArrowUpRight, LayoutGrid } from 'lucide-react';
import type { TravelData } from '../lib/types';
import { categoryGroup } from '../lib/data';
import { CategoryIcon } from '../components/Icon';
import { PlaceImage } from '../components/PlaceImage';
import { ExternalLink } from '../components/ExternalLink';
import { TravelMap } from '../components/TravelMap';
import { collectionMapPoints,hasCoordinates } from '../lib/mapPoints';
const categories = ['老件店','古蹟／歷史','美術館／公園','素食餐廳','咖啡廳','酒吧','住宿','交通'];
export function PlacesPage({ data, visited, setVisited }: { data:TravelData; visited:Record<string,boolean>; setVisited:(value:Record<string,boolean> | ((previous:Record<string,boolean>) => Record<string,boolean>)) => void }) {
  const [filter, setFilter] = useState('');
  const [status, setStatus] = useState('全部');
  const [selected,setSelected] = useState<string | null>(null);
  const [focusVersion,setFocusVersion] = useState(0);
  const places = useMemo(() => data.places.filter(p => !p.virtual), [data.places]);
  const visible = useMemo(() => places.filter(p => (!filter || filter === categoryGroup(p.category)) &&
    (status === '全部' || (status === '已造訪' ? visited[p.id] : !visited[p.id]))),[places,filter,status,visited]);
  const mapPoints = useMemo(() => collectionMapPoints(places,visible),[places,visible]);
  function selectPlace(id:string) {
    setSelected(id);
    setFocusVersion(previous => previous+1);
  }
  function focusPlace(id:string,returnToMap = false) {
    selectPlace(id);
    document.getElementById(returnToMap ? 'places-map' : `place-${id}`)?.scrollIntoView({ behavior:'smooth',block:returnToMap ? 'start' : 'center' });
  }
  return <>
    <header className="page-heading"><div className="heading-kicker"><span>PLACES TO KEEP</span><span>NAGOYA, JAPAN</span></div><h1>踩點清單<span className="heading-ja" lang="ja">行きたい場所</span></h1></header>
    <div className="places-layout"><aside className="places-controls">
      <fieldset className="category-filter" aria-label="地點分類篩選"><legend className="sr-only">分類（單選）</legend>{['',...categories].map(category => <label key={category} className={`category-option ${filter === category ? 'active' : ''}`} title={category || '全部分類'}><input type="radio" name="place-category" value={category} checked={filter === category} onChange={() => setFilter(category)} aria-label={category || '全部分類'} />{category ? <CategoryIcon category={category} size={20} /> : <LayoutGrid size={20} strokeWidth={1.7} aria-hidden="true" />}</label>)}</fieldset>
      <div className="status-filter" aria-label="造訪狀態">{['全部','未造訪','已造訪'].map(value => <button key={value} aria-pressed={status === value} className={status === value ? 'active' : ''} onClick={() => setStatus(value)}>{value}</button>)}</div>
    </aside><section className="places-results" aria-label="地點清單"><TravelMap id="places-map" label="踩點與收藏地圖" points={mapPoints} focusIds={visible.map(place => place.id)} selected={selected} onSelect={id => focusPlace(id)} onFocusPlace={selectPlace} onReset={() => setSelected(null)} focusVersion={focusVersion} /><div className="section-heading"><h2 aria-live="polite">{filter || '旅行收藏'}</h2></div>
      <div className="places-list">{visible.map(place => <article id={`place-${place.id}`} className={`collection-card ${visited[place.id] ? 'is-visited' : ''} ${selected === place.id ? 'selected' : ''}`} key={place.id}>
        <div className="collection-top"><PlaceImage place={place} compact /><div className="collection-heading"><span className="place-category"><CategoryIcon category={place.category} size={13} />{place.category}<span>{place.priority === '備選' ? '候選' : ''}</span></span><h2>{place.nameZh}</h2><p lang="ja">{place.nameJa}</p></div></div>
        {place.id !== 'barns' && <p className="collection-summary">{place.summary}</p>}<p className="collection-address"><MapPin size={13} /><span>{place.address}</span></p>
        {place.hoursText && <p className="collection-hours">{place.hoursText}</p>}
        {place.closedText && <p className="small muted">休業：{place.closedText}</p>}
        {place.dietText && place.category !== '酒吧' && <p className="diet-note">{place.dietText}</p>}
        {place.id === 'barns' && <p className="note">11/17 為第三個週二，可能休業，須核對。</p>}
        {place.id === 'toraya' && <p className="note">11/16 週一營業請出發前複核。</p>}
        <div className="collection-actions"><ExternalLink href={place.mapsUrl} className="text-action">Google Maps<ArrowUpRight size={15} /></ExternalLink>
          {hasCoordinates(place) && <button className="text-action" onClick={() => focusPlace(place.id,true)}><MapPin size={13} />在地圖查看</button>}
          <label className={`visited-checkbox ${visited[place.id] ? 'checked' : ''}`}><input type="checkbox" checked={!!visited[place.id]} onChange={event => setVisited(previous => ({ ...previous, [place.id]:event.target.checked }))} aria-label={`${place.nameZh} 已造訪`} /><span className="checkbox-visual">{visited[place.id] && <Check size={12} />}</span>{visited[place.id] ? '已造訪' : '標記造訪'}</label></div>
      </article>)}</div>
      {!visible.length && <div className="empty-state"><MapPin size={28} /><h2>沒有符合的地點</h2><button className="button button-outline" onClick={() => { setFilter(''); setStatus('全部'); }}>清除篩選</button></div>}
    </section></div>
  </>;
}
