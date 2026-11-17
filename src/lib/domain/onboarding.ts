import type { Profile } from "@/lib/types";
import { isProfileComplete } from "./paywall";

export interface ChecklistStep {
  id: "profile" | "license" | "first_deal" | "first_interest" | "first_match";
  label: string;
  description: string;
  href: string;
  done: boolean;
}

export interface InvestorOnboardingInput {
  profile: Profile;
  dealsPosted: number;
  matchesMade: number;
}

/**
 * Investor "Get started": complete profile → post a deal or find a buyer's agent → first match.
 * Investors aren't verified; their success rate builds as deals close.
 */
export function investorChecklist({ profile, dealsPosted, matchesMade }: InvestorOnboardingInput): ChecklistStep[] {
  return [
    {
      id: "profile",
      label: "Complete profile",
      description: "Name, phone, and the markets you buy in",
      href: "/profile",
      done: isProfileComplete(profile),
    },
    {
      id: "first_deal",
      label: "Post your first deal or find a buyer's agent",
      description: "List a property for a listing agent, or get a buyer's agent to help you acquire one",
      href: "/deals/new",
      done: dealsPosted > 0,
    },
    {
      id: "first_match",
      label: "Get your first match",
      description: "Accept an interested realtor to start working together",
      href: "/deals",
      done: matchesMade > 0,
    },
  ];
}

export interface RealtorOnboardingInput {
  profile: Profile;
  interestsSent: number;
  matchesMade: number;
}

/** Realtor "Get started": complete profile → add license number → express interest → first match. */
export function realtorChecklist({ profile, interestsSent, matchesMade }: RealtorOnboardingInput): ChecklistStep[] {
  return [
    {
      id: "profile",
      label: "Complete profile",
      description: "Name, phone, the states you serve, and what you work on",
      href: "/profile",
      done: isProfileComplete(profile) && (profile.services ?? []).length > 0,
    },
    {
      id: "license",
      label: "Add your license number",
      description: "Your real estate license number. Investors see it on your profile",
      href: "/profile#license",
      done: !!profile.license_number,
    },
    {
      id: "first_interest",
      label: "Find a property in your area",
      description: "Express interest where an investor needs a listing or buyer's agent",
      href: "/browse",
      done: interestsSent > 0,
    },
    {
      id: "first_match",
      label: "Get your first match",
      description: "An investor accepts you and contact details are shared",
      href: "/deals",
      done: matchesMade > 0,
    },
  ];
}

export function checklistProgress(steps: ChecklistStep[]) {
  const done = steps.filter((s) => s.done).length;
  return { done, total: steps.length, percent: Math.round((done / steps.length) * 100) };
}
