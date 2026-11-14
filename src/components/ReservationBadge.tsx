import type { Place } from '../lib/types';
export function ReservationBadge({ place }:{place?:Place}) {
  return place?.reservationRequired ? <span className="reservation-badge">需預約</span> : null;
}
