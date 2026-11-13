import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { loadData,validateData } from './validate-data.mjs';
const supplement=JSON.parse(readFileSync(new URL('./document-supplement.json',import.meta.url)));
const data=loadData();
const qr=supplement.documents[0];
test('Drive QR is one private document reference without an image, code payload or public preview',()=>{
  assert.equal(supplement.documents.length,1);
  assert.equal(qr.id,'entry-qr-visit-japan');
  assert.equal(qr.category,'入境');assert.equal(qr.access,'私人');
  assert.equal(qr.url,'https://drive.google.com/file/d/1ixcOzR5ACuzWeYsgC6tFqd6RS1hwop9x/view');
  assert.equal(data.documents.filter(x=>x.url===qr.url).length,1);
  assert.deepEqual(data.documents.find(x=>x.id===qr.id),qr);
  assert.equal(qr.preview,undefined);assert.equal(qr.imageUrl,undefined);
  assert.deepEqual(Object.keys(qr).sort(),['id','category','title','url','access','dates','description'].sort());
  assert.deepEqual(validateData(data),[]);
});
test('Excel reimport retains the private QR and gives a future workbook entry precedence without duplicates',()=>{
  const directory=mkdtempSync(join(tmpdir(),'nagoya-private-doc-'));
  try{
    const workbook=fileURLToPath(new URL('../docs/名古屋四日行程_20261115-1118.xlsx',import.meta.url));
    const script=fileURLToPath(new URL('./xlsx-to-json.py',import.meta.url));
    execFileSync('python3',[script,workbook,'--out',directory]);
    const read=()=>JSON.parse(readFileSync(join(directory,'documents.json'),'utf8'));
    assert.deepEqual(read(),data.documents);
    const future=join(directory,'future.xlsx');
    execFileSync('python3',['-c',`
import openpyxl,sys
b=openpyxl.load_workbook(sys.argv[1])
b['04_重要文件'].append(['入境','Excel 入境 QR',sys.argv[3],'私人','11/15','Excel 主資料優先'])
b.save(sys.argv[2])
`,workbook,future,qr.url]);
    execFileSync('python3',[script,future,'--out',directory]);
    const matches=read().filter(x=>x.url===qr.url);
    assert.equal(matches.length,1);assert.equal(matches[0].title,'Excel 入境 QR');assert.equal(matches[0].access,'私人');
    assert.deepEqual(read().filter(x=>x.url!==qr.url),data.documents.filter(x=>x.url!==qr.url));
  }finally{rmSync(directory,{recursive:true,force:true});}
});
