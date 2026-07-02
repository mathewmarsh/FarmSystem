// Core data model for The Clipboard Prototype.
// This is deliberately small: three eval tracks, one directive, one staff
// member, one team. Everything here is a subset of the fuller design --
// nothing here should have to be thrown away when the game grows, only
// extended.

export type PlayerRole = "priority_prospect" | "regular" | "veteran" | "bench";

export interface Player {
  id: string;
  name: string;
  position: string;
  role: PlayerRole;
  isPitcher: boolean;
  bat: number; // 0-100, hitters
  defense: number; // 0-100, hitters
  pitch?: number; // 0-100, pitchers
  stamina?: number; // 0-100, pitchers
  fatigue: number; // 0-100, higher = more tired
  morale: number; // 0-100
  development: number; // 0-100, hidden growth progress (prospects mainly)
}

export interface Team {
  name: string;
  parentOrg: string;
  level: string;
  roster: Player[];
}

export interface Opponent {
  name: string;
  strength: number; // 0-100 baseline team strength
}

export type StaffStyle = "development_first" | "win_now" | "balanced";

export interface StaffMember {
  id: string;
  name: string;
  role: "assistant_manager";
  style: StaffStyle;
  strength: string;
  weakness: string;
}

export type DirectivePriority = "low" | "medium" | "high";

export interface Directive {
  id: string;
  title: string;
  description: string;
  reason: string;
  risk: string;
  playerId: string;
  requiredStarts: number;
  gamesRemaining: number;
  startsSoFar: number;
  priority: DirectivePriority;
}

// ---- Decision Ledger -------------------------------------------------
// Single source of truth for consequences. Mastery XP, the trust
// dashboard, and "The Book on You" reputation labels are all *derived
// views* computed from this one log -- not three systems kept in sync by
// hand. Only 3 of the 7 mastery tracks and all 5 identity axes are
// actually populated by this slice's content; the rest exist so the type
// doesn't need to change when the game grows.

export type MasteryTrack =
  | "player_development"
  | "health_management"
  | "organizational_trust"
  | "winning"
  | "clubhouse_culture"
  | "communication"
  | "promotion_readiness";

export type IdentityAxis =
  | "player_advocacy"
  | "org_alignment"
  | "health_stewardship"
  | "competitive_drive"
  | "clubhouse_authority";

export type Audience = "front_office" | "players" | "specific_player" | "staff" | "media" | "fans" | "agents";

export type DecisionTag =
  | "injury_risk"
  | "org_directive"
  | "priority_prospect"
  | "veteran_playing_time"
  | "discipline"
  | "lineup"
  | "fatigue"
  | "development"
  | "winning_now"
  | "communication"
  | "delegation";

export interface AxisDelta {
  axis: IdentityAxis;
  amount: number;
}

export interface XpDelta {
  track: MasteryTrack;
  amount: number;
  reason: string;
}

export interface RelationshipDelta {
  targetId: string;
  targetName: string;
  audience: Audience;
  trustDelta?: number;
  respectDelta?: number;
  moraleDelta?: number;
  note: string;
}

export interface DecisionLedgerEntry {
  id: string;
  date: string;
  seasonDay: number;
  situationId: string;
  situationTitle: string;
  situationText: string;
  choiceId: string;
  choiceText: string;
  tags: DecisionTag[];
  axisDeltas: AxisDelta[];
  xpDeltas: XpDelta[];
  relationshipDeltas: RelationshipDelta[];
  visibleSummary: string;
  privateNotes: string[];
  sourceRule: string;
  simVersion: string;
  createdAt: string;
}

export interface GameResult {
  gameNumber: number;
  opponent: string;
  result: "W" | "L";
  runsFor: number;
  runsAgainst: number;
  notes: string[];
}

export type LineupChoiceId = "A" | "B" | "C" | "D";

export type DaySituation = "alvarez_reps" | "injury_pitcher";

export interface ScheduledDay {
  dayLabel: string; // e.g. "May 7"
  opponent: Opponent | null; // null = off day
  scenario?: DaySituation; // defaults to "alvarez_reps" on game days
}
