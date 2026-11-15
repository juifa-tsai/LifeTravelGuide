import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadData, validateData } from './validate-data.mjs';
import { dataManifest, diffData, enrichmentIssues, replaceFiles, syncItinerary } from './sync-itinerary.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const workbookName = '名古屋四日行程_20261115-1118.xlsx';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const data = loadData();
function fixture(t) {
  const path = mkdtempSync(join(tmpdir(), 'nagoya-sync-'));
  t.after(() => rmSync(path, { recursive: true, force: true }));
  cpSync(join(root, 'scripts'), join(path, 'scripts'), { recursive: true });
  cpSync(join(root, 'public/data'), join(path, 'public/data'), { recursive: true });
  mkdirSync(join(path, 'docs'));
  copyFileSync(join(root, 'docs', workbookName), join(path, 'docs', workbookName));
  copyFileSync(join(root, 'docs/workbook-source.json'), join(path, 'docs/workbook-source.json'));
  symlinkSync(join(root, 'public/images'), join(path, 'public/images'), 'dir');
  return path;
}
const fixtureData = root => loadData(pathToFileURL(`${join(root, 'public/data')}/`));
function editWorkbook(root, code) {
  const target = join(root, 'candidate.xlsx');
  execFileSync('python3', ['-c', `import openpyxl,sys,datetime\nb=openpyxl.load_workbook(sys.argv[1])\n${code}\nb.save(sys.argv[2])`, join(root, 'docs', workbookName), target]);
  return target;
}
function trackedBytes(root) {
  return Object.fromEntries(['docs/' + workbookName, 'docs/workbook-source.json', ...['trip', 'places', 'itinerary', 'legs', 'documents', 'version'].map(name => `public/data/${name}.json`)].map(path => [path, readFileSync(join(root, path))]));
}

test('a no-op synchronization and check are byte-stable, retain timestamps and release their lock', t => {
  const root = fixture(t), before = trackedBytes(root);
  const mtime = statSync(join(root, 'public/data/itinerary.json')).mtimeMs;
  assert.equal(syncItinerary({ root, check: true }).status, 'unchanged');
  assert.equal(syncItinerary({ root }).status, 'unchanged');
  assert.deepEqual(trackedBytes(root), before);
  assert.equal(statSync(join(root, 'public/data/itinerary.json')).mtimeMs, mtime);
  assert(!existsSync(join(root, 'output/itinerary-sync.lock')));
  assert.deepEqual(read(join(root, 'public/data/version.json')), dataManifest(fixtureData(root)));
});

test('time and duration edits can be checked, applied and reimported without touching other days or place resources', t => {
  const root = fixture(t), before = trackedBytes(root);
  const original = fixtureData(root);
  const target = original.itinerary.find(stop => stop.date === '2026-11-16' && stop.placeId === 'kato_coffee_sakae');
  const workbook = editWorkbook(root, `s=b['01_每日行程']\nfor row in range(5,s.max_row+1):\n if s.cell(row,5).value=='kato_coffee_sakae':\n  s.cell(row,3).value=datetime.time(7,55)\n  s.cell(row,4).value=65`);
  const pending = syncItinerary({ root, workbook, check: true });
  assert.equal(pending.status, 'changes-pending');
  assert.deepEqual(pending.changedDates, ['2026-11-16']);
  assert.deepEqual(pending.changes.itinerary.changed.map(row => row.fields), [['arrivalTime', 'stayMinutes']]);
  assert.deepEqual(trackedBytes(root), before, 'check never replaces workbook, metadata or data');
  const result = syncItinerary({ root, workbook });
  assert.equal(result.status, 'applied');
  const after = fixtureData(root);
  const changed = after.itinerary.find(stop => stop.stopId === target.stopId);
  assert.equal(changed.arrivalTime, '07:55');
  assert.equal(changed.stayMinutes, 65);
  assert.deepEqual(after.itinerary.filter(stop => stop.date !== '2026-11-16'), original.itinerary.filter(stop => stop.date !== '2026-11-16'));
  for (const name of ['places', 'legs', 'trip', 'documents']) assert.deepEqual(after[name], original[name]);
  assert.deepEqual(readFileSync(join(root, 'docs', workbookName)), readFileSync(workbook));
  assert(!('driveModifiedTime' in read(join(root, 'docs/workbook-source.json'))), 'a new local file cannot inherit an unverified Drive modification time');
  assert.equal(syncItinerary({ root, check: true }).status, 'unchanged');
});

