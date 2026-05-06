import { EXPECTED_HEADERS, ROLE_ORDER } from '../config/gameConfig.js';
import { createEditableCandidate, clearSelectedSlot, selectSlot, swapSlots } from './editor.js';
import { getTopCandidates } from './optimizer.js';
import { parseClipboard } from './parseClipboard.js';
import {
  PREFERENCE_SOURCES,
  adjustPreferencePoints,
  clonePreferencePoints,
  resolvePreferencePoints,
} from './preferences.js';

function cloneTierSnapshot(tier) {
  return {
    key: tier.key,
    label: tier.label,
    description: tier.description,
    score: tier.score,
    isUnranked: tier.isUnranked,
    rawValue: tier.rawValue,
  };
}

function cloneRoleMap(roles) {
  return ROLE_ORDER.reduce((nextRoles, role) => {
    nextRoles[role] = cloneTierSnapshot(roles[role]);
    return nextRoles;
  }, {});
}

function buildSavedRecordLookup(savedPlayerRecords) {
  return new Map(savedPlayerRecords.map((record) => [record.id, record]));
}

export function hydrateMatchPlayers(players, savedPlayerRecords = []) {
  const savedRecordLookup = buildSavedRecordLookup(savedPlayerRecords);

  return players.map((player) => {
    const savedRecord = savedRecordLookup.get(player.id);

    return {
      ...player,
      roles: cloneRoleMap(player.roles),
      preferencePoints: resolvePreferencePoints(player, savedRecord?.preferencePoints, savedRecord?.preferenceOrder),
      preferenceSource: savedRecord ? PREFERENCE_SOURCES.saved : PREFERENCE_SOURCES.default,
    };
  });
}

export function parseMatchPlayersFromClipboard(rawText, savedPlayerRecords = []) {
  const parsed = parseClipboard(rawText);

  if (parsed.errors.length > 0) {
    return {
      errors: parsed.errors,
      players: [],
      headers: parsed.headers,
    };
  }

  return {
    errors: [],
    players: hydrateMatchPlayers(parsed.players, savedPlayerRecords),
    headers: parsed.headers,
  };
}

export function buildBalanceFromPlayers(players, options = {}) {
  if (!players.length) {
    return {
      errors: [],
      players: [],
      candidates: [],
      candidateCount: 0,
      selectedCandidateId: null,
      editor: null,
    };
  }

  const { candidates, candidateCount } = getTopCandidates(players, options);
  const selectedCandidateId = candidates[0]?.id ?? null;
  const selectionState = getSelectedCandidateState(candidates, players, selectedCandidateId, candidateCount);

  return {
    errors: [],
    players,
    candidates,
    candidateCount,
    selectedCandidateId: selectionState.selectedCandidateId,
    editor: selectionState.editor,
  };
}

export function buildBalanceFromClipboard(rawText, options = {}) {
  const { savedPlayerRecords = [], ...optimizerOptions } = options;
  const parsed = parseMatchPlayersFromClipboard(rawText, savedPlayerRecords);

  if (parsed.errors.length > 0) {
    return {
      errors: parsed.errors,
      players: [],
      candidates: [],
      candidateCount: 0,
      selectedCandidateId: null,
      editor: null,
    };
  }

  return buildBalanceFromPlayers(parsed.players, optimizerOptions);
}

export function refreshResultsFromPlayers(candidates, editor, players, options = {}) {
  if (!players.length) {
    return {
      candidates: [],
      candidateCount: 0,
      selectedCandidateId: null,
      editor: null,
    };
  }

  const selectedCandidateId = editor?.candidateId ?? candidates[0]?.id ?? null;
  const { candidates: nextCandidates, candidateCount } = getTopCandidates(players, options);
  const selectionState = getSelectedCandidateState(nextCandidates, players, selectedCandidateId, candidateCount);

  return {
    candidates: nextCandidates,
    candidateCount,
    selectedCandidateId: selectionState.selectedCandidateId,
    editor: selectionState.editor,
  };
}

export function updateMatchPlayerPreferencePoints(matchPlayers, playerId, role, delta) {
  return matchPlayers.map((player) => {
    if (player.id !== playerId) {
      return player;
    }

    return {
      ...player,
      preferencePoints: adjustPreferencePoints(player.preferencePoints, role, delta),
      preferenceSource: PREFERENCE_SOURCES.manual,
    };
  });
}

export function createMatchPlayersFromSavedRecords(savedPlayerRecords) {
  return savedPlayerRecords.map((record, index) => ({
    id: record.id,
    name: record.name,
    sourceRow: index + 2,
    roles: cloneRoleMap(record.roles),
    preferencePoints: resolvePreferencePoints(record, record.preferencePoints, record.preferenceOrder),
    preferenceSource: PREFERENCE_SOURCES.saved,
  }));
}

export function serializeMatchPlayers(players, { includeHeader = true } = {}) {
  const lines = players.map((player) =>
    [player.name, ...ROLE_ORDER.map((role) => player.roles[role].description)].join('\t'),
  );

  if (includeHeader) {
    lines.unshift(EXPECTED_HEADERS.join('\t'));
  }

  return lines.join('\n');
}

export function loadSavedPlayersIntoMatch(savedPlayerRecords) {
  const players = createMatchPlayersFromSavedRecords(savedPlayerRecords).map((player) => ({
    ...player,
    preferencePoints: clonePreferencePoints(player.preferencePoints),
  }));

  return {
    players,
    clipboardText: serializeMatchPlayers(players, { includeHeader: true }),
  };
}

export function getSelectedCandidateState(candidates, players, selectedCandidateId, candidateCount) {
  const selectedCandidate = candidates.find((candidate) => candidate.id === selectedCandidateId) ?? candidates[0] ?? null;

  if (!selectedCandidate) {
    return {
      selectedCandidateId: null,
      candidateCount,
      editor: null,
    };
  }

  return {
    selectedCandidateId: selectedCandidate.id,
    candidateCount,
    editor: createEditableCandidate(selectedCandidate, players),
  };
}

export function selectCandidate(candidates, players, candidateId, candidateCount) {
  return getSelectedCandidateState(candidates, players, candidateId, candidateCount);
}

export function getEditorGuideText(editor) {
  if (!editor) {
    return '';
  }

  if (editor.lastAction === 'selected' && editor.selectedSlotId) {
    const selectedSlot = editor.teams
      .flatMap((team) => team.slots)
      .find((slot) => slot.id === editor.selectedSlotId);

    if (!selectedSlot) {
      return '슬롯 두 개를 차례대로 클릭하면 바로 스왑됩니다.';
    }

    return `${selectedSlot.teamLabel} ${selectedSlot.roleLabel} 슬롯을 선택했습니다. 바꿀 슬롯을 한 번 더 눌러 주세요.`;
  }

  if (editor.lastAction === 'swapped') {
    return '스왑이 적용되었습니다. 다른 슬롯 두 개를 계속 클릭해 바로 조정할 수 있습니다.';
  }

  return '슬롯 두 개를 차례대로 클릭하면 바로 스왑됩니다.';
}

export function applySlotSelection(editor, slotId) {
  if (!editor) {
    return null;
  }

  if (!editor.selectedSlotId) {
    return selectSlot(editor, slotId);
  }

  if (editor.selectedSlotId === slotId) {
    return clearSelectedSlot(editor);
  }

  return swapSlots(editor, editor.selectedSlotId, slotId);
}
