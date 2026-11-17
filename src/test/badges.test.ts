import { describe, expect, it } from "vitest";
import { memberBadges } from "@/lib/domain/badges";

const base = { role: "realtor" as const, completed_deals: 0, avg_rating: null, review_count: 0, now: new Date("2027-01-01") };
const keys = (x: Parameters<typeof memberBadges>[0]) => memberBadges(x).map((b) => b.key);

describe("member badges", () => {
  it("founding within 60 days of launch, early supporter after", () => {
    expect(keys({ ...base, created_at: "2026-12-10" })).toContain("founding");
    expect(keys({ ...base, created_at: "2026-12-20" })).toContain("early_supporter");
  });
  it("high performer needs 5 sold deals", () => {
    expect(keys({ ...base, created_at: "2026-12-20", completed_deals: 4 })).not.toContain("high_performer");
    expect(keys({ ...base, created_at: "2026-12-20", completed_deals: 5 })).toContain("high_performer");
  });
  it("5-star needs 4.8+ from 5 reviews", () => {
    expect(keys({ ...base, created_at: "2026-12-20", avg_rating: 4.9, review_count: 4 })).not.toContain("five_star");
    expect(keys({ ...base, created_at: "2026-12-20", avg_rating: 4.8, review_count: 5 })).toContain("five_star");
  });
  it("veteran after 12 months", () => {
    expect(keys({ ...base, created_at: "2025-12-01" })).toContain("veteran");
  });
});
