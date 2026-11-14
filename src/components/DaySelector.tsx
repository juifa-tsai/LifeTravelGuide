import { NavLink } from 'react-router-dom';
import type { Day } from '../lib/types';
import { shortDate } from '../lib/data';
export function DaySelector({ days, onSelect }: { days:Day[]; onSelect:(date:string)=>void }) {
  return <nav className="day-selector" aria-label="日期切換">{days.map(day =>
    <NavLink key={day.date} to={`/day/${day.date}`} onClick={event=>{if(event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey)onSelect(day.date);}} className={({ isActive }) => isActive ? 'day-tab active' : 'day-tab'}>
      <span>{shortDate(day.date)}</span><span className="weekday">{day.weekday}</span>
    </NavLink>)}</nav>;
}
