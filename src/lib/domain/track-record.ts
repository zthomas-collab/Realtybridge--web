import type { AgentNeed, Deal, Match } from "@/lib/types";

export interface ClosedDealRef {
  match_id: string;
  deal_id: string;
  title: string;
  city: string;
  state: string;
  agent_need: AgentNeed;
  closed_at: string;
  /** the other party: the realtor on an investor's record, the investor on a realtor's */
  counterparty_id: string;
}

export interface TrackRecord {
  /** contracted deals both parties confirmed sold */
  completed_deals: number;
  /** contracted deals both parties confirmed cancelled */
  cancelled_deals: number;
  as_listing: number;
  as_buyers: number;
  counterparties_worked_with: number;
  active_matches: number;
  states: { state: string; count: number }[];
  recent: ClosedDealRef[];
}

/**
 * Success rate on contracted deals: confirmed sold ÷ (confirmed sold + confirmed cancelled).
 * Same formula for investors and realtors. Deals still in progress don't count either way.
 * Null until something has closed.
 */
export function successRate(sold: number, cancelled: number): number | null {
  const contracted = sold + cancelled;
  return contracted === 0 ? null : Math.round((sold / contracted) * 100);
}

/** Mirrors public.member_track_record in SQL; works for either side of a match. */
export function computeTrackRecord(userId: string, matches: Match[], deals: Deal[]): TrackRecord {
  const byId = new Map(deals.map((d) => [d.id, d]));
  const mine = matches.filter((m) => m.investor_id === userId || m.realtor_id === userId);
  const closed: ClosedDealRef[] = mine
    .filter((m) => m.status === "completed" && byId.has(m.deal_id))
    .map((m) => {
      const d = byId.get(m.deal_id)!;
      return {
        match_id: m.id,
        deal_id: d.id,
        title: d.title,
        city: d.city,
        state: d.state,
        agent_need: d.agent_need,
        closed_at: m.completed_at ?? m.created_at,
        counterparty_id: m.investor_id === userId ? m.realtor_id : m.investor_id,
      };
    })
    .sort((a, b) => b.closed_at.localeCompare(a.closed_at));

  const stateCounts = new Map<string, number>();
  for (const c of closed) stateCounts.set(c.state, (stateCounts.get(c.state) ?? 0) + 1);

  return {
    completed_deals: closed.length,
    cancelled_deals: mine.filter((m) => m.status === "cancelled").length,
    as_listing: closed.filter((c) => c.agent_need === "listing_agent").length,
    as_buyers: closed.filter((c) => c.agent_need === "buyers_agent").length,
    counterparties_worked_with: new Set(closed.map((c) => c.counterparty_id)).size,
    active_matches: mine.filter((m) => m.status === "active").length,
    states: [...stateCounts].map(([state, count]) => ({ state, count })).sort((a, b) => b.count - a.count || a.state.localeCompare(b.state)),
    recent: closed.slice(0, 10),
  };
}
