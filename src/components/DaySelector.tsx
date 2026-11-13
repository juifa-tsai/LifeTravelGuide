import { NavLink } from 'react-router-dom';
import type { Day } from '../lib/types';
import { shortDate } from '../lib/data';
export function DaySelector({ days }: { days: Day[] }) {
  return <nav className="day-selector" aria-label="日期切換">{days.map(day =>
    <NavLink key={day.date} to={`/day/${day.date}`} className={({ isActive }) => isActive ? 'day-tab active' : 'day-tab'}>
      <span>{shortDate(day.date)}</span><span className="weekday">{day.weekday}<span className="desktop-day-theme"> · {day.title}</span></span>
    </NavLink>)}</nav>;
}
