import { ROLE_ORDER } from '../config/gameConfig.js';

function clonePlayerPool(players) {
  return Object.fromEntries(players.map((player) => [player.id, player]));
}

function hydrateSlot(slot, playerPool) {
  const player = playerPool[slot.playerId];

  if (!player) {
    throw new Error(`알 수 없는 플레이어 슬롯입니다: ${slot.playerId}`);
  }

  const tier = player.roles[slot.role];

  return {
    ...slot,
    playerName: player.name,
    sourceRow: player.sourceRow,
    tierKey: tier.key,
    tierLabel: tier.label,
    tierDescription: tier.description,
    score: tier.score,
    isUnranked: tier.isUnranked,
  };
}

function hydrateTeams(teams, playerPool) {
  return teams.map((team) => hydrateTeam(team, playerPool));
}

function getRoleSortIndex(role) {
  return ROLE_ORDER.indexOf(role);
}

function createAssignment(slot) {
  return {
    playerId: slot.playerId,
    playerName: slot.playerName,
    sourceRow: slot.sourceRow,
    assignedRole: slot.role,
    roleLabel: slot.roleLabel,
    tierKey: slot.tierKey,
    tierLabel: slot.tierLabel,
    tierDescription: slot.tierDescription,
    score: slot.score,
    isUnranked: slot.isUnranked,
  };
}

function hydrateTeam(team, playerPool) {
  const slots = team.slots.map((slot) => hydrateSlot(slot, playerPool));
  const assignments = [...slots]
    .map((slot) => createAssignment(slot))
    .sort((left, right) => {
      const roleIndexDifference = getRoleSortIndex(left.assignedRole) - getRoleSortIndex(right.assignedRole);

      if (roleIndexDifference !== 0) {
        return roleIndexDifference;
      }

      return left.playerName.localeCompare(right.playerName, 'ko');
    });
  const totalScore = slots.reduce((sum, slot) => sum + slot.score, 0);
  const unrankedCount = slots.filter((slot) => slot.isUnranked).length;
  const roleTotals = ROLE_ORDER.reduce((totals, role) => {
    totals[role] = slots.filter((slot) => slot.role === role).reduce((sum, slot) => sum + slot.score, 0);
    return totals;
  }, {});

  return {
    ...team,
    slots,
    assignments,
    totalScore,
    unrankedCount,
    roleTotals,
  };
}

function mapSlotIds(editor) {
  return Object.fromEntries(
    editor.teams.flatMap((team) => team.slots.map((slot) => [slot.id, slot])),
  );
}

export function createEditableCandidate(candidate, players) {
  const playerPool = clonePlayerPool(players);
  const teams = hydrateTeams(candidate.teams, playerPool);

  return {
    candidateId: candidate.id,
    rank: candidate.rank,
    selectedSlotId: null,
    lastAction: 'idle',
    playerPool,
    teams,
  };
}

export function getEditableSlots(editor) {
  return editor?.teams.flatMap((team) => team.slots) ?? [];
}

export function selectSlot(editor, slotId) {
  return {
    ...editor,
    selectedSlotId: slotId,
    lastAction: 'selected',
  };
}

export function clearSelectedSlot(editor) {
  return {
    ...editor,
    selectedSlotId: null,
    lastAction: 'idle',
  };
}

export function swapSlots(editor, firstSlotId, secondSlotId) {
  const slotLookup = mapSlotIds(editor);
  const firstSlot = slotLookup[firstSlotId];
  const secondSlot = slotLookup[secondSlotId];

  if (!firstSlot || !secondSlot) {
    throw new Error('스왑할 슬롯을 찾지 못했습니다.');
  }

  const swappedTeams = editor.teams.map((team) =>
    hydrateTeam(
      {
        ...team,
        slots: team.slots.map((slot) => {
          if (slot.id === firstSlotId) {
            return {
              ...slot,
              playerId: secondSlot.playerId,
            };
          }

          if (slot.id === secondSlotId) {
            return {
              ...slot,
              playerId: firstSlot.playerId,
            };
          }

          return slot;
        }),
      },
      editor.playerPool,
    ),
  );

  return {
    ...editor,
    teams: swappedTeams,
    selectedSlotId: null,
    lastAction: 'swapped',
  };
}
