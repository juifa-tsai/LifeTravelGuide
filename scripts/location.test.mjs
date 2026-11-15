import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import ts from 'typescript';
function moduleUrl(file,replace=s=>s){
 const source=replace(readFileSync(new URL(file,import.meta.url),'utf8'));
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 return `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`;
}
const city=readFileSync(new URL('../src/data/nagoyaBoundary.json',import.meta.url),'utf8');
const geoUrl=moduleUrl('../src/lib/distances.ts',s=>s.replace(/import boundary from [^;]+;/,`const boundary=${city};`));
const geometry=readFileSync(new URL('../src/data/japanBoundary.json',import.meta.url),'utf8');
const japanUrl=moduleUrl('../src/lib/japan.ts',s=>s.replace(/import boundary from [^;]+;/,`const boundary=${geometry};`).replaceAll("'./distances'",JSON.stringify(geoUrl)));
const {isInJapan}=await import(japanUrl);
const {createLocationTracker}=await import(moduleUrl('../src/lib/locationTracker.ts',s=>s.replaceAll("'./distances'",JSON.stringify(geoUrl)).replaceAll("'./japan'",JSON.stringify(japanUrl))));
const airport={lat:34.858,lng:136.811},road={lat:34.98,lng:136.92},taiwan={lat:25.08,lng:121.23};
function setup(){
 let now=1800000000000,id=0,state;const timers=new Map(),calls=[];
 const schedule=(fn,ms)=>{timers.set(++id,{fn,at:now+ms});return id;};
 const environment={now:()=>now,schedule,cancel:id=>timers.delete(id),locate:(success,error)=>{
  const request={success,error,canceled:false};calls.push(request);return()=>{request.canceled=true;};
 }};
 const tracker=createLocationTracker(environment,value=>{state=value;});
 function advance(ms){const target=now+ms;for(;;){const due=[...timers.entries()].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!due)break;now=due[1].at;timers.delete(due[0]);due[1].fn();}now=target;}
 return {tracker,calls,timers,advance,get state(){return state;},get now(){return now;},
  fix(point=airport,index=calls.length-1,timestamp=now){calls[index].success({coords:{latitude:point.lat,longitude:point.lng},timestamp});},
  fail(code=3,index=calls.length-1){calls[index].error({code});}};
}

