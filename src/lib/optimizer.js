import { ROLE_ORDER, getRoleConfig } from '../config/gameConfig.js';
import { getPlayerId } from './playerIdentity.js';

const SLOT_ORDER = ['tank', 'damage', 'damage', 'support', 'support'];

function buildCombinations(items, size, startIndex = 0, current = [], combinations = []) {
  if (current.length === size) {
    combinations.push([...current]);
    return combinations;
  }

  for (let index = startIndex; index <= items.length - (size - current.length); index += 1) {
    current.push(items[index]);
    buildCombinations(items, size, index + 1, current, combinations);
    current.pop();
  }

  return combinations;
}

function createAssignment(player, role) {
  const tier = player.roles[role];
  const roleConfig = getRoleConfig(role);

  return {
    playerId: getPlayerId(player),
    playerName: player.name,
    sourceRow: player.sourceRow,
    assignedRole: role,
    roleLabel: roleConfig.label,
    tierKey: tier.key,
    tierLabel: tier.label,
    tierDescription: tier.description,
    score: tier.score,
    isUnranked: tier.isUnranked,
  };
}

function buildTeamSlots(assignments, teamId, teamLabel) {
  const slotCounts = {
    tank: 0,
    damage: 0,
    support: 0,
  };

  return assignments.map((assignment) => {
    slotCounts[assignment.assignedRole] += 1;

    return {
      id: `${teamId}-${assignment.assignedRole}-${slotCounts[assignment.assignedRole]}`,
      teamId,
      teamLabel,
      role: assignment.assignedRole,
      roleLabel: assignment.roleLabel,
      roleShortLabel: getRoleConfig(assignment.assignedRole).shortLabel,
      slotIndex: slotCounts[assignment.assignedRole],
      playerId: assignment.playerId,
      playerName: assignment.playerName,
      tierKey: assignment.tierKey,
      tierLabel: assignment.tierLabel,
      tierDescription: assignment.tierDescription,
      score: assignment.score,
      isUnranked: assignment.isUnranked,
      sourceRow: assignment.sourceRow,
    };
  });
}

function getRoleSortIndex(role) {
  return ROLE_ORDER.indexOf(role);
}

function buildTeamKey(assignments) {
  return [...assignments]
    .sort((left, right) => {
      const roleIndexDifference = getRoleSortIndex(left.assignedRole) - getRoleSortIndex(right.assignedRole);

      if (roleIndexDifference !== 0) {
        return roleIndexDifference;
      }

      return left.playerName.localeCompare(right.playerName, 'ko');
    })
    .map((assignment) => `${assignment.assignedRole}:${assignment.playerName}:${assignment.tierKey}:${assignment.score}`)
    .join('|');
}

function buildTeamSummary(rawAssignments, id, label) {
  const assignments = [...rawAssignments].sort((left, right) => {
    const roleIndexDifference = getRoleSortIndex(left.assignedRole) - getRoleSortIndex(right.assignedRole);

    if (roleIndexDifference !== 0) {
      return roleIndexDifference;
    }

    return left.playerName.localeCompare(right.playerName, 'ko');
  });

  const totalScore = assignments.reduce((sum, assignment) => sum + assignment.score, 0);
  const unrankedCount = assignments.filter((assignment) => assignment.isUnranked).length;
  const roleTotals = ROLE_ORDER.reduce((totals, role) => {
    totals[role] = assignments
      .filter((assignment) => assignment.assignedRole === role)
      .reduce((sum, assignment) => sum + assignment.score, 0);
    return totals;
  }, {});

  return {
    id,
    label,
    assignments,
    slots: buildTeamSlots(assignments, id, label),
    totalScore,
    unrankedCount,
    roleTotals,
  };
}

function createCandidate(teamOneAssignments, teamTwoAssignments) {
  const firstTeamKey = buildTeamKey(teamOneAssignments);
  const secondTeamKey = buildTeamKey(teamTwoAssignments);
  const orderedAssignments =
    firstTeamKey.localeCompare(secondTeamKey, 'ko') <= 0
      ? [teamOneAssignments, teamTwoAssignments]
      : [teamTwoAssignments, teamOneAssignments];

  const teams = orderedAssignments.map((assignments, index) =>
    buildTeamSummary(assignments, index === 0 ? 'A' : 'B', `팀 ${index === 0 ? 'A' : 'B'}`),
  );

  const comparisonKey = teams.map((team) => buildTeamKey(team.assignments)).join('||');
  const roleScoreDifferences = ROLE_ORDER.reduce((differences, role) => {
    differences[role] = Math.abs(teams[0].roleTotals[role] - teams[1].roleTotals[role]);
    return differences;
  }, {});
  const scoreDifference = Math.abs(teams[0].totalScore - teams[1].totalScore);
  const roleScoreDifferenceSum = ROLE_ORDER.reduce((sum, role) => sum + roleScoreDifferences[role], 0);
  const tankScoreDifference = roleScoreDifferences.tank;
  const unrankedDifference = Math.abs(teams[0].unrankedCount - teams[1].unrankedCount);

  return {
    id: comparisonKey,
    teams,
    scoreDifference,
    roleScoreDifferences,
    roleScoreDifferenceSum,
    tankScoreDifference,
    unrankedDifference,
    candidateKey: comparisonKey,
    comparisonKey,
  };
}

