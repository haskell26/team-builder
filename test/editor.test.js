import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { parseMatchPlayersFromClipboard, updateMatchPlayerPreferencePoints } from '../src/lib/appFlow.js';
import { clearSelectedSlot, createEditableCandidate, selectSlot, swapSlots } from '../src/lib/editor.js';
import { getTopCandidates } from '../src/lib/optimizer.js';

async function loadFirstCandidate() {
  const sampleFixture = await readFile(new URL('../src/fixtures/samplePlayers.tsv', import.meta.url), 'utf8');
  const parsed = parseMatchPlayersFromClipboard(sampleFixture);

  assert.deepEqual(parsed.errors, []);

  const playersWithPreferences = updateMatchPlayerPreferencePoints(
    updateMatchPlayerPreferencePoints(parsed.players, '빛의수호', 'support', 3),
    '하늘방패',
    'tank',
    3,
  );
  const { candidates } = getTopCandidates(playersWithPreferences, {
    limit: 6,
    rng: () => 0.5,
  });

  return {
    players: playersWithPreferences,
    candidate: candidates[0],
  };
}

function getSlot(editor, slotId) {
  return editor.teams.flatMap((team) => team.slots).find((slot) => slot.id === slotId);
}

test('createEditableCandidate builds fixed slot ids and role-based tier and point displays', async () => {
  const { players, candidate } = await loadFirstCandidate();
  const editor = createEditableCandidate(candidate, players);

  assert.equal(editor.rank, 1);
  assert.equal(editor.selectedSlotId, null);
  assert.equal(editor.teams.length, 2);
  assert.equal(editor.teams[0].slots[0].id, 'A-tank-1');
  assert.equal(editor.teams[1].slots[4].id, 'B-support-2');
  assert.equal(getSlot(editor, 'B-tank-1')?.playerName, '언랭복귀');
  assert.equal(getSlot(editor, 'B-tank-1')?.tierDescription, '브론즈');
  assert.equal(getSlot(editor, 'B-tank-1')?.assignedPreferencePoints, 2);
  assert.equal(getSlot(editor, 'B-tank-1')?.preferenceLabel, '선호 2점');
});

test('slot selection state can be applied and cleared without mutating team data', async () => {
  const { players, candidate } = await loadFirstCandidate();
  const editor = createEditableCandidate(candidate, players);
  const selected = selectSlot(editor, 'A-damage-1');
  const cleared = clearSelectedSlot(selected);

  assert.equal(selected.selectedSlotId, 'A-damage-1');
  assert.equal(selected.lastAction, 'selected');
  assert.equal(cleared.selectedSlotId, null);
  assert.equal(cleared.lastAction, 'idle');
  assert.equal(getSlot(cleared, 'A-damage-1')?.playerName, getSlot(editor, 'A-damage-1')?.playerName);
});

test('same-team same-role swaps exchange players while keeping slot roles fixed', async () => {
  const { players, candidate } = await loadFirstCandidate();
  const editor = createEditableCandidate(candidate, players);
  const swapped = swapSlots(editor, 'B-damage-1', 'B-damage-2');

  assert.equal(getSlot(swapped, 'B-damage-1')?.playerName, '에임장인');
  assert.equal(getSlot(swapped, 'B-damage-2')?.playerName, '구원천사');
  assert.equal(getSlot(swapped, 'B-damage-1')?.tierDescription, '그랜드마스터');
  assert.equal(getSlot(swapped, 'B-damage-2')?.tierDescription, '실버');
});

test('cross-role swaps recompute displayed tier info from the destination slot role and point fit', async () => {
  const { players, candidate } = await loadFirstCandidate();
  const editor = createEditableCandidate(candidate, players);
  const swapped = swapSlots(editor, 'A-support-2', 'B-tank-1');

  assert.equal(getSlot(swapped, 'B-tank-1')?.playerName, '빛의수호');
  assert.equal(getSlot(swapped, 'B-tank-1')?.tierDescription, '실버');
  assert.equal(getSlot(swapped, 'B-tank-1')?.assignedPreferencePoints, 0);
  assert.equal(getSlot(swapped, 'A-support-2')?.playerName, '언랭복귀');
  assert.equal(getSlot(swapped, 'A-support-2')?.tierDescription, '골드');
  assert.equal(getSlot(swapped, 'A-support-2')?.assignedPreferencePoints, 2);
  assert.equal(swapped.selectedSlotId, null);
  assert.equal(swapped.lastAction, 'swapped');
});

test('swap recalculates assignments and derived team totals from the updated slot state', async () => {
  const { players, candidate } = await loadFirstCandidate();
  const editor = createEditableCandidate(candidate, players);
  const swapped = swapSlots(editor, 'A-support-2', 'B-tank-1');
  const teamA = swapped.teams.find((team) => team.id === 'A');
  const teamB = swapped.teams.find((team) => team.id === 'B');

  assert.ok(teamA);
  assert.ok(teamB);
  assert.equal(editor.teams[1].assignments.find((assignment) => assignment.assignedRole === 'tank')?.playerName, '언랭복귀');
  assert.equal(teamB.assignments.find((assignment) => assignment.assignedRole === 'tank')?.playerName, '빛의수호');
  assert.equal(
    teamA.assignments.find((assignment) => assignment.assignedRole === 'support' && assignment.playerName === '언랭복귀')
      ?.tierDescription,
    '골드',
  );
  assert.equal(teamB.roleTotals.tank, 2);
  assert.equal(teamA.totalScore, teamA.slots.reduce((sum, slot) => sum + slot.score, 0));
  assert.equal(teamB.totalScore, teamB.slots.reduce((sum, slot) => sum + slot.score, 0));
  assert.equal(teamA.unrankedCount, teamA.slots.filter((slot) => slot.isUnranked).length);
  assert.equal(teamB.unrankedCount, teamB.slots.filter((slot) => slot.isUnranked).length);
});
