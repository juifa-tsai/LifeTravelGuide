import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {loadData} from './validate-data.mjs';
const data=loadData();
test('Nov16 follows Kato breakfast, the castle visit and Yamamotoya lunch with exact workbook durations',()=>{
 const stops=data.itinerary.filter(s=>s.date==='2026-11-16');
 for(const [sequence,id,time,minutes]of [[2,'kato_coffee_sakae','07:50',70],[3,'nagoyajo','09:20',115],[4,'yamamotoya_okute','11:45',50],[5,'fukiage','12:45',90],[6,'le_jardin','14:18',12],[7,'store_factory','16:15',85]]){
  const s=stops.find(s=>s.sequence===sequence);assert.equal(s.placeId,id);assert.equal(s.arrivalTime,time);assert.equal(s.stayMinutes,minutes);
 }
 assert.deepEqual(data.trip.days.find(d=>d.date==='2026-11-16').candidateIds,['yamamotoya_otsu']);
 assert(!data.places.some(p=>['bio_terrace','meal_tbd_16'].includes(p.id)));
 for(const id of ['yamamotoya_okute','yamamotoya_otsu']){const p=data.places.find(p=>p.id===id);assert(p&&!p.virtual);assert.equal(p.imageKind,'place');assert.equal(p.imageSubject,'exterior');assert(p.lat&&p.lng&&p.coordinateSource.includes('msearch.gsi.go.jp'));assert.equal(p.diningType,'葷素餐廳');assert.match(p.foodDescription,/純素/);assert.match(p.foodDescription,/魚介/);assert(p.reservationUrl&&!p.reservationRequired);}
});
test('every traffic field stays owned by Excel while sourced station/walking supplements survive reimport',()=>{
 const source=JSON.parse(execFileSync('python3',['-c',`
import json,sys,openpyxl
b=openpyxl.load_workbook(sys.argv[1],data_only=True)
keys=['date','fromPlaceId','toPlaceId','mode','summary','details','minutesEstimate','fareJpyEstimate','certainty','sourceUrl']
rows=[]
for r in list(b['03_交通銜接'].values)[4:]:
 if r[0]:
  x=dict(zip(keys,r));x['date']=str(r[0])[:10];rows.append(x)
print(json.dumps(rows,ensure_ascii=False))
`,fileURLToPath(new URL('../docs/名古屋四日行程_20261115-1118.xlsx',import.meta.url))],{encoding:'utf8'}));
 const replacements=JSON.parse(readFileSync(new URL('./transport-supplement.json',import.meta.url),'utf8')).urlReplacements;
 for(const leg of source){const actual=data.legs.find(l=>l.date===leg.date&&l.fromPlaceId===leg.fromPlaceId&&l.toPlaceId===leg.toPlaceId);assert(actual);for(const [field,value]of Object.entries(leg))assert.deepEqual(actual[field],field==='sourceUrl' ? replacements[value] ?? value : value,`${leg.fromPlaceId}/${leg.toPlaceId}: ${field}`);}
 const nav=(a,b)=>data.legs.find(l=>l.date==='2026-11-16'&&l.fromPlaceId===a&&l.toPlaceId===b).navigation;
 assert.deepEqual(nav('le_jardin','store_factory').steps.map(s=>[s.line,s.fromStation,s.toStation]),[['櫻通線','吹上站','御器所站'],['鶴舞線','御器所站','鶴舞站']]);
 assert.deepEqual(nav('nagoyajo','yamamotoya_okute').steps.map(s=>[s.line,s.fromStation,s.toStation]),[['名城線','名古屋城站','久屋大通站'],['櫻通線','久屋大通站','吹上站']]);
 for(const [a,b]of [['hotel','kato_coffee_sakae'],['shikemichi','endoji'],['yamamotoya_okute','fukiage']])assert(nav(a,b).walking.distanceMeters>0);
});

test('the Nov15 and Nov18 schedules remain identical to the preceding deployed workbook',()=>{
 const expected={"2026-11-15": "41b8090b6044f18f5b0439481a1a98437c33a5f69cf3d8518478ff2232a7bd6e", "2026-11-18": "3bfb4b52d4370121f925c8537dd40ac04f460dfd59ca6b5fd74496459bb81711"};
 for(const [date,hash]of Object.entries(expected))assert.equal(createHash('sha256').update(JSON.stringify(data.itinerary.filter(s=>s.date===date))).digest('hex'),hash,date);
});
