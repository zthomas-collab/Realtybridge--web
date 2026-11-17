import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { shouldSendWelcomeClass } from "@/lib/domain/welcome-class";

/** Sends the signed-in member their one-time welcome + Novations Class email (deduped per user). */
export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.auth.getUser();
    const user = data.user;
    if (!user?.email || !user.created_at) return { sent: false };
    if (!shouldSendWelcomeClass(new Date(), new Date(user.created_at))) return { sent: false };
    const name = (user.user_metadata?.first_name as string | undefined) || (user.user_metadata?.full_name as string | undefined)?.split(" ")[0];
    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      const r = await sendTemplateEmail("welcome-class", user.email, {
        templateData: { name, email: user.email },
        idempotencyKey: `welcome-class-${user.id}`,
      });
      return { sent: r.sent };
    } catch (e) {
      console.error("welcome email failed", e);
      return { sent: false };
    }
  });
