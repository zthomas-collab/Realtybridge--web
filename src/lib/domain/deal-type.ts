/**
 * Deal strategy an investor picks when posting a property. Same strategies as the buy box plus
 * short sale — short sale only makes sense on a specific property, not as a standing buying criteria.
 */
export const DEAL_TYPES = [
  { value: "novation", label: "Novation", hint: "You hold the property under a novation agreement and sell the contract." },
  { value: "fix_n_flip", label: "Fix n flip", hint: "Bought to renovate and resell." },
  { value: "seller_finance", label: "Seller finance", hint: "You finance the buyer directly instead of a bank." },
  { value: "rentals", label: "Rentals", hint: "Bought to keep and rent out." },
  { value: "sub_to", label: "Sub to", hint: "You take over the seller's existing mortgage payments." },
  { value: "short_sale", label: "Short sale", hint: "The lender agrees to accept less than what the seller owes." },
] as const;

export type DealType = (typeof DEAL_TYPES)[number]["value"];

/** Tuple form for zod enums. */
export const DEAL_TYPE_VALUES = DEAL_TYPES.map((t) => t.value) as [DealType, ...DealType[]];

export const DEAL_TYPE_LABEL: Record<string, string> = Object.fromEntries(DEAL_TYPES.map((t) => [t.value, t.label]));

export function isDealType(value: unknown): value is DealType {
  return typeof value === "string" && DEAL_TYPES.some((t) => t.value === value);
}

/** "Short sale" for a stored value; null on deals posted before deal types existed. */
export function dealTypeLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return DEAL_TYPE_LABEL[value] ?? null;
}

/** One-line explanation of the picked strategy, shown under the picker. */
export function dealTypeHint(value: string | null | undefined): string | null {
  if (!value) return null;
  return DEAL_TYPES.find((t) => t.value === value)?.hint ?? null;
}