test('inserting a visit preserves every previous identity, including repeated hotel stops; later edits keep the new identity', t => {
  const root = fixture(t), original = fixtureData(root);
  const workbook = editWorkbook(root, `s=b['01_每日行程']\nrows=[list(r) for r in list(s.values)[4:] if r[0]]\nfirst=next(r for r in rows if r[4]=='kato_coffee_sakae')\nextra=list(first);extra[2]=datetime.time(7,45);extra[3]=5;extra[8]='新增候位安排'\nrows.insert(rows.index(first),extra)\ns.delete_rows(5,s.max_row)\ncounts={}\nfor r in rows:\n key=str(r[0])[:10];counts[key]=counts.get(key,0)+1;r[1]=counts[key];s.append(r)`);
  const report = syncItinerary({ root, workbook });
  assert.equal(report.status, 'applied');
  const after = fixtureData(root);
  for (const stop of original.itinerary) {
    const retained = after.itinerary.find(candidate => candidate.stopId === stop.stopId);
    assert(retained, stop.stopId);
    const { sequence: oldSequence, ...oldFields } = stop;
    const { sequence: newSequence, ...newFields } = retained;
    assert.deepEqual(newFields, oldFields);
    if (stop.date === '2026-11-16' && oldSequence >= 2) assert.equal(newSequence, oldSequence + 1);
  }
  const added = after.itinerary.find(stop => stop.summary === '新增候位安排');
  assert.match(added.stopId, /^stop-[a-f0-9]{32}$/);
  assert.equal(report.changes.itinerary.added.length, 1);
  assert.equal(report.changes.itinerary.removed.length, 0);
  assert.equal(syncItinerary({ root }).status, 'unchanged');
  const edited = editWorkbook(root, `s=b['01_每日行程']\nfor row in range(5,s.max_row+1):\n if s.cell(row,9).value=='新增候位安排':s.cell(row,3).value=datetime.time(7,40)`);
  assert.equal(syncItinerary({ root, workbook: edited }).status, 'applied');
  assert.equal(fixtureData(root).itinerary.find(stop => stop.summary === '新增候位安排').stopId, added.stopId);
});

test('invalid references and incomplete new places are blocked before any tracked file is replaced', t => {
  const root = fixture(t), before = trackedBytes(root);
  const workbook = editWorkbook(root, `s=b['02_踩點清單']\nr=[None]*22\nr[:13]=['new_shop','潮牌／選物','新店','新店','名古屋市','11:00–20:00','不定休','備選',None,None,'新店介紹','https://www.google.com/maps/search/?api=1&query=Nagoya','https://example.com']\nr[16]='待查核';r[17]='https://example.com';s.append(r)`);
  const report = syncItinerary({ root, workbook });
  assert.equal(report.status, 'blocked');
  assert.match(report.errors.join('\n'), /new_shop.*實景照片/);
  assert.match(report.errors.join('\n'), /new_shop.*座標/);
  assert.deepEqual(trackedBytes(root), before);
  assert(read(join(root, 'output/itinerary-sync.json')).changes.places.added.some(place => place.id === 'new_shop'));
  const invalid = editWorkbook(root, `b['01_每日行程'].cell(5,5).value='unknown_place'`);
  assert.equal(syncItinerary({ root, workbook: invalid }).status, 'blocked');
  assert.deepEqual(trackedBytes(root), before);
});