test('Japan eligibility includes cities, southern islands and coastal airports while excluding neighboring countries',()=>{
 for(const point of [airport,road,{lat:35.168,lng:136.904},{lat:35.68,lng:139.76},{lat:34.69,lng:135.5},
  {lat:43.061,lng:141.354},{lat:33.59,lng:130.401},{lat:26.212,lng:127.68},{lat:24.34,lng:124.15},
  {lat:34.231,lng:129.284},{lat:24.467,lng:123.008},{lat:35.549,lng:139.779},{lat:34.785,lng:135.438}]) assert(isInJapan(point),JSON.stringify(point));
 for(const point of [taiwan,{lat:37.566,lng:126.978},{lat:35.179,lng:129.076},{lat:43.115,lng:131.885},
  {lat:31.232,lng:121.47},{lat:35,lng:145},null,undefined,{lat:NaN,lng:136.9},{lat:35,lng:Infinity}]) assert.equal(isInJapan(point),false,JSON.stringify(point));
});
test('local Japan outline is the documented rounded Natural Earth geometry with closed valid rings',()=>{
 assert.equal(createHash('sha256').update(geometry).digest('hex'),'d8e05891b2c68401d261802de66dbb4594a93dc86ad301edd07c827708f6a820');
 const data=JSON.parse(geometry);assert.equal(data.type,'MultiPolygon');assert.equal(data.coordinates.length,109);
 for(const polygon of data.coordinates)for(const ring of polygon){assert(ring.length>=4);assert.deepEqual(ring[0],ring.at(-1));for(const [lng,lat]of ring)assert(Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180);}
});
test('opening gets one fix; Japan fixes schedule fresh requests every 60 seconds without waiting for movement callbacks',()=>{
 const s=setup();s.tracker.resume();s.tracker.resume();assert.equal(s.calls.length,1);assert(s.state.locating);
 s.fix();assert.equal(s.state.country,'japan');assert.equal(s.calls[0].canceled,false);const previous=s.state;
 s.advance(59999);assert.equal(s.calls.length,1);s.advance(1);assert.equal(s.calls.length,2);s.fix(road);
 assert.deepEqual(s.state.position,road);assert.deepEqual(previous.position,airport);assert.equal(s.calls[0].canceled,false);assert(s.calls[1].canceled);
 s.advance(60000);assert.equal(s.calls.length,3);s.tracker.dispose();assert.equal(s.timers.size,0);
});
test('outside Japan gets one opening fix and no automatic follow-up; return to foreground checks again',()=>{
 const s=setup();s.tracker.resume();s.fix(taiwan);assert.equal(s.state.country,'outside');
 s.advance(600000);assert.equal(s.calls.length,1);assert.equal(s.state.position,null);
 s.tracker.pause();s.tracker.resume();assert.equal(s.calls.length,2);s.fix();s.advance(60000);assert.equal(s.calls.length,3);s.tracker.dispose();
});
test('leaving Japan stops polling and a manual fix can restart it after returning',()=>{
 const s=setup();s.tracker.resume();s.fix();s.advance(60000);s.fix(taiwan);assert.equal(s.state.country,'outside');
 s.advance(180000);assert.equal(s.calls.length,2);let focused;
 s.tracker.request(p=>{focused=p;});s.fix();assert.deepEqual(focused,airport);s.advance(60000);assert.equal(s.calls.length,4);s.tracker.dispose();
});
test('transient failures retry on the minute but an old distance expires exactly two minutes after its fix',()=>{
 const s=setup();s.tracker.resume();s.fix();s.advance(60000);s.fail(3);assert.deepEqual(s.state.position,airport);
 s.advance(59999);assert.deepEqual(s.state.position,airport);s.advance(1);assert.equal(s.state.position,null);assert.equal(s.state.updatedAt,null);assert.equal(s.calls.length,3);
 s.fail(2);s.advance(60000);s.fix(road);assert.deepEqual(s.state.position,road);assert.equal(s.state.message,'');s.tracker.dispose();
});
test('a browser that never returns a fix times out after 15 seconds, cancels GPS and remains retryable',()=>{
 const s=setup();s.tracker.resume();s.advance(15000);assert(s.calls[0].canceled);assert.equal(s.state.locating,false);assert.match(s.state.message,/逾時/);
 s.advance(180000);assert.equal(s.calls.length,1);s.tracker.request();s.fix();s.advance(60000);assert.equal(s.calls.length,3);s.tracker.dispose();
});
test('Japan timeout retries keep the 60-second cadence and late callbacks cannot overwrite a newer request',()=>{
 const s=setup();s.tracker.resume();s.fix();s.advance(60000);s.advance(15000);assert(s.calls[1].canceled);
 s.advance(45000);assert.equal(s.calls.length,3);s.fix(taiwan,1);assert.equal(s.state.country,'japan');assert.equal(s.state.locating,true);
 s.fix(road);s.fix(taiwan,1);assert.deepEqual(s.state.position,road);assert.equal(s.state.country,'japan');s.tracker.dispose();
});
test('backgrounding cancels GPS and timers; one fresh fix on return ignores prior callbacks and duplicate resume events',()=>{
 const s=setup();s.tracker.resume();s.tracker.pause();assert(s.calls[0].canceled);assert.equal(s.timers.size,0);
 s.advance(300000);assert.equal(s.calls.length,1);s.tracker.resume();s.tracker.resume();assert.equal(s.calls.length,2);
 s.fix(taiwan,0);assert.equal(s.state.country,'unknown');assert(s.state.locating);s.fix();
 s.tracker.pause();s.advance(300000);assert.equal(s.calls.length,2);s.tracker.resume();assert.equal(s.calls.length,3);s.tracker.dispose();s.fix(taiwan);assert.equal(s.timers.size,0);
});
test('manual updates share one in-flight request and do not pan the map after a later automatic update or pause',()=>{
 const s=setup();let focused=0;s.tracker.resume();s.tracker.request(()=>focused++);assert.equal(s.calls.length,1);s.fix();assert.equal(focused,1);
 s.advance(60000);s.fix(road);assert.equal(focused,1);s.tracker.request(()=>focused++);s.tracker.pause();s.fix();assert.equal(focused,1);s.tracker.dispose();
});
test('denied or unsupported location stops polling, clears distances and can be retried manually',()=>{
 for(const code of [0,1]){const s=setup();s.tracker.resume();s.fix();s.tracker.request();s.fail(code);assert.equal(s.state.position,null);assert.equal(s.state.country,'unknown');s.advance(180000);assert.equal(s.calls.length,2);s.tracker.request();s.fix();assert.equal(s.state.country,'japan');s.tracker.dispose();}
});
test('invalid coordinates and stale or future samples never become a fresh distance',()=>{
 for(const [point,age]of [[{lat:NaN,lng:136.9},0],[airport,31000],[airport,-6000]]){const s=setup();s.tracker.resume();s.fix(point,0,s.now-age);assert.equal(s.state.position,null);assert.equal(s.state.country,'unknown');s.advance(15000);assert.equal(s.state.locating,false);s.advance(120000);assert.equal(s.calls.length,1);s.tracker.dispose();}
});

