import type { AgentNeed, RealtorService } from "@/lib/types";

export const REALTOR_SERVICES: { value: RealtorService; label: string; description: string }[] = [
  { value: "novation", label: "Novations", description: "List properties under a novation agreement with the investor" },
  { value: "flat_fee_listing", label: "Flat-fee listings", description: "MLS listings for a flat fee instead of a percentage" },
  { value: "buyers_agent", label: "Buyer's agent", description: "Represent investors buying a property" },
  { value: "short_sale", label: "Short sales", description: "Negotiate sales where the lender accepts less than what's owed" },
];

export const SERVICE_LABEL = Object.fromEntries(REALTOR_SERVICES.map((s) => [s.value, s.label])) as Record<RealtorService, string>;

const VALID = new Set<string>(REALTOR_SERVICES.map((s) => s.value));

export function isRealtorService(v: string): v is RealtorService {
  return VALID.has(v);
}

/** Keep the canonical order so the same set always displays the same way. */
export function sortServices(services: RealtorService[]): RealtorService[] {
  return REALTOR_SERVICES.map((s) => s.value).filter((v) => services.includes(v));
}

/** Services relevant to what an investor posted: a buyer's-agent post vs. listing work. */
export function servicesForNeed(need: AgentNeed): RealtorService[] {
  return need === "buyers_agent" ? ["buyers_agent"] : ["novation", "flat_fee_listing", "short_sale"];
}

/** Does this realtor list a service that fits the post? */
export function offersServiceFor(services: RealtorService[], need: AgentNeed): boolean {
  return servicesForNeed(need).some((s) => services.includes(s));
}
