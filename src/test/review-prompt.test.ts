import { describe, expect, it } from "vitest";
import { canLeaveReview } from "@/lib/domain/match-outcome";
import type { Match } from "@/lib/types";

const base: Match = {
  id: "m1",
  deal_id: "d1",
  investor_id: "inv",
  realtor_id: "rea",
  status: "active",
  investor_outcome: null,
  realtor_outcome: null,
  investor_reported_at: null,
  realtor_reported_at: null,
  resolved_by_admin: false,
  completed_at: null,
  created_at: "2026-01-01",
} as Match;

describe("Review prompt after reporting an outcome", () => {
  it('never grants review eligibility to someone outside the selected connection', () => {
    expect(canLeaveReview({ ...base, status: 'completed' }, 'outsider')).toBe(false);
    expect(canLeaveReview({ ...base, realtor_outcome: 'sold' }, 'outsider')).toBe(false);
  });
  it("does not prompt before either party reports", () => {
    expect(canLeaveReview(base, "inv")).toBe(false);
    expect(canLeaveReview(base, "rea")).toBe(false);
  });
  it("prompts the investor as soon as they report, without waiting for the realtor", () => {
    const m = { ...base, investor_outcome: "sold" as const };
    expect(canLeaveReview(m, "inv")).toBe(true);
    expect(canLeaveReview(m, "rea")).toBe(false);
  });
  it("prompts the realtor as soon as they report cancelled, without waiting for the investor", () => {
    const m = { ...base, realtor_outcome: "cancelled" as const };
    expect(canLeaveReview(m, "rea")).toBe(true);
    expect(canLeaveReview(m, "inv")).toBe(false);
  });
  it("prompts both parties once the match is closed, sold or cancelled", () => {
    for (const status of ["completed", "cancelled"] as const) {
      const m = { ...base, status };
      expect(canLeaveReview(m, "inv")).toBe(true);
      expect(canLeaveReview(m, "rea")).toBe(true);
    }
  });
});
