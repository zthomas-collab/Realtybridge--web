import { describe, expect, it } from "vitest";
import { mapStatus } from "@/routes/api/public/payments/webhook";

describe("subscription status sync", () => {
  it("unpaid subscriptions lock posting as past due", () => expect(mapStatus("unpaid")).toBe("past_due"));
  it("expired or paused subscriptions count as canceled", () => {
    expect(mapStatus("incomplete_expired")).toBe("canceled");
    expect(mapStatus("paused")).toBe("canceled");
  });
  it("trialing stays trialing", () => expect(mapStatus("trialing")).toBe("trialing"));
});
