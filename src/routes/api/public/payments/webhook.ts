import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";
import type { Database } from "@/integrations/supabase/types";

type SubStatus = Database["public"]["Enums"]["subscription_status"];

/** Stripe subscription status → profile subscription_status. */
export function mapStatus(s: string): SubStatus {
  switch (s) {
    case "trialing":
    case "active":
    case "past_due":
    case "incomplete":
      return s;
    case "unpaid":
      return "past_due";
    default:
      return "canceled";
  }
}

const iso = (sec: number | null | undefined) => (sec ? new Date(sec * 1000).toISOString() : null);

async function syncSubscription(sub: any, env: StripeEnv, deleted = false) {
  const userId = sub.metadata?.userId;
  if (!userId) return console.error("No userId in subscription metadata", sub.id);
  const item = sub.items?.data?.[0];
  const periodEnd = item?.current_period_end ?? sub.current_period_end;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
      stripe_subscription_id: sub.id,
      subscription_status: deleted ? "canceled" : mapStatus(sub.status),
      trial_ends_at: iso(sub.trial_end) ?? undefined,
      current_period_end: iso(periodEnd),
      ...(item?.price?.lookup_key && { billing_plan: item.price.lookup_key }),
    })
    .eq("id", userId);
  if (error) throw error;
  console.log(`[${env}] synced subscription ${sub.id} for ${userId}: ${sub.status}`);
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") return Response.json({ received: true, ignored: "invalid env" });
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);
          switch (event.type) {
            case "customer.subscription.created":
            case "customer.subscription.updated":
              await syncSubscription(event.data.object, env);
              break;
            case "customer.subscription.deleted":
              await syncSubscription(event.data.object, env, true);
              break;
            default:
              console.log("Unhandled event:", event.type);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
