import { createStripeClient, type StripeEnv } from "@/lib/stripe.server";

type BillingAccount = {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

const missingResource = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && error.code === "resource_missing";

/** Both payment modes must be cleared; deleting from preview must not orphan live billing. */
export async function cancelAccountBilling(userId: string, account: BillingAccount) {
  const environments: StripeEnv[] = [];
  if (process.env.STRIPE_SANDBOX_API_KEY) environments.push("sandbox");
  if (process.env.STRIPE_LIVE_API_KEY) environments.push("live");
  if (!environments.length && (account.stripe_customer_id || account.stripe_subscription_id)) {
    throw new Error("Billing is not configured; your account has not been deleted.");
  }

  for (const environment of environments) {
    const stripe = createStripeClient(environment);
    const customerIds = new Set<string>();
    const subscriptionIds = new Set<string>();
    // Metadata, never email, identifies every checkout customer belonging to this account.
    for await (const customer of stripe.customers.search({ query: `metadata['userId']:'${userId}'` })) {
      customerIds.add(customer.id);
    }
    if (account.stripe_customer_id) {
      try {
        const customer = await stripe.customers.retrieve(account.stripe_customer_id);
        if (!customer.deleted) {
          if (customer.metadata.userId !== userId) throw new Error("Billing account ownership could not be verified.");
          customerIds.add(customer.id);
        }
      } catch (error) {
        if (!missingResource(error)) throw error;
      }
    }
    if (account.stripe_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(account.stripe_subscription_id);
        if (subscription.metadata.userId !== userId) throw new Error("Subscription ownership could not be verified.");
        if (subscription.status !== "canceled" && subscription.status !== "incomplete_expired") subscriptionIds.add(subscription.id);
      } catch (error) {
        if (!missingResource(error)) throw error;
      }
    }
    for (const customer of customerIds) {
      // An unfinished checkout must not create a new subscription after deletion.
      for await (const session of stripe.checkout.sessions.list({ customer, status: "open" })) {
        await stripe.checkout.sessions.expire(session.id);
      }
      for await (const subscription of stripe.subscriptions.list({ customer, status: "all" })) {
        if (subscription.status !== "canceled" && subscription.status !== "incomplete_expired") subscriptionIds.add(subscription.id);
      }
    }
    for (const subscriptionId of subscriptionIds) {
      const canceled = await stripe.subscriptions.cancel(subscriptionId, { invoice_now: false, prorate: false });
      if (canceled.status !== "canceled") throw new Error("Subscription cancellation was not confirmed; your account has not been deleted.");
    }
  }
}