import { ROLE_ORDER, getRoleConfig } from '../config/gameConfig.js';

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

  return {
    id,
    label,
    assignments,
    totalScore,
    unrankedCount,
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
    buildTeamSummary(assignments, index === 0 ? 'A' : 'B', `${index + 1}팀`),
  );

  const comparisonKey = teams.map((team) => buildTeamKey(team.assignments)).join('||');
  const scoreDifference = Math.abs(teams[0].totalScore - teams[1].totalScore);
  const unrankedDifference = Math.abs(teams[0].unrankedCount - teams[1].unrankedCount);

  return {
    teams,
    scoreDifference,
    unrankedDifference,
    comparisonKey,
  };
}

export function compareBalanceResults(left, right) {
  if (left.scoreDifference !== right.scoreDifference) {
    return left.scoreDifference - right.scoreDifference;
  }

  if (left.unrankedDifference !== right.unrankedDifference) {
    return left.unrankedDifference - right.unrankedDifference;
  }

  return left.comparisonKey.localeCompare(right.comparisonKey, 'ko');
}

export function enumerateValidAssignments(players) {
  if (players.length !== 10) {
    throw new Error('Optimizer expects exactly 10 players.');
  }

  const allIndices = players.map((_, index) => index);
  const candidates = [];

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

          candidates.push(createCandidate(teamOneAssignments, teamTwoAssignments));
        }
      }
    }
  }

  return candidates;
}

export function optimizeTeams(players) {
  const candidates = enumerateValidAssignments(players);
  const bestCandidate = candidates.reduce((currentBest, candidate) => {
    if (!currentBest) {
      return candidate;
    }

    return compareBalanceResults(candidate, currentBest) < 0 ? candidate : currentBest;
  }, null);

  return {
    ...bestCandidate,
    candidateCount: candidates.length,
  };
}

export { SLOT_ORDER };
