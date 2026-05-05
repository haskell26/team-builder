import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { normalizeTier } from '../src/config/gameConfig.js';
import { parseClipboard } from '../src/lib/parseClipboard.js';

async function loadSampleFixture() {
  return readFile(new URL('../src/fixtures/samplePlayers.tsv', import.meta.url), 'utf8');
}

test('tier aliases normalize to canonical values', () => {
  assert.equal(normalizeTier('U')?.key, 'unranked');
  assert.equal(normalizeTier('언랭')?.key, 'unranked');
  assert.equal(normalizeTier('Unranked')?.key, 'unranked');
  assert.equal(normalizeTier('플래')?.key, 'platinum');
  assert.equal(normalizeTier('그마')?.key, 'grandmaster');
  assert.equal(normalizeTier('브론즈')?.score, 1);
});

test('clipboard parser accepts the canonical header row and preserves spreadsheet row numbers', async () => {
  const sampleFixture = await loadSampleFixture();
  const parsed = parseClipboard(`${sampleFixture}\n\n`);

  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.players.length, 10);
  assert.equal(parsed.players[0].sourceRow, 2);
  assert.equal(parsed.players[9].sourceRow, 11);
  assert.equal(parsed.players[0].roles.tank.description, '마스터');
  assert.equal(parsed.players[2].roles.damage.description, '그랜드마스터');
});

test('clipboard parser accepts headerless input and numbers rows from 1', async () => {
  const sampleFixture = await loadSampleFixture();
  const headerlessFixture = sampleFixture.split('\n').slice(1).join('\n');
  const parsed = parseClipboard(headerlessFixture);

  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.players.length, 10);
  assert.equal(parsed.players[0].sourceRow, 1);
  assert.equal(parsed.players[9].sourceRow, 10);
  assert.equal(parsed.players[0].name, '하늘방패');
});

test('malformed pseudo-header rows are treated as player data instead of being silently skipped', async () => {
  const sampleFixture = await loadSampleFixture();
  const playerRows = sampleFixture.split('\n').slice(1, 10);
  const pseudoHeaderClipboard = ['유저 이름\t탱커\t딜러\t힐러', ...playerRows].join('\n');
  const parsed = parseClipboard(pseudoHeaderClipboard);

  assert.equal(parsed.players.length, 0);
  assert.ok(parsed.errors.some((error) => error.includes('1행: `탱커` 는 지원하지 않는 티어 표기입니다.')));
  assert.ok(parsed.errors.some((error) => error.includes('1행: `딜러` 는 지원하지 않는 티어 표기입니다.')));
  assert.ok(parsed.errors.some((error) => error.includes('1행: `힐러` 는 지원하지 않는 티어 표기입니다.')));
});

test('header-based validation keeps spreadsheet row numbers in error messages', () => {
  const invalidClipboard = `유저 이름\t탱커 티어\t딜러 티어\t힐러 티어
중복닉\t골드\t골드\t골드
중복닉\t실버\t그마\tU
빈셀\t\t플래\t골드`;
  const parsed = parseClipboard(invalidClipboard);

  assert.equal(parsed.players.length, 0);
  assert.ok(parsed.errors.some((error) => error.includes('현재 3명입니다.')));
  assert.ok(parsed.errors.some((error) => error.includes('3행: `중복닉` 이름이 중복되었습니다. (2행과 중복)')));
  assert.ok(parsed.errors.some((error) => error.includes('4행: 탱커 티어 값이 비어 있습니다.')));
});

test('headerless validation starts row numbering from 1', () => {
  const invalidClipboard = `중복닉\t골드\t골드\t골드
중복닉\t실버\t그마\tU
빈셀\t\t플래\t골드`;
  const parsed = parseClipboard(invalidClipboard);

  assert.equal(parsed.players.length, 0);
  assert.ok(parsed.errors.some((error) => error.includes('현재 3명입니다.')));
  assert.ok(parsed.errors.some((error) => error.includes('2행: `중복닉` 이름이 중복되었습니다. (1행과 중복)')));
  assert.ok(parsed.errors.some((error) => error.includes('3행: 탱커 티어 값이 비어 있습니다.')));
});
