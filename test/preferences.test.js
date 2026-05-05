import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deriveDefaultPreferenceOrder,
  getPreferenceMeta,
  normalizePreferenceOrder,
  updatePreferenceOrder,
} from '../src/lib/preferences.js';

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

test('default preference order follows highest tier score and tank-damage-support tie break', () => {
  const player = {
    roles: {
      tank: tier('master', '마스터', 6),
      damage: tier('master', '마스터', 6),
      support: tier('gold', '골드', 3),
    },
  };

  assert.deepEqual(deriveDefaultPreferenceOrder(player), ['tank', 'damage', 'support']);
});

test('normalizePreferenceOrder removes duplicates and appends missing roles', () => {
  assert.deepEqual(normalizePreferenceOrder(['support', 'support', 'tank']), ['support', 'tank', 'damage']);
});

test('updatePreferenceOrder keeps role order unique when a select value changes', () => {
  const initialOrder = ['tank', 'support', 'damage'];

  assert.deepEqual(updatePreferenceOrder(initialOrder, 1, 'tank', initialOrder), ['support', 'tank', 'damage']);
  assert.deepEqual(updatePreferenceOrder(initialOrder, 2, 'tank', initialOrder), ['support', 'damage', 'tank']);
});

test('getPreferenceMeta returns visible rank metadata for an assigned role', () => {
  const preferenceMeta = getPreferenceMeta(['support', 'tank', 'damage'], 'tank');

  assert.equal(preferenceMeta.preferenceRank, 2);
  assert.equal(preferenceMeta.preferenceLabel, '2순위');
  assert.equal(preferenceMeta.preferenceFitKey, 'rank-2');
});
