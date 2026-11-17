import { describe, expect, it } from "vitest";
import type { Match, Profile, Review } from "@/lib/types";
import { formatPhoneAsYouType, formatUsPhone, isValidUsPhone, toE164 } from "@/lib/domain/phone";
import { applyOutcomeReport, isDisputed, outcomeState } from "@/lib/domain/match-outcome";
import { summarizeByState, summarizeReviews, validateReviewScores } from "@/lib/domain/ratings";
import { canExpressInterest, canPostDeal, trialDaysLeft } from "@/lib/domain/paywall";
import { checklistProgress, investorChecklist, realtorChecklist } from "@/lib/domain/onboarding";
import { isStateCode, US_STATES } from "@/lib/domain/states";
import { countByNeed, realtorStates } from "@/lib/domain/agent-need";
import { computeTrackRecord, successRate } from "@/lib/domain/track-record";
import { isRealtorService, offersServiceFor, sortServices } from "@/lib/domain/services";
import { priceRangeLabel } from "@/lib/domain/buybox";
import { VERIFICATION_BADGE } from "@/lib/domain/trust";
import { TERMS_VERSION } from "@/lib/legal/terms";

const NOW = new Date("2026-10-09T12:00:00Z");

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "u1",
    role: "investor",
    email: "a@b.com",
    first_name: "Ada",
    last_name: "Lane",
    company_name: null,
    phone: "+15125550123",
    avatar_url: null,
    bio: null,
    markets: ["TX"],
    verification_status: "verified",
    verified_at: null,
    verification_note: null,
    license_number: null,
    license_state: null,
    brokerage_name: null,
    services: [],
    buybox_min_price: null,
    buybox_max_price: null,
    buybox_property_types: [],
    buybox_notes: null,
    push_notifications: true,
    terms_version: TERMS_VERSION,
    terms_accepted_at: NOW.toISOString(),
    stripe_customer_id: null,
    subscription_status: "trialing",
    trial_ends_at: "2026-10-20T00:00:00Z",
    current_period_end: null,
    created_at: NOW.toISOString(),
    ...overrides,
  };
}

function review(overrides: Partial<Review>): Review {
  return {
    id: Math.random().toString(),
    match_id: "m",
    reviewer_id: "r",
    reviewee_id: "u1",
    state: "TX",
    rating: 5,
    communication: null,
    contract_accuracy: null,
    speed_to_close: null,
    market_knowledge: null,
    body: null,
    is_flagged: false,
    flag_reason: null,
    hidden: false,
    created_at: "",
    ...overrides,
  };
}

describe("states", () => {
  it("covers 50 states plus DC", () => expect(US_STATES).toHaveLength(51));
  it("validates codes", () => {
    expect(isStateCode("WY")).toBe(true);
    expect(isStateCode("XX")).toBe(false);
  });
});

describe("phone", () => {
  it.each([
    ["(512) 555-0123", "+15125550123"],
    ["512.555.0123", "+15125550123"],
    ["+1 512 555 0123", "+15125550123"],
    ["15125550123", "+15125550123"],
  ])("normalizes %s", (input, e164) => {
    expect(isValidUsPhone(input)).toBe(true);
    expect(toE164(input)).toBe(e164);
  });

  it.each(["555-0123", "(012) 555-0123", "(512) 155-0123", "+44 20 7946 0958", "abc"])("rejects %s", (input) => {
    expect(isValidUsPhone(input)).toBe(false);
    expect(toE164(input)).toBeNull();
  });

  it("formats for display and while typing", () => {
    expect(formatUsPhone("+15125550123")).toBe("(512) 555-0123");
    expect(formatPhoneAsYouType("512")).toBe("512");
    expect(formatPhoneAsYouType("51255")).toBe("(512) 55");
    expect(formatPhoneAsYouType("5125550123999")).toBe("(512) 555-0123");
  });
});

