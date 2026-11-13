import { useMemo, useState } from 'react';
import { Search, X, Check, MapPin, ArrowUpRight, CheckCheck, LayoutGrid } from 'lucide-react';
import type { TravelData } from '../lib/types';
import { categoryGroup } from '../lib/data';
import { CategoryIcon } from '../components/Icon';
import { PlaceImage } from '../components/PlaceImage';
import { ExternalLink } from '../components/ExternalLink';
const categories = ['老件店','古蹟／歷史','美術館／公園','素食餐廳','咖啡廳','酒吧','住宿','交通'];
export function PlacesPage({ data, visited, setVisited }: { data:TravelData; visited:Record<string,boolean>; setVisited:(value:Record<string,boolean> | ((previous:Record<string,boolean>) => Record<string,boolean>)) => void }) {
  const [filter, setFilter] = useState('');
  const [status, setStatus] = useState('全部');
  const [query, setQuery] = useState('');
  const places = useMemo(() => data.places.filter(p => !p.virtual), [data.places]);
  const count = places.filter(p => visited[p.id]).length;
  const visible = places.filter(p => (!filter || filter === categoryGroup(p.category)) &&
    (status === '全部' || (status === '已造訪' ? visited[p.id] : !visited[p.id])) &&
    `${p.nameZh} ${p.nameJa} ${p.address} ${p.category}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <>
    <header className="page-heading"><div className="heading-kicker"><span>PLACES TO KEEP</span><span>NAGOYA, JAPAN</span></div><h1>踩點清單<span className="heading-ja" lang="ja">行きたい場所</span></h1></header>
    <div className="places-layout"><aside className="places-controls">
      <div className="visit-progress"><div><CheckCheck size={19} /><strong>{count}<span> / {places.length}</span></strong><span>已造訪</span></div><progress value={count} max={places.length} aria-label="造訪進度" /></div>
      <div className="search-field"><Search size={18} /><input type="search" aria-label="搜尋地點" placeholder="搜尋地點、日文名稱或地址" value={query} onChange={event => setQuery(event.target.value)} />{query && <button aria-label="清除搜尋" onClick={() => setQuery('')}><X size={16} /></button>}</div>
      <fieldset className="category-filter" aria-label="地點分類篩選"><legend className="sr-only">分類（單選）</legend>{['',...categories].map(category => <label key={category} className={`category-option ${filter === category ? 'active' : ''}`} title={category || '全部分類'}><input type="radio" name="place-category" value={category} checked={filter === category} onChange={() => setFilter(category)} aria-label={category || '全部分類'} />{category ? <CategoryIcon category={category} size={20} /> : <LayoutGrid size={20} strokeWidth={1.7} aria-hidden="true" />}</label>)}</fieldset>
      <div className="status-filter" aria-label="造訪狀態">{['全部','未造訪','已造訪'].map(value => <button key={value} aria-pressed={status === value} className={status === value ? 'active' : ''} onClick={() => setStatus(value)}>{value}</button>)}</div>
    </aside><section className="places-results" aria-label="地點搜尋結果"><div className="section-heading"><h2>{filter || '旅行收藏'}</h2><span className="small muted" role="status">{visible.length} 個地點</span></div>
      <div className="places-list">{visible.map(place => <article className={`collection-card ${visited[place.id] ? 'is-visited' : ''}`} key={place.id}>
        <div className="collection-top"><PlaceImage place={place} compact /><div className="collection-heading"><span className="place-category"><CategoryIcon category={place.category} size={13} />{place.category}<span>{place.priority === '備選' ? '候選' : ''}</span></span><h2>{place.nameZh}</h2><p lang="ja">{place.nameJa}</p></div></div>
        {place.id !== 'barns' && <p className="collection-summary">{place.summary}</p>}<p className="collection-address"><MapPin size={13} /><span>{place.address}</span></p>
        {place.hoursText && <p className="collection-hours">{place.hoursText}</p>}
        {place.closedText && <p className="small muted">休業：{place.closedText}</p>}
        {place.dietText && place.category !== '酒吧' && <p className="diet-note">{place.dietText}</p>}
        {place.id === 'barns' && <p className="note">11/17 為第三個週二，可能休業，須核對。</p>}
        {place.id === 'toraya' && <p className="note">11/16 週一營業請出發前複核。</p>}
        <div className="collection-actions"><ExternalLink href={place.mapsUrl} className="text-action">Google Maps<ArrowUpRight size={15} /></ExternalLink>
          <label className={`visited-checkbox ${visited[place.id] ? 'checked' : ''}`}><input type="checkbox" checked={!!visited[place.id]} onChange={event => setVisited(previous => ({ ...previous, [place.id]:event.target.checked }))} aria-label={`${place.nameZh} 已造訪`} /><span className="checkbox-visual">{visited[place.id] && <Check size={12} />}</span>{visited[place.id] ? '已造訪' : '標記造訪'}</label></div>
      </article>)}</div>
      {!visible.length && <div className="empty-state"><Search size={28} /><h2>沒有符合的地點</h2><button className="button button-outline" onClick={() => { setQuery(''); setFilter(''); setStatus('全部'); }}>清除篩選</button></div>}
    </section></div>
  </>;
}
