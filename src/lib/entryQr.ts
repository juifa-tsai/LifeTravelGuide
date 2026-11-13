export const entryQrKey = 'nagoya:entry-qr';
export function entryQrDrivePreview(source?:{category:string;access:string;url:string}):string | null {
  if (source?.category !== '入境' || source.access !== '私人') return null;
  try {
    const url = new URL(source.url);
    const match = /^\/file\/d\/([A-Za-z0-9_-]+)(?:\/view)?\/?$/.exec(url.pathname);
    return url.protocol === 'https:' && url.hostname === 'drive.google.com' && !url.username && !url.password && match
      ? `https://drive.google.com/file/d/${match[1]}/preview` : null;
  } catch { return null; }
}
export type EntryQr = { kind:'matrix' | 'image'; data:string };
type QrStorage = Pick<Storage,'getItem' | 'setItem' | 'removeItem'>;

// Only the original black/white modules travel in the private URL fragment.
// Nothing here decodes or sends immigration data to a service.
export function qrMatrix(value:string | null): { size:number; path:string } | null {
  if (!value || value.length > 5300) return null;
  const match = /^(\d{2,3})\.([A-Za-z0-9_-]+)$/.exec(value);
  if (!match) return null;
  const size = Number(match[1]);
  if (size < 21 || size > 177 || (size-21)%4) return null;
  let bytes:Uint8Array;
  try { bytes = Uint8Array.from(atob(match[2].replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)); }
  catch { return null; }
  if (bytes.length !== Math.ceil(size*size/8)) return null;
  const unused = bytes.length*8-size*size;
  if (unused && (bytes.at(-1)! & ((1<<unused)-1))) return null;
  const black = (x:number,y:number) => !!(bytes[Math.floor((y*size+x)/8)] & (1 << (7-(y*size+x)%8)));
  let path = '';
  for (let y=0;y<size;y++) for (let x=0;x<size;) {
    if (!black(x,y)) { x++; continue; }
    const start = x;
    while (x<size && black(x,y)) x++;
    const width = x-start;
    path += `M${start+4} ${y+4}h${width}v1h-${width}z`;
  }
  return {size,path};
}
export function validEntryQr(value:unknown): value is EntryQr {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<EntryQr>;
  if (typeof record.data !== 'string') return false;
  return record.kind === 'matrix' ? !!qrMatrix(record.data) : record.kind === 'image' && record.data.length <= 3000000 && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(record.data);
}
export function loadEntryQr(storage?:QrStorage): EntryQr | null {
  try {
    const raw = (storage ?? localStorage).getItem(entryQrKey);
    const value:unknown = raw ? JSON.parse(raw) : null;
    return validEntryQr(value) ? value : null;
  } catch { return null; }
}
export function saveEntryQr(value:EntryQr | null,storage?:QrStorage): boolean {
  try {
    const target = storage ?? localStorage;
    if (value === null) target.removeItem(entryQrKey);
    else {
      if (!validEntryQr(value)) return false;
      target.setItem(entryQrKey,JSON.stringify(value));
    }
    return true;
  } catch { return false; }
}
