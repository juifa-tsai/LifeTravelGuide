import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {loadData} from './validate-data.mjs';
const source=readFileSync(new URL('../src/lib/arrival.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {plannedArrival}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const data=loadData();
test('expanded arrival times retain exact Excel minutes independently of stays, rounded hr and departure notes',()=>{
 const before=structuredClone(data);
 for(const [id,time]of [['kato_coffee_sakae','07:50'],['nagoyajo','09:20'],['yamamotoya_okute','11:45'],['fukiage','12:45'],['le_jardin','14:18'],['store_factory','16:15'],['aoi_celestie','17:55'],['toraya','18:30']]){
  const stop=data.itinerary.find(s=>s.date==='2026-11-16'&&s.placeId===id);
  assert.deepEqual(plannedArrival(stop),{time,zone:null},id);
  for(const stayMinutes of [null,0,120])assert.equal(plannedArrival({...stop,stayMinutes}).time,time,id);
 }
 const final=data.itinerary.filter(s=>s.date==='2026-11-16').at(-1);assert.equal(plannedArrival(final).time,'23:55');
 assert.deepEqual(data,before);
});
test('flight and booked pickup retain their dedicated times; Taiwan time stays explicit and invalid times stay absent',()=>{
 const base=data.itinerary.find(s=>s.placeId==='shrub');
 assert.deepEqual(plannedArrival({...base,arrivalTime:'00:20'}),{time:'00:20',zone:null});
 assert.deepEqual(plannedArrival({...base,arrivalTime:'14:40',timezone:'Asia/Taipei'}),{time:'14:40',zone:'台灣時間'});
 for(const time of ['25:00','09:60','',null,undefined])assert.equal(plannedArrival({...base,arrivalTime:time}),null);
 for(const stop of data.itinerary.filter(s=>s.displayStatus==='固定航班'||(s.category==='接駁'&&s.displayStatus==='已預訂')))assert.equal(plannedArrival(stop),null);
});
