import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';

const source = readFileSync(new URL('../src/data/audioPhrases.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions:{ module:ts.ModuleKind.ESNext, target:ts.ScriptTarget.ES2022 } });
const { audioPhrases } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const recordings = JSON.parse(readFileSync(new URL('../public/audio/recordings.json', import.meta.url), 'utf8'));

test('phrase recordings have unique IDs, valid local MP3s and matching generation provenance', () => {
  assert.equal(new Set(audioPhrases.map(phrase => phrase.id)).size, audioPhrases.length);
  for (const phrase of audioPhrases) {
    assert.match(phrase.audioPath, /^audio\/[a-z0-9-]+\.mp3$/);
    assert(phrase.japanese && phrase.translation && phrase.voiceName);
    const matches = recordings.filter(recording => recording.id === phrase.id);
    assert.equal(matches.length, 1);
    const recording = matches[0];
    assert.equal(recording.text, phrase.japanese, 'spoken text and card text must stay synchronized');
    assert.equal(recording.path, phrase.audioPath);
    assert.equal(recording.voice, phrase.voiceName);
    const bytes = readFileSync(new URL(`../public/${phrase.audioPath}`, import.meta.url));
    assert(bytes.length > 1024);
    assert(bytes.toString('ascii', 0, 3) === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0), 'expected an MP3 header');
    assert.equal(createHash('sha256').update(bytes).digest('hex'), recording.sha256, 'audio must match the recorded generation');
  }
});

test('two polite phrases ask about vegetarian dishes first and then clarify lacto-vegetarian restrictions', () => {
  assert.deepEqual(audioPhrases.map(phrase => phrase.id), ['vegetarian-inquiry','lacto-vegetarian']);
  const [inquiry, details] = audioPhrases;
  for (const term of ['すみません','ベジタリアン','料理はありますか']) assert(inquiry.japanese.includes(term), term);
  assert.match(inquiry.translation, /適合素食者的餐點/);
  for (const term of ['乳製品','肉','魚','卵','かつおだし','魚醤','動物性のだし']) assert(details.japanese.includes(term), term);
  for (const term of ['乳製品','肉','魚','蛋','柴魚','魚露','動物性高湯']) assert(details.translation.includes(term), term);
  assert(!details.japanese.includes('教えていただけますか'), 'supplement should explain conditions without repeating the inquiry');
  assert(!details.japanese.includes('私は'), 'supplement should avoid repeating the introduction');
  assert.equal(inquiry.voiceName, details.voiceName);
});
