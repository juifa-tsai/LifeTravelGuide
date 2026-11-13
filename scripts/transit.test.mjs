import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { loadData, validateData } from './validate-data.mjs';

const compile = path => ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{ compilerOptions:{ module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022 } }).outputText;
const asUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const timelineUrl = asUrl(compile('../src/lib/timeline.ts'));
const source = compile('../src/lib/transit.ts').replace("'./timeline'",JSON.stringify(timelineUrl));
const { legView, transitTime, walkingDistance } = await import(asUrl(source));
const data = loadData();
const place = id => data.places.find(place => place.id === id);
const view = leg => legView(leg,place(leg.fromPlaceId),place(leg.toPlaceId));

test('walking distances come from sourced foot routes with unchanged verified endpoints', () => {
  const walks = data.legs.filter(leg => leg.mode === '步行' && !place(leg.fromPlaceId).virtual && !place(leg.toPlaceId).virtual);
  assert.equal(walks.length,8);
  for (const leg of walks) {
    assert(leg.navigation.walking.distanceMeters > 0);
    assert(leg.navigation.sources.some(source => source.includes('/routed-foot/')));
    const result = view(leg);
    assert(result.distance && result.time);
    assert.equal(result.walking,true);
    assert.equal(legView(leg,{...place(leg.fromPlaceId),lat:null,lng:null},place(leg.toPlaceId)).distance,null);
  }
  assert.equal(walkingDistance(481.5),'500 m');
  assert.equal(walkingDistance(1087.2),'1.1 km');
  assert.equal(walkingDistance(undefined),null);
  assert.equal(walkingDistance(NaN),null);
});

test('public transport has continuous station steps and useful transfer details', () => {
  const transit = data.legs.filter(leg => /地鐵|名鐵/.test(leg.mode) && !place(leg.fromPlaceId).virtual && !place(leg.toPlaceId).virtual);
  assert.equal(transit.length,9);
  for (const leg of transit) {
    const result = view(leg);
    assert(result.steps.length > 0);
    assert.match(result.title,/站 → .*站/);
    assert(result.lines && result.time);
    for (let i=1;i<result.steps.length;i++) assert.equal(result.steps[i-1].toStation,result.steps[i].fromStation);
  }
  const airport = view(transit.find(leg => leg.mode === '名鐵機場線'));
  assert.equal(airport.title,'名鐵名古屋站 → 中部國際機場站');
  assert.match(airport.note,/μticket/);
});

test('unselected restaurants never create routes or guessed distances and short trips use minutes', () => {
  for (const leg of data.legs.filter(leg => place(leg.fromPlaceId).virtual || place(leg.toPlaceId).virtual)) assert.equal(view(leg),null);
  assert.equal(transitTime(3.4),'4 分');
  assert.equal(transitTime(30),'30 分');
  assert.equal(transitTime(65),'1 hr');
  assert.equal(transitTime(null),null);
  const booked = data.legs.find(leg => leg.mode === '預約專車');
  const note = view({...booked,details:'預約19:55接機，車程約65分鐘'}).note;
  assert.equal(note,'預約19:55接機，車程65分鐘');
});

test('stale walking coordinates and disconnected transfers are rejected', () => {
  const changed = structuredClone(data);
  changed.legs.find(leg => leg.navigation?.walking).navigation.walking.fromCoordinates.lat += 0.01;
  changed.legs.find(leg => leg.navigation?.steps?.length > 1).navigation.steps[1].fromStation = '錯誤站';
  const errors = validateData(changed).join('\n');
  assert.match(errors,/Walking route endpoints changed or unverified/);
  assert.match(errors,/Disconnected station transfer/);
});
