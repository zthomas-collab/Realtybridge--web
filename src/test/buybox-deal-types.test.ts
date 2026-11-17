import { describe, expect, it } from "vitest";
import { BUYBOX_DEAL_TYPES, toggleBuyBoxDealType } from "@/lib/domain/buybox";

describe("Investor buy box deal types", () => {
  it("supports the five requested deal strategies", () => {
    expect(BUYBOX_DEAL_TYPES.map((option) => option.value)).toEqual(["novation", "fix_n_flip", "seller_finance", "rentals", "sub_to"]);
  });
  it("allows all strategies together and removes only an unchecked strategy", () => {
    let selected: string[] = [];
    for (const type of ["novation", "fix_n_flip", "seller_finance", "rentals", "sub_to"]) selected = toggleBuyBoxDealType(selected, type);
    expect(selected).toEqual(["novation", "fix_n_flip", "seller_finance", "rentals", "sub_to"]);
    expect(toggleBuyBoxDealType(selected, "seller_finance")).toEqual(["novation", "fix_n_flip", "rentals", "sub_to"]);
    expect(toggleBuyBoxDealType(selected, "unsupported")).toEqual(selected);
  });
});