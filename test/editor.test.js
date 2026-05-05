import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { clearSelectedSlot, createEditableCandidate, selectSlot, swapSlots } from '../src/lib/editor.js';
import { getTopCandidates } from '../src/lib/optimizer.js';
import { parseClipboard } from '../src/lib/parseClipboard.js';

async function loadFirstCandidate() {
  const sampleFixture = await readFile(new URL('../src/fixtures/samplePlayers.tsv', import.meta.url), 'utf8');
  const parsed = parseClipboard(sampleFixture);

  assert.deepEqual(parsed.errors, []);

  const { candidates } = getTopCandidates(parsed.players, {
    limit: 6,
    rng: () => 0.5,
  });

  return {
    players: parsed.players,
    candidate: candidates[0],
  };
}

function getSlot(editor, slotId) {
  return editor.teams.flatMap((team) => team.slots).find((slot) => slot.id === slotId);
}

test('createEditableCandidate builds fixed slot ids and role-based tier displays', async () => {
  const { players, candidate } = await loadFirstCandidate();
  const editor = createEditableCandidate(candidate, players);

  assert.equal(editor.rank, 1);
  assert.equal(editor.selectedSlotId, null);
  assert.equal(editor.teams.length, 2);
  assert.equal(editor.teams[0].slots[0].id, 'A-tank-1');
  assert.equal(editor.teams[1].slots[4].id, 'B-support-2');
  assert.equal(getSlot(editor, 'A-tank-1')?.playerName, '빛의수호');
  assert.equal(getSlot(editor, 'A-tank-1')?.tierDescription, '실버');
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
  const swapped = swapSlots(editor, 'A-damage-1', 'A-damage-2');

  assert.equal(getSlot(editor, 'A-damage-1')?.playerName, '구원천사');
  assert.equal(getSlot(editor, 'A-damage-2')?.playerName, '정조준');
  assert.equal(getSlot(swapped, 'A-damage-1')?.playerName, '정조준');
  assert.equal(getSlot(swapped, 'A-damage-2')?.playerName, '구원천사');
  assert.equal(getSlot(swapped, 'A-damage-1')?.tierDescription, '마스터');
  assert.equal(getSlot(swapped, 'A-damage-2')?.tierDescription, '실버');
});

test('cross-role swaps recompute displayed tier info from the destination slot role', async () => {
  const { players, candidate } = await loadFirstCandidate();
  const editor = createEditableCandidate(candidate, players);
  const swapped = swapSlots(editor, 'A-tank-1', 'B-support-2');

  assert.equal(getSlot(swapped, 'A-tank-1')?.playerName, '하늘방패');
  assert.equal(getSlot(swapped, 'A-tank-1')?.tierDescription, '마스터');
  assert.equal(getSlot(swapped, 'B-support-2')?.playerName, '빛의수호');
  assert.equal(getSlot(swapped, 'B-support-2')?.tierDescription, '마스터');
  assert.equal(swapped.selectedSlotId, null);
  assert.equal(swapped.lastAction, 'swapped');
});

test('swap recalculates assignments and derived team totals from the updated slot state', async () => {
  const { players, candidate } = await loadFirstCandidate();
  const editor = createEditableCandidate(candidate, players);
  const swapped = swapSlots(editor, 'A-tank-1', 'B-support-2');
  const teamA = swapped.teams.find((team) => team.id === 'A');
  const teamB = swapped.teams.find((team) => team.id === 'B');

  assert.ok(teamA);
  assert.ok(teamB);
  assert.equal(editor.teams[0].assignments.find((assignment) => assignment.assignedRole === 'tank')?.playerName, '빛의수호');
  assert.equal(teamA.assignments.find((assignment) => assignment.assignedRole === 'tank')?.playerName, '하늘방패');
  assert.equal(teamB.assignments.find((assignment) => assignment.assignedRole === 'support' && assignment.playerName === '빛의수호')?.tierDescription, '마스터');
  assert.equal(teamA.roleTotals.tank, 6);
  assert.equal(teamA.totalScore, teamA.slots.reduce((sum, slot) => sum + slot.score, 0));
  assert.equal(teamB.totalScore, teamB.slots.reduce((sum, slot) => sum + slot.score, 0));
  assert.equal(teamA.unrankedCount, teamA.slots.filter((slot) => slot.isUnranked).length);
  assert.equal(teamB.unrankedCount, teamB.slots.filter((slot) => slot.isUnranked).length);
});
