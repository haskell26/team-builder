import { ROLE_ORDER, getRoleConfig } from '../config/gameConfig.js';

export const PREFERENCE_SOURCES = {
  default: 'default',
  saved: 'saved',
  manual: 'manual',
};

export const PREFERENCE_POINT_TOTAL = 6;
export const DEFAULT_PREFERENCE_POINTS = Object.freeze({
  tank: 2,
  damage: 2,
  support: 2,
});

function hasExplicitPointValue(preferencePoints) {
  return ROLE_ORDER.some((role) => preferencePoints?.[role] !== undefined && preferencePoints?.[role] !== null);
}

function sanitizePreferencePointValue(value, fallback = 0) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return Math.max(0, Math.trunc(fallback));
  }

  return Math.max(0, Math.trunc(numericValue));
}

function rebalancePreferencePointSubset(points, roles, total) {
  const nextPoints = {
    ...points,
  };
  let currentTotal = roles.reduce((sum, role) => sum + nextPoints[role], 0);

  while (currentTotal > total) {
    const roleToReduce = [...roles]
      .sort(
        (left, right) =>
          nextPoints[right] - nextPoints[left] || ROLE_ORDER.indexOf(left) - ROLE_ORDER.indexOf(right),
      )
      .find((role) => nextPoints[role] > 0);

    if (!roleToReduce) {
      break;
    }

    nextPoints[roleToReduce] -= 1;
    currentTotal -= 1;
  }

  while (currentTotal < total) {
    const roleToIncrease = [...roles].sort(
      (left, right) => nextPoints[left] - nextPoints[right] || ROLE_ORDER.indexOf(left) - ROLE_ORDER.indexOf(right),
    )[0];

    nextPoints[roleToIncrease] += 1;
    currentTotal += 1;
  }

  return nextPoints;
}

function normalizeLegacyPreferenceOrder(preferenceOrder) {
  const nextOrder = [];

  for (const role of preferenceOrder ?? []) {
    if (!ROLE_ORDER.includes(role) || nextOrder.includes(role)) {
      continue;
    }

    nextOrder.push(role);
  }

  for (const role of ROLE_ORDER) {
    if (!nextOrder.includes(role)) {
      nextOrder.push(role);
    }
  }

  return nextOrder.slice(0, ROLE_ORDER.length);
}

function getPreferenceFitBucket(assignedPreferencePoints) {
  if (assignedPreferencePoints >= 3) {
    return 'high';
  }

  if (assignedPreferencePoints === 2) {
    return 'balanced';
  }

  if (assignedPreferencePoints === 1) {
    return 'low';
  }

  return 'zero';
}

export function createDefaultPreferencePoints() {
  return {
    tank: DEFAULT_PREFERENCE_POINTS.tank,
    damage: DEFAULT_PREFERENCE_POINTS.damage,
    support: DEFAULT_PREFERENCE_POINTS.support,
  };
}

export function normalizePreferencePoints(preferencePoints, fallbackPoints = DEFAULT_PREFERENCE_POINTS) {
  const useExplicitPoints = hasExplicitPointValue(preferencePoints);

  const nextPoints = ROLE_ORDER.reduce((points, role) => {
    const fallbackValue = useExplicitPoints
      ? 0
      : sanitizePreferencePointValue(fallbackPoints?.[role], DEFAULT_PREFERENCE_POINTS[role]);

    points[role] = sanitizePreferencePointValue(preferencePoints?.[role], fallbackValue);
    return points;
  }, {});

  return rebalancePreferencePointSubset(nextPoints, ROLE_ORDER, PREFERENCE_POINT_TOTAL);
}

export function clonePreferencePoints(preferencePoints) {
  return normalizePreferencePoints(preferencePoints);
}

export function migratePreferenceOrderToPoints(preferenceOrder) {
  if (!Array.isArray(preferenceOrder) || preferenceOrder.length === 0) {
    return createDefaultPreferencePoints();
  }

  const normalizedOrder = normalizeLegacyPreferenceOrder(preferenceOrder);
  const migratedPoints = ROLE_ORDER.reduce((points, role) => {
    points[role] = 0;
    return points;
  }, {});

  migratedPoints[normalizedOrder[0]] = 3;
  migratedPoints[normalizedOrder[1]] = 2;
  migratedPoints[normalizedOrder[2]] = 1;

  return migratedPoints;
}

export function resolvePreferencePoints(player, explicitPreferencePoints, legacyPreferenceOrder) {
  if (hasExplicitPointValue(explicitPreferencePoints)) {
    return normalizePreferencePoints(explicitPreferencePoints);
  }

  if (hasExplicitPointValue(player?.preferencePoints)) {
    return normalizePreferencePoints(player.preferencePoints);
  }

  const orderToMigrate = legacyPreferenceOrder ?? player?.preferenceOrder;

  if (Array.isArray(orderToMigrate) && orderToMigrate.length > 0) {
    return migratePreferenceOrderToPoints(orderToMigrate);
  }

  return createDefaultPreferencePoints();
}

export function setPreferencePointsValue(preferencePoints, role, nextValue) {
  const normalizedRole = ROLE_ORDER.includes(role) ? role : ROLE_ORDER[0];
  const basePoints = normalizePreferencePoints(preferencePoints);
  const clampedValue = Math.min(PREFERENCE_POINT_TOTAL, sanitizePreferencePointValue(nextValue));
  const otherRoles = ROLE_ORDER.filter((currentRole) => currentRole !== normalizedRole);
  const nextPoints = {
    ...basePoints,
    [normalizedRole]: clampedValue,
  };
  const rebalanced = rebalancePreferencePointSubset(
    nextPoints,
    otherRoles,
    PREFERENCE_POINT_TOTAL - clampedValue,
  );

  return normalizePreferencePoints(rebalanced, basePoints);
}

export function adjustPreferencePoints(preferencePoints, role, delta) {
  const basePoints = normalizePreferencePoints(preferencePoints);
  return setPreferencePointsValue(basePoints, role, basePoints[role] + delta);
}

export function getPreferenceMeta(preferencePoints, role) {
  const normalizedPoints = normalizePreferencePoints(preferencePoints);
  const assignedPreferencePoints = normalizedPoints[role] ?? 0;

  return {
    preferencePoints: normalizedPoints,
    assignedPreferencePoints,
    preferenceLabel: `선호 ${assignedPreferencePoints}점`,
    preferenceFitKey: `points-${assignedPreferencePoints}`,
    preferenceFitBucket: getPreferenceFitBucket(assignedPreferencePoints),
  };
}

export function summarizePreferenceFits(items) {
  const summary = {
    high: 0,
    balanced: 0,
    low: 0,
    zero: 0,
  };

  for (const item of items) {
    const bucket = getPreferenceFitBucket(item.assignedPreferencePoints ?? 0);
    summary[bucket] += 1;
  }

  return summary;
}

export function formatPreferencePointsSummary(preferencePoints) {
  const normalizedPoints = normalizePreferencePoints(preferencePoints);

  return ROLE_ORDER.map((role) => `${getRoleConfig(role).shortLabel} ${normalizedPoints[role]}점`).join(' · ');
}
