export type Role = 'tank' | 'damage' | 'support';

export interface PlayerInput {
  name: string;
  tankTier: string;
  damageTier: string;
  supportTier: string;
  sourceRow: number;
}

export interface TierSnapshot {
  key: string;
  label: string;
  description: string;
  score: number;
  isUnranked: boolean;
  rawValue: string;
}

export interface NormalizedPlayer {
  name: string;
  sourceRow: number;
  roles: Record<Role, TierSnapshot>;
}

export interface TeamAssignment {
  playerName: string;
  sourceRow: number;
  assignedRole: Role;
  roleLabel: string;
  tierKey: string;
  tierLabel: string;
  tierDescription: string;
  score: number;
  isUnranked: boolean;
}

export interface TeamSummary {
  id: 'A' | 'B';
  label: string;
  assignments: TeamAssignment[];
  totalScore: number;
  unrankedCount: number;
}

export interface BalanceResult {
  teams: TeamSummary[];
  scoreDifference: number;
  unrankedDifference: number;
  comparisonKey: string;
  candidateCount: number;
}
