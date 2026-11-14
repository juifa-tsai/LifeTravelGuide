import { useState, type FormEvent } from 'react';
import { ArrowRight, FileText, MapPinned, Pencil } from 'lucide-react';
import type { BookingBasics } from '../data/bookingBasics';
import type { Place, TravelDocument } from '../lib/types';
import { shortDate } from '../lib/data';
import { useBookingDetails } from './BookingProvider';
import { ExternalLink } from './ExternalLink';
export default function BookingDetails({ booking, documents, place }:{booking:BookingBasics;documents:TravelDocument[];place?:Place}) {
  const {records,update} = useBookingDetails();
  const saved = records[booking.key];
  const [editing,setEditing] = useState(false);
  const [order,setOrder] = useState('');
  const [reference,setReference] = useState('');
  const flight = booking.kind === 'flight';
  const sourceDocuments = documents.filter(document=>document.category === (flight ? '機票' : '住宿')).slice(0,2);
  function edit() { setOrder(saved?.orderNumber || ''); setReference(saved?.bookingReference || ''); setEditing(true); }
  function submit(event:FormEvent) { event.preventDefault(); update(booking.key,{orderNumber:order,...(flight ? {bookingReference:reference} : {})}); setEditing(false); }
  return <section className="booking-details" aria-label={flight ? `${booking.key} 航班資料` : '住宿預訂資料'}>
    <div className="booking-heading-row"><p className="booking-heading">{flight ? `${shortDate(booking.date)} · ${booking.carrier} · ${booking.key}` : booking.name}</p>{!editing && <button className="booking-edit" type="button" onClick={edit} title="編輯訂單" aria-label="編輯訂單"><Pencil size={16} aria-hidden="true" /></button>}</div>
    {flight ? <>
      <div className="booking-route"><div><strong>{booking.from.time}</strong><span>{booking.from.code} {booking.from.airport} {booking.from.terminal}</span><small>{booking.from.zone}</small></div><ArrowRight size={18} aria-hidden="true" /><div><strong>{booking.to.time}</strong><span>{booking.to.code} {booking.to.airport} {booking.to.terminal}</span><small>{booking.to.zone}</small></div></div>
      <dl className="booking-data"><div><dt>艙等</dt><dd>{booking.cabin} · {booking.aircraft}</dd></div></dl>
    </> : <dl className="booking-data"><div><dt>房型</dt><dd>{booking.room}</dd></div><div><dt>住宿</dt><dd>{booking.stay}</dd></div><div><dt>入住</dt><dd>{booking.checkIn} · 日本時間</dd></div><div><dt>退房</dt><dd>{booking.checkOut} · 日本時間</dd></div></dl>}
    <dl className="booking-data booking-private"><div><dt>訂單編號</dt><dd>{saved?.orderNumber || '—'}</dd></div>{flight && <div><dt>訂位代號</dt><dd>{saved?.bookingReference || '—'}</dd></div>}</dl>
    {editing && <form className="booking-editor" onSubmit={submit}><label>訂單編號<input autoFocus value={order} onChange={event=>setOrder(event.target.value)} maxLength={64} pattern="[A-Za-z0-9 \-]*" autoComplete="off" /></label>{flight && <label>航空公司訂位代號<input value={reference} onChange={event=>setReference(event.target.value)} maxLength={64} pattern="[A-Za-z0-9 \-]*" autoComplete="off" /></label>}<div><button className="button" type="submit">儲存本機</button><button className="text-action" type="button" onClick={()=>setEditing(false)}>取消</button></div><p>僅儲存在此瀏覽器。</p></form>}
    <div className="booking-documents">{sourceDocuments.map((document,index)=><ExternalLink key={document.id} href={document.url} className="booking-document-link" label={`開啟 Google Drive：${document.title}`}><FileText size={16} aria-hidden="true" />{index === 0 ? flight ? '機票' : '入住憑證' : '訂單'}</ExternalLink>)}{place && <ExternalLink href={place.mapsUrl} className="collection-icon-action" label={`在 Google Maps 開啟 ${place.nameZh}`}><MapPinned size={20} aria-hidden="true" /></ExternalLink>}</div>
  </section>;
}
