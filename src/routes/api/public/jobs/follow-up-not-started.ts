import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

const DAY = 86_400_000;

/** Daily follow-ups for paid-profile members who never started a trial or subscription.
 *  finish-checkout: anyone signed up 3+ days ago (including older accounts).
 *  get-active: 7+ days after signup. Each sent once per member, recorded in member_followups. */
const STEPS = [
  { template: "finish-checkout", afterDays: 3 },
  { template: "get-active", afterDays: 7 },
] as const;

export const Route = createFileRoute("/api/public/jobs/follow-up-not-started")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
        const now = Date.now();
        let sent = 0;
        for (const step of STEPS) {
          const { data, error } = await supabaseAdmin
            .from("profiles")
            .select("id, email, roles, role")
            .eq("subscription_status", "none")
            .not("complimentary", "is", true)
            .lte("created_at", new Date(now - step.afterDays * DAY).toISOString());
          if (error) return Response.json({ error: error.message }, { status: 500 });
          const { data: done } = await supabaseAdmin
            .from("member_followups").select("user_id").eq("template", step.template);
          const already = new Set((done ?? []).map((d) => d.user_id));
          for (const p of data ?? []) {
            const roles: string[] = (p.roles as string[] | null) ?? [p.role as string];
            if (already.has(p.id) || !p.email || !roles.some((r) => r === "realtor" || r === "contractor")) continue;
            try {
              const r = await sendTemplateEmail(step.template, p.email, { idempotencyKey: `${step.template}-${p.id}` });
              if (r.sent || r.reason === "recipient_suppressed") {
                await supabaseAdmin.from("member_followups").insert({ user_id: p.id, template: step.template });
                if (r.sent) sent++;
              }
            } catch (e) {
              console.error("follow-up email failed", step.template, p.id, e);
            }
          }
        }
        return Response.json({ success: true, sent });
      },
    },
  },
});