export function compareCandidateMetrics(left, right) {
  if (left.scoreDifference !== right.scoreDifference) {
    return left.scoreDifference - right.scoreDifference;
  }

  if (left.roleScoreDifferenceSum !== right.roleScoreDifferenceSum) {
    return left.roleScoreDifferenceSum - right.roleScoreDifferenceSum;
  }

  if (left.tankScoreDifference !== right.tankScoreDifference) {
    return left.tankScoreDifference - right.tankScoreDifference;
  }

  if (left.unrankedDifference !== right.unrankedDifference) {
    return left.unrankedDifference - right.unrankedDifference;
  }

  return 0;
}

export function compareBalanceResults(left, right) {
  const metricComparison = compareCandidateMetrics(left, right);

  if (metricComparison !== 0) {
    return metricComparison;
  }

  return left.comparisonKey.localeCompare(right.comparisonKey, 'ko');
}

export function enumerateValidAssignments(players) {
  if (players.length !== 10) {
    throw new Error('Optimizer expects exactly 10 players.');
  }

  const allIndices = players.map((_, index) => index);
  const candidates = new Map();

  for (const [tankAIndex, tankBIndex] of buildCombinations(allIndices, 2)) {
    const remainingAfterTanks = allIndices.filter((index) => index !== tankAIndex && index !== tankBIndex);

    for (const damageAIndices of buildCombinations(remainingAfterTanks, 2)) {
      const remainingAfterDamageA = remainingAfterTanks.filter((index) => !damageAIndices.includes(index));

      for (const damageBIndices of buildCombinations(remainingAfterDamageA, 2)) {
        const remainingAfterDamageB = remainingAfterDamageA.filter((index) => !damageBIndices.includes(index));

        for (const supportAIndices of buildCombinations(remainingAfterDamageB, 2)) {
          const supportBIndices = remainingAfterDamageB.filter((index) => !supportAIndices.includes(index));
          const teamOneAssignments = [
            createAssignment(players[tankAIndex], 'tank'),
            ...damageAIndices.map((index) => createAssignment(players[index], 'damage')),
            ...supportAIndices.map((index) => createAssignment(players[index], 'support')),
          ];
          const teamTwoAssignments = [
            createAssignment(players[tankBIndex], 'tank'),
            ...damageBIndices.map((index) => createAssignment(players[index], 'damage')),
            ...supportBIndices.map((index) => createAssignment(players[index], 'support')),
          ];

          const candidate = createCandidate(teamOneAssignments, teamTwoAssignments);
          candidates.set(candidate.candidateKey, candidate);
        }
      }
    }
  }

  return [...candidates.values()];
}

function shuffleCandidates(candidates, rng) {
  const shuffled = [...candidates];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    const current = shuffled[index];
    shuffled[index] = shuffled[swapIndex];
    shuffled[swapIndex] = current;
  }

  return shuffled;
}

export function rankCandidates(candidates, { rng = Math.random } = {}) {
  const metricSorted = [...candidates].sort((left, right) => {
    const metricComparison = compareCandidateMetrics(left, right);

    if (metricComparison !== 0) {
      return metricComparison;
    }

    return left.candidateKey.localeCompare(right.candidateKey, 'ko');
  });
  const ranked = [];

  for (let index = 0; index < metricSorted.length; ) {
    let bucketEndIndex = index + 1;

    while (
      bucketEndIndex < metricSorted.length &&
      compareCandidateMetrics(metricSorted[index], metricSorted[bucketEndIndex]) === 0
    ) {
      bucketEndIndex += 1;
    }

    ranked.push(...shuffleCandidates(metricSorted.slice(index, bucketEndIndex), rng));
    index = bucketEndIndex;
  }

  return ranked.map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
  }));
}

export function getTopCandidates(players, { limit = 6, rng = Math.random } = {}) {
  const allCandidates = enumerateValidAssignments(players);
  const rankedCandidates = rankCandidates(allCandidates, { rng });
  const limitedCandidates = rankedCandidates.slice(0, limit).map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
  }));

  return {
    candidates: limitedCandidates,
    candidateCount: allCandidates.length,
  };
}

export function optimizeTeams(players, options = {}) {
  const { candidates, candidateCount } = getTopCandidates(players, options);
  const bestCandidate = candidates[0] ?? null;

  if (!bestCandidate) {
    return null;
  }

  return {
    ...bestCandidate,
    candidates,
    candidateCount,
    displayedCandidateCount: candidates.length,
  };
}

export { SLOT_ORDER };
