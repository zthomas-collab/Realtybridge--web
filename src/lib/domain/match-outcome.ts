import type { Match, MatchOutcome } from "@/lib/types";

export type OutcomeState =
  | { kind: "closed"; outcome: MatchOutcome; byAdmin: boolean }
  | { kind: "awaiting_both" }
  | { kind: "awaiting_you"; theirs: MatchOutcome }
  | { kind: "awaiting_them"; yours: MatchOutcome }
  | { kind: "disputed"; yours: MatchOutcome; theirs: MatchOutcome };

/**
 * Where a match stands from one party's point of view. Mirrors report_match_outcome in SQL:
 * a match only closes when investor and realtor report the same outcome (or an admin resolves it).
 */
export function outcomeState(m: Match, viewerId: string): OutcomeState {
  if (m.status !== "active") return { kind: "closed", outcome: m.status === "completed" ? "sold" : "cancelled", byAdmin: m.resolved_by_admin };
  const isInvestor = viewerId === m.investor_id;
  const yours = isInvestor ? m.investor_outcome : m.realtor_outcome;
  const theirs = isInvestor ? m.realtor_outcome : m.investor_outcome;
  if (!yours && !theirs) return { kind: "awaiting_both" };
  if (!yours && theirs) return { kind: "awaiting_you", theirs };
  if (!yours) return { kind: "awaiting_both" };
  if (!theirs) return { kind: "awaiting_them", yours };
  return { kind: "disputed", yours, theirs };
}

/** Applies one party's report. Returns the updated match; closes it when both sides agree. */
export function applyOutcomeReport(m: Match, reporterId: string, outcome: MatchOutcome, now: string): Match {
  const next: Match =
    reporterId === m.investor_id
      ? { ...m, investor_outcome: outcome, investor_reported_at: now }
      : { ...m, realtor_outcome: outcome, realtor_reported_at: now };
  if (next.investor_outcome && next.investor_outcome === next.realtor_outcome) {
    return { ...next, status: outcome === "sold" ? "completed" : "cancelled", completed_at: now };
  }
  return next;
}

/** A party can review once they have reported an outcome — no need to wait for the other side. */
export function canLeaveReview(m: Match, viewerId: string): boolean {
  if (viewerId !== m.investor_id && viewerId !== m.realtor_id) return false;
  if (m.status !== "active") return true;
  return viewerId === m.investor_id ? m.investor_outcome != null : m.realtor_outcome != null;
}

export function isDisputed(m: Match): boolean {
  return m.status === "active" && !!m.investor_outcome && !!m.realtor_outcome && m.investor_outcome !== m.realtor_outcome;
}
