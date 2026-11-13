import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { loadData } from './validate-data.mjs';

const source = readFileSync(new URL('../src/lib/timeline.ts',import.meta.url),'utf8');
const { outputText } = ts.transpileModule(source,{ compilerOptions:{ module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022 } });
const { durationHours, dayPeriod, groupTimeline } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const data = loadData();

test('durations are approximate hours without inventing stays for flight events or unknown values', () => {
  for (const [minutes,label] of [[5,'~ 0.5 hr'],[20,'~ 0.5 hr'],[30,'~ 0.5 hr'],[45,'~ 1 hr'],[65,'~ 1 hr'],[85,'~ 1.5 hr'],[110,'~ 2 hr'],[120,'~ 2 hr'],[155,'~ 2.5 hr']]) assert.equal(durationHours(minutes),label);
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
    '2026-11-15':[['afternoon',1],['evening',4]],
    '2026-11-16':[['morning',2],['afternoon',3],['evening',2]],
    '2026-11-17':[['morning',3],['afternoon',4],['evening',2]],
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