test('changed routes, stale coordinates and opening supplements are explicitly identified', () => {
  const changed = structuredClone(data);
  const store = changed.places.find(place => place.id === 'kato_coffee_sakae');
  store.address = '新地址'; store.hoursText = '09:00–17:00';
  changed.legs = changed.legs.filter(leg => !(leg.fromPlaceId === 'hotel' && leg.toPlaceId === 'kato_coffee_sakae'));
  const errors = enrichmentIssues(changed, data, join(root, 'public')).join('\n');
  assert.match(errors, /地址已變更/);
  assert.match(errors, /開放資訊已變更/);
  assert.match(errors, /缺少點到點交通/);
});

test('new Excel reservation wording takes precedence over an older shortened supplement without changing other fields', t => {
  const root = fixture(t);
  const workbook = editWorkbook(root, `s=b['02_踩點清單']\nfor row in range(5,s.max_row+1):\n if s.cell(row,1).value=='oribio':\n  s.cell(row,19).value='否'\n  s.cell(row,20).value='新的聯絡與預約說明'`);
  const report = syncItinerary({ root, workbook });
  assert.equal(report.status, 'applied');
  const updated = fixtureData(root).places.find(place => place.id === 'oribio');
  assert.equal(updated.reservationRequired, false);
  assert.equal(updated.reservationNote, '新的聯絡與預約說明');
  assert.deepEqual(report.changes.places.changed[0].fields, ['reservationRequired', 'reservationNote']);
});

test('walking cache reuse across days requires unchanged verified endpoints; transit on a new date requires its own check', t => {
  const root = fixture(t);
  const workbook = editWorkbook(root, `s=b['03_交通銜接']\nrows=[list(r) for r in list(s.values)[4:] if r[0]]\nr=next(r for r in rows if r[1]=='hotel' and r[2]=='kato_coffee_sakae');r[0]=datetime.datetime(2026,11,17);s.append(r)`);
  assert.equal(syncItinerary({ root, workbook }).status, 'applied');
  const walking = fixtureData(root).legs.filter(leg => leg.fromPlaceId === 'hotel' && leg.toPlaceId === 'kato_coffee_sakae');
  assert.equal(walking.length, 2);
  assert.deepEqual(walking[0].navigation, walking[1].navigation);
  const before = trackedBytes(root);
  const unverified = editWorkbook(root, `s=b['03_交通銜接']\nrows=[list(r) for r in list(s.values)[4:] if r[0]]\nr=next(r for r in rows if r[1]=='kato_coffee_sakae' and r[2]=='nagoyajo');r[0]=datetime.datetime(2026,11,17);s.append(r)`);
  const blocked = syncItinerary({ root, workbook: unverified });
  assert.equal(blocked.status, 'blocked');
  assert.match(blocked.errors.join('\n'), /公共運輸起訖站與路線/);
  assert.deepEqual(trackedBytes(root), before);
});

test('corrupt input and concurrent sync fail cleanly without changing the published dataset', t => {
  const root = fixture(t), before = trackedBytes(root);
  const corrupt = join(root, 'corrupt.xlsx'); writeFileSync(corrupt, 'invalid');
  assert.throws(() => syncItinerary({ root, workbook: corrupt }));
  assert.deepEqual(trackedBytes(root), before);
  assert.equal(read(join(root, 'output/itinerary-sync.json')).status, 'failed');
  assert(!existsSync(join(root, 'output/itinerary-sync.lock')));
  writeFileSync(join(root, 'output/itinerary-sync.lock'), 'another process');
  assert.throws(() => syncItinerary({ root }), /另一個行程同步/);
  assert.deepEqual(trackedBytes(root), before);
});

