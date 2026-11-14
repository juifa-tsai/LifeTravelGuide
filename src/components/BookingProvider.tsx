import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { BookingKey } from '../data/bookingBasics';
import { bookingStorageKey, decodeBookingImport, loadPrivateBookings, mergeBookingImport, parsePrivateBookings, savePrivateBookings, type PrivateBooking, type PrivateBookings } from '../lib/privateBookings';
const Context = createContext<{ records:PrivateBookings; update:(key:BookingKey,value:PrivateBooking)=>void }>({records:{},update:()=>{}});
export const useBookingDetails = () => useContext(Context);
export function BookingProvider({ children }:{children:ReactNode}) {
  const [records,setRecords] = useState(loadPrivateBookings);
  const [message,setMessage] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  function persist(value:PrivateBookings) {
    setRecords(value);
    setMessage(savePrivateBookings(value) ? '' : '訂單資料暫時只保留於本次瀏覽，無法儲存至此瀏覽器。');
  }
  useEffect(()=>{
    const params = new URLSearchParams(location.search);
    if (!params.has('bookings') && !params.has('pickup')) return;
    const incoming = decodeBookingImport(params.get('bookings') ?? params.get('pickup'));
    if (incoming) persist(mergeBookingImport(loadPrivateBookings(),incoming));
    else setMessage('訂單匯入連結無效，可在卡片內填寫。');
    params.delete('bookings');
    params.delete('pickup');
    const rest = params.toString();
    navigate({pathname:location.pathname,search:rest ? `?${rest}` : ''},{replace:true});
  },[location.search,location.pathname,navigate]);
  useEffect(()=>{
    const changed = (event:StorageEvent) => {if (event.key === bookingStorageKey || event.key === null) setRecords(loadPrivateBookings());};
    window.addEventListener('storage',changed);
    return ()=>window.removeEventListener('storage',changed);
  },[]);
  function update(key:BookingKey,value:PrivateBooking) {
    const next = {...records};
    const parsed = parsePrivateBookings({[key]:value});
    if (!parsed) return;
    if (parsed[key]) next[key] = parsed[key]; else delete next[key];
    persist(next);
  }
  return <Context.Provider value={{records,update}}>{message && <p className="booking-status" role="status">{message}</p>}{children}</Context.Provider>;
}
