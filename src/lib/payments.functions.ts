import { createServerFn } from "@tanstack/react-start";
import type Stripe from "stripe";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";
import { priceIdForRoles } from "@/lib/domain/contractors";
import { TRIAL_DAYS } from "@/lib/domain/paywall";

export const INVESTOR_PRICE_ID = "investor_monthly";

type EnvInput = { environment: StripeEnv; returnUrl: string; interval?: "month" | "year" };

// Only send people back to RealtyBridge itself after checkout / billing portal.
function isAllowedReturnUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") return u.protocol === "http:" || u.protocol === "https:";
  if (u.protocol !== "https:") return false;
  return host === "realtybridge.app" || host === "www.realtybridge.app" || host.endsWith(".lovable.app");
}

const validate = (d: EnvInput) => {
  if (d.environment !== "sandbox" && d.environment !== "live") throw new Error("Invalid environment");
  if (typeof d.returnUrl !== "string" || !isAllowedReturnUrl(d.returnUrl)) throw new Error("Invalid return URL");
  if (d.interval !== undefined && d.interval !== "month" && d.interval !== "year") throw new Error("Invalid interval");
  return d;
};

/** Customers are tied to the account only by userId metadata — never adopted by email match. */
async function resolveOrCreateCustomer(stripe: Stripe, options: { email?: string; userId: string }): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");
  const found = await stripe.customers.search({ query: `metadata['userId']:'${options.userId}'`, limit: 1 });
  if (found.data[0]) return found.data[0].id;
  const created = await stripe.customers.create({ ...(options.email && { email: options.email }), metadata: { userId: options.userId } });
  return created.id;
}

/** Paid subscription checkout. First-time subscribers begin their trial only after completing checkout; nobody can subscribe twice. */
export const createInvestorCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validate)
  .handler(async ({ data, context }): Promise<{ clientSecret: string } | { error: string }> => {
    const { supabase, userId } = context;
    const { data: me } = await supabase
      .from("profiles")
      .select("role, roles, email, subscription_status, trial_ends_at, stripe_subscription_id")
      .eq("id", userId)
      .single();
    const basePrice = me ? priceIdForRoles(me.roles?.length ? me.roles : [me.role]) : null;
    if (!me || !basePrice) return { error: "Only realtor and contractor accounts can subscribe." };
    const isRealtorPlan = basePrice === "investor_monthly";
    const priceId = isRealtorPlan && data.interval === "year" ? "realtor_yearly" : basePrice;
    if (me.subscription_status === "active" || (me.subscription_status === "trialing" && me.stripe_subscription_id)) {
      return { error: "You already have an active subscription." };
    }
    // RealtyBridge Pro has no free trial; the Contractor plan keeps its trial.
    const giveTrial = !isRealtorPlan && !me.trial_ends_at && !me.stripe_subscription_id;
    try {
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [priceId] });
      const price = prices.data[0];
      if (!price) return { error: "Subscription price not found" };
      const customerId = await resolveOrCreateCustomer(stripe, { email: me.email, userId });
      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "subscription",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        metadata: { userId, managed_payments: "true" },
        subscription_data: { metadata: { userId }, ...(giveTrial && { trial_period_days: TRIAL_DAYS }) },
        managed_payments: { enabled: true },
      } as Stripe.Checkout.SessionCreateParams);
      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const createBillingPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validate)
  .handler(async ({ data, context }): Promise<{ url: string } | { error: string }> => {
    const { data: me } = await context.supabase.from("profiles").select("stripe_customer_id").eq("id", context.userId).single();
    if (!me?.stripe_customer_id) return { error: "No billing account yet" };
    try {
      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({ customer: me.stripe_customer_id, return_url: data.returnUrl });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Moves an existing $6 Contractor subscription onto the $25 plan once the account adds a Realtor profile. */
export const upgradeSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { environment: StripeEnv }) => {
    if (d.environment !== "sandbox" && d.environment !== "live") throw new Error("Invalid environment");
    return d;
  })
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    const { data: me } = await context.supabase.from("profiles").select("role, roles, stripe_subscription_id").eq("id", context.userId).single();
    const priceId = me ? priceIdForRoles(me.roles?.length ? me.roles : [me.role]) : null;
    if (!me?.stripe_subscription_id || !priceId) return { error: "No subscription to upgrade" };
    try {
      const stripe = createStripeClient(data.environment);
      const sub = await stripe.subscriptions.retrieve(me.stripe_subscription_id);
      if (sub.metadata?.userId !== context.userId) return { error: "Subscription not found" };
      const item = sub.items.data[0];
      if (item?.price.lookup_key === priceId) return { ok: true };
      const prices = await stripe.prices.list({ lookup_keys: [priceId] });
      const price = prices.data[0];
      if (!price || !item) return { error: "Subscription price not found" };
      await stripe.subscriptions.update(sub.id, { items: [{ id: item.id, price: price.id }], proration_behavior: "create_prorations" });
      return { ok: true };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
