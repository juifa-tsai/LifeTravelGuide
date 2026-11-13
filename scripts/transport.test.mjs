import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadData, validateData } from './validate-data.mjs';

const data = loadData();
const supplement = JSON.parse(readFileSync(new URL('./transport-supplement.json',import.meta.url),'utf8'));
const credits = JSON.parse(readFileSync(new URL('../public/transport/credits.json',import.meta.url),'utf8'));

test('both uploaded transport diagrams have local previews and traceable original sources', () => {
  const previews = data.documents.filter(document => document.preview);
  assert.equal(previews.length,2);
  for (const document of previews) {
    assert.equal(document.access,'公開');
    assert.equal(document.category,'交通地圖');
    const credit = credits.find(credit => credit.imageUrl === document.preview.imageUrl);
    assert(credit);
    assert.equal(document.preview.attribution,credit.attribution);
    assert.match(credit.sourceDriveUrl,/^https:\/\/drive\.google\.com\/file\/d\//);
    assert.match(credit.referenceUrl,/^https:\/\//);
    assert.match(credit.sourceSha256,/^[a-f0-9]{64}$/);
    assert(credit.rights && credit.processing);
    const bytes = readFileSync(new URL(`../public/${document.preview.imageUrl}`,import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),credit.assetSha256);
    if (document.preview.imageUrl.endsWith('.svg')) {
      const svg = bytes.toString('utf8');
      assert.match(svg,/<svg\b/);
      assert(!/<(?:script|foreignObject)\b|\son[a-z]+\s*=/i.test(svg));
      assert(!/(?:href|url)\s*(?:=|\()\s*["']?\s*(?:https?:|\/\/)/i.test(svg));
      assert.equal(credit.sourceSha256,credit.assetSha256,'original SVG remains unchanged');
    } else assert.equal(bytes.toString('ascii',8,12),'WEBP');
  }
  assert.equal(data.documents.filter(document => document.access === '私人').length,6);
  assert(data.documents.filter(document => document.access === '私人').every(document => !document.preview));
});

test('transport links use verified Traditional Chinese counterparts and include both requested sites once', () => {
  const all = [data.places,data.itinerary,data.legs,data.documents].flat();
  for (const [oldUrl,newUrl] of Object.entries(supplement.urlReplacements)) {
    assert(!all.some(record => ['url','website','sourceUrl'].some(field => record[field] === oldUrl)));
    assert(all.some(record => ['url','website','sourceUrl'].some(field => record[field] === newUrl)));
  }
  for (const extra of supplement.documents) assert.equal(data.documents.filter(document => document.url === extra.url).length,1);
  for (const [url,extra] of Object.entries(supplement.previews)) {
    assert.deepEqual(data.documents.find(document => document.url === url).preview,extra.preview);
  }
});

test('private document previews and unsafe image paths are rejected', () => {
  const changed = structuredClone(data);
  changed.documents[0].preview = { imageUrl:'https://drive.google.com/private.svg',alt:'',attribution:'',width:0,height:-1 };
  const errors = validateData(changed).join('\n');
  for (const message of ['only public transport diagrams','local transport preview','preview description and attribution','invalid preview dimensions']) assert(errors.includes(message));
});
