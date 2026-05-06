export type Role = 'tank' | 'damage' | 'support';
export type PreferenceSource = 'default' | 'saved' | 'manual';

export interface PreferencePoints {
  tank: number;
  damage: number;
  support: number;
}

export interface PreferenceFitSummary {
  high: number;
  balanced: number;
  low: number;
  zero: number;
}

export interface CandidatePreferenceSignal {
  totalAssignedPreferencePoints: number;
  tankAssignedPreferencePoints: number;
  highPreferenceAssignments: number;
  balancedPreferenceAssignments: number;
  lowPreferenceAssignments: number;
  zeroPreferenceAssignments: number;
  selectionWeight: number;
}

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

export interface MatchPlayer extends NormalizedPlayer {
  preferencePoints: PreferencePoints;
  preferenceSource: PreferenceSource;
}

export interface SavedPlayerRecord {
  id: string;
  name: string;
  roles: Record<Role, TierSnapshot>;
  preferencePoints: PreferencePoints;
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
  preferencePoints: PreferencePoints;
  assignedPreferencePoints: number;
  preferenceLabel: string;
  preferenceFitKey: string;
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
  preferencePoints: PreferencePoints;
  assignedPreferencePoints: number;
  preferenceLabel: string;
  preferenceFitKey: string;
}

export interface TeamSummary {
  id: 'A' | 'B';
  label: string;
  assignments: TeamAssignment[];
  slots: TeamSlot[];
  totalScore: number;
  unrankedCount: number;
  roleTotals: Record<Role, number>;
  preferenceSummary: PreferenceFitSummary;
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
  preferenceSummary: PreferenceFitSummary;
  preferenceSignal: CandidatePreferenceSignal;
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
  playerPool: Record<string, MatchPlayer>;
  teams: TeamSummary[];
}
