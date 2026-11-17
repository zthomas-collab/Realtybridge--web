import type { AdminOverview } from "@/lib/api/types";
import { MONTHLY_PRICE_USD } from "./paywall";

export type SubscriberState = "paying" | "trial" | "free" | "lapsed" | "none";

export function subscriberState(m: AdminOverview["members"][number], now: Date = new Date()): SubscriberState {
  if (m.complimentary) return "free";
  if (m.subscription_status === "active") return "paying";
  if (m.subscription_status === "trialing" && m.trial_ends_at && new Date(m.trial_ends_at) > now) return "trial";
  if (m.subscription_status === "none") return "none";
  return "lapsed";
}

export function summarize(o: AdminOverview, now: Date = new Date()) {
  const realtors = o.members.filter((m) => m.role === "realtor");
  const count = (s: SubscriberState) => realtors.filter((m) => subscriberState(m, now) === s).length;
  const weekAgo = now.getTime() - 7 * 86_400_000;
  const paying = count("paying");
  return {
    subscribers: paying + count("trial"),
    total_members: o.members.filter((m) => m.role !== "admin").length,
    investors: o.members.filter((m) => m.role === "investor").length,
    realtors: realtors.length,
    new_this_week: o.members.filter((m) => m.role !== "admin" && new Date(m.created_at).getTime() >= weekAgo).length,
    paying,
    trial: count("trial"),
    free: count("free"),
    lapsed: count("lapsed"),
    mrr: paying * MONTHLY_PRICE_USD,
    live_deals: o.deal_statuses.filter((s) => s === "live").length,
    total_deals: o.deal_statuses.length,
    active_listings: (o.listing_statuses ?? []).filter((s) => s === "active").length,
    total_listings: (o.listing_statuses ?? []).length,
    active_matches: o.match_statuses.filter((s) => s === "active").length,
    closed_matches: o.match_statuses.filter((s) => s === "completed").length,
    total_matches: o.match_statuses.length,
  };
}

/** Last `days` days (oldest first), counting new accounts and deals posted per UTC day. */
export function dailyActivity(o: AdminOverview, days = 30, now: Date = new Date()) {
  const out: { day: string; accounts: number; deals: number }[] = [];
  const idx = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now.getTime() - i * 86_400_000).toISOString().slice(0, 10);
    idx.set(day, out.length);
    out.push({ day, accounts: 0, deals: 0 });
  }
  for (const m of o.members) if (m.role !== "admin") { const i = idx.get(m.created_at.slice(0, 10)); if (i != null) out[i].accounts++; }
  for (const d of o.deal_dates) { const i = idx.get(d.slice(0, 10)); if (i != null) out[i].deals++; }
  return out;
}

/** Monthly amount a realtor is currently paying. */
export const monthlyAmount = (s: SubscriberState) => (s === "paying" ? MONTHLY_PRICE_USD : 0);

/** Investors on the platform: name and email only. */
export function investorMembers(o: AdminOverview) {
  return o.members.filter((m) => m.role === "investor");
}

/** Per-state tally of investors and realtors who list that state on their profile (a member counts once per state). */
/** Members per state they work in/serve, plus deals posted per property state (withdrawn excluded). */
export function stateTally(
  members: { role: string; markets?: string[] }[],
  deals: { state?: string | null; status?: string }[] = [],
): { state: string; investors: number; realtors: number; deals: number }[] {
  const t = new Map<string, { investors: number; realtors: number; deals: number }>();
  for (const m of members) {
    if (m.role !== "investor" && m.role !== "realtor") continue;
    for (const st of new Set(m.markets ?? [])) {
      const row = t.get(st) ?? { investors: 0, realtors: 0, deals: 0 };
      if (m.role === "investor") row.investors++; else row.realtors++;
      t.set(st, row);
    }
  }
  for (const d of deals) {
    if (!d.state || d.status === "withdrawn") continue;
    const row = t.get(d.state) ?? { investors: 0, realtors: 0, deals: 0 };
    row.deals++;
    t.set(d.state, row);
  }
  return [...t.entries()].map(([state, r]) => ({ state, ...r })).sort((a, b) => b.deals - a.deals || b.investors + b.realtors - (a.investors + a.realtors) || a.state.localeCompare(b.state));
}

/** Realtor accounts grouped by each state they serve, with names and emails for admin contact. */
export function realtorsByState(
  members: { role: string; email: string; first_name?: string | null; last_name?: string | null; brokerage_name?: string | null; markets?: string[] }[],
): { state: string; realtors: { name: string; email: string; brokerage: string | null }[] }[] {
  const t = new Map<string, { name: string; email: string; brokerage: string | null }[]>();
  for (const m of members) {
    if (m.role !== "realtor") continue;
    const name = [m.first_name, m.last_name].filter(Boolean).join(" ") || m.email;
    for (const st of new Set(m.markets ?? [])) {
      const list = t.get(st) ?? [];
      list.push({ name, email: m.email, brokerage: m.brokerage_name ?? null });
      t.set(st, list);
    }
  }
  return [...t.entries()]
    .map(([state, realtors]) => ({ state, realtors: realtors.sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => b.realtors.length - a.realtors.length || a.state.localeCompare(b.state));
}
