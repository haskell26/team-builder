import { ROLE_ORDER } from '../config/gameConfig.js';
import { normalizePlayerId } from './playerIdentity.js';
import { normalizePreferencePoints, resolvePreferencePoints } from './preferences.js';

export const PLAYER_STORE_KEY = 'team-builder.saved-players.v2';
export const LEGACY_PLAYER_STORE_KEY = 'team-builder.saved-players.v1';
export const PLAYER_STORE_VERSION = 2;

function getDefaultStorage() {
  try {
    return globalThis.localStorage ?? globalThis.window?.localStorage ?? null;
  } catch {
    return null;
  }
}

function cloneTierSnapshot(tier) {
  return {
    key: tier.key,
    label: tier.label,
    description: tier.description,
    score: tier.score,
    isUnranked: Boolean(tier.isUnranked ?? tier.key === 'unranked'),
    rawValue: tier.rawValue ?? tier.description,
  };
}

function cloneRoleMap(roles) {
  return ROLE_ORDER.reduce((nextRoles, role) => {
    if (!roles?.[role]) {
      return nextRoles;
    }

    nextRoles[role] = cloneTierSnapshot(roles[role]);
    return nextRoles;
  }, {});
}

function parseStorePayload(rawValue) {
  const parsed = JSON.parse(rawValue);
  const rawRecords = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.players) ? parsed.players : [];

  return {
    parsed,
    rawRecords,
  };
}

function normalizeSavedPlayerRecord(record) {
  const name = `${record?.name ?? ''}`.trim();

  if (!name) {
    return null;
  }

  const roles = cloneRoleMap(record.roles);

  if (ROLE_ORDER.some((role) => !roles[role])) {
    return null;
  }

  return {
    id: normalizePlayerId(name),
    name,
    roles,
    preferencePoints: resolvePreferencePoints(record, record.preferencePoints, record.preferenceOrder),
  };
}

function toSerializableRecord(record) {
  return {
    id: record.id ?? normalizePlayerId(record.name),
    name: record.name,
    roles: cloneRoleMap(record.roles),
    preferencePoints: normalizePreferencePoints(record.preferencePoints),
  };
}

function sortRecords(records) {
  return [...records].sort((left, right) => left.name.localeCompare(right.name, 'ko'));
}

function buildStorageUnavailableResult(warning) {
  return {
    records: [],
    storageAvailable: false,
    warning,
  };
}

function persistRecords(records, storage) {
  if (records.length === 0) {
    return clearSavedPlayerStore(storage);
  }

  return savePlayerStore(records, storage);
}

export function createSavedPlayerRecord(player) {
  return normalizeSavedPlayerRecord({
    id: normalizePlayerId(player.name),
    name: player.name,
    roles: player.roles,
    preferencePoints: resolvePreferencePoints(player),
  });
}

export function upsertSavedPlayerRecords(existingRecords, players) {
  const recordMap = new Map(existingRecords.map((record) => [record.id, toSerializableRecord(record)]));

  for (const player of players) {
    const record = createSavedPlayerRecord(player);

    if (!record) {
      continue;
    }

    recordMap.set(record.id, record);
  }

  return sortRecords([...recordMap.values()].map((record) => normalizeSavedPlayerRecord(record)).filter(Boolean));
}

