import { describe, expect, it } from "vitest";
import { dailyActivity, investorMembers, monthlyAmount, summarize } from "@/lib/domain/admin-metrics";
import type { AdminMember } from "@/lib/api/types";

const now = new Date("2026-10-12T00:00:00Z");
const m = (p: Partial<AdminMember>): AdminMember => ({
  id: Math.random().toString(), role: "realtor", email: "a@b.c", first_name: null, last_name: null, brokerage_name: null, company_name: null,
  subscription_status: "none", trial_ends_at: null, current_period_end: null, complimentary: false, created_at: "2026-01-01T00:00:00Z", ...p,
});

describe("admin metrics", () => {
  it("monthly revenue counts only paying realtors at $25", () => {
    const s = summarize({ members: [m({ subscription_status: "active" }), m({ subscription_status: "active" }), m({ complimentary: true, subscription_status: "active" }), m({ role: "investor" })], deal_statuses: [], deal_dates: [], deals: [], match_statuses: [] }, now);
    expect(s.paying).toBe(2);
    expect(s.free).toBe(1);
    expect(s.mrr).toBe(50);
  });
  it("expired trials count as lapsed, not trial", () => {
    const s = summarize({ members: [m({ subscription_status: "trialing", trial_ends_at: "2026-10-01T00:00:00Z" }), m({ subscription_status: "trialing", trial_ends_at: "2026-10-20T00:00:00Z" })], deal_statuses: [], deal_dates: [], deals: [], match_statuses: [] }, now);
    expect(s.subscribers).toBe(1);
    expect(s.trial).toBe(1);
    expect(s.lapsed).toBe(1);
  });
  it("daily activity counts accounts and deals per day, excluding admins", () => {
    const a = dailyActivity({ members: [m({ created_at: "2026-10-11T05:00:00Z" }), m({ role: "admin", created_at: "2026-10-11T06:00:00Z" })], deal_statuses: ["live"], deal_dates: ["2026-10-11T09:00:00Z"], deals: [], match_statuses: [] }, 7, now);
    expect(a).toHaveLength(7);
    expect(a.find((x) => x.day === "2026-10-11")).toEqual({ day: "2026-10-11", accounts: 1, deals: 1 });
  });
  it("investor members list counts investor accounts, excluding admins and realtors", () => {
    const rows = investorMembers({ members: [m({ id: "i1", role: "investor" }), m({ id: "r1", role: "realtor" }), m({ id: "a1", role: "admin" })], deal_statuses: [], deal_dates: [], match_statuses: [], deals: [] });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("i1");
    expect(rows[0].email).toBeTruthy();
  });
  it("matches made counts every match row, with active and closed tallies", () => {
    const s = summarize({ members: [], deal_statuses: [], deal_dates: [], deals: [], match_statuses: ["active", "active", "completed", "cancelled"] }, now);
    expect(s.total_matches).toBe(4);
    expect(s.active_matches).toBe(2);
    expect(s.closed_matches).toBe(1);
  });
  it("only paying realtors are billed $25/month", () => {
    expect(monthlyAmount("paying")).toBe(25);
    expect(monthlyAmount("trial")).toBe(0);
    expect(monthlyAmount("free")).toBe(0);
  });
});

import { stateTally, realtorsByState } from "@/lib/domain/admin-metrics";

describe("realtorsByState", () => {
  it("lists each realtor under every state they serve, with name, email and brokerage", () => {
    const rows = realtorsByState([
      { role: "realtor", email: "jane@x.com", first_name: "Jane", last_name: "Doe", brokerage_name: "ABC Realty", markets: ["NC", "VA"] },
      { role: "realtor", email: "bob@x.com", first_name: null, last_name: null, brokerage_name: null, markets: ["NC"] },
      { role: "investor", email: "inv@x.com", markets: ["NC"] },
      { role: "realtor", email: "nostate@x.com", markets: [] },
    ]);
    expect(rows).toEqual([
      { state: "NC", realtors: [
        { name: "bob@x.com", email: "bob@x.com", brokerage: null },
        { name: "Jane Doe", email: "jane@x.com", brokerage: "ABC Realty" },
      ] },
      { state: "VA", realtors: [{ name: "Jane Doe", email: "jane@x.com", brokerage: "ABC Realty" }] },
    ]);
  });
});
describe("stateTally", () => {
  it("counts investors and realtors per state, skipping admins and duplicates", () => {
    const rows = stateTally([
      { role: "investor", markets: ["NC", "NC", "SC"] },
      { role: "realtor", markets: ["NC"] },
      { role: "admin", markets: ["NC"] },
    ]);
    expect(rows).toEqual([{ state: "NC", investors: 1, realtors: 1, deals: 0 }, { state: "SC", investors: 1, realtors: 0, deals: 0 }]);
  });
  it("counts deals per property state, skipping withdrawn deals", () => {
    const rows = stateTally([{ role: "investor", markets: ["NC"] }], [
      { state: "VA", status: "live" },
      { state: "VA", status: "matched" },
      { state: "NC", status: "withdrawn" },
    ]);
    expect(rows).toEqual([{ state: "VA", investors: 0, realtors: 0, deals: 2 }, { state: "NC", investors: 1, realtors: 0, deals: 0 }]);
  });
});
