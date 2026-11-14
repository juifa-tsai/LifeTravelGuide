import type { Stop } from '../lib/types';
export type BookingKey = 'JL8670' | 'JL8671' | 'hotel';
export interface FlightBooking {
  kind:'flight'; key:'JL8670' | 'JL8671'; date:string; carrier:string; cabin:string; aircraft:string;
  from:{code:string;airport:string;terminal:string;time:string;zone:string};
  to:{code:string;airport:string;terminal:string;time:string;zone:string};
  carryOn:string; checked:string;
}
export interface HotelBooking {
  kind:'hotel'; key:'hotel'; name:string; room:string; stay:string; checkIn:string; checkOut:string; breakfast:string;
}
export type BookingBasics = FlightBooking | HotelBooking;
const common = {carrier:'日本航空 JAL',cabin:'經濟艙',aircraft:'B737-800',carryOn:'手提 1 件＋個人物品 1 件，合計 10 kg',checked:'2 件，每件 23 kg'};
export const flightBookings:FlightBooking[] = [
  {kind:'flight',key:'JL8670',date:'2026-11-15',...common,
    from:{code:'TPE',airport:'桃園',terminal:'T2',time:'15:50',zone:'台灣時間'},
    to:{code:'NGO',airport:'中部',terminal:'T1',time:'19:25',zone:'日本時間'}},
  {kind:'flight',key:'JL8671',date:'2026-11-18',...common,
    from:{code:'NGO',airport:'中部',terminal:'T1',time:'12:05',zone:'日本時間'},
    to:{code:'TPE',airport:'桃園',terminal:'T2',time:'14:40',zone:'台灣時間'}},
];
export const hotelBooking:HotelBooking = {kind:'hotel',key:'hotel',name:'名古屋伏見舒適飯店',room:'標準雙人床房 · 1 張雙人床',stay:'1 間 · 3 晚 · 1 位成人',checkIn:'11/15 15:00 後',checkOut:'11/18 10:00 前',breakfast:'11/16–18，每日 1 客早餐'};
// Basic details checked against the private flight itinerary and hotel voucher.
// Order numbers, airline references, passenger names and PINs never belong here.
export function bookingForStop(stop:Pick<Stop,'date' | 'displayStatus' | 'placeId' | 'category'>):BookingBasics | undefined {
  if (stop.displayStatus === '固定航班') return flightBookings.find(flight=>flight.date === stop.date);
  if (stop.placeId === 'hotel' && stop.category === '住宿') return hotelBooking;
}
