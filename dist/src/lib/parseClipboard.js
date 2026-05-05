import { EXPECTED_HEADERS, MAX_PLAYERS, ROLE_ORDER, normalizeTier } from '../config/gameConfig.js';
import { normalizePlayerId } from './playerIdentity.js';

const ROLE_HEADER_MAP = {
  tank: '탱커 티어',
  damage: '딜러 티어',
  support: '힐러 티어',
};
const HEADER_COLUMN_INDEX = {
  '유저 이름': 0,
  '탱커 티어': 1,
  '딜러 티어': 2,
  '힐러 티어': 3,
};

function splitClipboardLine(line) {
  return line.split('\t').map((cell) => cell.trim());
}

function normalizePlayerName(name) {
  return normalizePlayerId(name);
}

function buildTierSnapshot(rawValue) {
  const normalizedTier = normalizeTier(rawValue);

  if (!normalizedTier) {
    return null;
  }

  return {
    key: normalizedTier.key,
    label: normalizedTier.label,
    description: normalizedTier.description,
    score: normalizedTier.score,
    isUnranked: normalizedTier.key === 'unranked',
    rawValue,
  };
}

function isCanonicalHeaderRow(cells) {
  return EXPECTED_HEADERS.every((header, index) => cells[index] === header);
}

export function parseClipboard(rawText) {
  const text = rawText.replace(/\ufeff/g, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n');

  while (lines.length > 0 && !lines[lines.length - 1].trim()) {
    lines.pop();
  }

  const firstContentLineIndex = lines.findIndex((line) => line.trim());

  if (firstContentLineIndex < 0) {
    return {
      errors: ['복사한 표를 붙여넣어 주세요.'],
      players: [],
      headers: [],
    };
  }

  const rows = lines
    .map((line, index) => ({
      line,
      rowNumber: index + 1,
    }))
    .slice(firstContentLineIndex);
  const firstRowCells = splitClipboardLine(rows[0].line);
  const hasHeader = isCanonicalHeaderRow(firstRowCells);
  const headers = hasHeader ? firstRowCells : [];
  const dataRows = rows.slice(hasHeader ? 1 : 0).filter((row) => row.line.trim());
  const errors = [];

  if (dataRows.length !== MAX_PLAYERS) {
    errors.push(`플레이어는 정확히 ${MAX_PLAYERS}명이어야 합니다. 현재 ${dataRows.length}명입니다.`);
  }

  const players = dataRows.map((row, index) => {
    const rowNumber = hasHeader ? row.rowNumber : index + 1;
    const cells = splitClipboardLine(row.line);
    const name = cells[HEADER_COLUMN_INDEX['유저 이름']] ?? '';
    const player = {
      id: normalizePlayerName(name),
      name,
      sourceRow: rowNumber,
      roles: {
        tank: null,
        damage: null,
        support: null,
      },
    };

    if (!name) {
      errors.push(`${rowNumber}행: 유저 이름이 비어 있습니다.`);
    }

    for (const role of ROLE_ORDER) {
      const headerName = ROLE_HEADER_MAP[role];
      const rawTier = cells[HEADER_COLUMN_INDEX[headerName]] ?? '';

      if (!rawTier) {
        errors.push(`${rowNumber}행: ${headerName} 값이 비어 있습니다.`);
        continue;
      }

      const tierSnapshot = buildTierSnapshot(rawTier);

      if (!tierSnapshot) {
        errors.push(`${rowNumber}행: \`${rawTier}\` 는 지원하지 않는 티어 표기입니다.`);
        continue;
      }

      player.roles[role] = tierSnapshot;
    }

    return player;
  });

  const seenNames = new Map();

  for (const player of players) {
    if (!player.name) {
      continue;
    }

    const normalizedName = normalizePlayerName(player.name);
    const firstSeenRow = seenNames.get(normalizedName);

    if (firstSeenRow) {
      errors.push(`${player.sourceRow}행: \`${player.name}\` 이름이 중복되었습니다. (${firstSeenRow}행과 중복)`);
      continue;
    }

    seenNames.set(normalizedName, player.sourceRow);
  }

  if (errors.length > 0) {
    return {
      errors,
      players: [],
      headers,
    };
  }

  return {
    errors: [],
    players,
    headers,
  };
}
