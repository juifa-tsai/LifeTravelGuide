import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadData } from './validate-data.mjs';

const data = loadData();
const workbook = JSON.parse(execFileSync('python3',['-c',`
import openpyxl,json,sys
b=openpyxl.load_workbook(sys.argv[1],data_only=True)
stops=[]
for r in list(b['01_每日行程'].values)[4:]:
 if r[0]:
  stops.append(dict(date=str(r[0])[:10],sequence=r[1],arrivalTime=str(r[2])[:5],stayMinutes=r[3],placeId=r[4],title=r[5],category=r[6],displayStatus=r[7],summary=r[8],note=r[9]))
places=[]
for r in list(b['02_踩點清單'].values)[4:]:
 if r[0]:
  places.append(dict(id=r[0],category=r[1],nameZh=r[2],nameJa=r[3],address=r[4],hoursText=r[5],closedText=r[6],priority=r[7],dietText=r[9],summary=r[10]))
print(json.dumps(dict(stops=stops,places=places),ensure_ascii=False))
`,fileURLToPath(new URL('../docs/名古屋四日行程_20261115-1118.xlsx',import.meta.url))],{encoding:'utf8'}));

test('the updated workbook owns every itinerary time, status, summary and note', () => {
  assert.equal(data.itinerary.length,29);
  assert.equal(data.itinerary.length,workbook.stops.length);
  for (const source of workbook.stops) {
    const stop = data.itinerary.find(stop => stop.date === source.date && stop.sequence === source.sequence);
    for (const [key,value] of Object.entries(source)) assert.deepEqual(stop[key],value,`${source.date}/${source.sequence}: ${key}`);
  }
  for (const source of workbook.places) {
    const place = data.places.find(place => place.id === source.id);
    for (const [key,value] of Object.entries(source)) assert.deepEqual(place[key],value,`${source.id}: ${key}`);
  }
});

test('seven newly added places have sourced descriptions, real map reference points and credited illustrations', () => {
  const ids=['bio_terrace','khaja_ghar','mihos_grains','oribio','pupu_kitchen','ko_vegan','bar_thistle'];
  assert.equal(data.places.length,35);
  for (const id of ids) {
    assert.equal(data.places.filter(place => place.id === id).length,1);
    const place=data.places.find(place => place.id === id);
    assert.equal(place.virtual,false);
    assert(Number.isFinite(place.lat) && Number.isFinite(place.lng));
    assert.match(place.coordinateSource,/^https:\/\/msearch\.gsi\.go\.jp\//);
    assert(place.foodDescription.length>=35 && place.foodDescription.length<=70);
    assert(place.diningType && place.weeklyHours && place.hoursNote && place.detailSourceUrls.length);
    assert.equal(place.imageKind,'illustration');
    assert.match(place.imageAlt,/示意/);
    assert(place.imageAttribution && place.imageSourceUrl && place.imageLicenseUrl);
  }
});

test('revised lunches, antique stop and optional bar follow the new day routes', () => {
  const get=(date,id)=>data.itinerary.find(stop=>stop.date===date&&stop.placeId===id);
  assert.equal(get('2026-11-16','bio_terrace').arrivalTime,'12:15');
  assert.equal(get('2026-11-16','fukiage').arrivalTime,'13:45');
  assert.equal(get('2026-11-16','fukiage').stayMinutes,105);
  assert.equal(get('2026-11-17','khaja_ghar').arrivalTime,'12:45');
  assert.equal(get('2026-11-17','bar_thistle').arrivalTime,'20:00');
  assert.equal(get('2026-11-17','bar_thistle').displayStatus,'可選');
  assert.deepEqual(data.trip.days.find(day=>day.date==='2026-11-16').candidateIds,['le_jardin','recit']);
  assert.deepEqual(data.trip.days.find(day=>day.date==='2026-11-17').candidateIds,['mihos_grains','recit']);
  assert(!data.itinerary.some(stop=>stop.placeId==='barns'));
});
