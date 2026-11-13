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
    if (leg.navigation) {
      const nav = leg.navigation;
      assert(Array.isArray(nav.sources) && nav.sources.length > 0, 'Transit navigation needs sources');
      for (const source of nav.sources || []) url(source, 'Transit navigation source');
      assert(/^\d{4}-\d{2}-\d{2}$/.test(nav.checkedAt), 'Transit navigation needs check date');
      for (const [index,step] of (nav.steps || []).entries()) {
        assert(Boolean(step.line && step.fromStation && step.toStation && step.fromStation !== step.toStation), 'Invalid station step');
        if (index) assert(nav.steps[index-1].toStation === step.fromStation, 'Disconnected station transfer');
      }
      if (nav.walking) {
        assert(leg.mode === '步行', 'Walking distance on non-walking leg');
        const foot = nav.walking;
        assert(Number.isFinite(foot.distanceMeters) && foot.distanceMeters > 0, 'Invalid walking route distance');
        assert(Number.isFinite(foot.durationSeconds) && foot.durationSeconds > 0, 'Invalid walking route duration');
        for (const [id,coordinates] of [[leg.fromPlaceId,foot.fromCoordinates],[leg.toPlaceId,foot.toCoordinates]]) {
          const place = places.find(place => place.id === id);
          assert(place && !place.virtual && Number.isFinite(place.lat) && Number.isFinite(place.lng) && coordinates?.lat === place.lat && coordinates?.lng === place.lng, 'Walking route endpoints changed or unverified');
        }
      }
    }
  }
  const docIds = new Set();
  for (const doc of documents) {
    assert(!docIds.has(doc.id), 'Duplicate document ID'); docIds.add(doc.id);
    assert(Boolean(doc.title && doc.url), 'Missing document fields'); url(doc.url, 'Document URL');
    if (doc.preview) {
      assert(doc.access === '公開' && doc.category === '交通地圖', `${doc.id}: only public transport diagrams can be embedded`);
      assert(/^transport\/[a-z0-9-]+\.(svg|webp)$/.test(doc.preview.imageUrl), `${doc.id}: expected local transport preview`);
      assert(Boolean(doc.preview.alt && doc.preview.attribution), `${doc.id}: preview description and attribution required`);
      assert([doc.preview.width,doc.preview.height].every(value => Number.isInteger(value) && value > 0), `${doc.id}: invalid preview dimensions`);
    }
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
