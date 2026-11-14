import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as lucide from 'lucide-react';
import { loadData } from './validate-data.mjs';

const source = readFileSync(new URL('../src/lib/mapPoints.ts',import.meta.url),'utf8');
const { outputText } = ts.transpileModule(source,{ compilerOptions:{ module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022 } });
const model = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const data = loadData();
const favoriteIds = model.favorites(data.places).map(place => place.id).sort();

test('lightweight marker SVGs match the current Lucide category icons', () => {
  const icons = JSON.parse(readFileSync(new URL('../src/data/markerIcons.json',import.meta.url),'utf8'));
  for (const [name,svg] of Object.entries(icons)) {
    assert.equal(svg,renderToStaticMarkup(createElement(lucide[name],{ size:16,strokeWidth:1.7,'aria-hidden':'true' })),name);
  }
});

test('all four daily maps permanently retain the complete shared favorite collection', () => {
  assert.equal(favoriteIds.length,23);
  for (const day of data.trip.days) {
    const points = model.dailyMapPoints(data.itinerary.filter(stop => stop.date === day.date),data.places);
    assert.deepEqual(points.filter(point => point.favorite).map(point => point.place.id).sort(),favoriteIds);
    assert.equal(new Set(points.map(point => point.place.id)).size,points.length);
    assert(!points.some(point => point.place.virtual || point.place.id === 'tpe'));
  }
});
test('places map shows exactly the filtered locations plus lodging, including empty results', () => {
  for (const visible of [data.places,data.places.filter(p => p.category === '咖啡廳'),data.places.filter(p => p.category === '酒吧'),data.places.filter(p => p.category === '老件店'),[]]) {
    const points = model.collectionMapPoints(data.places,visible);
    const expected = new Set(visible.filter(p => model.hasCoordinates(p) && p.id !== 'tpe').map(p => p.id));
    for (const hotel of data.places.filter(p => p.category === '住宿' && model.hasCoordinates(p))) expected.add(hotel.id);
    assert.deepEqual(points.map(point => point.place.id).sort(), [...expected].sort());
    assert.equal(new Set(points.map(point => point.place.id)).size,points.length);
    assert(points.every(point => point.favorite === model.isFavorite(point.place)));
  }
});
test('a scheduled favorite has one marker with both its itinerary number and favorite identity', () => {
  const stops = data.itinerary.filter(stop => stop.date === '2026-11-17');
  const points = model.dailyMapPoints(stops,data.places);
  const shrub = points.filter(point => point.place.id === 'shrub');
  assert.equal(shrub.length,1);
  assert.equal(shrub[0].favorite,true);
  assert.equal(shrub[0].number,2);
  assert.equal(model.dayPins(stops,data.places).filter(point => point.place.id === 'hotel').length,1);
});
test('schematic segments stop at unknown meals and never connect international flights', () => {
  const expectedCounts = { '2026-11-15':3,'2026-11-16':10,'2026-11-17':10,'2026-11-18':2 };
  const knownTaiwan = data.places.map(place => place.id === 'tpe' ? {...place,lat:25.08,lng:121.23} : place);
  for (const [date,count] of Object.entries(expectedCounts)) {
    const stops = data.itinerary.filter(stop => stop.date === date);
    const segments = model.dailySegments(stops,knownTaiwan);
    assert.equal(segments.length,count);
    assert(segments.every(segment => segment.every(([latitude]) => latitude > 34)));
  }
  const segments = model.dailySegments(data.itinerary.filter(stop => stop.date === '2026-11-17'),data.places);
  const park = data.places.find(place => place.id === 'shirokawa');
  const temple = data.places.find(place => place.id === 'osu_kannon');
  assert(!segments.some(([from,to]) => from[0] === park.lat && to[0] === temple.lat));
  assert.equal(model.hasCoordinates({...park,lat:NaN}),false);
  assert.equal(model.hasCoordinates({...park,virtual:true}),false);
});

test('lodging remains exactly once on every daily and filtered places map', () => {
  const hotel = data.places.find(place => place.id === 'hotel');
  const maps = data.trip.days.map(day => model.dailyMapPoints(data.itinerary.filter(stop => stop.date === day.date),data.places));
  maps.push(model.collectionMapPoints(data.places,data.places.filter(place => place.category === '咖啡廳')));
  maps.push(model.collectionMapPoints(data.places,[]));
  for (const points of maps) {
    const lodging = points.filter(point => point.place.id === hotel.id);
    assert.equal(lodging.length,1);
    assert.equal(lodging[0].place.lat,hotel.lat);
    assert.equal(lodging[0].place.lng,hotel.lng);
    assert.equal(lodging[0].favorite,false);
  }
  const missingLocation = data.places.map(place => place.id === hotel.id ? {...place,lat:null,lng:null} : place);
  assert(!model.collectionMapPoints(missingLocation,[]).some(point => point.place.id === hotel.id));
});

test('all five dinner locations appear on the map exactly once, while unknown coordinates stay unmarked', () => {
  const dinnerIds = ['molnoda','coco_fushimi','nine_cafe_fushimi','kazan','durbar_sakae'];
  const listed = data.places.filter(place => !place.virtual);
  const points = model.collectionMapPoints(data.places, listed);
  for (const id of dinnerIds) {
    assert(listed.some(place => place.id === id));
    assert.equal(points.filter(point => point.place.id === id).length,1);
    assert.equal(model.hasCoordinates(data.places.find(place => place.id === id)), true);
  }
  const unknown = data.places.map(place => dinnerIds.includes(place.id) ? {...place,lat:null,lng:null,coordinateSource:null} : place);
  for (const id of dinnerIds) {
    assert(!model.collectionMapPoints(unknown,unknown).some(point => point.place.id === id));
    assert(!model.dailyMapPoints(data.itinerary,unknown).some(point => point.place.id === id));
  }
});

const hoursSource = readFileSync(new URL('../src/lib/hours.ts',import.meta.url),'utf8');
const hoursModule = ts.transpileModule(hoursSource,{ compilerOptions:{ module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022 } });
const { compactHours } = await import(`data:text/javascript;base64,${Buffer.from(hoursModule.outputText).toString('base64')}`);
test('popup hours keep last order, weekdays, overnight times and uncertain opening information', () => {
  for (const id of ['anzu','toraya','recit']) {
    const place = data.places.find(place => place.id === id);
    assert.equal(compactHours(place),place.hoursText);
  }
  const nine = compactHours(data.places.find(place => place.id === 'nine_cafe_fushimi'));
  assert.match(nine,/翌(?:日)?04:00/);
  assert.match(nine,/L\.O\.\s*翌(?:日)?03:00/);
  assert(!nine.includes('一般週日資訊'));
  assert.equal(compactHours({ hoursText:null }), '開放時間待確認');
  assert.equal(compactHours(data.places.find(place => place.id === 'bio_terrace')), '營業狀態待確認');
});
