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
  roleTotals: Record<Role, number>;
}

export interface BalanceCandidate {
  id: string;
  candidateKey: string;
  comparisonKey: string;
  rank: number;
  teams: TeamSummary[];
  scoreDifference: number;
  roleScoreDifferences: Record<Role, number>;
  roleScoreDifferenceSum: number;
  tankScoreDifference: number;
  unrankedDifference: number;
}

export interface BalanceResult extends BalanceCandidate {
  candidateCount: number;
  displayedCandidateCount: number;
  candidates: BalanceCandidate[];
}
