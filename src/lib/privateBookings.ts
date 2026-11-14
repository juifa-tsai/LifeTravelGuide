import type { BookingKey } from '../data/bookingBasics';
export const transferFieldLimits = { licensePlate:40, vehicleColor:24, vehicleModel:80, driverName:64, driverLanguage:24 } as const;
export type TransferField = keyof typeof transferFieldLimits;
export type PrivateBooking = { orderNumber?:string; bookingReference?:string } & Partial<Record<TransferField,string>>;
export type PrivateBookings = Partial<Record<BookingKey,PrivateBooking>>;
export const bookingStorageKey = 'nagoya:booking-details';
const keys = ['JL8670','JL8671','hotel','airport_transfer'];
export function parsePrivateBookings(value:unknown):PrivateBookings | null {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length > 4) return null;
  const result:PrivateBookings = {};
  for (const [key,record] of Object.entries(value)) {
    if (!keys.includes(key) || !record || typeof record !== 'object' || Array.isArray(record)) return null;
    const fields:PrivateBooking = {};
    for (const [field,text] of Object.entries(record)) {
      if (typeof text !== 'string') return null;
      if (Object.prototype.hasOwnProperty.call(transferFieldLimits,field)) {
        if (key !== 'airport_transfer' || text.length > transferFieldLimits[field as TransferField] || !/^[\p{L}\p{M}\p{N} .&/()（）・·'’－-]*$/u.test(text)) return null;
      } else if (!['orderNumber','bookingReference'].includes(field) || (!['JL8670','JL8671'].includes(key) && field === 'bookingReference') || !/^[A-Za-z0-9 -]{0,64}$/.test(text)) return null;
      if (text.trim()) fields[field as keyof PrivateBooking] = text.trim();
    }
    if (Object.keys(fields).length) result[key as BookingKey] = fields;
  }
  return result;
}
export function mergeBookingImport(existing:PrivateBookings, incoming:PrivateBookings):PrivateBookings {
  const merged = {...existing};
  for (const [key,record] of Object.entries(incoming)) merged[key as BookingKey] = {...existing[key as BookingKey],...record};
  return merged;
}
export function decodeBookingImport(encoded:string | null):PrivateBookings | null {
  if (!encoded || encoded.length > 4096 || !/^[A-Za-z0-9_-]+$/.test(encoded)) return null;
  try {
    const bytes = Uint8Array.from(atob(encoded.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
    return parsePrivateBookings(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));
  } catch { return null; }
}
export function loadPrivateBookings():PrivateBookings {
  try { return parsePrivateBookings(JSON.parse(localStorage.getItem(bookingStorageKey) || '{}')) || {}; }
  catch { return {}; }
}
export function savePrivateBookings(records:PrivateBookings):boolean {
  const value = parsePrivateBookings(records);
  if (!value) return false;
  try { localStorage.setItem(bookingStorageKey,JSON.stringify(value)); return true; }
  catch { return false; }
}
