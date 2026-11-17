/** Contractor account pricing and the service catalog contractors choose from. */
export const CONTRACTOR_MONTHLY_PRICE_USD = 6;
export const CONTRACTOR_PRICE_ID = "contractor_monthly";
export const REALTOR_PRICE_ID = "investor_monthly";

export const CONTRACTOR_SERVICES = [
  { value: "general_contractor", label: "General contractor" },
  { value: "roofing", label: "Roofing" },
  { value: "hvac", label: "HVAC" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "cleanout", label: "Junk removal / cleanout" },
  { value: "landscaping", label: "Landscaping / lawn care" },
  { value: "inspection", label: "Home inspection" },
  { value: "handyman", label: "Handyman / small repairs" },
  { value: "painting", label: "Painting" },
  { value: "flooring", label: "Flooring" },
  { value: "tech", label: "Technology / smart home" },
  { value: "title_law", label: "Title company / Law firm" },
  { value: "crm", label: "CRM" },
  { value: "lender", label: "Lender" },
] as const;

export const CONTRACTOR_SERVICE_LABEL: Record<string, string> = Object.fromEntries(CONTRACTOR_SERVICES.map((s) => [s.value, s.label]));

/** Dropdown entry that opens the free-text "Other" box instead of picking a catalog service. */
export const CONTRACTOR_OTHER = "__other__";

const CUSTOM_SERVICE_MAX = 40;

/** Services saved as free text (typed under "Other") aren't in the catalog, so they show as typed. */
export function contractorServiceLabel(value: string): string {
  return CONTRACTOR_SERVICE_LABEL[value] ?? value;
}

/** Clean up a free-text service name; null when there's nothing usable to save. */
export function customServiceName(raw: string): string | null {
  const text = raw.trim().replace(/\s+/g, " ").slice(0, CUSTOM_SERVICE_MAX);
  return text.length > 0 ? text : null;
}

/** Add a service (catalog value or free text), skipping one already picked in any lettering. */
export function addContractorService(services: string[], value: string): string[] {
  const next = value.trim();
  if (!next) return services;
  const lower = next.toLowerCase();
  if (services.some((s) => s.trim().toLowerCase() === lower)) return services;
  return [...services, next];
}

/** Which subscription price an account pays, or null when the role doesn't subscribe. */
export function priceIdForRole(role: string): string | null {
  if (role === "realtor") return REALTOR_PRICE_ID;
  if (role === "contractor") return CONTRACTOR_PRICE_ID;
  return null;
}

export function monthlyPriceForRole(role: string): number {
  return role === "contractor" ? CONTRACTOR_MONTHLY_PRICE_USD : 25;
}

export type MemberRole = "investor" | "realtor" | "contractor";

/** Subscription price for an account holding several profiles: any Realtor → $25 plan, Contractor only (± Investor) → $6, Investor only → free. */
export function priceIdForRoles(roles: readonly string[]): string | null {
  if (roles.includes("realtor")) return REALTOR_PRICE_ID;
  if (roles.includes("contractor")) return CONTRACTOR_PRICE_ID;
  return null;
}

export function monthlyPriceForRoles(roles: readonly string[]): number {
  const id = priceIdForRoles(roles);
  return id === REALTOR_PRICE_ID ? 25 : id === CONTRACTOR_PRICE_ID ? CONTRACTOR_MONTHLY_PRICE_USD : 0;
}

/** Profile that opens first after sign-up. */
export function primaryRole(roles: readonly MemberRole[]): MemberRole {
  return roles.includes("realtor") ? "realtor" : roles.includes("contractor") ? "contractor" : "investor";
}
