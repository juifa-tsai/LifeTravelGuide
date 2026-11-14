import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import ts from 'typescript';
import {loadData,validateData} from './validate-data.mjs';
const data=loadData();
const ids=['hirokoji_lights_fushimi','bar_ylang_ylang','oasis21','jazz_inn_lovely','montmartre','dainagoya_lights','ikeda_lights','sakaeminami_lights','mirai_naked_moon','aniaff_air','shirotori_lights'];
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url)));
test('all eleven new activities are real, photographed, sourced and mapped using recorded address results',()=>{
 const geocodes=read('./geocodes.json');
 for(const id of ids){
  const matches=data.places.filter(p=>p.id===id);assert.equal(matches.length,1,id);const p=matches[0];
  assert.equal(p.virtual,false);assert.equal(new URL(p.mapsUrl).protocol,'https:');assert.equal(new URL(p.mapsUrl).hostname,'www.google.com');
  assert.equal(p.lat,geocodes[id].lat);assert.equal(p.lng,geocodes[id].lng);assert.equal(p.coordinateSource,geocodes[id].source);
  assert(p.address && p.summary && p.detailSourceUrls?.length && p.detailsCheckedAt==='2026-11-14');
  assert.equal(p.imageKind,'place');assert.match(p.imageAlt,/實景/);assert.equal(readFileSync(new URL('../public/'+p.imageUrl,import.meta.url)).toString('ascii',8,12),'WEBP');
 }
 assert.equal(data.places.filter(p=>p.category==='夜間活動').length,9);
});
test('source workbook metadata matches the exact newly synchronized file and exported counts',()=>{
 const metadata=read('../docs/workbook-source.json');const bytes=readFileSync(new URL('../docs/名古屋四日行程_20261115-1118.xlsx',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),metadata.sha256);
 assert.equal(metadata.driveModifiedTime,'2026-11-14T03:13:43.877Z');
 assert.equal(metadata.places,data.places.length);assert.equal(metadata.stops,data.itinerary.length);assert.equal(metadata.legs,data.legs.length);
});
test('only mandatory reservations produce a badge; optional and unknown statuses stay unlabelled',()=>{
 const source=readFileSync(new URL('../src/components/ReservationBadge.tsx',import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const module={exports:{}};new Function('require','module','exports',js)(createRequire(import.meta.url),module,module.exports);
 const {ReservationBadge}=module.exports;
 assert.deepEqual(data.places.filter(p=>p.reservationRequired).map(p=>p.id).sort(),['mihos_grains','oribio']);
 for(const p of data.places){
  const markup=renderToStaticMarkup(createElement(ReservationBadge,{place:p}));
  assert.equal(markup.includes('需預約'),p.reservationRequired===true,p.id);
  if(p.reservationRequired){assert(p.reservationNote && p.reservationSourceUrl);assert.equal(new URL(p.reservationUrl).protocol,'https:');}
  else assert.equal(markup,'');
 }
 assert.equal(renderToStaticMarkup(createElement(ReservationBadge,{})),'');
});
test('reservation links and dated event hours cannot bypass data validation',()=>{
 const changed=structuredClone(data);const p=changed.places.find(p=>p.id==='oribio');p.reservationUrl='javascript:alert(1)';p.reservationNote=null;
 const event=changed.places.find(p=>p.id==='aniaff_air');event.eventPeriod={start:'2026-11-17',end:'2026-11-15'};event.dateHours={'not-a-date':'19:00–20:30'};
 const errors=validateData(changed).join('\n');assert.match(errors,/reservationUrl: expected HTTPS/);assert.match(errors,/required reservations need/);assert.match(errors,/invalid event period/);assert.match(errors,/invalid dated hours/);
});
