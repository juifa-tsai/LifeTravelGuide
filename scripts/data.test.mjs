import test from 'node:test';
import assert from 'node:assert/strict';
import { loadData, validateData } from './validate-data.mjs';
const data = loadData();

test('workbook export meets the public data contract', () => assert.deepEqual(validateData(data), []));
test('broken references, duplicate sequence and virtual pins are rejected', () => {
  const changed = structuredClone(data);
  changed.itinerary[0].placeId = 'unknown';
  changed.itinerary.push(changed.itinerary[1]);
  Object.assign(changed.places.find(p => p.id === 'late_dinner'), { lat:35.16, lng:136.9, coordinateSource:'https://example.com' });
  const errors = validateData(changed).join('\n');
  assert.match(errors, /Missing place/); assert.match(errors, /Duplicate sequence/); assert.match(errors, /virtual places/);
});
test('fixed bookings, flexible dinner and museum day stay intact', () => {
  const day = date => data.itinerary.filter(s => s.date === date);
  assert(day('2026-11-15').some(s => s.arrivalTime === '19:55' && s.summary.includes('專車')));
  assert(day('2026-11-15').some(s => s.placeId === 'late_dinner' && s.displayStatus === '彈性'));
  assert(!day('2026-11-16').some(s => s.placeId === 'art_museum'));
  assert(day('2026-11-17').some(s => s.placeId === 'art_museum'));
  assert(day('2026-11-18').some(s => s.arrivalTime === '12:05' && s.summary.includes('JL8671')));
  assert(day('2026-11-18').some(s => s.arrivalTime === '14:40' && s.timezone === 'Asia/Taipei'));
  assert(!data.itinerary.some(s => s.placeId === 'barns'));
});
test('private payloads and uncredited images cannot be exported', () => {
  const changed = structuredClone(data);
  changed.trip.email = 'traveler@example.com';
  changed.places[0].imageUrl = 'https://drive.google.com/private.pdf';
  const errors = validateData(changed).join('\n');
  assert.match(errors, /email address/); assert.match(errors, /sensitive field/);
  assert.match(errors, /attribution required/); assert.match(errors, /private documents/);
});
