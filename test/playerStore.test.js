import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PLAYER_STORE_KEY,
  createSavedPlayerRecord,
  loadPlayerStore,
  saveCurrentPlayersToStore,
  savePlayerStore,
  upsertSavedPlayerRecords,
} from '../src/lib/playerStore.js';

function createMemoryStorage(seed = {}) {
  const store = new Map(Object.entries(seed));

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, `${value}`);
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

function tier(key, description, score) {
  return {
    key,
    label: description === '언랭' ? 'U' : description,
    description,
    score,
    isUnranked: score === 0,
    rawValue: description,
  };
}

function makePlayer(name, preferenceOrder = ['tank', 'damage', 'support']) {
  return {
    id: name.trim().toLowerCase(),
    name,
    sourceRow: 1,
    roles: {
      tank: tier('diamond', '다이아', 5),
      damage: tier('gold', '골드', 3),
      support: tier('master', '마스터', 6),
    },
    preferenceOrder,
    preferenceSource: 'manual',
  };
}

test('loadPlayerStore returns an empty library when nothing is saved yet', () => {
  const storage = createMemoryStorage();
  const loaded = loadPlayerStore(storage);

  assert.equal(loaded.storageAvailable, true);
  assert.deepEqual(loaded.records, []);
  assert.equal(loaded.warning, '');
});

test('loadPlayerStore falls back safely when saved JSON is corrupted', () => {
  const storage = createMemoryStorage({
    [PLAYER_STORE_KEY]: '{bad json',
  });
  const loaded = loadPlayerStore(storage);

  assert.equal(loaded.storageAvailable, true);
  assert.deepEqual(loaded.records, []);
  assert.match(loaded.warning, /읽지 못해 비운 상태로 시작했습니다/);
});

test('upsertSavedPlayerRecords updates an existing record by normalized player name', () => {
  const existing = [createSavedPlayerRecord(makePlayer('테스터', ['tank', 'damage', 'support']))];
  const updated = upsertSavedPlayerRecords(existing, [makePlayer('  테스터  ', ['support', 'tank', 'damage'])]);

  assert.equal(updated.length, 1);
  assert.deepEqual(updated[0].preferenceOrder, ['support', 'tank', 'damage']);
});

test('saveCurrentPlayersToStore and loadPlayerStore round-trip tiers and preferences', () => {
  const storage = createMemoryStorage();
  const players = [makePlayer('저장1', ['support', 'tank', 'damage']), makePlayer('저장2', ['damage', 'support', 'tank'])];
  const saved = saveCurrentPlayersToStore([], players, storage);
  const loaded = loadPlayerStore(storage);

  assert.equal(saved.success, true);
  assert.equal(saved.records.length, 2);
  assert.equal(loaded.records.length, 2);
  assert.deepEqual(loaded.records[0].preferenceOrder, ['support', 'tank', 'damage']);
  assert.equal(loaded.records[1].roles.support.description, '마스터');
});

test('savePlayerStore writes the versioned wrapper payload', () => {
  const storage = createMemoryStorage();
  const records = [createSavedPlayerRecord(makePlayer('버전체크'))];
  const result = savePlayerStore(records, storage);
  const rawPayload = storage.getItem(PLAYER_STORE_KEY);

  assert.equal(result.success, true);
  assert.match(rawPayload, /"version":1/);
  assert.match(rawPayload, /"players"/);
});
