import type { Profile } from "@/lib/types";
import { TERMS_VERSION } from "@/lib/legal/terms";

/** Mirrors public.has_accepted_terms in SQL: the *current* version must be accepted. */
export function hasAcceptedTerms(p: Pick<Profile, "terms_version" | "terms_accepted_at">): boolean {
  return p.terms_version === TERMS_VERSION && !!p.terms_accepted_at;
}

export const TRIAL_DAYS = 7;
export const MONTHLY_PRICE_USD = 25;
export const YEARLY_PRICE_USD = 275;
export const REALTOR_YEARLY_PRICE_ID = "realtor_yearly";

export type PaywallBlock =
  | { code: "not_investor"; message: string }
  | { code: "terms_required"; message: string; href: string }
  | { code: "profile_incomplete"; message: string; href: string }
  | { code: "billing_required"; message: string; href: string }
  | { code: "trial_expired"; message: string; href: string };

export type PaywallResult = { allowed: true } | { allowed: false; block: PaywallBlock };

export function isProfileComplete(p: Profile): boolean {
  return Boolean(p.first_name && p.last_name && p.phone && p.markets.length > 0);
}

export function hasActiveBilling(p: Profile, now: Date = new Date()): boolean {
  if (p.complimentary || p.grandfathered_premium) return true;
  // A $6 Contractor plan does not cover an account that also holds a Realtor profile.
  const roles = p.roles?.length ? p.roles : [p.role];
  if (p.stripe_subscription_id && p.billing_plan && p.billing_plan !== "investor_monthly" && p.billing_plan !== REALTOR_YEARLY_PRICE_ID && roles.includes("realtor")) return false;
  if (p.subscription_status === "active") return true;
  // Canceled or past-due members keep access until their paid-through date.
  if ((p.subscription_status === "canceled" || p.subscription_status === "past_due") && p.current_period_end && new Date(p.current_period_end) > now) return true;
  return p.subscription_status === "trialing" && !!p.trial_ends_at && new Date(p.trial_ends_at) > now;
}

/** Account-wide access: switching to Investor cannot bypass a paid profile's billing. */
export function hasPlatformAccess(p: Profile, now: Date = new Date()): boolean {
  const roles = p.roles?.length ? p.roles : [p.role];
  if (p.role === "admin" || roles.includes("admin")) return true;
  // Realtors enter free and see previews; Pro features check hasActiveBilling.
  if (roles.includes("realtor")) return true;
  if (!roles.some((role) => role === "realtor" || role === "contractor")) return true;
  return hasActiveBilling(p, now);
}

export function trialDaysLeft(p: Profile, now: Date = new Date()): number | null {
  if (p.subscription_status !== "trialing" || !p.trial_ends_at) return null;
  const ms = new Date(p.trial_ends_at).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/**
 * Gate for "+ Post a Deal". Mirrors public.can_post_deal in SQL, which is the real enforcement;
 * this drives the UI so users see *why* they're locked out and what to do next.
 */
export function canPostDeal(p: Profile, now: Date = new Date()): PaywallResult {
  if (p.role !== "investor") {
    return { allowed: false, block: { code: "not_investor", message: "Only investor accounts can post deals." } };
  }
  if (!hasAcceptedTerms(p)) {
    return {
      allowed: false,
      block: { code: "terms_required", message: "Accept the Professional Conduct Agreement & Terms of Service to post deals.", href: "/terms" },
    };
  }
  if (!isProfileComplete(p)) {
    return {
      allowed: false,
      block: {
        code: "profile_incomplete",
        message: "Add your name, phone number and at least one market before posting.",
        href: "/profile",
      },
    };
  }
  // Posting is free for investors; realtors pay to express interest (canExpressInterest).
  return { allowed: true };
}

/** Realtors need an active trial, subscription or free account to express interest. Mirrors express_interest in SQL. */
export function canExpressInterest(p: Profile, now: Date = new Date()): PaywallResult {
  if (hasActiveBilling(p, now)) return { allowed: true };
  const expired = p.subscription_status === "trialing" || p.subscription_status === "canceled" || p.subscription_status === "past_due";
  return {
    allowed: false,
    block: expired
      ? { code: "trial_expired", message: `Your Pro access has ended. Upgrade to RealtyBridge Pro ($${MONTHLY_PRICE_USD}/month or $${YEARLY_PRICE_USD}/year) to keep reaching investors.`, href: "/settings#billing" }
      : { code: "billing_required", message: `Upgrade to RealtyBridge Pro to see full deal details, investor contact and messaging. $${MONTHLY_PRICE_USD}/month or $${YEARLY_PRICE_USD}/year, cancel anytime.`, href: "/settings#billing" },
  };
}
