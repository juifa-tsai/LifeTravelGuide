import test from 'node:test';
import assert from 'node:assert/strict';
import {loadData} from './validate-data.mjs';
import {readFileSync} from 'node:fs';
const data=loadData();
const shops=['graphpaper','jack_in_the_box','kapital','freaks_store','hoods_nagoya','unlimited_lounge','supreme_nagoya','chrome_hearts','beams_nagoya','ron_herman'];
const added=[...shops,'aoi_celestie','kakuozan_sando','tamesaburo_memorial','shikemichi','endoji','new_poppy'];
test('all sixteen new places have the same sourced photo, time, description and map contract as existing cards',()=>{
 for(const id of added){const places=data.places.filter(p=>p.id===id);assert.equal(places.length,1,id);const p=places[0];assert(!p.virtual);assert(Number.isFinite(p.lat)&&Number.isFinite(p.lng));assert.match(p.coordinateSource,/^https:\/\/msearch.gsi.go.jp\//);assert.equal(p.imageKind,'place');assert(p.imageAttribution&&p.imageSourceUrl&&p.imageLicenseUrl);assert.match(p.imageAlt,/實景/);assert(p.weeklyHours&&Object.keys(p.weeklyHours).length===7);assert((p.description||p.foodDescription).length>=30);assert.match(p.detailsCheckedAt,/^\d{4}-\d{2}-\d{2}$/);assert.equal(new URL(p.mapsUrl).protocol,'https:');}
 const media=JSON.parse(readFileSync(new URL('./media.json',import.meta.url),'utf8'));
 for(const p of data.places.filter(p=>p.category==='潮牌／選物')){assert.equal(p.imageUrl,media[p.id].imageUrl);assert(p.description&&p.weeklyHours&&p.coordinateSource);}
 assert.notEqual(data.places.find(p=>p.id==='shikemichi').lat,data.places.find(p=>p.id==='endoji').lat,'different verified street reference points');
});
test('scheduled shops and coffee stops resolve to the same reusable place cards after route changes',()=>{
 for(const stop of data.itinerary.filter(stop=>added.includes(stop.placeId))){const p=data.places.find(p=>p.id===stop.placeId);assert(p&&!p.virtual&&p.imageUrl&&p.mapsUrl&&p.hoursText);}
});
