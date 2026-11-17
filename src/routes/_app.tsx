import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/navbar";
import { TermsGate } from "@/components/terms-gate";
import { PaymentTestModeBanner } from "@/components/checkout";
import { useEffect } from "react";
import { sendWelcomeEmail } from "@/lib/welcome.functions";
import { api } from "@/lib/api";
import { hasPlatformAccess } from "@/lib/domain/paywall";
import { keys, useRealMe } from "@/lib/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, ButtonLink, PageLoader } from "@/components/ui";
import { isValidUsPhone } from '@/lib/domain/phone';
import SettingsPage from "@/screens/settings";

// Signed-in area. The session lives in the browser, so this subtree renders client-side only.
export const Route = createFileRoute("/_app")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login", search: { next: location.href } as never });
    const profile = await api.me();
    if (!hasPlatformAccess(profile) && location.pathname !== "/settings") {
      throw redirect({ to: "/settings", hash: "billing", replace: true });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const location = useLocation();
  const { data: me } = useRealMe();
  const qc = useQueryClient();
  const active = me ? hasPlatformAccess(me) : false;
  // Recheck billing on focus and when a trial expires, without waiting for navigation.
  useEffect(() => {
    const refresh = () => { void qc.invalidateQueries({ queryKey: keys.me }); };
    window.addEventListener("focus", refresh);
    const expires = me?.subscription_status === "trialing" && me.trial_ends_at
      ? new Date(me.trial_ends_at).getTime() - Date.now() : null;
    const timer = expires != null && expires > 0
      ? window.setTimeout(refresh, Math.min(expires + 100, 2_147_483_647)) : null;
    return () => {
      window.removeEventListener("focus", refresh);
      if (timer != null) window.clearTimeout(timer);
    };
  }, [qc, me?.subscription_status, me?.trial_ends_at]);
  // New members get the welcome + Novations Class email once (server dedupes per user).
  useEffect(() => {
    if (sessionStorage.getItem("rb_welcome_checked")) return;
    sessionStorage.setItem("rb_welcome_checked", "1");
    sendWelcomeEmail().catch(() => {});
  }, []);
  return (
    <>
      <PaymentTestModeBanner />
      {me && <Navbar restricted={!active} />}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {!me ? <PageLoader /> : !active ? <SettingsPage /> : (
          <TermsGate>
            {me.role !== 'admin' && !isValidUsPhone(me.phone ?? '') && location.pathname !== '/profile' && <div className="mb-6"><Alert tone="yellow" title="Complete your account contact" action={<ButtonLink href="/profile#contact" size="sm">Add phone number</ButtonLink>}>Add your phone number so members viewing your postings can reach you by phone or email.</Alert></div>}
            <Outlet />
          </TermsGate>
        )}
      </main>
    </>
  );
}
