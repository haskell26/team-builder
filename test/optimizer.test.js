import test from 'node:test';
import assert from 'node:assert/strict';

import { optimizeTeams } from '../src/lib/optimizer.js';

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

function uniqueAssignments(result) {
  return result.teams.flatMap((team) => team.assignments).map((assignment) => assignment.playerName);
}

test('optimizer preserves role counts and never duplicates players', () => {
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

  const result = optimizeTeams(players);
  const assignments = uniqueAssignments(result);

  assert.equal(result.teams.length, 2);
  assert.equal(new Set(assignments).size, 10);
  assert.equal(assignments.length, 10);

  for (const team of result.teams) {
    assert.equal(team.assignments.filter((assignment) => assignment.assignedRole === 'tank').length, 1);
    assert.equal(team.assignments.filter((assignment) => assignment.assignedRole === 'damage').length, 2);
    assert.equal(team.assignments.filter((assignment) => assignment.assignedRole === 'support').length, 2);
  }
});

test('optimizer finds zero score difference for mirrored specialist fixture', () => {
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

  const result = optimizeTeams(players);

  assert.equal(result.scoreDifference, 0);
});

test('optimizer uses unranked distribution as the second tie-breaker', () => {
  const players = [
    makePlayer('탱커1', tier('diamond', '다이아', 5), tier('unranked', '언랭', 0), tier('unranked', '언랭', 0)),
    makePlayer('탱커2', tier('diamond', '다이아', 5), tier('unranked', '언랭', 0), tier('unranked', '언랭', 0)),
    makePlayer('공격수1', tier('unranked', '언랭', 0), tier('master', '마스터', 6), tier('unranked', '언랭', 0)),
    makePlayer('공격수2', tier('unranked', '언랭', 0), tier('diamond', '다이아', 5), tier('unranked', '언랭', 0)),
    makePlayer('지원수1', tier('unranked', '언랭', 0), tier('unranked', '언랭', 0), tier('master', '마스터', 6)),
    makePlayer('지원수2', tier('unranked', '언랭', 0), tier('unranked', '언랭', 0), tier('diamond', '다이아', 5)),
    makePlayer('하이브리드1', tier('unranked', '언랭', 0), tier('gold', '골드', 3), tier('unranked', '언랭', 0)),
    makePlayer('하이브리드2', tier('unranked', '언랭', 0), tier('gold', '골드', 3), tier('unranked', '언랭', 0)),
    makePlayer('하이브리드3', tier('unranked', '언랭', 0), tier('unranked', '언랭', 0), tier('gold', '골드', 3)),
    makePlayer('하이브리드4', tier('unranked', '언랭', 0), tier('unranked', '언랭', 0), tier('gold', '골드', 3)),
  ];

  const result = optimizeTeams(players);

  assert.equal(result.scoreDifference, 0);
  assert.equal(result.unrankedDifference, 0);
});