describe("ratings", () => {
  it("averages visible reviews and skips null categories", () => {
    const s = summarizeReviews([
      review({ rating: 5, communication: 5, speed_to_close: 4 }),
      review({ rating: 4, communication: 3 }),
      review({ rating: 1, communication: 1, hidden: true }),
    ]);
    expect(s.count).toBe(2);
    expect(s.average).toBe(4.5);
    expect(s.categories.communication).toBe(4);
    expect(s.categories.speed_to_close).toBe(4);
    expect(s.categories.market_knowledge).toBeNull();
    expect(s.distribution).toEqual([0, 0, 0, 1, 1]);
  });

  it("returns null average with no reviews", () => {
    expect(summarizeReviews([]).average).toBeNull();
  });

  it("groups by state", () => {
    const s = summarizeByState([review({ state: "TX", rating: 5 }), review({ state: "FL", rating: 3 }), review({ state: "TX", rating: 4 })]);
    expect(s.TX.average).toBe(4.5);
    expect(s.FL.count).toBe(1);
  });

  it("validates scores", () => {
    expect(validateReviewScores({ rating: 5, communication: 3 })).toBeNull();
    expect(validateReviewScores({ rating: 0 })).toMatch(/Overall/);
    expect(validateReviewScores({ rating: 4, market_knowledge: 6 })).toMatch(/Market Knowledge/);
  });
});

describe("paywall", () => {
  it("allows a complete investor in an active trial", () => {
    expect(canPostDeal(profile(), NOW)).toEqual({ allowed: true });
  });

  it("blocks in order: role → terms → profile → billing", () => {
    const code = (p: Profile) => {
      const r = canPostDeal(p, NOW);
      return r.allowed ? "ok" : r.block.code;
    };
    expect(code(profile({ role: "realtor" }))).toBe("not_investor");
    expect(code(profile({ terms_accepted_at: null, terms_version: null }))).toBe("terms_required");
    expect(code(profile({ terms_version: "2020-01-01" }))).toBe("terms_required"); // outdated version
    expect(code(profile({ phone: null, verification_status: "not_submitted" }))).toBe("profile_incomplete");
    expect(code(profile({ markets: [] }))).toBe("profile_incomplete");
    // investors aren't verified: verification status never blocks posting
    expect(code(profile({ verification_status: "not_submitted" }))).toBe("ok");
    // investors post for free
    expect(code(profile({ subscription_status: "none" }))).toBe("ok");
  });

  it("realtors need a subscription to express interest", () => {
    const code = (p: Profile) => {
      const r = canExpressInterest(p, NOW);
      return r.allowed ? "ok" : r.block.code;
    };
    expect(code(profile({ role: "realtor" }))).toBe("ok"); // active trial
    expect(code(profile({ role: "realtor", subscription_status: "none" }))).toBe("billing_required");
    expect(code(profile({ role: "realtor", subscription_status: "none", complimentary: true }))).toBe("ok");
    expect(code(profile({ role: "realtor", trial_ends_at: "2026-10-01T00:00:00Z" }))).toBe("trial_expired");
    expect(code(profile({ role: "realtor", subscription_status: "active", trial_ends_at: null }))).toBe("ok");
  });

  it("counts trial days left", () => {
    expect(trialDaysLeft(profile(), NOW)).toBe(11);
    expect(trialDaysLeft(profile({ subscription_status: "active" }), NOW)).toBeNull();
  });
});

describe("agent need", () => {
  it("covers the realtor's license state plus served markets", () => {
    expect([...realtorStates({ markets: ["TX", "FL"], license_state: "GA" })].sort()).toEqual(["FL", "GA", "TX"]);
    expect([...realtorStates({ markets: ["TX"], license_state: "TX" })]).toEqual(["TX"]);
    expect(realtorStates({ markets: [], license_state: null }).size).toBe(0);
  });

  it("counts listing vs buyer's agent posts", () => {
    const rows = [{ agent_need: "listing_agent" }, { agent_need: "buyers_agent" }, { agent_need: "buyers_agent" }] as const;
    expect(countByNeed([...rows])).toEqual({ listing_agent: 1, buyers_agent: 2 });
  });
});

