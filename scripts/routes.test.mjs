import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadData} from './validate-data.mjs';
const data=loadData();
test('both Yamamotoya branches retain independently checked photo, location and vegan meal information',()=>{
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
 assert.equal(data.legs.length,source.length);
 const supplements=JSON.parse(readFileSync(new URL('./leg-details.json',import.meta.url),'utf8'));
 for(const extra of supplements){const leg=data.legs.find(l=>l.date===extra.date&&l.fromPlaceId===extra.fromPlaceId&&l.toPlaceId===extra.toPlaceId);if(leg)assert.deepEqual(leg.navigation,extra.navigation);}
});

test('every consecutive pair in the current workbook has point-to-point traffic data',()=>{
 for(const day of data.trip.days){
  const stops=data.itinerary.filter(s=>s.date===day.date).sort((a,b)=>a.sequence-b.sequence);
  for(let i=1;i<stops.length;i++){
   const from=stops[i-1].placeId,to=stops[i].placeId;
   if(from!==to)assert(data.legs.some(l=>l.date===day.date&&l.fromPlaceId===from&&l.toPlaceId===to),day.date+'/'+from+'/'+to);
  }
 }
});
