import { parseClipboard } from './parseClipboard.js';
import { getTopCandidates } from './optimizer.js';

export function getSelectedCandidateResult(candidates, selectedCandidateId, candidateCount) {
  const selectedCandidate = candidates.find((candidate) => candidate.id === selectedCandidateId) ?? candidates[0] ?? null;

  if (!selectedCandidate) {
    return null;
  }

  return {
    ...selectedCandidate,
    candidateCount,
  };
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
      result: null,
    };
  }

  const { candidates, candidateCount } = getTopCandidates(parsed.players, options);
  const selectedCandidateId = candidates[0]?.id ?? null;

  return {
    errors: [],
    players: parsed.players,
    candidates,
    candidateCount,
    selectedCandidateId,
    result: getSelectedCandidateResult(candidates, selectedCandidateId, candidateCount),
  };
}
