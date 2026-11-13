import { LockKeyhole, ArrowUpRight, FileText, Plane, BedDouble, CarFront, TrainFront, Maximize2, ExternalLink as LinkIcon } from 'lucide-react';
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
    <header className="page-heading"><div className="heading-kicker"><span>EVERYTHING IN ONE PLACE</span><span>TRAVEL ESSENTIALS</span></div><h1>重要文件<span className="heading-ja" lang="ja">旅の準備</span></h1></header>
    <div className="documents-layout"><aside className="documents-aside"><div className="privacy-note"><LockKeyhole size={21} /><div><h2>Google Drive 私人文件</h2><p>請連線並登入有權限的 Google 帳號。</p></div></div>
      <div className="flight-overview"><span className="eyebrow">YOUR FLIGHT NOTES</span>
        <div><span className="small muted">11/15（日）· JL8670</span><p><strong>TPE</strong><Plane size={15} /><strong>NGO</strong></p><div className="flight-times"><span>15:50<small>桃園 T2 · 台灣時間</small></span><span>19:25<small>中部 T1 · 日本時間</small></span></div></div>
        <div><span className="small muted">11/18（三）· JL8671</span><p><strong>NGO</strong><Plane size={15} /><strong>TPE</strong></p><div className="flight-times"><span>12:05<small>中部 T1 · 日本時間</small></span><span>14:40<small>桃園 T2 · 台灣時間</small></span></div></div>
      </div></aside><div className="document-groups">{groups.map(group => {
        const documents = data.documents.filter(document => document.category === group.category && document.url);
        if (!documents.length) return null;
        return <section className="document-group" key={group.category}><div className="document-group-heading"><span className="document-group-icon"><group.icon size={20} strokeWidth={1.6} /></span><h2>{group.title}<span>{group.en}</span></h2></div>
          <div className="document-list">{documents.map(document => <article key={document.id} className={document.preview ? 'document-guide' : undefined}>
            <ExternalLink href={document.url} className="document-card"><FileText size={19} /><span><strong>{document.title}</strong><small>{document.dates}{document.access === '私人' ? ' · Google Drive' : ' · 公開資訊'}</small></span>{document.access === '私人' && <LockKeyhole size={13} className="muted" />}<ArrowUpRight size={17} /></ExternalLink>
            {document.access === '公開' && document.preview && <figure className="transport-guide">
              <a href={`${import.meta.env.BASE_URL}${document.preview.imageUrl}`} target="_blank" rel="noopener noreferrer" aria-label={`放大${document.title}（另開分頁）`}>
                <img src={`${import.meta.env.BASE_URL}${document.preview.imageUrl}`} alt={document.preview.alt} width={document.preview.width} height={document.preview.height} loading="lazy" />
                <span className="guide-zoom"><Maximize2 size={13} aria-hidden="true" />點圖放大</span>
              </a>
              <figcaption><span>{document.description}</span><small>圖：{document.preview.attribution}</small></figcaption>
            </figure>}
          </article>)}</div>
          {group.category === '接駁' && <p className="document-footnote">11/15 19:55 預約接機 · 中部國際機場 → 伏見飯店。上車位置依司機通知。</p>}
          {group.category === '住宿' && <p className="document-footnote">名古屋伏見舒適飯店 · 11/15 入住，11/18 10:00 前退房。含 11/16–18 早餐。</p>}
        </section>;
      })}</div></div>
  </>;
}