test('one shared Japan subscription updates movement between minute refreshes and stops immediately on an outside fix',()=>{
 const s=setup();let focused=0;s.tracker.resume();s.tracker.request(()=>focused++);s.fix();
 s.advance(5000);s.fix(road,0);assert.deepEqual(s.state.position,road);assert.equal(s.calls.length,1);assert.equal(focused,1);assert.equal(s.calls[0].canceled,false);
 s.advance(5000);s.fix(taiwan,0);assert.equal(s.state.country,'outside');assert(s.calls[0].canceled);s.advance(180000);assert.equal(s.calls.length,1);s.tracker.dispose();
});

test('temporary watch errors do not cancel movement updates or warn over a fresh position, and minute refresh leaves the watch alive',()=>{
 const s=setup();s.tracker.resume();s.fix();s.fail(3,0);assert.equal(s.calls[0].canceled,false);assert.equal(s.state.message,'');
 s.advance(5000);s.fix(road,0);assert.deepEqual(s.state.position,road);s.advance(55000);assert.equal(s.calls.length,2);assert.equal(s.calls[0].canceled,false);s.fix(airport,1);assert.equal(s.calls[0].canceled,false);s.fix(road,0);assert.deepEqual(s.state.position,road);s.tracker.dispose();assert(s.calls[0].canceled);
});

test('an older minute response never replaces a more recent movement fix',()=>{
 const s=setup();s.tracker.resume();s.fix();s.advance(60000);const started=s.now;s.advance(1000);s.fix(road,0);
 s.fix(airport,1,started);assert.deepEqual(s.state.position,road);assert.equal(s.state.locating,false);assert.equal(s.calls[0].canceled,false);s.tracker.dispose();
});

test('a temporary startup error does not discard a valid fix arriving a moment later',()=>{
 const s=setup();s.tracker.resume();s.fail(2);assert.equal(s.calls[0].canceled,false);assert.equal(s.state.message,'正在取得位置…');s.advance(1000);s.fix(road,0);assert.deepEqual(s.state.position,road);assert.equal(s.state.country,'japan');assert.equal(s.state.message,'');s.tracker.dispose();
});
