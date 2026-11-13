import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function validateData({ trip, places, itinerary, legs, documents }) {
  const errors = [];
  const assert = (ok, message) => { if (!ok) errors.push(message); };
  const datePattern = /^2026-11-(15|16|17|18)$/;
  const ids = new Set();
  const url = (value, field) => {
    if (value == null) return;
    try { assert(new URL(value).protocol === 'https:', `${field}: expected HTTPS URL`); }
    catch { errors.push(`${field}: invalid URL`); }
  };
  const nonnegative = value => value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0);
  for (const place of places) {
    assert(typeof place.id === 'string' && /^[a-z0-9_]+$/.test(place.id), 'Invalid place ID');
    assert(!ids.has(place.id), `Duplicate place ID: ${place.id}`);
    ids.add(place.id);
    assert(Boolean(place.nameZh && place.nameJa), `${place.id}: missing name`);
    assert((place.lat === null) === (place.lng === null), `${place.id}: coordinate pair required`);
    if (place.lat !== null) {
      assert(Number.isFinite(place.lat) && Math.abs(place.lat) <= 90, `${place.id}: invalid latitude`);
      assert(Number.isFinite(place.lng) && Math.abs(place.lng) <= 180, `${place.id}: invalid longitude`);
      assert(Boolean(place.coordinateSource), `${place.id}: coordinate provenance required`);
      assert(!place.virtual, `${place.id}: virtual places cannot have coordinates`);
    }
    for (const field of ['mapsUrl', 'website', 'sourceUrl', 'coordinateSource']) url(place[field], `${place.id}.${field}`);
    if (place.weeklyHours) {
      assert(typeof place.weeklyHours === 'object' && !Array.isArray(place.weeklyHours), `${place.id}: weekly hours must be an object`);
      for (const [day,hours] of Object.entries(place.weeklyHours)) {
        assert(/^[0-6]$/.test(day), `${place.id}: invalid weekday`);
        assert(hours === null || (typeof hours === 'string' && hours.length > 0 && hours.length <= 60), `${place.id}: invalid daily hours`);
      }
      assert(place.detailSourceUrls?.length > 0, `${place.id}: weekly hours need sources`);
    }
    if (place.foodDescription) {
      assert(place.foodDescription.length >= 35 && place.foodDescription.length <= 70, `${place.id}: food description should be about 50 characters`);
      assert(Boolean(place.diningType), `${place.id}: dining type required`);
      assert(place.detailSourceUrls?.length > 0, `${place.id}: food description needs sources`);
    }
    for (const source of place.detailSourceUrls || []) url(source, `${place.id}.detailSourceUrls`);
    if (place.imageUrl) {
      assert(Boolean(place.imageAttribution), `${place.id}: image attribution required`);
      assert(Boolean(place.imageSourceUrl && place.imageLicenseUrl), `${place.id}: image source and license required`);
      url(place.imageSourceUrl, `${place.id}.imageSourceUrl`);
      url(place.imageLicenseUrl, `${place.id}.imageLicenseUrl`);
      assert(['place','illustration'].includes(place.imageKind), `${place.id}: image kind required`);
      if (place.imageKind === 'illustration') assert(place.imageAlt?.includes('示意'), `${place.id}: illustrative photos must be labeled`);
      assert(!place.imageUrl.includes('drive.google.com'), `${place.id}: private documents cannot be images`);
      if (!place.imageUrl.startsWith('images/')) url(place.imageUrl, `${place.id}.imageUrl`);
    }
  }
  const sequences = new Set();
  for (const stop of itinerary) {
    assert(ids.has(stop.placeId), `Missing place: ${stop.placeId}`);
    assert(datePattern.test(stop.date), `Invalid itinerary date: ${stop.date}`);
    assert(Number.isInteger(stop.sequence) && stop.sequence > 0, 'Invalid sequence');
    const key = `${stop.date}/${stop.sequence}`;
    assert(!sequences.has(key), `Duplicate sequence: ${key}`);
    sequences.add(key);
    assert(/^([01]\d|2[0-3]):[0-5]\d$/.test(stop.arrivalTime), `Invalid time: ${key}`);
    assert(nonnegative(stop.stayMinutes), `Invalid stay: ${key}`);
    assert(stop.timezone === (stop.placeId === 'tpe' ? 'Asia/Taipei' : 'Asia/Tokyo'), `Invalid timezone: ${key}`);
    url(stop.mapsUrl, key);
    url(stop.sourceUrl, key);
  }
  for (const day of trip.days) assert(itinerary.some(s => s.date === day.date), `Empty day: ${day.date}`);
  for (const leg of legs) {
    assert(ids.has(leg.fromPlaceId) && ids.has(leg.toPlaceId), 'Missing transit reference');
    assert(datePattern.test(leg.date), 'Invalid transit date');
    assert(nonnegative(leg.minutesEstimate) && nonnegative(leg.fareJpyEstimate), 'Invalid transit estimate');
    url(leg.sourceUrl, 'Transit source');
  }
  const docIds = new Set();
  for (const doc of documents) {
    assert(!docIds.has(doc.id), 'Duplicate document ID'); docIds.add(doc.id);
    assert(Boolean(doc.title && doc.url), 'Missing document fields'); url(doc.url, 'Document URL');
  }
  const publicData = JSON.stringify({ trip, places, itinerary, legs, documents });
  assert(!/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(publicData), 'Public data contains an email address');
  assert(!/"(?:pin|password|ticketNumber|bookingNumber|birthDate|creditCard|email)"\s*:/i.test(publicData), 'Public data contains a sensitive field');
  const stringValues = value => typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(stringValues) : [];
  assert(!stringValues({ trip, places, itinerary, legs, documents }).some(value => /\b(?:\d[ -]?){13,19}\b/.test(value)), 'Public data contains a possible ticket/card number');
  return errors;
}

export function loadData(directory = new URL('../public/data/', import.meta.url)) {
  return Object.fromEntries(['trip','places','itinerary','legs','documents'].map(name => [name, JSON.parse(readFileSync(new URL(`${name}.json`, directory), 'utf8'))]));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = validateData(loadData());
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log('Travel data validated: IDs, dates, times, coordinates, links, attribution and sensitive fields.');
}
