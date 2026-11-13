import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ImagePlus, Maximize2, QrCode, X } from 'lucide-react';
import { loadEntryQr, qrMatrix, saveEntryQr, type EntryQr } from '../lib/entryQr';

export function EntryQrCard() {
  const [record,setRecord] = useState<EntryQr | null>(loadEntryQr);
  const [message,setMessage] = useState('');
  const [removeArmed,setRemoveArmed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const matrix = useMemo(()=>record?.kind === 'matrix' ? qrMatrix(record.data) : null,[record]);
  function store(value:EntryQr | null) {
    const saved = saveEntryQr(value);
    setRecord(value);
    setRemoveArmed(false);
    setMessage(saved ? '' : '此瀏覽器無法儲存，離開後需重新匯入。');
  }
  useEffect(()=>{
    const params = new URLSearchParams(location.search);
    if (!params.has('entryQr')) return;
    const value = params.get('entryQr');
    if (qrMatrix(value)) store({kind:'matrix',data:value!});
    else setMessage('QR 匯入連結無效，請改選原始圖片。');
    // Strip private modules immediately after import; never place them in HTTP URLs.
    params.delete('entryQr');
    const query = params.toString();
    navigate({pathname:location.pathname,search:query ? `?${query}` : ''},{replace:true});
  },[location.search,location.pathname,navigate]);
  async function chooseFile(event:ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 2*1024*1024) {
      setMessage('請選擇 2 MB 以內的 PNG、JPG 或 WebP 原始 QR 圖片。'); return;
    }
    try {
      const data = await new Promise<string>((resolve,reject)=>{
        const reader = new FileReader();
        reader.onload = ()=>resolve(String(reader.result)); reader.onerror = ()=>reject(reader.error);
        reader.readAsDataURL(file);
      });
      const image = new Image(); image.src = data; await image.decode();
      store({kind:'image',data});
    } catch { setMessage('圖片無法讀取，請重新選擇原始截圖。'); }
  }
  function picture() {
    if (matrix) return <svg className="entry-qr-image" role="img" aria-label="Visit Japan Web 入境審查及海關申報 QR 碼" viewBox={`0 0 ${matrix.size+8} ${matrix.size+8}`} shapeRendering="crispEdges"><rect width="100%" height="100%" fill="#fff" /><path d={matrix.path} fill="#000" /></svg>;
    return record ? <img className="entry-qr-image" src={record.data} alt="Visit Japan Web 入境 QR 原始截圖" /> : null;
  }
  return <section className="entry-qr-card" aria-labelledby="entry-qr-title">
    <header><QrCode size={23} aria-hidden="true" /><div><h2 id="entry-qr-title">入境審查及海關申報</h2><p>Visit Japan Web</p></div></header>
    {record ? <button type="button" className="entry-qr-open" onClick={()=>dialog.current?.showModal()} aria-label="放大入境 QR 碼，出示掃描">{picture()}<span><Maximize2 size={14} aria-hidden="true" />放大出示</span></button> : <p className="entry-qr-empty">匯入 QR 後，即可在這裡直接出示。</p>}
    <div className="entry-qr-actions"><label className="text-action entry-qr-upload"><ImagePlus size={16} aria-hidden="true" />{record ? '更換圖片' : '匯入 QR 圖片'}<input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseFile} aria-label="選擇入境 QR 圖片" /></label>{record && <button type="button" className="text-action" onClick={()=>removeArmed ? store(null) : setRemoveArmed(true)}>{removeArmed ? '確定移除' : '移除'}</button>}</div>
    <p className="entry-qr-local">僅存這台裝置，可離線出示。</p>
    {message && <p className="entry-qr-message" role="status">{message}</p>}
    <dialog ref={dialog} className="entry-qr-dialog" aria-labelledby="entry-qr-dialog-title" onClick={event=>{if(event.target === event.currentTarget) dialog.current?.close();}}><header><h2 id="entry-qr-dialog-title">入境 QR 碼</h2><button type="button" className="icon-button" aria-label="關閉放大 QR 碼" onClick={()=>dialog.current?.close()}><X size={22} /></button></header>{picture()}</dialog>
  </section>;
}
