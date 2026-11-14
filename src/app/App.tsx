import { lazy, Suspense, useEffect, useState, Component, type ReactNode } from 'react';
import { HashRouter, NavLink, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { BookOpen, CalendarDays, MapPin, Files, CircleHelp, WifiOff, RefreshCw, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import type { TravelData } from '../lib/types';
import { BookingProvider } from '../components/BookingProvider';
import { defaultDay, loadData } from '../lib/data';
import { useStoredState } from '../lib/storage';
import { useOnline } from '../lib/connectivity';
import { DayPage } from '../pages/DayPage';
import { PlacesPage } from '../pages/PlacesPage';
import { DocumentsPage } from '../pages/DocumentsPage';
const AudioPage = lazy(()=>import('../pages/AudioPage').then(module=>({default:module.AudioPage})));

class ErrorBoundary extends Component<{ children:ReactNode }, { failed:boolean }> {
  state = { failed:false };
  static getDerivedStateFromError() { return { failed:true }; }
  render() { return this.state.failed ? <LoadError /> : this.props.children; }
}
function LoadError() {
  return <main className="load-state"><BookOpen size={36} /><h1>行程資料暫時無法載入</h1><p>請確認網路後再試一次；離線時需先曾成功開啟網站。</p><button className="button" onClick={() => window.location.reload()}><RefreshCw size={16} />重新整理</button></main>;
}
function UpdateNotice() {
  const { needRefresh:[needRefresh,setNeedRefresh], offlineReady:[offlineReady,setOfflineReady], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Check when returning from background; no location or personal data is sent.
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void registration?.update().catch(() => {}); });
    },
  });
  if (!needRefresh && !offlineReady) return null;
  return <aside className="update-notice" role="status"><BookOpen size={18} /><span>{needRefresh ? '新版旅行手帖已準備好' : '行程已備妥，可離線查看'}</span>{needRefresh && <button onClick={() => void updateServiceWorker(true)}>更新</button>}<button aria-label="關閉通知" onClick={() => { setNeedRefresh(false); setOfflineReady(false); }}><X size={17} /></button></aside>;
}
function DayRoute({ data }: { data:TravelData }) {
  const { date } = useParams();
  const day = data.trip.days.find(d => d.date === date);
  return day ? <DayPage key={day.date} data={data} day={day} /> : <Navigate to={`/day/${defaultDay(data.trip.days)}`} replace />;
}
function TravelApp({ data }: { data:TravelData }) {
  const location = useLocation();
  const online = useOnline();
  const [visited,setVisited] = useStoredState<Record<string,boolean>>('visited', {});
  const [homeDay] = useState(() => defaultDay(data.trip.days));
  const activeDay = data.trip.days.find(d => location.pathname.endsWith(d.date));
  const dayUrl = `/day/${activeDay?.date ?? defaultDay(data.trip.days)}`;
  useEffect(() => { window.scrollTo({ top:0, behavior:'instant' }); }, [location.pathname]);
  useEffect(() => {
    document.title = `${activeDay ? `${activeDay.title} · ${activeDay.date.slice(5).replace('-','/')}` : location.pathname === '/places' ? '踩點清單' : location.pathname === '/documents' ? '重要文件' : location.pathname === '/audio' ? '求助' : '名古屋'}｜旅の手帖`;
  }, [activeDay, location.pathname]);
  const nav = [
    { url:dayUrl, label:'行程', icon:CalendarDays, active:location.pathname.startsWith('/day/') },
    { url:'/places', label:'踩點', icon:MapPin, active:location.pathname === '/places' },
    { url:'/documents', label:'文件', icon:Files, active:location.pathname === '/documents' },
    { url:'/audio', label:'求助', icon:CircleHelp, active:location.pathname === '/audio' },
  ];
  return <div className="app-shell"><a href="#main-content" className="skip-link" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>跳至主要內容</a>
    {!online && <div className="offline-banner" role="status"><WifiOff size={16} /><span>目前離線 · 已快取行程可查看，地圖與外部文件需連線。</span></div>}
    <main id="main-content" tabIndex={-1} className="main-content"><BookingProvider><Routes>
      <Route path="/day/:date" element={<DayRoute data={data} />} />
      <Route path="/places" element={<PlacesPage data={data} visited={visited} setVisited={setVisited} />} />
      <Route path="/documents" element={<DocumentsPage data={data} />} />
      <Route path="/audio" element={<Suspense fallback={<p role="status">載入中…</p>}><AudioPage /></Suspense>} />
      <Route path="*" element={<Navigate to={`/day/${homeDay}`} replace />} />
    </Routes></BookingProvider></main>
    <nav className="bottom-nav" aria-label="主選單">{nav.map(item => <NavLink key={item.label} to={item.url} className={item.active ? 'active' : ''} aria-current={item.active ? 'page' : undefined}><item.icon size={22} strokeWidth={1.7} /><span>{item.label}</span></NavLink>)}</nav>
    <UpdateNotice />
  </div>;
}
export default function App() {
  const [data,setData] = useState<TravelData | null>(null);
  const [error,setError] = useState(false);
  useEffect(() => { let active = true; loadData().then(value => { if (active) setData(value); }).catch(() => { if (active) setError(true); }); return () => { active = false; }; }, []);
  if (error) return <LoadError />;
  if (!data) return <main className="load-state" role="status"><BookOpen size={36} /><h1>打開旅行手帖…</h1><p>正在準備四天的名古屋時光。</p></main>;
  return <ErrorBoundary><HashRouter><TravelApp data={data} /></HashRouter></ErrorBoundary>;
}
