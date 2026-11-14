import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { loadData } from './validate-data.mjs';

const source = readFileSync(new URL('../src/lib/timeline.ts',import.meta.url),'utf8');
const { outputText } = ts.transpileModule(source,{ compilerOptions:{ module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022 } });
const { durationHours, dayPeriod, groupTimeline, compactTimeline } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const data = loadData();

test('durations are approximate hours without inventing stays for flight events or unknown values', () => {
  for (const [minutes,label] of [[5,'0.5 hr'],[20,'0.5 hr'],[30,'0.5 hr'],[45,'1 hr'],[65,'1 hr'],[85,'1.5 hr'],[110,'2 hr'],[120,'2 hr'],[155,'2.5 hr']]) assert.equal(durationHours(minutes),label);
  for (const value of [null,0,-10,NaN,Infinity]) assert.equal(durationHours(value),null);
});

test('morning, afternoon and evening boundaries use Japan time, including Taiwan flight events', () => {
  const period = (arrivalTime,timezone='Asia/Tokyo') => dayPeriod({ arrivalTime,timezone });
  assert.equal(period('11:59'),'morning');
  assert.equal(period('12:00'),'afternoon');
  assert.equal(period('17:59'),'afternoon');
  assert.equal(period('18:00'),'evening');
  assert.equal(period('11:00','Asia/Taipei'),'afternoon');
  assert.equal(period('17:00','Asia/Taipei'),'evening');
});

test('day parts preserve all itinerary entries, bookings and sequence without adding empty sections', () => {
  const before = structuredClone(data.itinerary);
  const expected = {
    '2026-11-15':[['afternoon',1],['evening',7]],
    '2026-11-16':[['morning',2],['afternoon',4],['evening',5]],
    '2026-11-17':[['morning',3],['afternoon',4],['evening',4]],
    '2026-11-18':[['morning',5],['afternoon',2]],
  };
  for (const [date,sections] of Object.entries(expected)) {
    const stops = data.itinerary.filter(stop => stop.date === date);
    const groups = groupTimeline(stops);
    assert.deepEqual(groups.map(group => [group.period,group.stops.length]),sections);
    assert.deepEqual(groups.flatMap(group => group.stops),stops);
    assert.equal(new Set(groups.map(group => group.id)).size,groups.length);
  }
  assert.deepEqual(data.itinerary,before);
  assert.deepEqual(groupTimeline([]),[]);
});


test('compact timelines remove breakfasts and repeated airport cards without changing source reservations',()=>{
  const before = structuredClone(data);
  const expected = {'2026-11-15':[1,4,5,6,7,8],'2026-11-16':[2,3,4,5,6,7,8,9,10,11],'2026-11-17':[2,3,4,5,6,7,8,9,10,11],'2026-11-18':[2,6]};
  for (const [date,sequences] of Object.entries(expected)) {
    const source = data.itinerary.filter(stop=>stop.date === date);
    const {entries} = compactTimeline(source,data.legs);
    assert.deepEqual(entries.map(entry=>entry.stop.sequence),sequences);
    assert(!entries.some(entry=>entry.stop.category === '早餐'));
    assert.equal(entries.filter(entry=>entry.stop.displayStatus === '固定航班').length,date === '2026-11-15' || date === '2026-11-18' ? 1 : 0);
    // Every source marker still points to a visible card, including merged nodes.
    for (const stop of source) assert.equal(entries.filter(entry=>entry.sourceStops.includes(stop)).length,1);
    assert.deepEqual(compactTimeline([...source].reverse(),data.legs).entries.map(entry=>entry.stop.sequence),sequences);
  }
  assert.deepEqual(data,before);
  assert.deepEqual(compactTimeline([],data.legs),{entries:[],leadingTransfers:[]});
});

test('point-to-point connections retain both return trains, morning hotel departures and booked airport pickup',()=>{
  const view = date=>compactTimeline(data.itinerary.filter(stop=>stop.date === date),data.legs);
  const outbound = view('2026-11-15');
  assert.equal(outbound.entries[0].stop.arrivalTime,'15:50');
  assert.equal(outbound.entries[0].stop.placeId,'ngo','the combined flight focuses its Japanese airport on the local map');
  assert.deepEqual(outbound.entries[0].sourceStops.map(stop=>stop.sequence),[1,2,3]);
  assert.equal(outbound.entries[0].transfers[0].pickupTime,'19:55');
  assert.equal(outbound.entries[0].transfers[0].leg.fromPlaceId,'ngo');
  assert.equal(outbound.entries[0].transfers[0].leg.toPlaceId,'hotel');
  const returning = view('2026-11-18');
  assert.deepEqual(returning.entries[0].transfers.map(({leg})=>[leg.fromPlaceId,leg.toPlaceId]),[['hotel','nagoya_station'],['nagoya_station','ngo']]);
  assert.equal(returning.entries[1].stop.arrivalTime,'12:05');
  assert.equal(returning.entries[1].checkInTime,'09:55');
  assert.deepEqual(groupTimeline(returning.entries.map(entry=>entry.stop)).map(group=>[group.period,group.stops.length]),[['morning',1],['afternoon',1]]);
  for(const [date,destination] of [['2026-11-16','nagoyajo'],['2026-11-17','shrub']]) {
    const morning = view(date);
    assert.equal(morning.leadingTransfers.length,1);
    assert.equal(morning.leadingTransfers[0].leg.fromPlaceId,'hotel');
    assert.equal(morning.leadingTransfers[0].leg.toPlaceId,destination);
  }
  for(const day of data.trip.days) {
    const timeline = view(day.date);
    for(const transfer of [...timeline.leadingTransfers,...timeline.entries.flatMap(entry=>entry.transfers)]) {
      assert(data.legs.includes(transfer.leg),'only use original route data');
      assert.notEqual(transfer.leg.mode,'航班','flight route is shown on its single booking card');
    }
  }
});

test('a standalone airport event or transfer without a matching route remains visible',()=>{
  const arrival = data.itinerary.find(stop=>stop.date === '2026-11-15' && stop.sequence === 2);
  const pickup = data.itinerary.find(stop=>stop.category === '接駁');
  assert.equal(compactTimeline([arrival],[]).entries[0].stop,arrival);
  assert.equal(compactTimeline([pickup],[]).entries[0].stop,pickup);
});
