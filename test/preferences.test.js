import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PREFERENCE_POINT_TOTAL,
  adjustPreferencePoints,
  createDefaultPreferencePoints,
  getPreferenceMeta,
  migratePreferenceOrderToPoints,
  normalizePreferencePoints,
  resolvePreferencePoints,
  summarizePreferenceFits,
} from '../src/lib/preferences.js';

test('createDefaultPreferencePoints starts every player at 2 / 2 / 2', () => {
  assert.deepEqual(createDefaultPreferencePoints(), {
    tank: 2,
    damage: 2,
    support: 2,
  });
});

test('normalizePreferencePoints clamps values to non-negative integers and keeps the total at 6', () => {
  const points = normalizePreferencePoints({
    tank: 6.8,
    damage: -3,
    support: 0.4,
  });

  assert.deepEqual(points, {
    tank: 6,
    damage: 0,
    support: 0,
  });
  assert.equal(points.tank + points.damage + points.support, PREFERENCE_POINT_TOTAL);
});

test('adjustPreferencePoints raises one role while rebalancing the other two', () => {
  const adjusted = adjustPreferencePoints(
    {
      tank: 2,
      damage: 2,
      support: 2,
    },
    'tank',
    3,
  );

  assert.deepEqual(adjusted, {
    tank: 5,
    damage: 0,
    support: 1,
  });
  assert.equal(adjusted.tank + adjusted.damage + adjusted.support, PREFERENCE_POINT_TOTAL);
});

test('migratePreferenceOrderToPoints preserves legacy 3 / 2 / 1 intent', () => {
  assert.deepEqual(migratePreferenceOrderToPoints(['support', 'tank', 'damage']), {
    tank: 2,
    damage: 1,
    support: 3,
  });
});

test('resolvePreferencePoints falls back to migrated legacy order when needed', () => {
  assert.deepEqual(resolvePreferencePoints({ preferenceOrder: ['damage', 'support', 'tank'] }), {
    tank: 1,
    damage: 3,
    support: 2,
  });
});

test('getPreferenceMeta returns assigned-role point metadata', () => {
  const preferenceMeta = getPreferenceMeta(
    {
      tank: 1,
      damage: 4,
      support: 1,
    },
    'damage',
  );

  assert.equal(preferenceMeta.assignedPreferencePoints, 4);
  assert.equal(preferenceMeta.preferenceLabel, '선호 4점');
  assert.equal(preferenceMeta.preferenceFitKey, 'points-4');
});

test('summarizePreferenceFits groups assigned-role points into compact display buckets', () => {
  const summary = summarizePreferenceFits([
    { assignedPreferencePoints: 4 },
    { assignedPreferencePoints: 3 },
    { assignedPreferencePoints: 2 },
    { assignedPreferencePoints: 1 },
    { assignedPreferencePoints: 0 },
  ]);

  assert.deepEqual(summary, {
    high: 2,
    balanced: 1,
    low: 1,
    zero: 1,
  });
});
