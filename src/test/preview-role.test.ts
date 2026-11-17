import { describe, expect, it } from "vitest";
import { applyPreview } from "@/lib/preview-role";
import type { Profile } from "@/lib/types";

const base = { id: "1", email: "a@b.c" } as unknown as Profile;

describe("admin preview", () => {
  it("admins can preview as a realtor", () => {
    expect(applyPreview({ ...base, role: "admin" }, "realtor").role).toBe("realtor");
  });
  it("non-admins cannot switch roles", () => {
    expect(applyPreview({ ...base, role: "investor" }, "realtor").role).toBe("investor");
  });
});
