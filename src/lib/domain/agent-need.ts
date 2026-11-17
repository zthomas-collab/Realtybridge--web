import type { AgentNeed } from "@/lib/types";

export const AGENT_NEEDS: AgentNeed[] = ["listing_agent", "buyers_agent"];

export const AGENT_NEED_COPY: Record<
  AgentNeed,
  { label: string; short: string; investorPrompt: string; investorHint: string; priceLabel: string; termsLabel: string; termsHint: string; termsPlaceholder: string; realtorPitch: string }
> = {
  listing_agent: {
    label: "Listing agent needed",
    short: "Listing",
    investorPrompt: "I need a listing agent",
    investorHint: "List or novate a property you control. The agent markets and sells it.",
    priceLabel: "Target list price",
    termsLabel: "Terms",
    termsHint: "What the agent is agreeing to: listing type (novation, flat fee, short sale…), commission or fee, who pays for repairs and staging, timeline, seller expectations.",
    termsPlaceholder: "e.g. Novation agreement in place. 2.5% commission at closing. Investor covers repairs and staging. Seller wants to close within 60 days.",
    realtorPitch: "Take the listing",
  },
  buyers_agent: {
    label: "Buyer's agent needed",
    short: "Buyer's",
    investorPrompt: "I need a buyer's agent",
    investorHint: "Have an agent bring a buyer for a property you're selling.",
    priceLabel: "Asking price",
    termsLabel: "Terms",
    termsHint: "What the agent gets for bringing you a buyer: commission or fee, financing you'll accept (cash, conventional, hard money…), closing timeline, showing access.",
    termsPlaceholder: "e.g. 2.5% buyer's agent commission paid at closing. Cash or conventional offers. Close within 30 days. Lockbox on site for showings.",
    realtorPitch: "Bring a buyer",
  },
};

/** Live deals in a realtor's area: their license state plus every market they serve. */
export function realtorStates(p: { markets: string[]; license_state: string | null }): Set<string> {
  return new Set([...p.markets, ...(p.license_state ? [p.license_state] : [])]);
}

export function countByNeed<T extends { agent_need: AgentNeed }>(rows: T[]): Record<AgentNeed, number> {
  return {
    listing_agent: rows.filter((r) => r.agent_need === "listing_agent").length,
    buyers_agent: rows.filter((r) => r.agent_need === "buyers_agent").length,
  };
}
