import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/lib/entryQr.ts',import.meta.url),'utf8');
const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const qr=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const encoded=(size,bytes)=>`${size}.${Buffer.from(bytes).toString('base64url')}`;
const fixture=()=>{const bytes=new Uint8Array(Math.ceil(21*21/8));bytes[0]=0b11000000;bytes[55]=0b10000000;return encoded(21,bytes);};
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};};

test('only a private immigration document can create a validated Google Drive preview',()=>{
  const source={category:'入境',access:'私人',url:'https://drive.google.com/file/d/example_qr-id/view?usp=drivesdk'};
  assert.equal(qr.entryQrDrivePreview(source),'https://drive.google.com/file/d/example_qr-id/preview');
  for(const value of [undefined,{...source,access:'公開'},{...source,category:'機票'},
    {...source,url:'https://drive.google.com.evil.test/file/d/example/view'},
    {...source,url:'http://drive.google.com/file/d/example/view'},
    {...source,url:'https://drive.google.com/drive/folders/example'},
    {...source,url:'https://evil.test/file/d/example/view'},
    {...source,url:'javascript:alert(1)'}]) assert.equal(qr.entryQrDrivePreview(value),null);
});

test('QR modules preserve original black cells and a four-module quiet zone without an external renderer',()=>{
  const matrix=qr.qrMatrix(fixture());
  assert.equal(matrix.size,21);
  assert.equal(matrix.path,'M4 4h2v1h-2zM24 24h1v1h-1z');
  assert.equal(qr.qrMatrix('22.'+fixture().split('.')[1]),null);
  assert.equal(qr.qrMatrix(encoded(21,new Uint8Array(55))),null);
  const invalid=new Uint8Array(56);invalid[55]=1;
  assert.equal(qr.qrMatrix(encoded(21,invalid)),null);
  for(const value of [null,'','999.AA','21.%invalid','21.A','<script>','21.'+'A'.repeat(6000)])assert.equal(qr.qrMatrix(value),null);
});
test('private QR imports stay in a URL fragment, never an HTTP path or query',()=>{
  const url=new URL('https://example.com/LifeTravelGuide/#/documents?entryQr='+fixture());
  assert.equal(url.pathname,'/LifeTravelGuide/');
  assert.equal(url.search,'');
  assert.equal(new URLSearchParams(url.hash.split('?')[1]).get('entryQr'),fixture());
});
test('local QR records persist across reads and can be replaced or removed without cloud storage',()=>{
  const storage=memory();const record={kind:'matrix',data:fixture()};
  assert.equal(qr.loadEntryQr(storage),null);
  assert(qr.saveEntryQr(record,storage));
  assert.deepEqual(qr.loadEntryQr(storage),record);
  const image={kind:'image',data:'data:image/png;base64,iVBORw0KGgo='};
  assert(qr.saveEntryQr(image,storage));assert.deepEqual(qr.loadEntryQr(storage),image);
  assert(qr.saveEntryQr(null,storage));assert.equal(qr.loadEntryQr(storage),null);
});
test('untrusted image URLs, corrupt storage and storage failures do not leak or replace the saved QR',()=>{
  const storage=memory();const original={kind:'matrix',data:fixture()};qr.saveEntryQr(original,storage);
  for(const record of [{kind:'image',data:'https://example.com/private.png'},{kind:'image',data:'data:image/svg+xml;base64,AAAA'},{kind:'matrix',data:'invalid'},{kind:'image',data:'data:image/png;base64,'+'A'.repeat(3000000)}]){
    assert.equal(qr.validEntryQr(record),false);assert.equal(qr.saveEntryQr(record,storage),false);assert.deepEqual(qr.loadEntryQr(storage),original);
  }
  storage.setItem(qr.entryQrKey,'{broken');assert.equal(qr.loadEntryQr(storage),null);
  const blocked={getItem(){throw Error('blocked')},setItem(){throw Error('quota')},removeItem(){throw Error('blocked')}};
  assert.equal(qr.loadEntryQr(blocked),null);assert.equal(qr.saveEntryQr(original,blocked),false);assert.equal(qr.saveEntryQr(null,blocked),false);
});