test('Drive provenance is recorded explicitly and accepts no credentials or unrelated metadata', t => {
  const root = fixture(t);
  const original = fixtureData(root);
  const current = read(join(root, 'docs/workbook-source.json'));
  const source = { driveFileId: current.driveFileId, driveUrl: current.driveUrl, driveModifiedTime: '2026-11-15T14:00:00.000Z' };
  assert.equal(syncItinerary({ root, source }).status, 'applied');
  assert.equal(read(join(root, 'docs/workbook-source.json')).driveModifiedTime, source.driveModifiedTime);
  assert.deepEqual(fixtureData(root), original);
  const before = trackedBytes(root);
  assert.throws(() => syncItinerary({ root, source: { ...source, accessToken: 'not-a-real-token' } }), /不接受欄位/);
  assert.deepEqual(trackedBytes(root), before);
});

test('file replacement rolls back all earlier replacements after an I/O failure', t => {
  const path = mkdtempSync(join(tmpdir(), 'nagoya-rollback-'));
  t.after(() => rmSync(path, { recursive: true, force: true }));
  const first = join(path, 'first.json'), second = join(path, 'second.json');
  writeFileSync(first, 'original');
  let calls = 0;
  assert.throws(() => replaceFiles([{ path: first, bytes: 'changed' }, { path: second, bytes: 'new' }], (from, to) => {
    if (++calls === 2) throw new Error('simulated write failure');
    renameSync(from, to);
  }), /simulated write failure/);
  assert.equal(readFileSync(first, 'utf8'), 'original');
  assert(!existsSync(second));
  assert(!existsSync(`${first}.sync-${process.pid}`));
});

test('visit matching survives reordering, date moves and renamed titles; ambiguous repeated visits require an explicit mapping', () => {
  const result = execFileSync('python3', ['-c', `
import sys,json
sys.path.insert(0,sys.argv[1])
from stop_identity import assign_stop_ids
def stop(id,seq,place,title='Visit',date='2026-11-16',time='10:00'):
 return dict(stopId=id,date=date,sequence=seq,placeId=place,title=title,category='住宿' if place=='hotel' else '咖啡廳',arrivalTime=time,summary='安排')
old=[stop('first',1,'hotel','出發'),stop('second',2,'coffee'),stop('third',3,'hotel','回飯店')]
new=[dict(old[2],sequence=1),dict(old[1],sequence=2,date='2026-11-17',title='新標題',arrivalTime='11:00'),dict(old[0],sequence=3)]
for s in new:s.pop('stopId')
assign_stop_ids(new,old)
assert [s['stopId'] for s in new]==['third','second','first']
duplicates=[stop('one',1,'hotel'),stop('two',2,'hotel')]
pending=[dict(duplicates[0],sequence=4),dict(duplicates[1],sequence=5)]
for s in pending:s.pop('stopId')
try:
 assign_stop_ids(pending,duplicates)
 raise AssertionError('ambiguous visits must not be guessed')
except ValueError as e:assert 'Ambiguous' in str(e)
assign_stop_ids(pending,duplicates,{'2026-11-16/4':'two','2026-11-16/5':'one'})
assert [s['stopId'] for s in pending]==['two','one']
print('ok')
`, join(root, 'scripts')], { encoding: 'utf8' });
  assert.equal(result.trim(), 'ok');
});

test('the manifest detects mixed versions, and stop IDs are unique independently of order', () => {
  assert.deepEqual(read(join(root, 'public/data/version.json')), dataManifest(data));
  const changed = structuredClone(data);
  changed.itinerary[0].arrivalTime = '15:51';
  assert.notEqual(dataManifest(changed).dataVersion, dataManifest(data).dataVersion);
  assert.equal(dataManifest(changed).files['places.json'], dataManifest(data).files['places.json']);
  changed.itinerary[1].stopId = changed.itinerary[0].stopId;
  assert.match(validateData(changed).join('\n'), /Duplicate stop ID/);
  assert.deepEqual(diffData(data, data).itinerary, { added: [], removed: [], changed: [] });
});
