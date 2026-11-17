/** Buy box: what an investor is looking to buy. Same property-type catalog as deal posting. */
export const BUYBOX_PROPERTY_TYPES = [
  { value: "single_family", label: "Single family" },
  { value: "townhome", label: "Townhome" },
  { value: "condo", label: "Condo" },
  { value: "multi_family", label: "Multi-family (2–4)" },
  { value: "manufactured", label: "Manufactured" },
  { value: "land", label: "Land" },
] as const;

export type BuyBoxPropertyType = (typeof BUYBOX_PROPERTY_TYPES)[number]["value"];

export const BUYBOX_DEAL_TYPES = [
  { value: "novation", label: "Novation" },
  { value: "fix_n_flip", label: "Fix n flip" },
  { value: "seller_finance", label: "Seller finance" },
  { value: "rentals", label: "Rentals" },
  { value: "sub_to", label: "Sub to" },
] as const;

export function toggleBuyBoxDealType(value: string[], type: string): string[] {
  if (!BUYBOX_DEAL_TYPES.some((option) => option.value === type)) return value;
  return value.includes(type) ? value.filter((item) => item !== type) : [...value, type];
}

export const DEAL_TYPE_LABEL: Record<string, string> = Object.fromEntries(BUYBOX_DEAL_TYPES.map((t) => [t.value, t.label]));

export const PROPERTY_TYPE_LABEL: Record<string, string> = Object.fromEntries(BUYBOX_PROPERTY_TYPES.map((t) => [t.value, t.label]));

/** Human price range: "Any price", "$50k+", "Up to $200k", "$50k – $200k". */
export function priceRangeLabel(min: number | null | undefined, max: number | null | undefined): string {
  const short = (n: number) => (n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`);
  if (min != null && max != null) return `${short(min)} – ${short(max)}`;
  if (min != null) return `${short(min)}+`;
  if (max != null) return `Up to ${short(max)}`;
  return "Any price";
}
