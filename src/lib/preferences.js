import { ROLE_ORDER, getRoleConfig } from '../config/gameConfig.js';

export const PREFERENCE_SOURCES = {
  default: 'default',
  saved: 'saved',
  manual: 'manual',
};

export function deriveDefaultPreferenceOrder(playerOrRoles) {
  const roles = playerOrRoles?.roles ?? playerOrRoles ?? {};

  return [...ROLE_ORDER].sort((left, right) => {
    const scoreDifference = (roles[right]?.score ?? -1) - (roles[left]?.score ?? -1);

    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    return ROLE_ORDER.indexOf(left) - ROLE_ORDER.indexOf(right);
  });
}

export function normalizePreferenceOrder(preferenceOrder, fallbackOrder = ROLE_ORDER) {
  const nextOrder = [];

  for (const role of preferenceOrder ?? []) {
    if (!ROLE_ORDER.includes(role) || nextOrder.includes(role)) {
      continue;
    }

    nextOrder.push(role);
  }

  for (const role of fallbackOrder ?? []) {
    if (ROLE_ORDER.includes(role) && !nextOrder.includes(role)) {
      nextOrder.push(role);
    }
  }

  for (const role of ROLE_ORDER) {
    if (!nextOrder.includes(role)) {
      nextOrder.push(role);
    }
  }

  return nextOrder.slice(0, ROLE_ORDER.length);
}

export function resolvePreferenceOrder(player, explicitPreferenceOrder) {
  const fallbackOrder = deriveDefaultPreferenceOrder(player);
  return normalizePreferenceOrder(explicitPreferenceOrder ?? player?.preferenceOrder ?? [], fallbackOrder);
}

export function updatePreferenceOrder(preferenceOrder, rankIndex, nextRole, fallbackOrder = ROLE_ORDER) {
  const baseOrder = normalizePreferenceOrder(preferenceOrder, fallbackOrder);
  const normalizedRole = ROLE_ORDER.includes(nextRole) ? nextRole : baseOrder[rankIndex] ?? fallbackOrder[rankIndex];
  const reordered = baseOrder.filter((role) => role !== normalizedRole);

  reordered.splice(rankIndex, 0, normalizedRole);
  return normalizePreferenceOrder(reordered, baseOrder);
}

export function getPreferenceRank(preferenceOrder, role) {
  const order = normalizePreferenceOrder(preferenceOrder);
  const rankIndex = order.indexOf(role);

  return rankIndex >= 0 ? rankIndex + 1 : null;
}

export function getPreferenceLabel(preferenceRank) {
  return preferenceRank ? `${preferenceRank}순위` : '선호 외';
}

export function getPreferenceMeta(preferenceOrder, role) {
  const order = normalizePreferenceOrder(preferenceOrder);
  const preferenceRank = getPreferenceRank(order, role);

  return {
    preferenceOrder: order,
    preferenceRank,
    preferenceLabel: getPreferenceLabel(preferenceRank),
    preferenceFitKey: preferenceRank ? `rank-${preferenceRank}` : 'out-of-order',
  };
}

export function summarizePreferenceRanks(items) {
  const summary = {
    rank1: 0,
    rank2: 0,
    rank3: 0,
    other: 0,
  };

  for (const item of items) {
    if (item.preferenceRank === 1) {
      summary.rank1 += 1;
      continue;
    }

    if (item.preferenceRank === 2) {
      summary.rank2 += 1;
      continue;
    }

    if (item.preferenceRank === 3) {
      summary.rank3 += 1;
      continue;
    }

    summary.other += 1;
  }

  return summary;
}

export function formatPreferenceSummary(preferenceOrder) {
  return normalizePreferenceOrder(preferenceOrder)
    .map((role, index) => `${index + 1}순위 ${getRoleConfig(role).label}`)
    .join(' · ');
}
