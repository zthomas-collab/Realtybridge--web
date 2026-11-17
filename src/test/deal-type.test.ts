import { describe, expect, it } from "vitest";
import { DEAL_TYPES, DEAL_TYPE_LABEL, DEAL_TYPE_VALUES, dealTypeHint, dealTypeLabel, isDealType } from "@/lib/domain/deal-type";
import { BUYBOX_DEAL_TYPES } from "@/lib/domain/buybox";

describe("Deal type on investor postings", () => {
  it("offers short sale to investors posting a deal", () => {
    expect(DEAL_TYPE_VALUES).toEqual(["novation", "fix_n_flip", "seller_finance", "rentals", "sub_to", "short_sale"]);
    expect(DEAL_TYPE_LABEL.short_sale).toBe("Short sale");
    expect(DEAL_TYPES.map((t) => t.label)).toContain("Short sale");
  });

  it("keeps every buy box strategy in the posting list", () => {
    for (const option of BUYBOX_DEAL_TYPES) expect(DEAL_TYPE_VALUES).toContain(option.value);
  });

  it("tells the investor what short sale means", () => {
    expect(dealTypeHint("short_sale")).toMatch(/lender/i);
  });

  it("shows nothing for deals posted before deal types existed", () => {
    expect(dealTypeLabel(null)).toBeNull();
    expect(dealTypeHint("")).toBeNull();
  });

  it("rejects strategies outside the catalog", () => {
    expect(isDealType("short_sale")).toBe(true);
    expect(isDealType("wholesale")).toBe(false);
    expect(isDealType(undefined)).toBe(false);
  });
});
