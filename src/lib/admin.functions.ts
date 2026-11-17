import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Grants free access (the RPC itself rejects non-admins), then emails the person a sign-in link. */
export const grantFreeAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ email: z.string().trim().email().max(255), note: z.string().trim().max(500).nullable(), role: z.enum(["realtor", "contractor"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_grant_free", { p_email: data.email, p_note: data.note as string, p_role: data.role });
    if (error) return { error: error.message, emailed: false };
    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      const r = await sendTemplateEmail("free-account", data.email.toLowerCase(), {
        templateData: { signInUrl: "https://realtybridge.app/login", note: data.note, role: data.role },
        idempotencyKey: `free-account-${data.email.toLowerCase()}-${new Date().toISOString().slice(0, 10)}`,
      });
      return { error: null, emailed: r.sent };
    } catch (e) {
      console.error("free account email failed", e);
      return { error: null, emailed: false };
    }
  });

/** Permanently deletes an investor or realtor account and everything tied to it. Admin only. */
export const deleteMemberAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) return { error: "Admins only" };
    if (data.userId === context.userId) return { error: "You can't delete your own account" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target, error: profileError } = await supabaseAdmin.from("profiles").select("role, stripe_customer_id, stripe_subscription_id").eq("id", data.userId).maybeSingle();
    if (profileError) return { error: profileError.message };
    if (!target) return { error: "Account not found" };
    if (target.role === "admin") return { error: "Admin accounts can't be deleted here" };
    try {
      const { cancelAccountBilling } = await import("@/lib/account-deletion.server");
      await cancelAccountBilling(data.userId, target);
      const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
      return { error: error ? `Billing has been canceled, but account deletion failed: ${error.message}. Please retry.` : null };
    } catch (error) {
      const { getStripeErrorMessage } = await import("@/lib/stripe.server");
      return { error: `Your account has not been deleted. ${getStripeErrorMessage(error)}` };
    }
  });

/** Lets an investor or realtor permanently delete their own account. Admin accounts are excluded. */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: me, error: profileError } = await context.supabase.from("profiles").select("role, stripe_customer_id, stripe_subscription_id").eq("id", context.userId).maybeSingle();
    if (profileError) return { error: profileError.message };
    if (!me) return { error: "Account not found" };
    if (me.role === "admin") return { error: "Admin accounts can't be deleted here" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    try {
      const { cancelAccountBilling } = await import("@/lib/account-deletion.server");
      await cancelAccountBilling(context.userId, me);
      const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
      return { error: error ? `Billing has been canceled, but account deletion failed: ${error.message}. Please retry.` : null };
    } catch (error) {
      const { getStripeErrorMessage } = await import("@/lib/stripe.server");
      return { error: `Your account has not been deleted. ${getStripeErrorMessage(error)}` };
    }
  });
