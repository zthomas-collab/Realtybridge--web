import { describe, expect, it } from "vitest";
import {
  CONTRACTOR_SERVICES,
  CONTRACTOR_SERVICE_LABEL,
  addContractorService,
  contractorServiceLabel,
  customServiceName,
  monthlyPriceForRole,
  priceIdForRole,
} from "@/lib/domain/contractors";

describe("contractor accounts", () => {
  it("contractors pay $6 a month", () => {
    expect(monthlyPriceForRole("contractor")).toBe(6);
    expect(priceIdForRole("contractor")).toBe("contractor_monthly");
  });
  it("realtors keep the $25 plan and investors don't subscribe", () => {
    expect(monthlyPriceForRole("realtor")).toBe(25);
    expect(priceIdForRole("realtor")).toBe("investor_monthly");
    expect(priceIdForRole("investor")).toBeNull();
  });
  it("offers a title company / law firm service option", () => {
    expect(CONTRACTOR_SERVICES.some((s) => s.value === "title_law")).toBe(true);
    expect(CONTRACTOR_SERVICE_LABEL["title_law"]).toBe("Title company / Law firm");
  });
  it("offers a technology / smart home service option", () => {
    expect(CONTRACTOR_SERVICES.some((s) => s.value === "tech")).toBe(true);
    expect(CONTRACTOR_SERVICE_LABEL["tech"]).toBe("Technology / smart home");
  });
  it("offers a CRM service option", () => {
    expect(CONTRACTOR_SERVICES.some((s) => s.value === "crm")).toBe(true);
    expect(CONTRACTOR_SERVICE_LABEL["crm"]).toBe("CRM");
  });
  it("offers a lender service option", () => {
    expect(CONTRACTOR_SERVICES.some((s) => s.value === "lender")).toBe(true);
    expect(CONTRACTOR_SERVICE_LABEL["lender"]).toBe("Lender");
  });
});

describe("contractor 'Other' service", () => {
  it("keeps a typed service name as written", () => {
    expect(customServiceName("  Pool   service  ")).toBe("Pool service");
    expect(customServiceName("   ")).toBeNull();
    expect(customServiceName("x".repeat(60))).toHaveLength(40);
  });
  it("shows a typed service by its own name and a catalog service by its label", () => {
    expect(contractorServiceLabel("Pool service")).toBe("Pool service");
    expect(contractorServiceLabel("hvac")).toBe("HVAC");
  });
  it("adds a service once, whatever the lettering", () => {
    expect(addContractorService(["Roofing"], "roofing")).toEqual(["Roofing"]);
    expect(addContractorService(["Roofing"], " Pool service ")).toEqual(["Roofing", "Pool service"]);
    expect(addContractorService(["Roofing"], "   ")).toEqual(["Roofing"]);
  });
});

import { monthlyPriceForRoles, priceIdForRoles, primaryRole } from "@/lib/domain/contractors";
describe("multi-profile pricing", () => {
  it("investor only is free", () => expect(monthlyPriceForRoles(["investor"])).toBe(0));
  it("contractor only is $6", () => expect(monthlyPriceForRoles(["contractor"])).toBe(6));
  it("realtor is $25", () => expect(monthlyPriceForRoles(["realtor"])).toBe(25));
  it("all three together is a flat $25", () => {
    expect(monthlyPriceForRoles(["investor", "realtor", "contractor"])).toBe(25);
    expect(priceIdForRoles(["realtor", "contractor"])).toBe("investor_monthly");
  });
  it("opens the realtor profile first", () => expect(primaryRole(["investor", "contractor", "realtor"])).toBe("realtor"));
});