export function loadPlayerStore(storage = getDefaultStorage()) {
  if (!storage || typeof storage.getItem !== 'function') {
    return buildStorageUnavailableResult('이 환경에서는 저장된 플레이어 기능을 사용할 수 없습니다.');
  }

  let latestRawValue = null;
  let legacyRawValue = null;

  try {
    latestRawValue = storage.getItem(PLAYER_STORE_KEY);
    legacyRawValue = storage.getItem(LEGACY_PLAYER_STORE_KEY);
  } catch {
    return buildStorageUnavailableResult('브라우저 저장소에 접근할 수 없어 저장된 플레이어를 불러오지 못했습니다.');
  }

  const loadTargets = [
    {
      key: PLAYER_STORE_KEY,
      rawValue: latestRawValue,
      isLegacy: false,
    },
    {
      key: LEGACY_PLAYER_STORE_KEY,
      rawValue: legacyRawValue,
      isLegacy: true,
    },
  ];
  let sawUnreadablePayload = false;

  for (const target of loadTargets) {
    if (!target.rawValue) {
      continue;
    }

    try {
      const { parsed, rawRecords } = parseStorePayload(target.rawValue);
      const records = sortRecords(rawRecords.map(normalizeSavedPlayerRecord).filter(Boolean));
      const usedLegacyFormat =
        target.isLegacy ||
        parsed?.version !== PLAYER_STORE_VERSION ||
        rawRecords.some((record) => Array.isArray(record?.preferenceOrder));

      return {
        records,
        storageAvailable: true,
        warning: usedLegacyFormat
          ? '예전 형식의 저장 데이터를 읽었습니다. 다시 저장하거나 삭제하면 최신 6점 선호 형식으로 정리됩니다.'
          : '',
      };
    } catch {
      sawUnreadablePayload = true;
    }
  }

  if (sawUnreadablePayload) {
    return {
      records: [],
      storageAvailable: true,
      warning: '저장된 플레이어 데이터를 읽지 못해 비운 상태로 시작했습니다.',
    };
  }

  return {
    records: [],
    storageAvailable: true,
    warning: '',
  };
}

export function savePlayerStore(records, storage = getDefaultStorage()) {
  if (!storage || typeof storage.setItem !== 'function') {
    return {
      success: false,
      storageAvailable: false,
      warning: '이 환경에서는 저장된 플레이어 기능을 사용할 수 없습니다.',
    };
  }

  const serializableRecords = sortRecords(records.map(toSerializableRecord));

  try {
    storage.setItem(
      PLAYER_STORE_KEY,
      JSON.stringify({
        version: PLAYER_STORE_VERSION,
        players: serializableRecords,
      }),
    );

    if (typeof storage.removeItem === 'function') {
      storage.removeItem(LEGACY_PLAYER_STORE_KEY);
    }

    return {
      success: true,
      storageAvailable: true,
      warning: '',
    };
  } catch {
    return {
      success: false,
      storageAvailable: false,
      warning: '브라우저 저장소에 저장하지 못했습니다.',
    };
  }
}

export function saveCurrentPlayersToStore(existingRecords, players, storage = getDefaultStorage()) {
  const records = upsertSavedPlayerRecords(existingRecords, players);
  const persistence = savePlayerStore(records, storage);

  return {
    records,
    success: persistence.success,
    storageAvailable: persistence.storageAvailable,
    warning: persistence.warning,
  };
}

export function deleteSavedPlayerRecord(existingRecords, playerId, storage = getDefaultStorage()) {
  const records = sortRecords(existingRecords.filter((record) => record.id !== playerId));
  const persistence = persistRecords(records, storage);

  return {
    records,
    success: persistence.success,
    storageAvailable: persistence.storageAvailable,
    warning: persistence.warning,
  };
}

export function clearSavedPlayerStore(storage = getDefaultStorage()) {
  if (!storage || typeof storage.removeItem !== 'function') {
    return {
      success: false,
      storageAvailable: false,
      warning: '이 환경에서는 저장된 플레이어 기능을 사용할 수 없습니다.',
    };
  }

  try {
    storage.removeItem(PLAYER_STORE_KEY);
    storage.removeItem(LEGACY_PLAYER_STORE_KEY);

    return {
      success: true,
      storageAvailable: true,
      warning: '',
    };
  } catch {
    return {
      success: false,
      storageAvailable: false,
      warning: '브라우저 저장소에서 저장된 플레이어를 삭제하지 못했습니다.',
    };
  }
}
