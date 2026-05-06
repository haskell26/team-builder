import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { updateMatchPlayerPreferencePoints } from '../src/lib/appFlow.js';
import { compareCandidateMetrics, getTopCandidates, optimizeTeams, rankCandidates } from '../src/lib/optimizer.js';
import { parseClipboard } from '../src/lib/parseClipboard.js';

function makePlayer(name, tank, damage, support) {
  return {
    name,
    sourceRow: 0,
    roles: {
      tank,
      damage,
      support,
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

function makeCandidate(candidateKey, scoreDifference, roleScoreDifferenceSum, tankScoreDifference, unrankedDifference) {
  return {
    id: candidateKey,
    candidateKey,
    comparisonKey: candidateKey,
    scoreDifference,
    roleScoreDifferenceSum,
    tankScoreDifference,
    unrankedDifference,
    teams: [],
  };
}

async function loadSamplePlayers() {
  const sampleFixture = await readFile(new URL('../src/fixtures/samplePlayers.tsv', import.meta.url), 'utf8');
  const parsed = parseClipboard(sampleFixture);

  assert.deepEqual(parsed.errors, []);
  return parsed.players;
}

function createSequenceRng(sequence) {
  let index = 0;

  return () => {
    const value = sequence[index % sequence.length];
    index += 1;
    return value;
  };
}

test('optimizer preserves 1탱 2딜 2힐 composition and unique players across the top 6 candidates', async () => {
  const players = await loadSamplePlayers();
  const { candidates, candidateCount } = getTopCandidates(players, {
    limit: 6,
    rng: () => 0.5,
  });

  assert.equal(candidates.length, 6);
  assert.ok(candidateCount >= 6);
  assert.equal(new Set(candidates.map((candidate) => candidate.candidateKey)).size, 6);

  for (const candidate of candidates) {
    const assignments = candidate.teams.flatMap((team) => team.assignments).map((assignment) => assignment.playerName);
    const slots = candidate.teams.flatMap((team) => team.slots);
    const preferenceSummaryTotal =
      candidate.preferenceSummary.high +
      candidate.preferenceSummary.balanced +
      candidate.preferenceSummary.low +
      candidate.preferenceSummary.zero;

    assert.equal(candidate.teams.length, 2);
    assert.equal(new Set(assignments).size, 10);
    assert.equal(assignments.length, 10);
    assert.equal(slots.length, 10);
    assert.equal(new Set(slots.map((slot) => slot.id)).size, 10);
    assert.equal(preferenceSummaryTotal, 10);

    for (const team of candidate.teams) {
      assert.equal(team.assignments.filter((assignment) => assignment.assignedRole === 'tank').length, 1);
      assert.equal(team.assignments.filter((assignment) => assignment.assignedRole === 'damage').length, 2);
      assert.equal(team.assignments.filter((assignment) => assignment.assignedRole === 'support').length, 2);
      assert.equal(team.slots.filter((slot) => slot.role === 'tank').length, 1);
      assert.equal(team.slots.filter((slot) => slot.role === 'damage').length, 2);
      assert.equal(team.slots.filter((slot) => slot.role === 'support').length, 2);
      assert.ok(team.slots.every((slot) => typeof slot.assignedPreferencePoints === 'number'));
    }
  }
});

test('optimizer can find a perfect balance when mirrored role tiers are available', () => {
  const players = [
    makePlayer('탱커1', tier('master', '마스터', 6), tier('unranked', '언랭', 0), tier('unranked', '언랭', 0)),
    makePlayer('탱커2', tier('master', '마스터', 6), tier('unranked', '언랭', 0), tier('unranked', '언랭', 0)),
    makePlayer('딜러1', tier('unranked', '언랭', 0), tier('grandmaster', '그랜드마스터', 7), tier('unranked', '언랭', 0)),
    makePlayer('딜러2', tier('unranked', '언랭', 0), tier('grandmaster', '그랜드마스터', 7), tier('unranked', '언랭', 0)),
    makePlayer('딜러3', tier('unranked', '언랭', 0), tier('diamond', '다이아', 5), tier('unranked', '언랭', 0)),
    makePlayer('딜러4', tier('unranked', '언랭', 0), tier('diamond', '다이아', 5), tier('unranked', '언랭', 0)),
    makePlayer('힐러1', tier('unranked', '언랭', 0), tier('unranked', '언랭', 0), tier('master', '마스터', 6)),
    makePlayer('힐러2', tier('unranked', '언랭', 0), tier('unranked', '언랭', 0), tier('master', '마스터', 6)),
    makePlayer('힐러3', tier('unranked', '언랭', 0), tier('unranked', '언랭', 0), tier('platinum', '플래티넘', 4)),
    makePlayer('힐러4', tier('unranked', '언랭', 0), tier('unranked', '언랭', 0), tier('platinum', '플래티넘', 4)),
  ];

  const result = optimizeTeams(players, { rng: () => 0.5 });

  assert.equal(result.scoreDifference, 0);
  assert.equal(result.rank, 1);
  assert.equal(result.id, result.candidates[0].id);
  assert.equal(result.candidateCount >= result.displayedCandidateCount, true);
  assert.equal(result.displayedCandidateCount, 6);
  assert.equal(result.teams[0].slots.length, 5);
  assert.equal(result.teams[1].slots.length, 5);
});

test('candidate ranking prioritizes total score difference, then role-score sum, then tank difference, then unranked difference', () => {
  const ranked = rankCandidates(
    [
      makeCandidate('total-worse', 1, 0, 0, 0),
      makeCandidate('role-worse', 0, 4, 0, 0),
      makeCandidate('tank-worse', 0, 3, 2, 0),
      makeCandidate('unranked-worse', 0, 3, 1, 2),
      makeCandidate('best', 0, 3, 1, 0),
    ],
    { rng: () => 0.5 },
  );

  assert.deepEqual(
    ranked.map((candidate) => candidate.candidateKey),
    ['best', 'unranked-worse', 'tank-worse', 'role-worse', 'total-worse'],
  );
});

test('exact metric ties are randomized only inside their tie bucket when rng is injected', () => {
  const sequence = [0, 0];
  const ranked = rankCandidates(
    [
      makeCandidate('leader', 0, 0, 0, 0),
      makeCandidate('tie-a', 0, 1, 0, 0),
      makeCandidate('tie-b', 0, 1, 0, 0),
      makeCandidate('tail', 1, 0, 0, 0),
    ],
    {
      rng: () => sequence.shift() ?? 0,
    },
  );

  assert.deepEqual(
    ranked.map((candidate) => candidate.candidateKey),
    ['leader', 'tie-b', 'tie-a', 'tail'],
  );
});

test('preference points can change surfaced candidates without breaking balance ranking precedence', async () => {
  const basePlayers = await loadSamplePlayers();
  const baseResult = getTopCandidates(basePlayers, {
    limit: 6,
    rng: createSequenceRng([0.11, 0.42, 0.73, 0.24, 0.55, 0.86]),
  });
  let preferredPlayers = basePlayers;
  const preferenceUpdates = [
    ['하늘방패', 'tank', 4],
    ['정조준', 'damage', 4],
    ['플랭크', 'damage', 4],
    ['빛의수호', 'support', 4],
    ['구원천사', 'support', 4],
    ['언랭복귀', 'tank', 4],
  ];

  for (const [playerId, role, delta] of preferenceUpdates) {
    preferredPlayers = updateMatchPlayerPreferencePoints(preferredPlayers, playerId, role, delta);
  }

  const preferredResult = getTopCandidates(preferredPlayers, {
    limit: 6,
    rng: createSequenceRng([0.11, 0.42, 0.73, 0.24, 0.55, 0.86]),
  });

  assert.notDeepEqual(
    preferredResult.candidates.map((candidate) => candidate.candidateKey),
    baseResult.candidates.map((candidate) => candidate.candidateKey),
  );

  for (let index = 1; index < preferredResult.candidates.length; index += 1) {
    assert.ok(compareCandidateMetrics(preferredResult.candidates[index - 1], preferredResult.candidates[index]) <= 0);
  }

  assert.ok(
    preferredResult.candidates.some(
      (candidate) => candidate.preferenceSignal.totalAssignedPreferencePoints > baseResult.candidates[0].preferenceSignal.totalAssignedPreferencePoints,
    ),
  );
});
