import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { loadData } from './validate-data.mjs';
const source=readFileSync(new URL('../src/lib/entryDay.ts',import.meta.url),'utf8');
const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const {defaultDay,launchHash}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const days=loadData().trip.days;

test('launch selects each exact Japan travel date and the first day before or after the trip',()=>{
 for(const date of ['2026-11-15','2026-11-16','2026-11-17','2026-11-18'])assert.equal(defaultDay(days,new Date(date+'T12:00:00+09:00')),date);
 for(const date of ['2026-01-01','2026-11-14','2026-11-19','2027-11-17'])assert.equal(defaultDay(days,new Date(date+'T12:00:00+09:00')),'2026-11-15');
});

test('Japan midnight determines the day even when Taiwan or UTC still has the previous date',()=>{
 for(const [instant,expected]of [['2026-11-15T14:59:59Z','2026-11-15'],['2026-11-15T15:00:00Z','2026-11-16'],['2026-11-17T23:30:00+08:00','2026-11-18'],['2026-11-18T14:59:59Z','2026-11-18'],['2026-11-18T15:00:00Z','2026-11-15']])assert.equal(defaultDay(days,new Date(instant)),expected);
});

test('a fresh launch resets stale itinerary URLs, preserving private imports and explicit utility links',()=>{
 const now=new Date('2026-11-16T10:00:00+09:00');
 for(const hash of ['','#','#/','#/day','#/day/2026-11-15','#/day/2026-11-18','#/day/invalid'])assert.equal(launchHash(hash,days,now),'#/day/2026-11-16');
 assert.equal(launchHash('#/day/2026-11-18',days,new Date('2026-11-19T10:00:00+09:00')),'#/day/2026-11-15');
 assert.equal(launchHash('#/day/2026-11-15?bookings=DEMO_TOKEN',days,now),'#/day/2026-11-16?bookings=DEMO_TOKEN');
 for(const hash of ['#/places','#/documents','#/audio','#/documents?entryQr=DEMO_QR'])assert.equal(launchHash(hash,days,now),hash);
});
