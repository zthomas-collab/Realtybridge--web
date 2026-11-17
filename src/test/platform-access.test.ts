import { describe, expect, it } from "vitest";
import { hasActiveBilling, hasPlatformAccess, MONTHLY_PRICE_USD, YEARLY_PRICE_USD, TRIAL_DAYS, trialDaysLeft } from "@/lib/domain/paywall";
import type { Profile } from "@/lib/types";

const now = new Date("2026-11-02T20:45:00Z");
const profile = (patch: Partial<Profile> = {}) => ({
  role: "contractor", roles: ["contractor"], subscription_status: "none",
  complimentary: false, trial_ends_at: null, stripe_subscription_id: null,
  billing_plan: null, ...patch,
} as Profile);

describe("platform access", () => {
  it("sets new subscription trials to exactly seven days", () => {
    expect(TRIAL_DAYS).toBe(7);
  });
  it("does not grant a trial or access just because a paid account was created", () => {
    const member = profile({ created_at: "2026-10-01T00:00:00Z" });
    expect(trialDaysLeft(member, now)).toBeNull();
    expect(hasPlatformAccess(member, now)).toBe(false);
  });
  it("grants access for seven days after subscription trial activation, then blocks access", () => {
    const activatedAt = new Date("2026-11-02T21:05:00Z");
    const member = profile({ subscription_status: "trialing", stripe_subscription_id: "sub_trial", trial_ends_at: new Date(activatedAt.getTime() + TRIAL_DAYS * 86_400_000).toISOString() });
    expect(member.trial_ends_at).toBe("2026-11-09T21:05:00.000Z");
    expect(trialDaysLeft(member, activatedAt)).toBe(7);
    expect(hasPlatformAccess(member, activatedAt)).toBe(true);
    expect(hasPlatformAccess(member, new Date("2026-11-09T21:05:00Z"))).toBe(false);
  });
  it.each(["none", "incomplete", "past_due", "canceled"] as const)("blocks %s paid members", (subscription_status) => {
    expect(hasPlatformAccess(profile({ subscription_status }), now)).toBe(false);
  });
  it("allows active subscriptions", () => {
    expect(hasPlatformAccess(profile({ subscription_status: "active" }), now)).toBe(true);
  });
  it("allows an unexpired trial and blocks it at expiry", () => {
    const member = profile({ subscription_status: "trialing", trial_ends_at: "2026-11-02T20:46:00Z" });
    expect(hasPlatformAccess(member, now)).toBe(true);
    expect(hasPlatformAccess(member, new Date("2026-11-02T20:46:00Z"))).toBe(false);
  });
  it("allows free investor-only members", () => {
    expect(hasPlatformAccess(profile({ role: "investor", roles: ["investor"] }), now)).toBe(true);
  });
  it("immediately allows a newly created investor without billing or a completed profile", () => {
    const investor = profile({
      role: "investor", roles: ["investor"], created_at: now.toISOString(),
      first_name: null, last_name: null, phone: null, markets: [],
      terms_accepted_at: null, terms_version: null,
    });
    expect(hasPlatformAccess(investor, now)).toBe(true);
    expect(trialDaysLeft(investor, now)).toBeNull();
  });
  it.each(["none", "incomplete", "past_due", "canceled", "trialing"] as const)("never paywalls an investor-only account with %s billing", (subscription_status) => {
    expect(hasPlatformAccess(profile({ role: "investor", roles: ["investor"], subscription_status }), now)).toBe(true);
  });
  it("allows complimentary members", () => {
    expect(hasPlatformAccess(profile({ complimentary: true }), now)).toBe(true);
  });
  it("allows administrators", () => {
    expect(hasPlatformAccess(profile({ role: "admin", roles: ["admin"] }), now)).toBe(true);
  });
  it("blocks inactive paid accounts even when switched to Investor", () => {
    expect(hasPlatformAccess(profile({ role: "investor", roles: ["investor", "contractor"] }), now)).toBe(false);
  });
  it("requires the Realtor tier when a Contractor adds Realtor", () => {
    expect(hasActiveBilling(profile({ roles: ["realtor", "contractor"], subscription_status: "active", stripe_subscription_id: "sub_test", billing_plan: "contractor_monthly" }), now)).toBe(false);
  });
});

describe("RealtyBridge Pro", () => {
  const realtor = (patch: Partial<Profile> = {}) => profile({ role: "realtor", roles: ["realtor"], ...patch });
  it("costs $25 monthly or $275 yearly", () => {
    expect(MONTHLY_PRICE_USD).toBe(25);
    expect(YEARLY_PRICE_USD).toBe(275);
  });
  it("lets new free Realtors into the platform without Pro", () => {
    expect(hasPlatformAccess(realtor(), now)).toBe(true);
    expect(hasActiveBilling(realtor(), now)).toBe(false);
  });
  it("gives grandfathered Realtors Pro without any subscription", () => {
    expect(hasActiveBilling(realtor({ grandfathered_premium: true }), now)).toBe(true);
  });
  it("keeps Pro after canceling until the paid-through date", () => {
    const member = realtor({ subscription_status: "canceled", current_period_end: "2026-11-10T00:00:00Z" });
    expect(hasActiveBilling(member, now)).toBe(true);
    expect(hasActiveBilling(member, new Date("2026-11-10T00:00:01Z"))).toBe(false);
  });
  it("accepts the yearly Pro plan on accounts with a Realtor profile", () => {
    expect(hasActiveBilling(realtor({ subscription_status: "active", stripe_subscription_id: "sub_y", billing_plan: "realtor_yearly" }), now)).toBe(true);
  });
});
