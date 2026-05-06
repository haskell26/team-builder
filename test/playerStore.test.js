import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LEGACY_PLAYER_STORE_KEY,
  PLAYER_STORE_KEY,
  clearSavedPlayerStore,
  createSavedPlayerRecord,
  deleteSavedPlayerRecord,
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

function makePlayer(name, preferencePoints = { tank: 2, damage: 2, support: 2 }) {
  return {
    id: name.trim().toLowerCase(),
    name,
    sourceRow: 1,
    roles: {
      tank: tier('diamond', '다이아', 5),
      damage: tier('gold', '골드', 3),
      support: tier('master', '마스터', 6),
    },
    preferencePoints,
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

test('loadPlayerStore migrates legacy preferenceOrder payloads from the v1 key', () => {
  const storage = createMemoryStorage({
    [LEGACY_PLAYER_STORE_KEY]: JSON.stringify({
      version: 1,
      players: [
        {
          id: 'legacy-player',
          name: '레거시',
          roles: {
            tank: tier('diamond', '다이아', 5),
            damage: tier('gold', '골드', 3),
            support: tier('master', '마스터', 6),
          },
          preferenceOrder: ['support', 'tank', 'damage'],
        },
      ],
    }),
  });
  const loaded = loadPlayerStore(storage);

  assert.equal(loaded.records.length, 1);
  assert.deepEqual(loaded.records[0].preferencePoints, {
    tank: 2,
    damage: 1,
    support: 3,
  });
  assert.match(loaded.warning, /예전 형식/);
});

test('upsertSavedPlayerRecords updates an existing record by normalized player name', () => {
  const existing = [createSavedPlayerRecord(makePlayer('테스터', { tank: 2, damage: 2, support: 2 }))];
  const updated = upsertSavedPlayerRecords(existing, [makePlayer('  테스터  ', { tank: 4, damage: 1, support: 1 })]);

  assert.equal(updated.length, 1);
  assert.deepEqual(updated[0].preferencePoints, {
    tank: 4,
    damage: 1,
    support: 1,
  });
});

test('saveCurrentPlayersToStore and loadPlayerStore round-trip tiers and point-based preferences', () => {
  const storage = createMemoryStorage();
  const players = [
    makePlayer('저장1', { tank: 1, damage: 4, support: 1 }),
    makePlayer('저장2', { tank: 3, damage: 1, support: 2 }),
  ];
  const saved = saveCurrentPlayersToStore([], players, storage);
  const loaded = loadPlayerStore(storage);

  assert.equal(saved.success, true);
  assert.equal(saved.records.length, 2);
  assert.equal(loaded.records.length, 2);
  assert.deepEqual(loaded.records[0].preferencePoints, { tank: 1, damage: 4, support: 1 });
  assert.equal(loaded.records[1].roles.support.description, '마스터');
});

test('deleteSavedPlayerRecord removes one player and persists the new list', () => {
  const storage = createMemoryStorage();
  const saved = saveCurrentPlayersToStore([], [makePlayer('삭제1'), makePlayer('삭제2')], storage);
  const deleted = deleteSavedPlayerRecord(saved.records, '삭제1'.toLowerCase(), storage);
  const loaded = loadPlayerStore(storage);

  assert.equal(deleted.success, true);
  assert.equal(deleted.records.length, 1);
  assert.equal(deleted.records[0].name, '삭제2');
  assert.equal(loaded.records.length, 1);
});

test('clearSavedPlayerStore removes all saved player payloads', () => {
  const storage = createMemoryStorage({
    [PLAYER_STORE_KEY]: '{"version":2,"players":[]}',
    [LEGACY_PLAYER_STORE_KEY]: '{"version":1,"players":[]}',
  });
  const cleared = clearSavedPlayerStore(storage);

  assert.equal(cleared.success, true);
  assert.equal(storage.getItem(PLAYER_STORE_KEY), null);
  assert.equal(storage.getItem(LEGACY_PLAYER_STORE_KEY), null);
});

test('savePlayerStore writes the versioned wrapper payload', () => {
  const storage = createMemoryStorage();
  const records = [createSavedPlayerRecord(makePlayer('버전체크'))];
  const result = savePlayerStore(records, storage);
  const rawPayload = storage.getItem(PLAYER_STORE_KEY);

  assert.equal(result.success, true);
  assert.match(rawPayload, /"version":2/);
  assert.match(rawPayload, /"preferencePoints"/);
});
