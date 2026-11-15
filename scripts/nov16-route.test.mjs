import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {loadData} from './validate-data.mjs';
const data=loadData();
test('Nov16 follows New Poppy, the earlier castle visit and Yamamotoya lunch with exact workbook durations',()=>{
 const stops=data.itinerary.filter(s=>s.date==='2026-11-16');
 for(const [sequence,id,time,minutes]of [[2,'shikemichi','08:20',10],[3,'new_poppy','08:35',20],[4,'nagoyajo','09:20',115],[5,'yamamotoya_okute','11:45',50],[6,'fukiage','12:45',90],[7,'le_jardin','14:18',12],[8,'store_factory','16:15',85]]){
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
 for(const [a,b]of [['shikemichi','new_poppy'],['new_poppy','nagoyajo'],['yamamotoya_okute','fukiage']])assert(nav(a,b).walking.distanceMeters>0);
});

test('the Nov17 and Nov18 schedules remain identical to the preceding deployed workbook',()=>{
 const expected={"2026-11-17": "c35896b13b98fb3a7e77bb4c4a2647ac200f152bddefcf8a1154c03f2df613fc", "2026-11-18": "3bfb4b52d4370121f925c8537dd40ac04f460dfd59ca6b5fd74496459bb81711"};
 for(const [date,hash]of Object.entries(expected))assert.equal(createHash('sha256').update(JSON.stringify(data.itinerary.filter(s=>s.date===date))).digest('hex'),hash,date);
});
