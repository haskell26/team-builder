import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { normalizeTier } from '../src/config/gameConfig.js';
import { parseClipboard } from '../src/lib/parseClipboard.js';

test('tier aliases normalize to canonical values', () => {
  assert.equal(normalizeTier('U')?.key, 'unranked');
  assert.equal(normalizeTier('언랭')?.key, 'unranked');
  assert.equal(normalizeTier('Unranked')?.key, 'unranked');
  assert.equal(normalizeTier('플래')?.key, 'platinum');
  assert.equal(normalizeTier('그마')?.key, 'grandmaster');
  assert.equal(normalizeTier('브론즈')?.score, 1);
});

test('clipboard parser handles valid excel-style paste text and trims trailing blanks', async () => {
  const sampleFixture = await readFile(new URL('../src/fixtures/samplePlayers.tsv', import.meta.url), 'utf8');
  const parsed = parseClipboard(`${sampleFixture}\n\n`);

  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.players.length, 10);
  assert.equal(parsed.players[0].roles.tank.description, '마스터');
  assert.equal(parsed.players[2].roles.damage.description, '그랜드마스터');
});

test('clipboard parser reports missing headers', () => {
  const parsed = parseClipboard('이름\t탱커\t딜러\t힐러\n플레이어1\t골드\t골드\t골드');

  assert.equal(parsed.players.length, 0);
  assert.ok(parsed.errors.some((error) => error.includes('유저 이름')));
  assert.ok(parsed.errors.some((error) => error.includes('탱커 티어')));
});

test('clipboard parser reports malformed row counts, duplicate names, missing cells, and invalid tiers', () => {
  const invalidClipboard = `유저 이름\t탱커 티어\t딜러 티어\t힐러 티어
중복닉\t골드\t골드\t골드
중복닉\t실버\t그마\tU
빈셀\t\t플래\t골드
이상치\t챌린저\t플래\t골드`;
  const parsed = parseClipboard(invalidClipboard);

  assert.equal(parsed.players.length, 0);
  assert.ok(parsed.errors.some((error) => error.includes('정확히 10명')));
  assert.ok(parsed.errors.some((error) => error.includes('중복')));
  assert.ok(parsed.errors.some((error) => error.includes('비어 있습니다')));
  assert.ok(parsed.errors.some((error) => error.includes('지원하지 않는 티어')));
});
