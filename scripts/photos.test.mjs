import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadData } from './validate-data.mjs';

const photos=JSON.parse(readFileSync(new URL('./storefront-photos.json',import.meta.url)));
const credits=JSON.parse(readFileSync(new URL('../public/images/credits.json',import.meta.url)));
const data=loadData();
test('all real locations use actual location photos; generic illustrations remain only for virtual events',()=>{
  for (const place of data.places.filter(p=>!p.virtual)) {
    assert.equal(place.imageKind,'place',place.id);
    assert(!place.imageAlt.includes('示意'),place.id);
  }
});
test('34 individually matched photo screenshots retain exact source, photographer, content hash and original rights',()=>{
  assert.equal(photos.length,34);
  assert.equal(new Set(photos.map(p=>p.placeId)).size,photos.length);
  assert(photos.filter(p=>p.view==='exterior').length>=16);
  for (const photo of photos) {
    const place=data.places.find(p=>p.id===photo.placeId);
    assert(place && !place.virtual);
    assert(photo.matchedName && photo.matchedAddress.includes('名古屋市'));
    assert(photo.author && photo.capturedAt && /Playwright screenshot/.test(photo.captureMethod));
    assert.match(photo.license,/原攝影者保留著作權/);
    assert.match(photo.license,/非 CC 授權/);
    assert.equal(place.imageRights,'original-rights');
    assert.equal(place.imageUrl,photo.path);
    assert.equal(place.imageSourceUrl,photo.sourceUrl);
    assert.equal(place.imageLicenseUrl,photo.licenseUrl);
    assert(place.imageAttribution.includes(photo.author));
    const sourceHost=new URL(photo.sourceUrl).hostname;
    const hosts = {'Google Maps':['www.google.com'],'店家官網':['molnoda.com','bar-ylangylang1.amebaownd.com','www.jazzinnlovely.com','www-new.tokyuhotels.co.jp'],'設施官網':['www.sakaepark.co.jp','dainagoyabuilding.com','www.nagoya-tv-tower.co.jp','www.shirotori-garden.jp'],'官方觀光網站':['www.nagoya-info.jp'],'ホームメイト・リサーチ':['www.homemate-research-cinema.com']};
    assert(hosts[photo.provider]?.includes(sourceHost),`${photo.placeId}: source host must match its reviewed provider`);
    assert.equal(new URL(photo.sourceImageUrl).protocol,'https:');
    const bytes=readFileSync(new URL(`../public/${photo.path}`,import.meta.url));
    assert.equal(bytes.toString('ascii',8,12),'WEBP');
    assert.equal(createHash('sha256').update(bytes).digest('hex'),photo.sha256);
    assert.match(photo.sourceScreenshotSha256,/^[a-f0-9]{64}$/);
    assert.deepEqual(credits.find(c=>c.placeId===photo.placeId)?.sha256,photo.sha256);
  }
});
