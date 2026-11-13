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
const hours = await moduleFrom('../src/lib/placeHours.ts');
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
  assert.equal(hours.todayHours(place('coco_fushimi'),'2026-11-15'),'週末時段待確認');
  assert.equal(hours.todayHours(place('art_museum'),'2026-11-13'),'09:30–20:00');
  assert.equal(hours.todayHours(place('bio_terrace'),'2026-11-16'),'營業狀態待確認');
  assert.equal(hours.todayHours(place('khaja_ghar'),'2026-11-17'),'11:00–15:00／17:00–23:00');
  assert.equal(hours.todayHours(place('bar_thistle'),'2026-11-17'),'17:00–翌01:00');
  assert.equal(hours.todayHours(place('oribio'),'2026-11-16'),'今日公休');
  assert.equal(hours.todayHours(place('ko_vegan'),'2026-11-17'),'今日公休');
  assert.equal(hours.todayHours(place('barns'),'2026-11-17'),'今日公休');
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
  assert.equal(dining.length,21);
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
