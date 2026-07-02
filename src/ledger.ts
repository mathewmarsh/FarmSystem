// Every derived view of the manager's career reads from the same array
// of DecisionLedgerEntry. Nothing here holds its own independent state --
// that's the whole point. Mastery XP, "The Book on You" labels, and the
// relationship trust dashboard are three lenses on one log, not three
// systems that can drift out of sync.

import type { DecisionLedgerEntry, IdentityAxis, MasteryTrack } from "./types.js";

let ledgerCounter = 0;
export function nextLedgerId(): string {
  ledgerCounter += 1;
  return `ledger_${String(ledgerCounter).padStart(3, "0")}`;
}

// ---- View 1: Mastery XP ------------------------------------------------

export function computeMasteryXp(entries: DecisionLedgerEntry[]): Partial<Record<MasteryTrack, number>> {
  const totals: Partial<Record<MasteryTrack, number>> = {};
  for (const entry of entries) {
    for (const delta of entry.xpDeltas) {
      totals[delta.track] = (totals[delta.track] ?? 0) + delta.amount;
    }
  }
  return totals;
}

export interface ReasonGroup {
  reason: string;
  amount: number; // total contributed by this reason across every occurrence
  count: number;
}

// Groups identical reason strings within a track so a five-day week
// doesn't print "High-leverage at-bats..." three times in a row. Sorted
// positive-first so a good week reads as good before the caveats show up.
export function groupedReasonsByTrack(entries: DecisionLedgerEntry[]): Partial<Record<MasteryTrack, ReasonGroup[]>> {
  const byTrack: Partial<Record<MasteryTrack, Map<string, ReasonGroup>>> = {};
  for (const entry of entries) {
    for (const delta of entry.xpDeltas) {
      const map = byTrack[delta.track] ?? new Map<string, ReasonGroup>();
      const existing = map.get(delta.reason);
      if (existing) {
        existing.count += 1;
        existing.amount += delta.amount;
      } else {
        map.set(delta.reason, { reason: delta.reason, amount: delta.amount, count: 1 });
      }
      byTrack[delta.track] = map;
    }
  }
  const result: Partial<Record<MasteryTrack, ReasonGroup[]>> = {};
  for (const track of Object.keys(byTrack) as MasteryTrack[]) {
    result[track] = [...byTrack[track]!.values()].sort((a, b) => b.amount - a.amount);
  }
  return result;
}

// ---- View 2: The Book on You -------------------------------------------

export function computeIdentityAxes(entries: DecisionLedgerEntry[]): Partial<Record<IdentityAxis, number>> {
  const totals: Partial<Record<IdentityAxis, number>> = {};
  for (const entry of entries) {
    for (const delta of entry.axisDeltas) {
      totals[delta.axis] = (totals[delta.axis] ?? 0) + delta.amount;
    }
  }
  return totals;
}

// Prototype thresholds only -- meant to be tuned once real playtests
// exist. Public-facing labels stay professional on purpose (see the
// design note on avoiding good/evil framing): no label here should read
// as an accusation.
export function deriveBookLabels(axisTotals: Partial<Record<IdentityAxis, number>>): string[] {
  const labels: string[] = [];
  const get = (a: IdentityAxis) => axisTotals[a] ?? 0;

  if (get("player_advocacy") >= 6 && get("org_alignment") >= 6 && get("health_stewardship") >= 6) {
    labels.push("Balanced Builder");
  }
  if (get("player_advocacy") >= 10) labels.push("Player Advocate");
  if (get("org_alignment") >= 10) labels.push("Organization Soldier");
  if (get("health_stewardship") >= 10) labels.push("Health Steward");
  if (get("competitive_drive") >= 10) labels.push("Win-Now Operator");
  if (get("clubhouse_authority") >= 10) labels.push("Standards Setter");
  if (get("org_alignment") >= 12 && get("player_advocacy") <= -4) labels.push("Company Man");
  if (get("competitive_drive") >= 10 && get("health_stewardship") <= -5) labels.push("Reckless Competitor");

  if (labels.length === 0) labels.push("Still Finding His Footing");
  return labels;
}

const EARLY_READ_PHRASES: Record<IdentityAxis, string> = {
  player_advocacy: "Player-first instincts are showing.",
  org_alignment: "Organization-first instincts are showing.",
  health_stewardship: "Health-conscious, process-oriented instincts are showing.",
  competitive_drive: "Competitive instincts are showing.",
  clubhouse_authority: "Standards-first instincts are showing.",
};

// A softer signal than a full reputation label -- meant to be shown when
// no formal label has fired yet but a pattern is already visible. Muted on
// purpose: this reads a lean, not a verdict.
export function deriveEarlyRead(axisTotals: Partial<Record<IdentityAxis, number>>): string | null {
  const entries = Object.entries(axisTotals) as [IdentityAxis, number][];
  if (entries.length === 0) return null;
  const [topAxis, topValue] = entries.reduce((best, cur) => (Math.abs(cur[1]) > Math.abs(best[1]) ? cur : best));
  if (Math.abs(topValue) < 4) return null; // too faint to call yet
  return EARLY_READ_PHRASES[topAxis];
}

// ---- View 3: Relationship trust dashboard ------------------------------

export interface RelationshipSummary {
  targetId: string;
  targetName: string;
  audience: string;
  trust: number;
  respect: number;
  morale: number;
  recentNotes: string[];
}

export function computeRelationshipTrust(entries: DecisionLedgerEntry[]): RelationshipSummary[] {
  const byTarget = new Map<string, RelationshipSummary>();
  for (const entry of entries) {
    for (const delta of entry.relationshipDeltas) {
      const existing = byTarget.get(delta.targetId) ?? {
        targetId: delta.targetId,
        targetName: delta.targetName,
        audience: delta.audience,
        trust: 0,
        respect: 0,
        morale: 0,
        recentNotes: [],
      };
      existing.trust += delta.trustDelta ?? 0;
      existing.respect += delta.respectDelta ?? 0;
      existing.morale += delta.moraleDelta ?? 0;
      existing.recentNotes.push(delta.note);
      byTarget.set(delta.targetId, existing);
    }
  }
  return [...byTarget.values()];
}
