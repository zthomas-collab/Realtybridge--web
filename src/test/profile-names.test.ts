import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { fullName } from "@/lib/utils";

describe("profile owner names", () => {
  it("uses the saved owner's name instead of a placeholder", () => {
    const saved = { first_name: "Zach", last_name: "Thomas" };
    expect(fullName(saved)).toBe("Zach Thomas");
  });

  it("ignores whitespace around saved name parts", () => {
    expect(fullName({ first_name: " Zach ", last_name: " Thomas " })).toBe("Zach Thomas");
    expect(fullName({ first_name: " ", last_name: "Thomas" })).toBe("Thomas");
  });

  it("replaces incomplete account names when the saved profile is cached", () => {
    const client = new QueryClient();
    client.setQueryData(["me"], { first_name: null, last_name: null });
    client.setQueryData(["me"], { first_name: "Zach", last_name: "Thomas" });
    expect(fullName(client.getQueryData(["me"]))).toBe("Zach Thomas");
  });
});