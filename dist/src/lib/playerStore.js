import { ROLE_ORDER } from '../config/gameConfig.js';
import { normalizePlayerId } from './playerIdentity.js';
import { normalizePreferenceOrder, resolvePreferenceOrder } from './preferences.js';

export const PLAYER_STORE_KEY = 'team-builder.saved-players.v1';
export const PLAYER_STORE_VERSION = 1;

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
    preferenceOrder: normalizePreferenceOrder(record.preferenceOrder, resolvePreferenceOrder({ roles })),
  };
}

function toSerializableRecord(record) {
  return {
    id: record.id ?? normalizePlayerId(record.name),
    name: record.name,
    roles: cloneRoleMap(record.roles),
    preferenceOrder: normalizePreferenceOrder(record.preferenceOrder, resolvePreferenceOrder(record)),
  };
}

function sortRecords(records) {
  return [...records].sort((left, right) => left.name.localeCompare(right.name, 'ko'));
}

export function createSavedPlayerRecord(player) {
  return normalizeSavedPlayerRecord({
    id: normalizePlayerId(player.name),
    name: player.name,
    roles: player.roles,
    preferenceOrder: resolvePreferenceOrder(player),
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
    return {
      records: [],
      storageAvailable: false,
      warning: '이 환경에서는 저장된 플레이어 기능을 사용할 수 없습니다.',
    };
  }

  let rawValue = null;

  try {
    rawValue = storage.getItem(PLAYER_STORE_KEY);
  } catch {
    return {
      records: [],
      storageAvailable: false,
      warning: '브라우저 저장소에 접근할 수 없어 저장된 플레이어를 불러오지 못했습니다.',
    };
  }

  if (!rawValue) {
    return {
      records: [],
      storageAvailable: true,
      warning: '',
    };
  }

  try {
    const parsed = JSON.parse(rawValue);
    const rawRecords = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.players) ? parsed.players : [];
    const records = sortRecords(rawRecords.map(normalizeSavedPlayerRecord).filter(Boolean));
    const warning =
      parsed?.version && parsed.version !== PLAYER_STORE_VERSION
        ? '예전 형식의 저장 데이터를 읽었습니다. 다시 저장하면 최신 형식으로 정리됩니다.'
        : '';

    return {
      records,
      storageAvailable: true,
      warning,
    };
  } catch {
    return {
      records: [],
      storageAvailable: true,
      warning: '저장된 플레이어 데이터를 읽지 못해 비운 상태로 시작했습니다.',
    };
  }
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
