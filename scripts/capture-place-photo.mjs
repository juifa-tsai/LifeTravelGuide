#!/usr/bin/env node
// Maintenance only. The public application never loads Playwright or Google APIs.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../',import.meta.url));
const manifestUrl = new URL('./storefront-photos.json',import.meta.url);
const records = JSON.parse(readFileSync(manifestUrl,'utf8'));
const record = records.find(photo => photo.placeId === process.argv[2]);
if (!record) throw new Error('Supply one reviewed place ID from scripts/storefront-photos.json.');
// Set PLAYWRIGHT_MODULE_PATH to an installed Playwright module when it is not local.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH ? pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href : 'playwright');
const browser = await chromium.launch({ headless:true, ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}) });
try {
  const page = await browser.newPage({viewport:{width:1100,height:900}});
  await page.goto(record.sourceImageUrl,{waitUntil:'load',timeout:45000});
  const image = page.locator('img');
  await image.evaluate(el=>el.decode());
  mkdirSync(`${root}output/place-photos`,{recursive:true});
  const screenshot = `${root}output/place-photos/${record.placeId}.png`;
  await image.screenshot({path:screenshot});
  execFileSync('python3',['-c',`
from PIL import Image
import sys
image=Image.open(sys.argv[1]).convert('RGB')
image.thumbnail((960,720))
image.save(sys.argv[2],'WEBP',quality=83)
`,screenshot,`${root}public/${record.path}`]);
  const hash = filename => createHash('sha256').update(readFileSync(filename)).digest('hex');
  Object.assign(record,{capturedAt:new Date().toISOString().slice(0,10),sourceScreenshotSha256:hash(screenshot),sha256:hash(`${root}public/${record.path}`)});
  writeFileSync(manifestUrl,JSON.stringify(records,null,2)+'\n');
  console.log(`Captured ${record.placeId}. Review the image, author and source, then sync scripts/media.json, run python3 scripts/fetch-images.py and npm run import:xlsx.`);
} finally { await browser.close(); }
