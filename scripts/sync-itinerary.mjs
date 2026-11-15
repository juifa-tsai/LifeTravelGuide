#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadData, validateData } from './validate-data.mjs';

export const dataNames = ['trip', 'places', 'itinerary', 'legs', 'documents'];
const workbookName = '名古屋四日行程_20261115-1118.xlsx';
const json = value => JSON.stringify(value, null, 2) + '\n';
const hash = value => createHash('sha256').update(value).digest('hex');
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function dataManifest(data) {
  const files = Object.fromEntries(dataNames.map(name => [`${name}.json`, hash(json(data[name]))]));
  return { schemaVersion: 1, dataVersion: hash(JSON.stringify(files)), files };
}

export function diffData(before, after) {
  const key = (name, row) => name === 'itinerary' ? row.stopId ?? `${row.date}-${row.sequence}`
    : name === 'legs' ? `${row.date}/${row.fromPlaceId}/${row.toPlaceId}` : row.id;
  return Object.fromEntries(dataNames.map(name => {
    if (name === 'trip') {
      const fields = [...new Set([...Object.keys(before.trip), ...Object.keys(after.trip)])];
      return [name, { fields: fields.filter(field => !same(before.trip[field], after.trip[field])) }];
    }
    const oldRows = new Map(before[name].map(row => [key(name, row), row]));
    const newRows = new Map(after[name].map(row => [key(name, row), row]));
    return [name, {
      added: after[name].filter(row => !oldRows.has(key(name, row))),
      removed: before[name].filter(row => !newRows.has(key(name, row))),
      changed: after[name].flatMap(row => {
        const previous = oldRows.get(key(name, row));
        if (!previous) return [];
        const fields = [...new Set([...Object.keys(previous), ...Object.keys(row)])].filter(field => !same(previous[field], row[field]));
        return fields.length ? [{ key: key(name, row), fields, before: previous, after: row }] : [];
      }),
    }];
  }));
}

// These are release requirements already met by the current app. A new place
// cannot silently ship with a borrowed photo, fabricated point or incomplete card.
export function enrichmentIssues(data, before, publicRoot) {
  const issues = [];
  const add = (id, field) => issues.push(`${id}: ${field}`);
  for (const place of data.places) {
    if (!place.virtual) {
      if (place.imageKind !== 'place') add(place.id, '需要對應店家／地點的實景照片');
      if (!place.address || !place.summary || (!place.hoursText && place.category !== '交通') || !place.verification || !place.sourceUrl) add(place.id, '地址、簡介、開放資訊或查核來源未完成');
      if (place.id !== 'tpe' && (!Number.isFinite(place.lat) || !Number.isFinite(place.lng) || !place.coordinateSource)) add(place.id, '座標與來源待核實；不建立虛構標記');
      if (['素食餐廳', '咖啡廳', '酒吧'].includes(place.category) && (!place.foodDescription || !place.diningType || !(place.dietText || /奶素|純素|蔬食|素食|Vegan/i.test(place.foodDescription)) || !place.weeklyHours)) add(place.id, '餐飲短描述、種類、奶素注意事項或每週時段未完成');
    }
    if (!/^images\/[a-z0-9-]+\.webp$/.test(place.imageUrl ?? '')) add(place.id, '需要既有格式的本機圖片');
    else {
      const path = join(publicRoot, place.imageUrl);
      if (!existsSync(path) || readFileSync(path).toString('ascii', 8, 12) !== 'WEBP') add(place.id, '圖片檔案不存在或格式錯誤');
    }
    const old = before.places.find(p => p.id === place.id);
    if (old && old.address !== place.address && old.coordinateAddress === place.coordinateAddress && old.coordinateSource === place.coordinateSource && old.lat === place.lat && old.lng === place.lng) add(place.id, '地址已變更，請重新核對照片與座標補充資料');
    if (old && (old.hoursText !== place.hoursText || old.closedText !== place.closedText) && place.weeklyHours && same(old.weeklyHours, place.weeklyHours) && old.detailsCheckedAt === place.detailsCheckedAt) add(place.id, '開放資訊已變更，請更新每週時段及查核日期');
  }
  const places = new Map(data.places.map(place => [place.id, place]));
  for (const day of data.trip.days) {
    const stops = data.itinerary.filter(stop => stop.date === day.date).sort((a, b) => a.sequence - b.sequence);
    for (let i = 1; i < stops.length; i++) {
      const from = stops[i - 1].placeId, to = stops[i].placeId;
      if (from !== to && !data.legs.some(leg => leg.date === day.date && leg.fromPlaceId === from && leg.toPlaceId === to)) add(`${day.date}/${from}/${to}`, '行程已變更，缺少點到點交通資料');
    }
  }
  for (const leg of data.legs) {
    if (!places.has(leg.fromPlaceId) || !places.has(leg.toPlaceId) || places.get(leg.fromPlaceId).virtual || places.get(leg.toPlaceId).virtual) continue;
    const key = `${leg.date}/${leg.fromPlaceId}/${leg.toPlaceId}`;
    if (leg.mode === '步行' && !leg.navigation?.walking) add(key, '步行距離與時間待查核');
    if (/地鐵|名鐵/.test(leg.mode) && !leg.navigation?.steps?.length) add(key, '公共運輸起訖站與路線待補齊');
    const old = before.legs.find(row => row.date === leg.date && row.fromPlaceId === leg.fromPlaceId && row.toPlaceId === leg.toPlaceId);
    if (old?.navigation && leg.navigation && (old.mode !== leg.mode || old.details !== leg.details) && same(old.navigation, leg.navigation)) add(key, '交通方式或路線說明已變更，請核對交通補充資料');
  }
  return issues;
}

