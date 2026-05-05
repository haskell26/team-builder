import { parseClipboard } from './parseClipboard.js';
import { optimizeTeams } from './optimizer.js';

export function buildBalanceFromClipboard(rawText) {
  const parsed = parseClipboard(rawText);

  if (parsed.errors.length > 0) {
    return {
      errors: parsed.errors,
      players: [],
      result: null,
    };
  }

  return {
    errors: [],
    players: parsed.players,
    result: optimizeTeams(parsed.players),
  };
}
