import { LockKeyhole, ArrowUpRight, FileText, Plane, BedDouble, CarFront, TrainFront, Maximize2, ExternalLink as LinkIcon } from 'lucide-react';
import type { TravelData } from '../lib/types';
import { ExternalLink } from '../components/ExternalLink';
import { EntryQrCard } from '../components/EntryQrCard';
import { PhotoCredits } from '../components/PhotoCredits';
const groups = [
  { category:'機票', title:'往返機票', icon:Plane },
  { category:'住宿', title:'住宿預訂', icon:BedDouble },
  { category:'接駁', title:'機場接駁', icon:CarFront },
  { category:'交通地圖', title:'交通與路線', icon:TrainFront },
  { category:'外部服務', title:'地圖入口', icon:LinkIcon },
];
export function DocumentsPage({ data }: { data:TravelData }) {
  return <>
    <header className="page-heading"><h1>重要文件</h1></header>
    <div className="documents-layout"><aside className="documents-aside">
      <EntryQrCard />
      <div className="flight-overview"><h2>航班時間</h2>
        <div><span className="small muted">11/15（日）· JL8670</span><p><strong>TPE</strong><Plane size={15} /><strong>NGO</strong></p><div className="flight-times"><span>15:50<small>桃園 T2 · 台灣時間</small></span><span>19:25<small>中部 T1 · 日本時間</small></span></div></div>
        <div><span className="small muted">11/18（三）· JL8671</span><p><strong>NGO</strong><Plane size={15} /><strong>TPE</strong></p><div className="flight-times"><span>12:05<small>中部 T1 · 日本時間</small></span><span>14:40<small>桃園 T2 · 台灣時間</small></span></div></div>
      </div></aside><div className="document-groups">{groups.map(group => {
        const documents = data.documents.filter(document => document.category === group.category && document.url);
        if (!documents.length) return null;
        return <section className="document-group" key={group.category}><div className="document-group-heading"><span className="document-group-icon"><group.icon size={20} strokeWidth={1.6} /></span><h2>{group.title}</h2></div>
          <div className="document-list">{documents.map(document => <article key={document.id} className={document.preview ? 'document-guide' : undefined}>
            <ExternalLink href={document.url} className="document-card"><FileText size={19} /><span><strong>{document.title}</strong><small>{document.dates}</small></span>{document.access === '私人' && <LockKeyhole size={13} className="muted" />}<ArrowUpRight size={17} /></ExternalLink>
            {document.access === '公開' && document.preview && <figure className="transport-guide">
              <a href={`${import.meta.env.BASE_URL}${document.preview.imageUrl}`} target="_blank" rel="noopener noreferrer" aria-label={`放大${document.title}（另開分頁）`}>
                <img src={`${import.meta.env.BASE_URL}${document.preview.imageUrl}`} alt={document.preview.alt} width={document.preview.width} height={document.preview.height} loading="lazy" />
                <span className="guide-zoom"><Maximize2 size={13} aria-hidden="true" />點圖放大</span>
              </a>
              <figcaption><span>{document.description}</span></figcaption>
            </figure>}
          </article>)}</div>
          {group.category === '接駁' && <p className="document-footnote">11/15 19:55 預約接機 · 中部國際機場 → 伏見飯店。上車位置依司機通知。</p>}
          {group.category === '住宿' && <p className="document-footnote">名古屋伏見舒適飯店 · 11/15 入住，11/18 10:00 前退房。</p>}
        </section>;
      })}</div></div>
    <PhotoCredits places={data.places} documents={data.documents} />
  </>;
}
