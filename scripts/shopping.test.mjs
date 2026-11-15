import test from 'node:test';
import assert from 'node:assert/strict';
import {loadData} from './validate-data.mjs';
const data=loadData();
const shops=['graphpaper','jack_in_the_box','kapital','freaks_store','hoods_nagoya','unlimited_lounge','supreme_nagoya','chrome_hearts','beams_nagoya','ron_herman'];
const added=[...shops,'aoi_celestie','kakuozan_sando','tamesaburo_memorial','shikemichi','endoji','new_poppy'];
test('all sixteen new places have the same sourced photo, time, description and map contract as existing cards',()=>{
 for(const id of added){const places=data.places.filter(p=>p.id===id);assert.equal(places.length,1,id);const p=places[0];assert(!p.virtual);assert(Number.isFinite(p.lat)&&Number.isFinite(p.lng));assert.match(p.coordinateSource,/^https:\/\/msearch.gsi.go.jp\//);assert.equal(p.imageKind,'place');assert(p.imageAttribution&&p.imageSourceUrl&&p.imageLicenseUrl);assert.match(p.imageAlt,/實景/);assert(p.weeklyHours&&Object.keys(p.weeklyHours).length===7);assert((p.description||p.foodDescription).length>=30);assert.equal(p.detailsCheckedAt,'2026-11-15');assert.equal(new URL(p.mapsUrl).protocol,'https:');}
 assert.deepEqual(data.places.filter(p=>p.category==='潮牌／選物').map(p=>p.id).sort(),[...shops].sort());
 assert.notEqual(data.places.find(p=>p.id==='shikemichi').lat,data.places.find(p=>p.id==='endoji').lat,'different verified street reference points');
});
test('new morning walks, coffee and Kakuozan visit follow the revised Excel route without changing flights',()=>{
 const day=date=>data.itinerary.filter(s=>s.date===date);const ids=date=>day(date).map(s=>s.placeId);
 assert.deepEqual(ids('2026-11-16').slice(1,4),['shikemichi','new_poppy','nagoyajo']);assert(ids('2026-11-16').includes('aoi_celestie'));
 assert.deepEqual(ids('2026-11-17').slice(7,10),['kakuozan_sando','tamesaburo_memorial','mori']);
 assert.equal(day('2026-11-17').find(s=>s.placeId==='shrub').arrivalTime,'08:10');assert.equal(day('2026-11-17').find(s=>s.placeId==='art_museum').arrivalTime,'09:30');
 assert.equal(day('2026-11-15').find(s=>s.placeId==='tpe').arrivalTime,'15:50');assert.equal(day('2026-11-18').find(s=>s.summary.includes('起飛')).arrivalTime,'12:05');
});
