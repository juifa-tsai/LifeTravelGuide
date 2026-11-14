import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { loadData } from './validate-data.mjs';

async function moduleFrom(path, replace = source => source) {
  const source = replace(readFileSync(new URL(path,import.meta.url),'utf8'));
  const { outputText } = ts.transpileModule(source,{ compilerOptions:{ module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const entryDaySource = readFileSync(new URL('../src/lib/entryDay.ts',import.meta.url),'utf8');
const entryDayJs = ts.transpileModule(entryDaySource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const entryDayUrl = `data:text/javascript;base64,${Buffer.from(entryDayJs).toString('base64')}`;
const hours = await moduleFrom('../src/lib/placeHours.ts',source=>source.replaceAll("'./entryDay'",JSON.stringify(entryDayUrl)));
const boundary = JSON.parse(readFileSync(new URL('../src/data/nagoyaBoundary.json',import.meta.url),'utf8'));
const geo = await moduleFrom('../src/lib/distances.ts', source => source.replace(/import boundary from [^;]+;/,`const boundary = ${JSON.stringify(boundary)};`));
const data = loadData();
const place = id => data.places.find(p => p.id === id);

test('today uses Japan time and the actual weekday, with split hours, closures and overnight service', () => {
  assert.equal(hours.japanDate(new Date('2026-11-15T15:30:00Z')),'2026-11-16');
  assert.equal(hours.todayCaption('2026-11-15'),'11/15（日）日本時間');
  assert.equal(hours.todayHours(place('anzu'),'2026-11-15'),'17:30–22:00');
  assert.equal(hours.todayHours(place('anzu'),'2026-11-16'),'今日公休');
  assert.equal(hours.todayHours(place('anzu'),'2026-11-13'),'11:30–14:00／17:30–23:00');
  assert.equal(hours.todayHours(place('toraya'),'2026-11-17'),'今日公休');
  assert.equal(hours.todayHours(place('toraya'),'2026-11-19'),'17:30–22:00');
  assert.equal(hours.todayHours(place('mori'),'2026-11-18'),'11:30–14:30');
  assert.equal(hours.todayHours(place('nine_cafe_fushimi'),'2026-11-15'),'17:00–翌04:00');
  assert.equal(hours.todayHours(place('coco_fushimi'),'2026-11-15'),'11:00–23:00');
  assert.equal(hours.todayHours(place('art_museum'),'2026-11-13'),'09:30–20:00');
  assert.equal(hours.todayHours(place('bio_terrace'),'2026-11-16'),'營業狀態待確認');
  assert.equal(hours.todayHours(place('khaja_ghar'),'2026-11-17'),'11:00–15:00／17:00–23:00');
  assert.equal(hours.todayHours(place('bar_thistle'),'2026-11-17'),'17:00–翌01:00');
  assert.equal(hours.todayHours(place('oribio'),'2026-11-16'),'今日公休');
  assert.equal(hours.todayHours(place('ko_vegan'),'2026-11-17'),'今日公休');
  assert.equal(hours.todayHours(place('barns'),'2026-11-17'),'16:00–24:00');
  assert.equal(hours.todayHours(place('barns'),'2026-11-03'),'今日公休');
  assert.equal(hours.todayHours(place('barns'),'2026-11-10'),'16:00–24:00');
});
test('workbook-only hours never copy a weekday-specific time to another day', () => {
  const workbookOnly = { ...place('toraya'),weeklyHours:undefined };
  assert.equal(hours.todayHours(workbookOnly,'2026-11-13'),'今日時段待確認');
  assert.equal(hours.todayHours(place('fukiage'),'2026-11-10'),'今日公休');
  assert.equal(hours.todayHours(place('fukiage'),'2026-11-17'),'11:00–19:00');
  assert.equal(hours.todayHours(place('nagoya_station'),'2026-11-15'),'今日時段待確認');
});
test('all dining places have short sourced descriptions and distinguish vegetarian from mixed kitchens', () => {
  const dining = data.places.filter(p => !p.virtual && ['素食餐廳','咖啡廳','酒吧'].includes(p.category));
  assert.equal(dining.length,23);
  for (const item of dining) {
    assert(item.foodDescription.length >= 35 && item.foodDescription.length <= 70, item.id);
    assert(item.diningType && item.weeklyHours && item.detailSourceUrls?.length);
    for (const source of item.detailSourceUrls) assert.equal(new URL(source).protocol,'https:');
  }
  assert.equal(place('toraya').diningType,'素食餐廳');
  for (const id of ['anzu','mori','coco_fushimi','kazan','molnoda']) assert.equal(place(id).diningType,'葷素餐廳');
});
test('local city boundary includes Nagoya wards and excludes nearby cities, the airport and overseas', () => {
  for (const p of [{lat:35.168,lng:136.904},{lat:35.1709,lng:136.8815},{lat:35.1638,lng:136.9735},{lat:35.105,lng:137.0}]) assert(geo.isInNagoya(p), JSON.stringify(p));
  for (const p of [{lat:35.179,lng:136.756},{lat:35.247,lng:136.972},{lat:35.181,lng:137.084},{lat:34.858,lng:136.811},{lat:35.68,lng:139.76},{lat:25.08,lng:121.23},null,{lat:NaN,lng:136.9}]) assert.equal(geo.isInNagoya(p),false,JSON.stringify(p));
});
test('straight-line distances require real coordinates and hotel distance is independent of current position', () => {
  const hotel = place('hotel');
  assert.equal(geo.distanceKm(hotel,hotel),0);
  const castle = place('nagoyajo');
  const distance = geo.distanceKm(hotel,castle);
  assert(distance > 1 && distance < 5);
  assert.equal(geo.distanceKm(null,castle),null);
  assert.equal(geo.distanceKm({lat:NaN,lng:136.9},castle),null);
  assert.equal(geo.formatDistance(null),'—');
  assert.equal(geo.formatDistance(distance),`${distance.toFixed(1)} km`);
  const molnoda = place('molnoda');
  assert(geo.distanceKm(hotel,molnoda) > 0 && geo.distanceKm(hotel,molnoda) < 2);
  assert.equal(geo.distanceKm(hotel,{...molnoda,lat:null,lng:null}),null);
});

test('places sort by unrounded distance from the hotel, keeping unknown coordinates last without mutating source data', () => {
  const hotel = place('hotel');
  const source = data.places.filter(p => !p.virtual && !['住宿','機場'].includes(p.category));
  const originalIds = source.map(p => p.id);
  const sorted = geo.byHotelDistance(source,hotel);
  for (let i=1; i<sorted.length; i++) {
    assert(geo.distanceKm(hotel,sorted[i-1]) <= geo.distanceKm(hotel,sorted[i]));
  }
  assert.deepEqual(source.map(p => p.id),originalIds);
  for (const category of new Set(source.map(p => p.category))) {
    assert.deepEqual(geo.byHotelDistance(source.filter(p=>p.category===category),hotel),sorted.filter(p=>p.category===category));
  }
  const unknown = { ...source[0],id:'unknown',lat:null,lng:null };
  assert.equal(geo.byHotelDistance([unknown,...source],hotel).at(-1).id,'unknown');
  assert.deepEqual(geo.byHotelDistance(source,undefined),source);
  assert.deepEqual(geo.byHotelDistance(source,{lat:null,lng:null}),source);
  const same = [{id:'first',lat:hotel.lat,lng:hotel.lng},{id:'second',lat:hotel.lat,lng:hotel.lng}];
  assert.deepEqual(geo.byHotelDistance(same,hotel).map(p=>p.id),['first','second']);
});

test('opening lights use Japan time, inclusive opening and exclusive closing times, including lunch breaks',()=>{
 const at=(id,time)=>hours.openingInfo(place(id),new Date(`2026-11-17T${time}:00+09:00`)).state;
 for(const [time,state]of [['10:59','closed'],['11:00','open'],['14:59','open'],['15:00','closed'],['16:59','closed'],['17:00','open'],['22:59','open'],['23:00','closed']])assert.equal(at('khaja_ghar',time),state,time);
 assert.equal(hours.openingInfo(place('khaja_ghar'),new Date('2026-11-17T02:00:00Z')).state,'open');
 assert.equal(hours.openingInfo(place('shrub'),new Date('2026-11-17T23:30:00+08:00')).state,'closed');
});

test('overnight service belongs to yesterday, including when today is closed and across month boundaries',()=>{
 const fixture={...place('recit'),closedText:null,hoursNote:undefined,weeklyHours:{'0':'17:00–翌04:00','1':null,'2':null,'3':null,'4':null,'5':null,'6':null}};
 assert.deepEqual(hours.openingInfo(fixture,new Date('2026-11-16T01:00:00+09:00')),{state:'open',hoursText:'跨日營業至 04:00'});
 assert.equal(hours.openingInfo(fixture,new Date('2026-11-16T04:00:00+09:00')).state,'closed');
 assert.equal(hours.openingInfo(fixture,new Date('2026-11-17T01:00:00+09:00')).state,'closed');
 assert.equal(hours.openingInfo(fixture,new Date('2026-12-01T01:00:00+09:00')).state,'closed','Monday had no service to carry into Tuesday');
 assert.equal(hours.openingInfo(place('nine_cafe_fushimi'),new Date('2026-12-01T03:59:59+09:00')).state,'open');
 assert.equal(hours.openingInfo(place('nine_cafe_fushimi'),new Date('2026-12-01T04:00:00+09:00')).state,'closed');
 assert.equal(hours.openingInfo(place('durbar_sakae'),new Date('2026-11-18T01:00:00+09:00')).state,'closed','Tuesday service ended at 22:00');
});

test('ordinary and nth-week closures are gray while unresolved or outdoor hours stay unknown',()=>{
 for(const [id,date]of [['anzu','2026-11-16'],['fukiage','2026-11-10'],['barns','2026-11-16']])assert.equal(hours.openingInfo(place(id),new Date(date+'T18:00:00+09:00')).state,'closed');
 assert.equal(hours.openingInfo(place('fukiage'),new Date('2026-11-17T18:00:00+09:00')).state,'open');
 for(const [id,date]of [['bio_terrace','2026-11-16'],['nagoya_station','2026-11-17'],['osu_street','2026-11-17'],['shirokawa','2026-11-17']])assert.equal(hours.openingInfo(place(id),new Date(date+'T12:00:00+09:00')).state,'unknown',id);
 const pending={...place('fukiage'),closedText:'待確認'};
 assert.equal(hours.openingInfo(pending,new Date('2026-11-17T12:00:00+09:00')).state,'unknown');
});

test('24-hour and inferred overnight schedules work without treating 24:00 as another open morning',()=>{
 const fixture=(schedule)=>({...place('recit'),closedText:null,hoursNote:undefined,weeklyHours:Object.fromEntries(Array.from({length:7},(_,day)=>[day,schedule]))});
 for(const time of ['00:00','12:00','23:59'])assert.equal(hours.openingInfo(fixture('24 小時'),new Date(`2026-11-17T${time}:00+09:00`)).state,'open');
 assert.equal(hours.openingInfo(fixture('22:00–02:00'),new Date('2026-11-17T01:00:00+09:00')).state,'open');
 assert.equal(hours.openingInfo(fixture('22:00–翌02:00'),new Date('2026-11-17T02:00:00+09:00')).state,'closed');
 assert.equal(hours.openingInfo(fixture('22:00–26:00'),new Date('2026-11-17T01:00:00+09:00')).state,'open');
 assert.equal(hours.openingInfo(fixture('16:00–24:00'),new Date('2026-11-17T00:00:00+09:00')).state,'closed');
 for(const schedule of ['00:00–00:00','99:00–100:00','11:00–15:00／晚間待確認'])assert.equal(hours.openingInfo(fixture(schedule),new Date('2026-11-17T12:00:00+09:00')).state,'unknown');
 assert.equal(hours.openingInfo(place('recit'),new Date('invalid')).state,'unknown');
});

test('seasonal and date-specific activities never appear open outside their actual dates',()=>{
 const at=(id,date,time)=>hours.openingInfo(place(id),new Date(`${date}T${time}:00+09:00`)).state;
 assert.equal(at('mirai_naked_moon','2026-11-15','20:00'),'open');
 assert.equal(at('mirai_naked_moon','2026-11-16','20:00'),'closed');
 assert.equal(at('jazz_inn_lovely','2026-11-16','20:00'),'closed');
 assert.equal(at('jazz_inn_lovely','2026-11-17','19:29'),'closed');
 assert.equal(at('jazz_inn_lovely','2026-11-17','19:30'),'open');
 assert.equal(at('jazz_inn_lovely','2026-11-17','22:00'),'closed');
 assert.equal(at('aniaff_air','2026-11-16','19:00'),'open');
 assert.equal(at('aniaff_air','2026-11-17','19:00'),'closed');
 assert.equal(at('shirotori_lights','2026-11-15','18:00'),'open');
 for(const date of ['2026-11-16','2026-11-17'])assert.equal(at('shirotori_lights',date,'18:00'),'closed');
 assert.equal(at('hirokoji_lights_fushimi','2027-01-16','01:29'),'open','the final evening can continue after midnight');
 assert.equal(at('hirokoji_lights_fushimi','2027-01-16','01:30'),'closed');
 assert.equal(at('dainagoya_lights','2026-11-10','18:00'),'closed');
 assert.equal(at('ikeda_lights','2026-11-17','01:00'),'open');
 assert.equal(at('oasis21','2026-11-17','21:00'),'closed');
 assert.equal(at('barns','2026-11-17','18:00'),'open','current official November calendar supersedes the old third-Tuesday rule');
 assert.equal(at('barns','2026-12-17','18:00'),'unknown','a November calendar does not promise December opening');
 assert.equal(at('coco_fushimi','2026-11-15','22:30'),'open');
 assert.equal(at('mihos_grains','2026-11-14','12:00'),'open');
 assert.equal(at('recit','2026-11-19','18:00'),'closed');
});
