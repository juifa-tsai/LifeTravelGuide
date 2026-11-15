import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {loadData} from './validate-data.mjs';
const source=readFileSync(new URL('../src/lib/departure.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {plannedDeparture}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const data=loadData();
function from(date,id){const stops=data.itinerary.filter(s=>s.date===date);const stop=stops.find(s=>s.placeId===id&&s.category!=='早餐');return plannedDeparture(stop,stops.find(s=>s.sequence>stop.sequence&&s.placeId!==stop.placeId));}
test('suggested departures use exact Excel arrival and stay, not rounded hr or times referring to a previous stop',()=>{
 const before=structuredClone(data);
 for(const[id,time]of [['shikemichi','08:30'],['new_poppy','08:55'],['nagoyajo','11:15'],['yamamotoya_okute','12:35'],['fukiage','14:15'],['le_jardin','14:30'],['store_factory','17:40'],['aoi_celestie','18:10'],['toraya','19:35']])assert.deepEqual(from('2026-11-16',id),{time,daysLater:0,zone:'日本時間'},id);
 for(const[id,time]of [['shrub','08:55'],['art_museum','11:20'],['khaja_ghar','12:45'],['kakuozan_sando','15:30'],['tamesaburo_memorial','16:20'],['mori','19:00'],['jazz_inn_lovely','22:00']])assert.equal(from('2026-11-17',id).time,time,id);
 assert.equal(from('2026-11-18','hotel').time,'08:20');
 assert.deepEqual(data,before);
});
test('flights, final stays and unknown durations do not invent departure times; overnight and Taiwan time are explicit',()=>{
 const base=data.itinerary.find(s=>s.placeId==='shrub');const next={...base,sequence:base.sequence+1,placeId:'next'};
 assert.deepEqual(plannedDeparture({...base,arrivalTime:'23:50',stayMinutes:30},next),{time:'00:20',daysLater:1,zone:'日本時間'});
 assert.deepEqual(plannedDeparture({...base,arrivalTime:'14:40',stayMinutes:20,timezone:'Asia/Taipei'},next),{time:'15:00',daysLater:0,zone:'台灣時間'});
 for(const duration of [null,0,-1,NaN,Infinity])assert.equal(plannedDeparture({...base,stayMinutes:duration},next),null);
 assert.equal(plannedDeparture(base),null);assert.equal(plannedDeparture(base,{...next,date:'2026-11-18'}),null);
 assert.equal(plannedDeparture({...base,displayStatus:'固定航班'},next),null);
 assert.equal(plannedDeparture({...base,arrivalTime:'25:00'},next),null);
});
