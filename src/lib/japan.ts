import boundary from '../data/japanBoundary.json';
import { inRing, validCoordinates, type Coordinates } from './distances';

// A small coastal tolerance covers GPS/outline precision and reclaimed
// airport land. This offline eligibility check never supplies map pins.
const coastKm = 3;
const polygons = boundary.coordinates.map(rings => ({
  rings,
  south:Math.min(...rings[0].map(p=>p[1])), north:Math.max(...rings[0].map(p=>p[1])),
  west:Math.min(...rings[0].map(p=>p[0])), east:Math.max(...rings[0].map(p=>p[0])),
}));
function nearCoast(point:Coordinates, ring:number[][]) {
  const xScale = 111.195*Math.cos(point.lat*Math.PI/180);
  for (let i=1;i<ring.length;i++) {
    const ax = (ring[i-1][0]-point.lng)*xScale, ay = (ring[i-1][1]-point.lat)*111.195;
    const dx = (ring[i][0]-ring[i-1][0])*xScale, dy = (ring[i][1]-ring[i-1][1])*111.195;
    const length = dx*dx+dy*dy;
    const t = length ? Math.min(1,Math.max(0,-(ax*dx+ay*dy)/length)) : 0;
    if (Math.hypot(ax+t*dx,ay+t*dy) <= coastKm) return true;
  }
  return false;
}
export function isInJapan(point:Coordinates | null | undefined): boolean {
  if (!validCoordinates(point)) return false;
  const latitudeMargin = coastKm/111.195;
  const longitudeMargin = coastKm/(111.195*Math.max(.01,Math.cos(point.lat*Math.PI/180)));
  return polygons.some(({rings,south,north,west,east}) =>
    point.lat >= south-latitudeMargin && point.lat <= north+latitudeMargin &&
    point.lng >= west-longitudeMargin && point.lng <= east+longitudeMargin &&
    ((inRing(point,rings[0]) && !rings.slice(1).some(hole=>inRing(point,hole))) || nearCoast(point,rings[0])));
}
