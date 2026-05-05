import { parseClipboard } from './parseClipboard.js';
import { clearSelectedSlot, createEditableCandidate, selectSlot, swapSlots } from './editor.js';
import { getTopCandidates } from './optimizer.js';

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

export function buildBalanceFromClipboard(rawText, options = {}) {
  const parsed = parseClipboard(rawText);

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

  const { candidates, candidateCount } = getTopCandidates(parsed.players, options);
  const selectedCandidateId = candidates[0]?.id ?? null;
  const selectionState = getSelectedCandidateState(candidates, parsed.players, selectedCandidateId, candidateCount);

  return {
    errors: [],
    players: parsed.players,
    candidates,
    candidateCount,
    selectedCandidateId: selectionState.selectedCandidateId,
    editor: selectionState.editor,
  };
}
