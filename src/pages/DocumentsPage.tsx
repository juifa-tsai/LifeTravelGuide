import { LockKeyhole, ArrowUpRight, FileText, Plane, BedDouble, CarFront, TrainFront, ExternalLink as LinkIcon } from 'lucide-react';
import type { TravelData } from '../lib/types';
import { ExternalLink } from '../components/ExternalLink';
const groups = [
  { category:'機票', title:'往返機票', en:'FLIGHTS', icon:Plane },
  { category:'住宿', title:'住宿預訂', en:'YOUR STAY', icon:BedDouble },
  { category:'接駁', title:'機場接駁', en:'AIRPORT TRANSFER', icon:CarFront },
  { category:'交通地圖', title:'交通與路線', en:'GETTING AROUND', icon:TrainFront },
  { category:'外部服務', title:'地圖入口', en:'MAPS', icon:LinkIcon },
];
export function DocumentsPage({ data }: { data:TravelData }) {
  return <>
    <header className="page-heading"><div className="heading-kicker"><span>EVERYTHING IN ONE PLACE</span><span>TRAVEL ESSENTIALS</span></div><h1>重要文件<span className="heading-ja" lang="ja">旅の準備</span></h1><p>需要的時候，不用再翻找。</p></header>
    <div className="documents-layout"><aside className="documents-aside"><div className="privacy-note"><LockKeyhole size={21} /><div><h2>私人文件，安心開啟</h2><p>憑證由 Google Drive 開啟，請登入原有權限的 Google 帳號。文件需要網路，不會離線保存。</p><p className="small">此網站為公開頁面，文件連結亦可見；文件內容仍受 Drive 私人權限保護。</p></div></div>
      <div className="flight-overview"><span className="eyebrow">YOUR FLIGHT NOTES</span>
        <div><span className="small muted">11/15（日）· JL8670</span><p><strong>TPE</strong><Plane size={15} /><strong>NGO</strong></p><div className="flight-times"><span>15:50<small>桃園 T2 · 台灣時間</small></span><span>19:25<small>中部 T1 · 日本時間</small></span></div></div>
        <div><span className="small muted">11/18（三）· JL8671</span><p><strong>NGO</strong><Plane size={15} /><strong>TPE</strong></p><div className="flight-times"><span>12:05<small>中部 T1 · 日本時間</small></span><span>14:40<small>桃園 T2 · 台灣時間</small></span></div></div>
      </div></aside><div className="document-groups">{groups.map(group => {
        const documents = data.documents.filter(document => document.category === group.category && document.url);
        if (!documents.length) return null;
        return <section className="document-group" key={group.category}><div className="document-group-heading"><span className="document-group-icon"><group.icon size={20} strokeWidth={1.6} /></span><h2>{group.title}<span>{group.en}</span></h2></div>
          <div className="document-list">{documents.map(document => <ExternalLink key={document.id} href={document.url} className="document-card"><FileText size={19} /><span><strong>{document.title}</strong><small>{document.dates}{document.access === '私人' ? ' · Google Drive' : ' · 公開資訊'}</small></span>{document.access === '私人' && <LockKeyhole size={13} className="muted" />}<ArrowUpRight size={17} /></ExternalLink>)}</div>
          {group.category === '接駁' && <p className="document-footnote">11/15 19:55 預約接機 · 中部國際機場 → 伏見飯店。上車位置依司機通知。</p>}
          {group.category === '住宿' && <p className="document-footnote">名古屋伏見舒適飯店 · 11/15 入住，11/18 10:00 前退房。含 11/16–18 早餐。</p>}
        </section>;
      })}<p className="document-bottom-note">出發前先確認可以開啟憑證，重要資訊也可自行保存於手機。</p></div></div>
  </>;
}
