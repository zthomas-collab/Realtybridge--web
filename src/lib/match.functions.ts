import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Accepts an interest as the caller (RPC enforces ownership), then emails both matched parties. */
export const acceptInterestAndNotify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ interestId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: match, error } = await context.supabase.rpc("accept_interest", { p_interest_id: data.interestId });
    if (error) return { error: error.message };
    const m = match as { id: string; deal_id: string; investor_id: string; realtor_id: string } | null;
    if (!m) return { error: null };
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const [{ data: deal }, { data: people }] = await Promise.all([
        supabaseAdmin.from("deals").select("title,address_line,city,state,zip,description,terms,referral_required").eq("id", m.deal_id).maybeSingle(),
        supabaseAdmin.from("profiles").select("id,email,first_name,last_name,phone,brokerage_name,license_number,license_state").in("id", [m.investor_id, m.realtor_id]),
      ]);
      const inv = people?.find((p) => p.id === m.investor_id);
      const rea = people?.find((p) => p.id === m.realtor_id);
      const name = (p?: { first_name: string | null; last_name: string | null }) => [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim() || "Member";
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      const dealUrl = `https://realtybridge.app/deals/${m.deal_id}`;
      if (deal?.referral_required) {
        // Referral notice exclusion only: never globally unsubscribe the member.
        const REFERRAL_NOTICE_EXCLUSIONS = new Set(['angela@thejaywhiteteam.com', 'zach@trunorthpropertypartners.com']);
        const receivesReferralNotice = (email?: string | null) =>
          Boolean(email) && !REFERRAL_NOTICE_EXCLUSIONS.has(email!.trim().toLowerCase());
        const address = [deal.address_line, deal.city, deal.state, deal.zip].filter(Boolean).join(', ');
        const investorData = { investorName: name(inv), investorEmail: inv?.email, investorPhone: inv?.phone };
        const shared = { dealTitle: deal.title, address, dealUrl, ...investorData };
        // Each event has its own fixed template and one expected recipient.
        await Promise.allSettled([
          rea?.email && receivesReferralNotice(rea.email) ? sendTemplateEmail('opportunity-selected', rea.email, { templateData: { ...shared, details: [deal.description, deal.terms].filter(Boolean).join('\n') }, idempotencyKey: `opportunity-selected-${m.id}` }) : Promise.resolve(),
          // Brock's brokerage referral notice is skipped when either party is referral-notice-excluded.
          receivesReferralNotice(rea?.email) && receivesReferralNotice(inv?.email)
            ? sendTemplateEmail('brokerage-referral', 'Brock.zevan@gmail.com', { templateData: { ...shared, realtorName: name(rea), brokerage: rea?.brokerage_name, realtorEmail: rea?.email, realtorPhone: rea?.phone, licenseNumber: rea?.license_number, licenseState: rea?.license_state }, idempotencyKey: `brokerage-referral-${m.id}` })
            : Promise.resolve(),
          inv?.email && receivesReferralNotice(inv.email) ? sendTemplateEmail('match-made', inv.email, { templateData: { dealTitle: deal.title, otherName: name(rea), otherRole: 'selected realtor', otherEmail: rea?.email, otherPhone: rea?.phone, dealUrl, referralRequired: true }, idempotencyKey: `match-made-${m.id}-${inv.id}` }) : Promise.resolve(),
        ]).then(results => { for (const result of results) if (result.status === 'rejected') console.error('selection email failed', result.reason); });
        return { error: null };
      }
      const sends = [
        [inv, rea, "realtor"],
        [rea, inv, "investor"],
      ] as const;
      await Promise.all(
        sends.map(async ([to, other, role]) => {
          if (!to?.email) return;
          try {
            await sendTemplateEmail("match-made", to.email, {
              templateData: { dealTitle: deal?.title, otherName: name(other), otherRole: role, otherEmail: other?.email, otherPhone: other?.phone, dealUrl },
              idempotencyKey: `match-made-${m.id}-${to.id}`,
            });
          } catch (e) {
            console.error("match email failed", e);
          }
        }),
      );
    } catch (e) {
      console.error("match notify failed", e);
    }
    return { error: null };
  });
