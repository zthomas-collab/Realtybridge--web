import { describe, it, expect } from "vitest";
import { shouldSendWelcomeClass } from "@/lib/domain/welcome-class";

describe("welcome class email", () => {
  it("sends to a member who just joined before Nov 2 2026 6pm ET", () => {
    const now = new Date("2026-10-20T12:00:00Z");
    expect(shouldSendWelcomeClass(now, new Date("2026-10-20T11:00:00Z"))).toBe(true);
  });
  it("stops once the class starts Nov 2 2026 6pm ET", () => {
    const now = new Date("2026-11-02T23:00:00Z");
    expect(shouldSendWelcomeClass(now, new Date("2026-11-02T22:00:00Z"))).toBe(false);
  });
  it("skips members who joined long ago", () => {
    expect(shouldSendWelcomeClass(new Date("2026-10-20T12:00:00Z"), new Date("2026-06-01T00:00:00Z"))).toBe(false);
  });
});
