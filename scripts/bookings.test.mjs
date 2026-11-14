import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { loadData,validateData } from './validate-data.mjs';
async function moduleFrom(path){const source=readFileSync(new URL(path,import.meta.url),'utf8');const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);}
const basic=await moduleFrom('../src/data/bookingBasics.ts');
const local=await moduleFrom('../src/lib/privateBookings.ts');
const data=loadData();
const sample={JL8670:{orderNumber:'DEMO-ORDER-01',bookingReference:'DEMO01'},JL8671:{orderNumber:'DEMO-ORDER-01',bookingReference:'DEMO02'},hotel:{orderNumber:'DEMO-HOTEL-01'},airport_transfer:{orderNumber:'DEMO-TRANSFER-01'}};
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');

test('booking details appear once per outbound flight, return flight and initial hotel check-in',()=>{
 const mapped=data.itinerary.map(stop=>({stop,booking:basic.bookingForStop(stop)}));
 assert.equal(mapped.filter(x=>x.booking?.kind==='flight').length,2);
 assert.equal(mapped.filter(x=>x.booking?.kind==='hotel').length,1);
 for(const {stop,booking} of mapped){
  if(stop.category==='早餐'||stop.category==='接駁')assert.equal(booking,undefined);
  if(booking?.kind==='flight'){assert.equal(booking.date,stop.date);assert(stop.summary.includes('起飛'));}
  if(booking?.kind==='hotel'){assert.equal(stop.placeId,'hotel');assert.equal(stop.date,'2026-11-15');}
 }
 assert.deepEqual(mapped.filter(x=>x.booking).map(x=>x.booking.key),['JL8670','hotel','JL8671']);
 for(const booking of [...basic.flightBookings,basic.hotelBooking])for(const field of ['carryOn','checked','breakfast'])assert.equal(field in booking,false);
 assert.equal(basic.bookingForStop({date:'2026-11-19',displayStatus:'固定航班',placeId:'ngo',category:'航班',summary:'起飛'}),undefined);
});
test('both full flight schedules agree with the existing precise departure/arrival events and time zones',()=>{
 for(const flight of basic.flightBookings){
  const stops=data.itinerary.filter(stop=>stop.date===flight.date&&stop.displayStatus==='固定航班');
  const departure=stops.find(stop=>stop.summary.includes('起飛'));const arrival=stops.find(stop=>stop.summary.includes('抵達'));
  assert.equal(flight.from.time,departure.arrivalTime);assert.equal(flight.to.time,arrival.arrivalTime);
  assert.equal(flight.from.zone,departure.timezone==='Asia/Taipei'?'台灣時間':'日本時間');
  assert.equal(flight.to.zone,arrival.timezone==='Asia/Taipei'?'台灣時間':'日本時間');
 }
 const nights=(Date.parse(data.trip.endDate)-Date.parse(data.trip.startDate))/86400000;
 assert(basic.hotelBooking.stay.includes(`${nights} 晚`));
});
test('private booking import round-trips all four known booking records, retaining compatibility with saved flight and hotel records',()=>{
 assert.deepEqual(local.decodeBookingImport(encode(sample)),sample);
 const {airport_transfer,...legacy}=sample;
 assert.deepEqual(local.parsePrivateBookings(legacy),legacy);
 assert.deepEqual(local.decodeBookingImport(encode({airport_transfer})),{airport_transfer});
 assert.deepEqual(local.parsePrivateBookings({hotel:{orderNumber:'  DEMO-HOTEL  '}}),{hotel:{orderNumber:'DEMO-HOTEL'}});
 assert.deepEqual(local.parsePrivateBookings({hotel:{orderNumber:''}}),{});
 const url=new URL('https://example.com/LifeTravelGuide/#/day/2026-11-15?bookings='+encode(sample));
 assert.equal(url.search,'');assert.equal(url.pathname,'/LifeTravelGuide/');
});
test('booking imports reject PINs, ticket numbers, unknown keys, markup, oversized values and invalid UTF-8',()=>{
 for(const payload of [{hotel:{pin:'demo'}},{JL8670:{ticketNumber:'demo'}},{traveler:{orderNumber:'demo'}},{hotel:{bookingReference:'demo'}},{airport_transfer:{bookingReference:'demo'}},{airport_transfer:{pin:'demo'}},{...sample,unexpected:{orderNumber:'demo'}},{hotel:{orderNumber:'<script>'}},{hotel:{orderNumber:'a'.repeat(65)}},JSON.parse('{"__proto__":{"orderNumber":"demo"}}'),[]])assert.equal(local.decodeBookingImport(encode(payload)),null);
 for(const text of [null,'','A','%invalid','A'.repeat(4097),Buffer.from([255]).toString('base64url')])assert.equal(local.decodeBookingImport(text),null);
});
test('local booking storage survives a new read and empty records can be removed',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');const values=new Map();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)}});
 try{assert.deepEqual(local.loadPrivateBookings(),{});assert(local.savePrivateBookings(sample));assert.deepEqual(local.loadPrivateBookings(),sample);assert(local.savePrivateBookings({}));assert.deepEqual(local.loadPrivateBookings(),{});}
 finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage;}
});
test('corrupt or blocked booking storage falls back safely without exposing data to a service',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>'{bad',setItem(){throw Error('quota')}}});
 try{assert.deepEqual(local.loadPrivateBookings(),{});assert.equal(local.savePrivateBookings(sample),false);}
 finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage;}
});
test('public data validation rejects reservation identifiers even when their values look like harmless labels',()=>{
 for(const field of ['orderNumber','bookingReference']){const changed=structuredClone(data);changed.trip[field]='DEMO';assert(validateData(changed).some(error=>error.includes('sensitive field')));}
});


test('only the booked airport pickup exposes a transfer order, using the existing private Drive document',()=>{
 const leg=data.legs.find(leg=>leg.date==='2026-11-15'&&leg.fromPlaceId==='ngo'&&leg.toPlaceId==='hotel');
 assert.equal(basic.bookingForTransfer(leg),basic.transferBooking);
 assert.equal(basic.transferBooking.key,'airport_transfer');
 assert.equal(basic.transferBooking.platform,'Trip.com');
 assert.equal('orderNumber' in basic.transferBooking,false);
 const source=data.documents.filter(document=>document.category==='接駁');
 assert.equal(source.length,1);assert.equal(source[0].url,leg.sourceUrl);
 assert.equal(source[0].access,'私人');assert.equal(new URL(source[0].url).hostname,'drive.google.com');
 for(const other of data.legs.filter(other=>other!==leg))assert.equal(basic.bookingForTransfer(other),undefined);
 for(const changes of [{date:'2026-11-18'},{fromPlaceId:'hotel'},{toPlaceId:'tpe'},{mode:'步行'}])assert.equal(basic.bookingForTransfer({...leg,...changes}),undefined);
});
