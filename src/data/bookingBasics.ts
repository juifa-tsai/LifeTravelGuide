import type { Leg, Stop } from '../lib/types';
export type BookingKey = 'JL8670' | 'JL8671' | 'hotel' | 'airport_transfer';
export interface FlightBooking {
  kind:'flight'; key:'JL8670' | 'JL8671'; date:string; carrier:string; cabin:string; aircraft:string;
  from:{code:string;airport:string;terminal:string;time:string;zone:string};
  to:{code:string;airport:string;terminal:string;time:string;zone:string};
}
export interface HotelBooking {
  kind:'hotel'; key:'hotel'; name:string; room:string; stay:string; checkIn:string; checkOut:string;
}
export interface TransferBooking {
  kind:'transfer'; key:'airport_transfer'; name:string; platform:string;
}
export type BookingBasics = FlightBooking | HotelBooking | TransferBooking;
export const transferBooking:TransferBooking = {kind:'transfer',key:'airport_transfer',name:'接機訂單',platform:'Trip.com'};
export function bookingForTransfer(leg:Leg):TransferBooking | undefined {
  if (leg.date === '2026-11-15' && leg.fromPlaceId === 'ngo' && leg.toPlaceId === 'hotel' && leg.mode === '預約專車') return transferBooking;
}
const common = {carrier:'日本航空 JAL',cabin:'經濟艙',aircraft:'B737-800'};
export const flightBookings:FlightBooking[] = [
  {kind:'flight',key:'JL8670',date:'2026-11-15',...common,
    from:{code:'TPE',airport:'桃園',terminal:'T2',time:'15:50',zone:'台灣時間'},
    to:{code:'NGO',airport:'中部',terminal:'T1',time:'19:25',zone:'日本時間'}},
  {kind:'flight',key:'JL8671',date:'2026-11-18',...common,
    from:{code:'NGO',airport:'中部',terminal:'T1',time:'12:05',zone:'日本時間'},
    to:{code:'TPE',airport:'桃園',terminal:'T2',time:'14:40',zone:'台灣時間'}},
];
export const hotelBooking:HotelBooking = {kind:'hotel',key:'hotel',name:'名古屋伏見舒適飯店',room:'標準雙人床房 · 1 張雙人床',stay:'1 間 · 3 晚 · 1 位成人',checkIn:'11/15 15:00 後',checkOut:'11/18 10:00 前'};
// Basic details checked against the private flight itinerary and hotel voucher.
// Order numbers, airline references, passenger names and PINs never belong here.
export function bookingForStop(stop:Pick<Stop,'date' | 'displayStatus' | 'placeId' | 'category' | 'summary'>):FlightBooking | HotelBooking | undefined {
  if (stop.displayStatus === '固定航班' && stop.summary.includes('起飛')) return flightBookings.find(flight=>flight.date === stop.date);
  if (stop.placeId === 'hotel' && stop.category === '住宿' && stop.date === '2026-11-15' && stop.summary.includes('入住')) return hotelBooking;
}
