import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * After an investor posts a deal: emails each matched realtor (the ones post_deal notified in-app)
 * a new-lead email, emails the investor the list of realtors matched to the deal's area,
 * and sends separate fixed-recipient operational notices for every posted property.
 */
export const emailDealMatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ dealId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    try {
      const { data: deal } = await context.supabase
        .from("deals")
        .select("id,investor_id,title,city,state,county,agent_need,asking_price,deal_type,referral_required,status,created_at")
        .eq("id", data.dealId)
        .maybeSingle();
      if (!deal || deal.investor_id !== context.userId) return { sent: 0 };
      // Only freshly posted, live deals trigger emails; retries are idempotent per deal/recipient.
      if (deal.status !== "live" || Date.now() - new Date(deal.created_at).getTime() > 30 * 60 * 1000) return { sent: 0 };
      // Plain, bounded title text: strip links/markup so posters cannot inject URLs into outbound mail.
      deal.title = deal.title.replace(/<[^>]*>/g, "").replace(/\b(?:https?:\/\/|www\.)\S+/gi, "").replace(/\s+/g, " ").trim().slice(0, 120) || "New property";
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: notes } = await supabaseAdmin.from("notifications").select("user_id").eq("link", `/deals/${deal.id}`);
      const ids = [...new Set((notes ?? []).map((n) => n.user_id).filter((id) => id !== deal.investor_id))];
      const { data: people } = await supabaseAdmin
        .from("profiles")
        .select("id,email,first_name,last_name,phone,brokerage_name")
        .in("id", [deal.investor_id, ...ids]);
      const inv = people?.find((p) => p.id === deal.investor_id);
      const realtors = (people ?? []).filter((p) => ids.includes(p.id));
      const name = (p?: { first_name: string | null; last_name: string | null }) =>
        [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim() || "Member";
      const area = [deal.county || deal.city, deal.state].filter(Boolean).join(", ");
      const dealUrl = `https://realtybridge.app/deals/${deal.id}`;
      const price = deal.asking_price != null ? `$${Number(deal.asking_price).toLocaleString("en-US")}` : "TBD";
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      let sent = 0;
      const propertyData = { dealTitle: deal.title, area, price, agentNeed: deal.agent_need, dealUrl, investorName: name(inv) };
      // Two distinct operational triggers, each locked to its intended recipient by the registry.
      await Promise.all([
        sendTemplateEmail("investor-property-posted-rica", "Rica@bzthree.com", {
          templateData: propertyData,
          idempotencyKey: `investor-property-posted-rica-${deal.id}`,
        }).then((result) => { if (result.sent) sent++; }).catch((e) => console.error("Rica property notification failed", e)),
        sendTemplateEmail("investor-property-posted-brock", "brock.zevan@gmail.com", {
          templateData: propertyData,
          idempotencyKey: `investor-property-posted-brock-${deal.id}`,
        }).then((result) => { if (result.sent) sent++; }).catch((e) => console.error("Brock property notification failed", e)),
      ]);
      await Promise.all(
        realtors.map(async (r) => {
          if (!r.email) return;
          try {
            // Free Realtors receive preview details only; full title and price require Pro.
            const { data: pro } = await supabaseAdmin.rpc("has_active_billing", { uid: r.id });
            await sendTemplateEmail("new-lead", r.email, {
              templateData: { name: r.first_name, dealTitle: pro ? deal.title : `Opportunity in ${deal.city}, ${deal.state}`, area, price: pro ? price : "Upgrade to RealtyBridge Pro to view", agentNeed: deal.agent_need, dealUrl, referralRequired: deal.referral_required },
              idempotencyKey: `new-lead-${deal.id}-${r.id}`,
            });
            sent++;
          } catch (e) {
            console.error("lead email failed", e);
          }
        }),
      );
      if (inv?.email) {
        try {
          await sendTemplateEmail("realtors-matched", inv.email, {
            templateData: {
              name: inv.first_name,
              dealTitle: deal.title,
              area,
              dealUrl,
              referralRequired: deal.referral_required,
              realtors: realtors.map((r) => ({ name: name(r), brokerage: r.brokerage_name })),
            },
            idempotencyKey: `realtors-matched-${deal.id}`,
          });
          sent++;
        } catch (e) {
          console.error("investor match email failed", e);
        }
      }
      return { sent };
    } catch (e) {
      console.error("deal match emails failed", e);
      return { sent: 0 };
    }
  });
