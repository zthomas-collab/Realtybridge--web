import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createStripe: vi.fn(), from: vi.fn(), rpc: vi.fn(), deleteUser: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const chain = { middleware: () => chain, inputValidator: () => chain, handler: (fn: unknown) => fn };
  return chain;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: mocks.from, auth: { admin: { deleteUser: mocks.deleteUser } } } }));
vi.mock("@/lib/stripe.server", () => ({ createStripeClient: mocks.createStripe, getStripeErrorMessage: (e: Error) => e.message }));

import { deleteMyAccount, deleteMemberAccount } from "@/lib/admin.functions";

const userId = "3c149a59-dbea-4a8a-aec6-3a36e278f514";
type Handler = (args: { data?: { userId: string }; context: { userId: string; supabase: { from: typeof mocks.from; rpc: typeof mocks.rpc } } }) => Promise<{ error: string | null }>;
const selfDelete = deleteMyAccount as unknown as Handler;
const adminDelete = deleteMemberAccount as unknown as Handler;
const context = { userId, supabase: { from: mocks.from, rpc: mocks.rpc } };
let account: { role: string; stripe_customer_id: string | null; stripe_subscription_id: string | null };
let stripe: ReturnType<typeof makeStripe>;

async function* rows<T>(values: T[]) { yield* values; }
function makeStripe() {
  return {
    customers: {
      search: vi.fn(() => rows([{ id: "cus_owned" }])),
      retrieve: vi.fn(async () => ({ id: "cus_owned", deleted: false, metadata: { userId } })),
    },
    subscriptions: {
      retrieve: vi.fn(async () => ({ id: "sub_owned", status: "active", metadata: { userId } })),
      list: vi.fn(() => rows([{ id: "sub_owned", status: "active" }])),
      cancel: vi.fn(async () => ({ status: "canceled" })),
    },
    checkout: { sessions: { list: vi.fn(() => rows([{ id: "cs_open" }])), expire: vi.fn(async () => ({})) } },
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("STRIPE_SANDBOX_API_KEY", "configured");
  vi.stubEnv("STRIPE_LIVE_API_KEY", "");
  account = { role: "realtor", stripe_customer_id: "cus_owned", stripe_subscription_id: "sub_owned" };
  stripe = makeStripe();
  mocks.createStripe.mockReturnValue(stripe);
  mocks.rpc.mockResolvedValue({ data: true });
  mocks.from.mockImplementation(() => {
    const chain = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: account, error: null }) };
    return chain;
  });
  mocks.deleteUser.mockResolvedValue({ error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe("account deletion billing pipeline", () => {
  it.each(["member", "admin"])("%s deletion cancels billing and expires checkout before deleting the account", async (path) => {
    const result = path === "member" ? await selfDelete({ context }) : await adminDelete({ context: { ...context, userId: "admin" }, data: { userId } });
    expect(result.error).toBeNull();
    expect(stripe.subscriptions.cancel).toHaveBeenCalledExactlyOnceWith("sub_owned", { invoice_now: false, prorate: false });
    expect(stripe.checkout.sessions.expire).toHaveBeenCalledWith("cs_open");
    expect(stripe.subscriptions.cancel.mock.invocationCallOrder[0]).toBeLessThan(mocks.deleteUser.mock.invocationCallOrder[0]);
    expect(mocks.deleteUser).toHaveBeenCalledWith(userId);
  });
  it("retains the account when subscription cancellation fails", async () => {
    stripe.subscriptions.cancel.mockRejectedValue(new Error("Stripe temporarily unavailable"));
    expect((await selfDelete({ context })).error).toContain("Stripe temporarily unavailable");
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
  it("retains the account when open checkout cannot be expired", async () => {
    stripe.checkout.sessions.expire.mockRejectedValue(new Error("Checkout expiration failed"));
    expect((await selfDelete({ context })).error).toContain("Checkout expiration failed");
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
  it("clears both live and test subscriptions before deleting", async () => {
    vi.stubEnv("STRIPE_LIVE_API_KEY", "configured");
    await selfDelete({ context });
    expect(mocks.createStripe.mock.calls).toEqual([["sandbox"], ["live"]]);
    expect(stripe.subscriptions.cancel).toHaveBeenCalledTimes(2);
    expect(mocks.deleteUser).toHaveBeenCalledTimes(1);
  });
  it("finds subscriptions before profile billing identifiers are synced", async () => {
    account.stripe_customer_id = null;
    account.stripe_subscription_id = null;
    await selfDelete({ context });
    expect(stripe.customers.search).toHaveBeenCalledWith({ query: `metadata['userId']:'${userId}'` });
    expect(stripe.subscriptions.cancel).toHaveBeenCalledWith("sub_owned", expect.anything());
  });
  it("deletes a free investor without any subscription", async () => {
    account = { role: "investor", stripe_customer_id: null, stripe_subscription_id: null };
    stripe.customers.search.mockImplementation(() => rows([]));
    await selfDelete({ context });
    expect(stripe.subscriptions.cancel).not.toHaveBeenCalled();
    expect(mocks.deleteUser).toHaveBeenCalledWith(userId);
  });
  it("skips already canceled subscriptions so deletion can be retried", async () => {
    stripe.subscriptions.retrieve.mockResolvedValue({ id: "sub_owned", status: "canceled", metadata: { userId } });
    stripe.subscriptions.list.mockImplementation(() => rows([{ id: "sub_owned", status: "canceled" }]));
    await selfDelete({ context });
    expect(stripe.subscriptions.cancel).not.toHaveBeenCalled();
    expect(mocks.deleteUser).toHaveBeenCalledWith(userId);
  });
  it("does not cancel a billing identifier belonging to another account", async () => {
    stripe.customers.retrieve.mockResolvedValue({ id: "cus_owned", deleted: false, metadata: { userId: "someone-else" } });
    expect((await selfDelete({ context })).error).toContain("ownership");
    expect(stripe.subscriptions.cancel).not.toHaveBeenCalled();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
  it("does not mistake a missing resource in test mode for a live cancellation", async () => {
    vi.stubEnv("STRIPE_LIVE_API_KEY", "configured");
    const testStripe = makeStripe();
    testStripe.customers.search.mockImplementation(() => rows([]));
    testStripe.customers.retrieve.mockRejectedValue({ code: "resource_missing" });
    testStripe.subscriptions.retrieve.mockRejectedValue({ code: "resource_missing" });
    mocks.createStripe.mockImplementation((env) => env === "sandbox" ? testStripe : stripe);
    await selfDelete({ context });
    expect(testStripe.subscriptions.cancel).not.toHaveBeenCalled();
    expect(stripe.subscriptions.cancel).toHaveBeenCalledWith("sub_owned", expect.anything());
    expect(mocks.deleteUser).toHaveBeenCalledWith(userId);
  });
  it("reports deletion failure after successful cancellation for safe retry", async () => {
    mocks.deleteUser.mockResolvedValue({ error: { message: "Deletion failed" } });
    expect((await selfDelete({ context })).error).toContain("Billing has been canceled");
    expect(stripe.subscriptions.cancel).toHaveBeenCalledTimes(1);
  });
  it("rejects unauthorized admin deletion before accessing payments", async () => {
    mocks.rpc.mockResolvedValue({ data: false });
    expect((await adminDelete({ context, data: { userId } })).error).toBe("Admins only");
    expect(mocks.createStripe).not.toHaveBeenCalled();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
  it("protects admin accounts from member deletion", async () => {
    account.role = "admin";
    expect((await selfDelete({ context })).error).toContain("Admin accounts");
    expect(mocks.createStripe).not.toHaveBeenCalled();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
});