// All candidates are prepared and verified before replacement. If any write or
// rename fails, restore the original bytes (including originally absent files).
export function replaceFiles(files, rename = renameSync) {
  const changes = files.filter(({ path, bytes }) => !existsSync(path) || !readFileSync(path).equals(Buffer.from(bytes)));
  const saved = changes.map(file => ({ ...file, previous: existsSync(file.path) ? readFileSync(file.path) : null, temp: `${file.path}.sync-${process.pid}` }));
  const applied = [];
  try {
    for (const file of saved) {
      mkdirSync(dirname(file.path), { recursive: true });
      writeFileSync(file.temp, file.bytes);
    }
    for (const file of saved) {
      rename(file.temp, file.path);
      applied.push(file);
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const file of applied.reverse()) {
      try {
        if (file.previous === null) rmSync(file.path, { force: true });
        else writeFileSync(file.path, file.previous);
      } catch (restoreError) { rollbackErrors.push(restoreError); }
    }
    if (rollbackErrors.length) throw new AggregateError([error, ...rollbackErrors], '檔案套用與回復失敗，請檢查工作目錄及 Git 差異。');
    throw error;
  } finally {
    for (const file of saved) rmSync(file.temp, { force: true });
  }
  return changes.map(file => file.path);
}

function sourceMetadata(old, bytes, data, source, now) {
  const sha256 = hash(bytes);
  const metadata = { ...old, sha256, places: data.places.length, stops: data.itinerary.length, legs: data.legs.length };
  if (old.sha256 !== sha256) {
    metadata.syncedAt = now.toISOString().slice(0, 10);
    // A local file does not prove the modification time of a remote Drive file.
    delete metadata.driveModifiedTime;
  }
  if (source) {
    for (const key of Object.keys(source)) if (!['driveFileId', 'driveUrl', 'driveModifiedTime'].includes(key)) throw new Error(`來源檔不接受欄位：${key}`);
    if (typeof source.driveFileId !== 'string' || !/^[\w-]+$/.test(source.driveFileId)) throw new Error('來源 driveFileId 無效');
    const url = new URL(source.driveUrl);
    if (url.protocol !== 'https:' || !['docs.google.com', 'drive.google.com'].includes(url.hostname) || !url.pathname.split('/').includes(source.driveFileId)) throw new Error('來源 Drive URL 無效');
    if (typeof source.driveModifiedTime !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(source.driveModifiedTime) || !Number.isFinite(Date.parse(source.driveModifiedTime))) throw new Error('來源修改時間無效');
    Object.assign(metadata, source);
  }
  return metadata;
}

function markdown(report) {
  const lines = ['# 行程同步報告', '', `狀態：${report.status}`, `資料版本：${report.dataVersion}`, '', '## 變更摘要', ''];
  for (const [name, diff] of Object.entries(report.changes)) {
    if (name === 'trip') { lines.push(`- trip：${diff.fields.join('、') || '無變動'}`); continue; }
    lines.push(`- ${name}：新增 ${diff.added.length}、移除 ${diff.removed.length}、修改 ${diff.changed.length}`);
    for (const row of diff.added) lines.push(`  - 新增 ${row.stopId ?? row.id ?? `${row.date}/${row.fromPlaceId}/${row.toPlaceId}`}`);
    for (const row of diff.removed) lines.push(`  - 移除 ${row.stopId ?? row.id ?? `${row.date}/${row.fromPlaceId}/${row.toPlaceId}`}`);
    for (const row of diff.changed) lines.push(`  - ${row.key}：${row.fields.join('、')}`);
  }
  lines.push('', `影響日期：${report.changedDates.join('、') || '無'}`, '', '## 待處理', '', ...report.errors.map(error => `- ${error}`));
  if (!report.errors.length) lines.push('無。');
  return lines.join('\n') + '\n';
}