describe("investor track record", () => {
  const mk = (id: string, state: string, agent_need: "listing_agent" | "buyers_agent") =>
    ({ id, state, agent_need, title: id, city: "X" }) as unknown as Parameters<typeof computeTrackRecord>[2][number];
  const match = (id: string, deal_id: string, realtor_id: string, status: Match["status"], completed_at: string | null = null): Match =>
    matchFixture({ id, deal_id, realtor_id, status, completed_at });

  it("counts only the investor's completed matches, by agent type, realtor and state", () => {
    const deals = [mk("a", "TX", "listing_agent"), mk("b", "TX", "buyers_agent"), mk("c", "FL", "listing_agent"), mk("d", "GA", "listing_agent")];
    const t = computeTrackRecord(
      "inv",
      [
        match("1", "a", "r1", "completed", "2026-03-01T00:00:00Z"),
        match("2", "b", "r1", "completed", "2026-04-01T00:00:00Z"),
        match("3", "c", "r2", "completed", "2026-02-01T00:00:00Z"),
        match("4", "d", "r3", "active"),
        match("5", "d", "r3", "cancelled"),
        { ...match("6", "a", "r9", "completed"), investor_id: "someone-else" },
      ],
      deals,
    );
    expect(t.completed_deals).toBe(3);
    expect(t.cancelled_deals).toBe(1);
    expect([t.as_listing, t.as_buyers]).toEqual([2, 1]);
    expect(t.counterparties_worked_with).toBe(2);
    expect(t.active_matches).toBe(1);
    expect(t.states).toEqual([
      { state: "TX", count: 2 },
      { state: "FL", count: 1 },
    ]);
    expect(t.recent.map((r) => r.deal_id)).toEqual(["b", "a", "c"]);
  });

  it("computes the realtor side from the same matches", () => {
    const deals = [mk("a", "TX", "listing_agent"), mk("b", "TX", "buyers_agent"), mk("c", "FL", "listing_agent")];
    const ms = [
      match("1", "a", "rea", "completed", "2026-03-01T00:00:00Z"),
      { ...match("2", "b", "rea", "completed", "2026-04-01T00:00:00Z"), investor_id: "inv2" },
      match("3", "c", "rea", "cancelled"),
      match("4", "c", "someone-else", "completed"),
    ];
    const t = computeTrackRecord("rea", ms, deals);
    expect([t.completed_deals, t.cancelled_deals]).toEqual([2, 1]);
    expect([t.as_listing, t.as_buyers]).toEqual([1, 1]);
    expect(t.counterparties_worked_with).toBe(2); // two different investors
    expect(t.recent.map((r) => r.counterparty_id)).toEqual(["inv2", "inv"]);
    expect(successRate(t.completed_deals, t.cancelled_deals)).toBe(67);
  });

  it("is empty for a new investor", () => {
    expect(computeTrackRecord("inv", [], []).completed_deals).toBe(0);
  });
});

describe("realtor services", () => {
  it("validates and orders services", () => {
    expect(isRealtorService("short_sale")).toBe(true);
    expect(isRealtorService("wholesale")).toBe(false);
    expect(sortServices(["short_sale", "novation", "buyers_agent"])).toEqual(["novation", "buyers_agent", "short_sale"]);
  });

  it("matches services to what the investor needs", () => {
    expect(offersServiceFor(["buyers_agent"], "buyers_agent")).toBe(true);
    expect(offersServiceFor(["buyers_agent"], "listing_agent")).toBe(false);
    expect(offersServiceFor(["flat_fee_listing"], "listing_agent")).toBe(true);
    expect(offersServiceFor(["short_sale", "novation"], "listing_agent")).toBe(true);
  });
});

describe("success rate", () => {
  it("is sold ÷ (sold + cancelled), rounded", () => {
    expect(successRate(4, 1)).toBe(80);
    expect(successRate(1, 1)).toBe(50);
    expect(successRate(2, 1)).toBe(67);
    expect(successRate(3, 0)).toBe(100);
    expect(successRate(0, 2)).toBe(0);
  });

  it("is null until a contracted deal closes", () => {
    expect(successRate(0, 0)).toBeNull();
  });
});

describe("two-party match outcome", () => {
  const base = matchFixture({ id: "m", deal_id: "d", realtor_id: "rea", status: "active" });
  const T = "2026-10-09T00:00:00Z";

  it("stays open until both parties report", () => {
    const m = applyOutcomeReport(base, "inv", "sold", T);
    expect(m.status).toBe("active");
    expect(outcomeState(m, "inv")).toEqual({ kind: "awaiting_them", yours: "sold" });
    expect(outcomeState(m, "rea")).toEqual({ kind: "awaiting_you", theirs: "sold" });
  });

  it("closes as completed when both report sold", () => {
    const m = applyOutcomeReport(applyOutcomeReport(base, "rea", "sold", T), "inv", "sold", T);
    expect(m.status).toBe("completed");
    expect(m.completed_at).toBe(T);
  });

  it("closes as cancelled when both report cancelled", () => {
    const m = applyOutcomeReport(applyOutcomeReport(base, "inv", "cancelled", T), "rea", "cancelled", T);
    expect(m.status).toBe("cancelled");
  });

  it("flags a disagreement as disputed instead of closing", () => {
    const m = applyOutcomeReport(applyOutcomeReport(base, "inv", "sold", T), "rea", "cancelled", T);
    expect(m.status).toBe("active");
    expect(isDisputed(m)).toBe(true);
    expect(outcomeState(m, "inv")).toEqual({ kind: "disputed", yours: "sold", theirs: "cancelled" });
  });

  it("lets a party change their answer to resolve a disagreement", () => {
    const disputed = applyOutcomeReport(applyOutcomeReport(base, "inv", "sold", T), "rea", "cancelled", T);
    const m = applyOutcomeReport(disputed, "inv", "cancelled", T);
    expect(m.status).toBe("cancelled");
  });
});

