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
  id: string;
  name: string;
  sourceRow: number;
  roles: Record<Role, TierSnapshot>;
}

export interface TeamAssignment {
  playerId: string;
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

export interface TeamSlot {
  id: string;
  teamId: 'A' | 'B';
  teamLabel: string;
  role: Role;
  roleLabel: string;
  roleShortLabel: string;
  slotIndex: number;
  playerId: string;
  playerName: string;
  sourceRow: number;
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
  slots: TeamSlot[];
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

export interface EditableCandidate {
  candidateId: string;
  rank: number;
  selectedSlotId: string | null;
  lastAction: 'idle' | 'selected' | 'swapped';
  playerPool: Record<string, NormalizedPlayer>;
  teams: TeamSummary[];
}
