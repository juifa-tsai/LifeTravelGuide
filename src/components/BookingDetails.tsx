import { useState, type FormEvent } from 'react';
import { ArrowRight, FileText, MapPinned, Pencil } from 'lucide-react';
import type { BookingBasics } from '../data/bookingBasics';
import type { Place, TravelDocument } from '../lib/types';
import { shortDate } from '../lib/data';
import { useBookingDetails } from './BookingProvider';
import { ExternalLink } from './ExternalLink';
import { parsePrivateBookings, transferFieldLimits, type TransferField } from '../lib/privateBookings';
const transferFields:{key:TransferField;label:string}[] = [{key:'licensePlate',label:'車牌'},{key:'vehicleColor',label:'車色'},{key:'vehicleModel',label:'車型'},{key:'driverName',label:'司機'},{key:'driverLanguage',label:'語言'}];
type ReturnField = 'destinationAddress' | 'registeredTime' | 'verificationCode' | 'orderUrl';
const returnFields:{key:ReturnField;label:string;maxLength:number}[] = [{key:'destinationAddress',label:'目的地',maxLength:120},{key:'registeredTime',label:'訂單登記時間',maxLength:5},{key:'verificationCode',label:'驗證碼',maxLength:4},{key:'orderUrl',label:'訂單連結',maxLength:200}];
export default function BookingDetails({ booking, documents, place }:{booking:BookingBasics;documents:TravelDocument[];place?:Place}) {
  const {records,update} = useBookingDetails();
  const saved = records[booking.key];
  const [editing,setEditing] = useState(false);
  const [order,setOrder] = useState('');
  const [reference,setReference] = useState('');
  const [vehicle,setVehicle] = useState<Partial<Record<TransferField,string>>>({});
  const [returnInfo,setReturnInfo] = useState<Partial<Record<ReturnField,string>>>({});
  const [error,setError] = useState('');
  const flight = booking.kind === 'flight';
  const transfer = booking.kind === 'transfer';
  const taiwan = booking.key === 'taiwan_transfer';
  const sourceDocuments = taiwan ? [] : documents.filter(document=>document.category === (flight ? '機票' : transfer ? '接駁' : '住宿')).slice(0,2);
  function edit() { setOrder(saved?.orderNumber || ''); setReference(saved?.bookingReference || ''); setVehicle(Object.fromEntries(transferFields.map(({key})=>[key,saved?.[key] || '']))); setReturnInfo(Object.fromEntries(returnFields.map(({key})=>[key,saved?.[key] || '']))); setError(''); setEditing(true); }
  function submit(event:FormEvent) {
    event.preventDefault();
    const value = {orderNumber:order,...(flight ? {bookingReference:reference} : {}),...(transfer ? vehicle : {}),...(taiwan ? returnInfo : {})};
    if (!parsePrivateBookings({[booking.key]:value})) { setError(taiwan ? '請確認訂單連結、驗證碼及資料格式。' : '請使用一般文字填寫車輛與司機資訊。'); return; }
    update(booking.key,value); setEditing(false);
  }
  return <section className="booking-details" aria-label={flight ? `${booking.key} 航班資料` : taiwan ? '返台接駁預訂資料' : transfer ? '接機預訂資料' : '住宿預訂資料'}>
    <div className="booking-heading-row"><p className="booking-heading">{flight ? `${shortDate(booking.date)} · ${booking.carrier} · ${booking.key}` : transfer ? `${booking.platform} · ${booking.name}` : booking.name}</p>{!editing && <button className="booking-edit" type="button" onClick={edit} title="編輯訂單" aria-label="編輯訂單"><Pencil size={16} aria-hidden="true" /></button>}</div>
    {flight ? <>
      <div className="booking-route"><div><strong>{booking.from.time}</strong><span>{booking.from.code} {booking.from.airport} {booking.from.terminal}</span><small>{booking.from.zone}</small></div><ArrowRight size={18} aria-hidden="true" /><div><strong>{booking.to.time}</strong><span>{booking.to.code} {booking.to.airport} {booking.to.terminal}</span><small>{booking.to.zone}</small></div></div>
      <dl className="booking-data"><div><dt>艙等</dt><dd>{booking.cabin} · {booking.aircraft}</dd></div></dl>
    </> : booking.kind === 'hotel' ? <dl className="booking-data"><div><dt>房型</dt><dd>{booking.room}</dd></div><div><dt>住宿</dt><dd>{booking.stay}</dd></div><div><dt>入住</dt><dd>{booking.checkIn} · 日本時間</dd></div><div><dt>退房</dt><dd>{booking.checkOut} · 日本時間</dd></div></dl> : null}
    {taiwan && <><dl className="booking-data booking-return">
      <div><dt>上車</dt><dd>桃園機場第二航廈</dd></div>
      {saved?.destinationAddress && <div><dt>目的地</dt><dd>{saved.destinationAddress}</dd></div>}
      {saved?.registeredTime && <div><dt>登記時間</dt><dd>{booking.kind === 'transfer' && booking.date ? `${shortDate(booking.date)} ` : ''}{saved.registeredTime} · 台灣時間</dd></div>}
    </dl><p className="small muted">依出關及司機通知上車。</p></>}
    {transfer && saved && <dl className="booking-data booking-vehicle">
      {saved.licensePlate && <div><dt>車牌</dt><dd><strong className="vehicle-plate">{saved.licensePlate}</strong></dd></div>}
      {(saved.vehicleColor || saved.vehicleModel) && <div><dt>車輛</dt><dd>{[saved.vehicleColor,saved.vehicleModel].filter(Boolean).join(' · ')}</dd></div>}
      {(saved.driverName || saved.driverLanguage) && <div><dt>司機</dt><dd>{[saved.driverName,saved.driverLanguage].filter(Boolean).join(' · ')}</dd></div>}
    </dl>}
    <dl className="booking-data booking-private"><div><dt>訂單編號</dt><dd>{saved?.orderNumber || '—'}</dd></div>{flight && <div><dt>訂位代號</dt><dd>{saved?.bookingReference || '—'}</dd></div>}{taiwan && saved?.verificationCode && <div><dt>驗證碼</dt><dd>{saved.verificationCode}</dd></div>}</dl>
    {editing && <form className="booking-editor" onSubmit={submit}><label>訂單編號<input autoFocus value={order} onChange={event=>setOrder(event.target.value)} maxLength={64} pattern="[A-Za-z0-9 \-]*" autoComplete="off" /></label>{flight && <label>航空公司訂位代號<input value={reference} onChange={event=>setReference(event.target.value)} maxLength={64} pattern="[A-Za-z0-9 \-]*" autoComplete="off" /></label>}{transfer && transferFields.map(({key,label})=><label key={key}>{label}<input value={vehicle[key] || ''} onChange={event=>setVehicle(previous=>({...previous,[key]:event.target.value}))} maxLength={transferFieldLimits[key]} autoComplete="off" /></label>)}{taiwan && returnFields.map(({key,label,maxLength})=><label key={key}>{label}<input value={returnInfo[key] || ''} onChange={event=>setReturnInfo(previous=>({...previous,[key]:event.target.value}))} type={key === 'orderUrl' ? 'url' : key === 'registeredTime' ? 'time' : 'text'} maxLength={maxLength} inputMode={key === 'verificationCode' ? 'numeric' : undefined} pattern={key === 'verificationCode' ? '[0-9]{4}' : undefined} autoComplete="off" /></label>)}<div><button className="button" type="submit">儲存本機</button><button className="text-action" type="button" onClick={()=>setEditing(false)}>取消</button></div><p>僅儲存在此瀏覽器。</p></form>}
    {editing && error && <p className="booking-status" role="alert">{error}</p>}
    <div className="booking-documents">{taiwan && saved?.orderUrl && <ExternalLink href={saved.orderUrl} className="booking-document-link" label="開啟全鋒接駁訂單"><FileText size={16} aria-hidden="true" />接駁訂單</ExternalLink>}{taiwan && saved?.destinationAddress && <ExternalLink href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent('桃園國際機場第二航廈')}&destination=${encodeURIComponent(saved.destinationAddress)}&travelmode=driving`} className="collection-icon-action" label="返台接駁路線"><MapPinned size={20} aria-hidden="true" /></ExternalLink>}{sourceDocuments.map((document,index)=><ExternalLink key={document.id} href={document.url} className="booking-document-link" label={`開啟 Google Drive：${document.title}`}><FileText size={16} aria-hidden="true" />{transfer ? 'Google Drive 訂單' : index === 0 ? flight ? '機票' : '入住憑證' : '訂單'}</ExternalLink>)}{place && <ExternalLink href={place.mapsUrl} className="collection-icon-action" label={`在 Google Maps 開啟 ${place.nameZh}`}><MapPinned size={20} aria-hidden="true" /></ExternalLink>}</div>
  </section>;
}
