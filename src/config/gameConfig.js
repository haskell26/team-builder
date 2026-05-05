export const MAX_PLAYERS = 10;
export const TEAM_SIZE = 5;
export const EXPECTED_HEADERS = ['유저 이름', '탱커 티어', '딜러 티어', '힐러 티어'];

export const ROLE_ORDER = ['tank', 'damage', 'support'];

export const ROLE_CONFIG = {
  tank: {
    key: 'tank',
    label: '탱커',
    shortLabel: 'TANK',
    accentClass: 'role-badge-tank',
  },
  damage: {
    key: 'damage',
    label: '딜러',
    shortLabel: 'DPS',
    accentClass: 'role-badge-damage',
  },
  support: {
    key: 'support',
    label: '힐러',
    shortLabel: 'SUP',
    accentClass: 'role-badge-support',
  },
};

export const TIER_DEFINITIONS = [
  {
    key: 'unranked',
    label: 'U',
    description: '언랭',
    score: 0,
    aliases: ['u', 'unranked', '언랭', '언랭크', '미배치', '배치전'],
  },
  {
    key: 'bronze',
    label: '브론즈',
    description: '브론즈',
    score: 1,
    aliases: ['bronze', '브론즈'],
  },
  {
    key: 'silver',
    label: '실버',
    description: '실버',
    score: 2,
    aliases: ['silver', '실버'],
  },
  {
    key: 'gold',
    label: '골드',
    description: '골드',
    score: 3,
    aliases: ['gold', '골드'],
  },
  {
    key: 'platinum',
    label: '플래티넘',
    description: '플래티넘',
    score: 4,
    aliases: ['platinum', 'plat', '플래티넘', '플래'],
  },
  {
    key: 'diamond',
    label: '다이아',
    description: '다이아',
    score: 5,
    aliases: ['diamond', 'dia', '다이아'],
  },
  {
    key: 'master',
    label: '마스터',
    description: '마스터',
    score: 6,
    aliases: ['master', '마스터'],
  },
  {
    key: 'grandmaster',
    label: '그랜드마스터',
    description: '그랜드마스터',
    score: 7,
    aliases: ['grandmaster', 'gm', '그랜드마스터', '그마'],
  },
];

function sanitizeTierAlias(value) {
  return value.trim().toLowerCase().replace(/[\s_.-]+/g, '');
}

export const TIER_LOOKUP = TIER_DEFINITIONS.reduce((lookup, tier) => {
  lookup.set(sanitizeTierAlias(tier.label), tier);
  lookup.set(sanitizeTierAlias(tier.description), tier);

  for (const alias of tier.aliases) {
    lookup.set(sanitizeTierAlias(alias), tier);
  }

  return lookup;
}, new Map());

export function getRoleConfig(role) {
  return ROLE_CONFIG[role];
}

export function normalizeTier(rawValue) {
  if (!rawValue || !rawValue.trim()) {
    return null;
  }

  return TIER_LOOKUP.get(sanitizeTierAlias(rawValue)) ?? null;
}

export function isUnrankedTier(tierKey) {
  return tierKey === 'unranked';
}

export function formatScore(score) {
  return `${score}점`;
}

export function getTierGuideRows() {
  return TIER_DEFINITIONS.map((tier) => ({
    label: tier.description === '언랭' ? 'U / 언랭' : tier.description,
    score: formatScore(tier.score),
  }));
}