function matchFixture(p: Partial<Match> & Pick<Match, "id" | "deal_id" | "realtor_id" | "status">): Match {
  return {
    investor_id: "inv",
    interest_id: "i",
    investor_outcome: null,
    investor_reported_at: null,
    realtor_outcome: null,
    realtor_reported_at: null,
    resolved_by_admin: false,
    created_at: "2026-01-01T00:00:00Z",
    completed_at: null,
    ...p,
  };
}

describe("license badge", () => {
  it("never calls a self-reported license verified", () => {
    expect(Object.values(VERIFICATION_BADGE).map((b) => b.label)).toEqual(["License # Needed", "License # on File"]);
    expect(Object.values(VERIFICATION_BADGE).some((b) => /verif/i.test(b.label))).toBe(false);
  });
});

describe("onboarding checklist", () => {
  it("gives investors three steps: profile → post a deal or find a buyer's agent → first match", () => {
    const steps = investorChecklist({ profile: profile(), dealsPosted: 1, matchesMade: 0 });
    expect(steps.map((s) => s.id)).toEqual(["profile", "first_deal", "first_match"]);
    expect(steps.map((s) => s.done)).toEqual([true, true, false]);
    expect(checklistProgress(steps)).toEqual({ done: 2, total: 3, percent: 67 });
  });

  it("doesn't require any verification for investors", () => {
    expect(investorChecklist({ profile: profile({ verification_status: "not_submitted" }), dealsPosted: 0, matchesMade: 0 })[0].done).toBe(true);
    expect(investorChecklist({ profile: profile({ phone: null }), dealsPosted: 0, matchesMade: 0 })[0].done).toBe(false);
  });

  it("gives realtors four steps; the license step only needs a license number", () => {
    const realtor = (o: Partial<Profile> = {}) => profile({ role: "realtor", verification_status: "not_submitted", services: ["novation"], ...o });
    // a realtor profile isn't complete until they pick at least one service
    expect(realtorChecklist({ profile: realtor({ services: [] }), interestsSent: 0, matchesMade: 0 })[0].done).toBe(false);
    const ids = realtorChecklist({ profile: realtor(), interestsSent: 0, matchesMade: 0 }).map((s) => s.id);
    expect(ids).toEqual(["profile", "license", "first_interest", "first_match"]);

    expect(realtorChecklist({ profile: realtor(), interestsSent: 0, matchesMade: 0 }).map((s) => s.done)).toEqual([true, false, false, false]);
    // no licensing state, brokerage or upload needed
    const licensed = realtor({ license_number: "TX-1", license_state: null, brokerage_name: null, verification_status: "verified" });
    expect(realtorChecklist({ profile: licensed, interestsSent: 2, matchesMade: 1 }).map((s) => s.done)).toEqual([true, true, true, true]);
  });
});

describe("investor buy box", () => {
  it("formats the price range investors are looking to buy in", () => {
    expect(priceRangeLabel(50000, 250000)).toBe("$50k – $250k");
    expect(priceRangeLabel(50000, null)).toBe("$50k+");
    expect(priceRangeLabel(null, 250000)).toBe("Up to $250k");
    expect(priceRangeLabel(null, null)).toBe("Any price");
  });
});

import { keepCountiesInStates, sharedCounties } from "@/lib/domain/counties";
describe("counties", () => {
  it("drops counties when their state is removed", () => {
    expect(keepCountiesInStates(["NC:Wake County", "SC:Greenville County"], ["NC"])).toEqual(["NC:Wake County"]);
  });
  it("finds counties both members cover", () => {
    expect(sharedCounties(["NC:Wake County", "NC:Durham County"], ["NC:Durham County"])).toEqual(["NC:Durham County"]);
  });
});