export function syncItinerary({ root = fileURLToPath(new URL('../', import.meta.url)), workbook, check = false, source, identityMap, now = new Date() } = {}) {
  root = resolve(root);
  const publicRoot = join(root, 'public');
  const publicData = join(publicRoot, 'data');
  const localWorkbook = join(root, 'docs', workbookName);
  const output = join(root, 'output');
  mkdirSync(output, { recursive: true });
  const lockPath = join(output, 'itinerary-sync.lock');
  let lock;
  try { lock = openSync(lockPath, 'wx'); }
  catch (error) { if (error.code === 'EEXIST') throw new Error('另一個行程同步正在執行；若先前程序已中斷，確認後移除 output/itinerary-sync.lock。'); throw error; }
  let staging;
  try {
    writeFileSync(lock, `${process.pid}\n`);
    staging = mkdtempSync(join(output, '.itinerary-sync-'));
    const bytes = readFileSync(workbook ? resolve(workbook) : localWorkbook);
    const snapshot = join(staging, 'source.xlsx');
    writeFileSync(snapshot, bytes);
    const stagedData = join(staging, 'data');
    const args = [join(root, 'scripts/xlsx-to-json.py'), snapshot, '--out', stagedData, '--previous', publicData, '--report', join(staging, 'data-report.md')];
    if (identityMap) args.push('--identity-map', resolve(identityMap));
    execFileSync('python3', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 });
    const before = loadData(pathToFileURL(`${publicData}/`));
    const data = loadData(pathToFileURL(`${stagedData}/`));
    const manifest = dataManifest(data);
    const changes = diffData(before, data);
    const errors = [...validateData(data), ...enrichmentIssues(data, before, publicRoot)];
    const metadataPath = join(root, 'docs/workbook-source.json');
    const metadata = sourceMetadata(readJson(metadataPath), bytes, data, source, now);
    const files = dataNames.map(name => ({ path: join(publicData, `${name}.json`), bytes: json(data[name]) }));
    files.push({ path: join(publicData, 'version.json'), bytes: json(manifest) }, { path: localWorkbook, bytes }, { path: metadataPath, bytes: json(metadata) });
    const changedFiles = files.filter(file => !existsSync(file.path) || !readFileSync(file.path).equals(Buffer.from(file.bytes))).map(file => file.path.slice(root.length + 1));
    const affectedStops = [...changes.itinerary.added, ...changes.itinerary.removed, ...changes.itinerary.changed.flatMap(row => [row.before, row.after])];
    const affectedLegs = [...changes.legs.added, ...changes.legs.removed, ...changes.legs.changed.flatMap(row => [row.before, row.after])];
    const changedDates = [...new Set([...affectedStops, ...affectedLegs].map(row => row.date))].sort();
    const report = { status: errors.length ? 'blocked' : check ? changedFiles.length ? 'changes-pending' : 'unchanged' : changedFiles.length ? 'applied' : 'unchanged', dataVersion: manifest.dataVersion, sourceSha256: metadata.sha256, changedFiles, changedDates, changes, errors };
    // The report contains public allowlisted data only and is never deployed.
    writeFileSync(join(output, 'itinerary-sync.json'), json(report));
    writeFileSync(join(output, 'itinerary-sync.md'), markdown(report));
    if (!errors.length && !check) replaceFiles(files);
    return report;
  } catch (error) {
    const report = { status: 'failed', errors: [error.stderr?.toString().trim() || error.message] };
    writeFileSync(join(output, 'itinerary-sync.json'), json(report));
    writeFileSync(join(output, 'itinerary-sync.md'), `# 行程同步失敗\n\n${report.errors[0]}\n\n未完成套用；請查看錯誤與工作目錄差異。\n`);
    throw error;
  } finally {
    if (staging) rmSync(staging, { recursive: true, force: true });
    closeSync(lock);
    rmSync(lockPath, { force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    if (args.includes('--help')) {
      console.log('npm run sync:itinerary -- [updated.xlsx] [--check] [--source drive-source.json] [--identity-map visits.json]\n先於暫存區匯入、比對及驗證，成功才套用。--check 僅檢查，有未同步變更時回傳失敗。');
    } else {
      const options = {};
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--check') options.check = true;
        else if (arg === '--source' || arg === '--identity-map') {
          if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`${arg} 需要檔案路徑`);
          const path = resolve(args[++i]);
          if (arg === '--source') options.source = readJson(path); else options.identityMap = path;
        } else if (!arg.startsWith('-') && !options.workbook) options.workbook = arg;
        else throw new Error(`未知參數：${arg}`);
      }
      const report = syncItinerary(options);
      console.log(`行程同步：${report.status}。影響日期：${report.changedDates.join('、') || '無'}。\n報告：output/itinerary-sync.md\n版本：${report.dataVersion}`);
      if (report.errors.length) console.error(report.errors.join('\n'));
      if (report.errors.length || (options.check && report.changedFiles.length)) process.exitCode = 1;
    }
  } catch (error) {
    console.error(error.stderr?.toString().trim() || error.message);
    process.exitCode = 1;
  }
}
