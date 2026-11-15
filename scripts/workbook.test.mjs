import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadData } from './validate-data.mjs';
import { readFileSync } from 'node:fs';

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

test('the six retained dining additions have sourced descriptions, real map reference points and credited location photos', () => {
  const ids=['khaja_ghar','mihos_grains','oribio','pupu_kitchen','ko_vegan','bar_thistle'];
  for (const id of ids) {
    assert.equal(data.places.filter(place => place.id === id).length,1);
    const place=data.places.find(place => place.id === id);
    assert.equal(place.virtual,false);
    assert(Number.isFinite(place.lat) && Number.isFinite(place.lng));
    assert.match(place.coordinateSource,/^https:\/\/msearch\.gsi\.go\.jp\//);
    assert(place.foodDescription.length>=35 && place.foodDescription.length<=70);
    assert(place.diningType && place.weeklyHours && place.hoursNote && place.detailSourceUrls.length);
    assert.equal(place.imageKind,'place');
    assert.match(place.imageAlt,/實景/);
    assert(place.imageAttribution && place.imageSourceUrl && place.imageLicenseUrl);
  }
});

test('all workbook places and supplemental candidates are exported once without duplicating scheduled stops', () => {
  const supplement=JSON.parse(readFileSync(new URL('./dinner-supplement.json',import.meta.url),'utf8'));
  assert.deepEqual(data.places.map(place=>place.id).sort(),[...new Set([...workbook.places,...supplement.places].map(place=>place.id))].sort());
  for(const day of data.trip.days){
    const scheduled=new Set(workbook.stops.filter(stop=>stop.date===day.date).map(stop=>stop.placeId));
    for(const id of day.candidateIds ?? []){
      assert(data.places.some(place=>place.id===id));
      assert(!scheduled.has(id),`${day.date}: ${id} is already scheduled`);
    }
  }
});

test('public reservation columns preserve mandatory flags and extract HYPERLINK targets instead of cached display labels',()=>{
  const records=JSON.parse(execFileSync('python3',['-c',`
import openpyxl,json,re,sys
b=openpyxl.load_workbook(sys.argv[1],data_only=False)
def link(c):
 v=c.hyperlink.target if c.hyperlink else c.value
 if not isinstance(v,str):return None
 m=re.match(r'^=HYPERLINK\\(\\s*"((?:[^"]|"")*)"\\s*[,;]',v,re.I)
 return m.group(1).replace('""','"') if m else v if v.startswith('https://') else None
result=[]
for row in b['02_踩點清單'].iter_rows(min_row=5):
 if row[0].value:result.append(dict(id=row[0].value,reservationRequired=row[18].value=='是',reservationUrl=link(row[20]),reservationSourceUrl=link(row[21])))
print(json.dumps(result,ensure_ascii=False))
`,fileURLToPath(new URL('../docs/名古屋四日行程_20261115-1118.xlsx',import.meta.url))],{encoding:'utf8'}));
  assert(records.some(r=>r.reservationRequired));assert(records.filter(r=>r.reservationUrl).length>10);
  for(const record of records){const place=data.places.find(p=>p.id===record.id);for(const field of ['reservationRequired','reservationUrl','reservationSourceUrl'])assert.deepEqual(place[field],record[field],`${record.id}: ${field}`);}
});
