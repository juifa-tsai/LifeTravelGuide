import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
  changed.places[0].imageAttribution = null;
  const errors = validateData(changed).join('\n');
  assert.match(errors, /email address/); assert.match(errors, /sensitive field/);
  assert.match(errors, /attribution required/); assert.match(errors, /private documents/);
});

test('every place and itinerary stop has a credited local preview with truthful labeling', () => {
  for (const place of data.places) {
    assert.match(place.imageUrl, /^images\/[a-z0-9-]+\.webp$/);
    const bytes = readFileSync(new URL(`../public/${place.imageUrl}`, import.meta.url));
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    assert(place.imageAttribution && place.imageSourceUrl && place.imageLicenseUrl);
    if (place.imageKind === 'illustration') assert.match(place.imageAlt, /示意/);
  }
  for (const stop of data.itinerary) assert(data.places.find(p => p.id === stop.placeId)?.imageUrl);
});

const dinnerIds = ['molnoda','coco_fushimi','nine_cafe_fushimi','kazan','durbar_sakae'];
const supplement = JSON.parse(readFileSync(new URL('./dinner-supplement.json', import.meta.url), 'utf8'));
test('arrival restaurants have unique real places, HTTPS Maps links and explicit lacto-vegetarian cautions', () => {
  for (const id of dinnerIds) {
    const matches = data.places.filter(place => place.id === id);
    assert.equal(matches.length, 1, id);
    const place = matches[0];
    assert.equal(place.virtual, false);
    const maps = new URL(place.mapsUrl);
    assert.equal(maps.protocol, 'https:');
    assert.equal(maps.hostname, 'www.google.com');
    assert(maps.searchParams.get('query'));
    for (const term of ['奶素','肉','魚','蛋','魚露','柴魚','動物性高湯']) assert(place.dietText.includes(term), `${id}: ${term}`);
    for (const field of ['nameZh','nameJa','address','hoursText','closedText','priority','summary','verification','sourceUrl']) assert(place[field], `${id}: ${field}`);
    assert.match(place.hoursText, /非 2026\/11\/15 當日保證/);
    assert.match(place.hoursText, /L\.O\./);
    assert.equal(place.lat, null, `${id}: no verified coordinates yet`);
    assert.equal(place.lng, null);
    assert.equal(place.coordinateSource, null);
    assert.equal(place.imageKind, 'illustration');
    assert.match(place.imageAlt, /示意/);
  }
});
test('arrival dinner remains flexible at 21:45 and explains all six candidates', () => {
  const dinner = data.itinerary.find(stop => stop.date === '2026-11-15' && stop.placeId === 'late_dinner');
  assert.equal(dinner.arrivalTime, '21:45');
  assert.equal(dinner.displayStatus, '彈性');
  for (const term of ['MOLNODA','CoCo','NINE CAFE','華山','Vegan','DURBAR','杏ZU','21:30']) assert((dinner.summary + dinner.note).includes(term), term);
});

// Exercise the real importer, including a future workbook owning a supplemental ID.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
test('Excel reimport preserves dinner additions, other days and workbook precedence without duplicates', () => {
  const directory = mkdtempSync(join(tmpdir(), 'nagoya-dinner-'));
  const script = fileURLToPath(new URL('./xlsx-to-json.py', import.meta.url));
  const workbook = fileURLToPath(new URL('../docs/名古屋四日行程_20261115-1118.xlsx', import.meta.url));
  const loadOutput = () => loadData(pathToFileURL(`${directory}/`));
  try {
    execFileSync('python3', [script, workbook, '--out', directory]);
    const exported = loadOutput();
    assert.deepEqual(exported, data, 'committed data must match a real Excel reimport');
    assert.deepEqual(validateData(exported), []);
    for (const id of dinnerIds) assert.equal(exported.places.filter(p => p.id === id).length, 1);
    execFileSync('python3', [script, workbook, '--out', directory]);
    assert.deepEqual(loadOutput(), exported, 'repeat imports are stable');
    const futureWorkbook = join(directory, 'future.xlsx');
    execFileSync('python3', ['-c', `
import openpyxl, sys
book = openpyxl.load_workbook(sys.argv[1])
sheet = book['02_踩點清單']
row = [None] * 18
row[0:3] = ['molnoda', '素食餐廳', 'Excel 優先餐廳']
row[3] = 'Excel restaurant'
row[4] = 'Excel address'
row[7] = '備選'
sheet.append(row)
book.save(sys.argv[2])
`, workbook, futureWorkbook]);
    execFileSync('python3', [script, futureWorkbook, '--out', directory]);
    const future = loadOutput();
    assert.equal(future.places.filter(p => p.id === 'molnoda').length, 1);
    assert.equal(future.places.find(p => p.id === 'molnoda').nameZh, 'Excel 優先餐廳');
    assert.equal(future.places.find(p => p.id === 'molnoda').address, 'Excel address');
    assert.equal(future.places.find(p => p.id === 'molnoda').hoursText, null, 'supplement must not fill workbook-owned places');
    assert.deepEqual(future.itinerary, data.itinerary);
    for (const field of ['trip','legs','documents']) assert.deepEqual(future[field], data[field]);
    assert.deepEqual(future.places.filter(p => !dinnerIds.includes(p.id)), data.places.filter(p => !dinnerIds.includes(p.id)));
    assert.deepEqual(supplement.places.map(p => p.id), dinnerIds);
  } finally { rmSync(directory, { recursive:true, force:true }); }
});
