
import { Bell, CreditCard, Trash2, ExternalLink, ScrollText } from "lucide-react";
import { useRouter, useSearchParams } from "@/lib/next/navigation";
import { Suspense, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { keys, useAction, useMe } from "@/lib/hooks";
import { hasActiveBilling, hasPlatformAccess, TRIAL_DAYS, trialDaysLeft, YEARLY_PRICE_USD } from "@/lib/domain/paywall";
import { monthlyPriceForRoles } from "@/lib/domain/contractors";
import type { Profile, SubscriptionStatus } from "@/lib/types";
import { Alert, Badge, Button, Card, CardBody, CardHeader, PageHeader, PageLoader, Switch } from "@/components/ui";
import { toast } from "@/components/toast";
import { SubscribeButton, UpgradeButton } from "@/components/checkout";
import { PasswordSettings } from "@/components/password-settings";

export default function SettingsPage() {
  const { data: me } = useMe();
  const router = useRouter();
  if (!me) return <PageLoader />;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Settings" />
      {!hasPlatformAccess(me) && (
        <Alert tone="yellow" title="No platform access — subscription required">
          Creating an account does not unlock RealtyBridge or start your free trial. Your {TRIAL_DAYS}-day free trial begins only when you subscribe and complete checkout. You cannot view properties, leads, connections, or member profiles until your subscription or free trial is active. After your trial ends, payment is required to keep access. You can still manage billing, reset your password, or delete your account here.
        </Alert>
      )}
      <Notifications me={me} />
      <PasswordSettings email={me.email} />
      <Legal me={me} />
      {(me.roles?.length ? me.roles : [me.role]).some((r) => r === "realtor" || r === "contractor") && (
        <Suspense>
          <Billing me={me} />
        </Suspense>
      )}
      {hasPlatformAccess(me) && <Button onClick={() => router.push("/dashboard")}>Go to dashboard</Button>}
      {me.role !== "admin" && <DeleteAccount />}
    </div>
  );
}

function Notifications({ me }: { me: Profile }) {
  const toggle = useAction((v: boolean) => api.updateProfile({ push_notifications: v }), { success: "Preferences saved", invalidate: [keys.me] });
  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><Bell className="size-4 text-slate-400" /> Notifications</span>} />
      <CardBody className="flex items-center justify-between gap-6">
        <div>
          <p className="text-sm font-medium">Push notifications</p>
          <p className="text-sm text-muted">{me.role === "investor" ? "New realtor interest, matches and reviews." : "New deals in your markets, matches and reviews."}</p>
        </div>
        <Switch label="Push notifications" checked={me.push_notifications} disabled={toggle.isPending} onChange={(v) => toggle.mutate(v)} />
      </CardBody>
    </Card>
  );
}

function Legal({ me }: { me: Profile }) {
  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><ScrollText className="size-4 text-slate-400" /> Legal</span>} />
      <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Professional Conduct Agreement, Terms of Service &amp; Privacy Policy</p>
          <p className="text-sm text-muted">
            {me.terms_accepted_at
              ? `You accepted version ${me.terms_version} on ${new Date(me.terms_accepted_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`
              : "Not accepted yet."}
          </p>
        </div>
        <div className="flex gap-4">
          <a href="/terms" target="_blank" className="text-sm font-medium text-brand-600 hover:underline">
            Read the agreement
          </a>
          <a href="/terms#privacy" target="_blank" className="text-sm font-medium text-brand-600 hover:underline">
            Privacy Policy
          </a>
        </div>
      </CardBody>
    </Card>
  );
}

const STATUS: Record<SubscriptionStatus, { label: string; tone: "gray" | "blue" | "green" | "yellow" | "red" }> = {
  none: { label: "No subscription", tone: "gray" },
  trialing: { label: "Free trial", tone: "blue" },
  active: { label: "Active", tone: "green" },
  past_due: { label: "Payment failed", tone: "red" },
  canceled: { label: "Canceled", tone: "gray" },
  incomplete: { label: "Incomplete", tone: "yellow" },
};

function Billing({ me }: { me: Profile }) {
  const params = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const result = params.get("billing");
  useEffect(() => {
    if (result === "success") {
      toast.success("Payment submitted. Your access will unlock once confirmed.");
      // The payment confirmation arrives a moment later; refresh a few times.
      [2000, 5000, 10000].forEach((ms) => setTimeout(() => qc.invalidateQueries({ queryKey: keys.me }), ms));
    }
    if (result) router.replace("/settings#billing");
  }, [result, router, qc]);

  const myRoles = me.roles?.length ? me.roles : [me.role];
  const MONTHLY_PRICE_USD = monthlyPriceForRoles(myRoles);
  const isContractor = !myRoles.includes("realtor");
  const needsUpgrade = !me.complimentary && !!me.stripe_subscription_id && me.billing_plan === "contractor_monthly" && myRoles.includes("realtor");
  const portal = useAction(() => api.openBillingPortal());
  const days = trialDaysLeft(me);
  const active = hasActiveBilling(me);
  const s = STATUS[me.subscription_status];
  const expiredTrial = me.subscription_status === "trialing" && !active;

  const go = (url: string | null) => {
    if (url) window.open(url, "_blank");
  };

  return (
    <Card id="billing" className="scroll-mt-24">
      <CardHeader
        title={<span className="flex items-center gap-2"><CreditCard className="size-4 text-slate-400" /> Billing</span>}
        description={isContractor ? `RealtyBridge Contractor — $${MONTHLY_PRICE_USD}/month after a ${TRIAL_DAYS}-day free trial` : `RealtyBridge Pro — $${MONTHLY_PRICE_USD}/month or $${YEARLY_PRICE_USD}/year. No free trial.`}
        action={me.grandfathered_premium && !isContractor ? <Badge tone="green">Pro · Founding member</Badge> : me.complimentary ? <Badge tone="green">Free account</Badge> : <Badge tone={expiredTrial ? "red" : s.tone}>{expiredTrial ? "Trial ended" : s.label}</Badge>}
      />
      <CardBody className="space-y-4">
        {needsUpgrade && (
          <Alert tone="yellow" title="Upgrade to $25/month" action={<UpgradeButton>Upgrade plan</UpgradeButton>}>
            Your account now includes a Realtor profile, which needs the $25/month plan. Platform access is blocked until the upgrade is confirmed. Your Contractor profile stays included.
          </Alert>
        )}
        {me.grandfathered_premium && !isContractor && <p className="text-sm text-muted">You were with RealtyBridge before Pro launched, so you keep full Pro access free, permanently.</p>}
        {!isContractor && !active && (
          <Alert tone="blue" title="Upgrade to RealtyBridge Pro" action={<div className="flex flex-wrap gap-2"><SubscribeButton interval="month">$${MONTHLY_PRICE_USD}/month</SubscribeButton><SubscribeButton interval="year" variant="secondary">$${YEARLY_PRICE_USD}/year · save $25</SubscribeButton></div>}>
            Your free account shows deal previews. Pro unlocks full addresses and descriptions, investor names and contact info, messaging, and nationwide search. Canceling keeps Pro until the end of your paid period.
          </Alert>
        )}
        {me.complimentary && <p className="text-sm text-muted">You have free access to express interest in deals — no subscription needed.</p>}
        {isContractor && !me.complimentary && me.subscription_status === "none" && (
          <Alert tone="blue" title={`Subscribe to begin your ${TRIAL_DAYS}-day free trial`} action={<SubscribeButton>Subscribe &amp; begin trial</SubscribeButton>}>
            Your {TRIAL_DAYS}-day trial begins only after you subscribe and complete checkout, not when you create your account. Add a card and finish checkout to activate your trial and platform access; you won&apos;t be charged until your trial ends. After that, payment is required to keep access.
          </Alert>
        )}
        {days != null && active && (
          <p className="text-sm">
            Your trial ends in <span className="font-semibold">{days} day{days === 1 ? "" : "s"}</span>
            {me.trial_ends_at && ` (${new Date(me.trial_ends_at).toLocaleDateString("en-US", { month: "long", day: "numeric" })})`}. Then ${MONTHLY_PRICE_USD}/month. Payment is required after your trial to keep platform access.
          </p>
        )}
        {me.subscription_status === "active" && me.current_period_end && (
          <p className="text-sm">Next charge of ${MONTHLY_PRICE_USD} on {new Date(me.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.</p>
        )}
        {isContractor && !me.complimentary && (expiredTrial || me.subscription_status === "canceled" || me.subscription_status === "past_due" || me.subscription_status === "incomplete") && (
          <Alert tone="red" title="Platform access is locked" action={<SubscribeButton>{me.subscription_status === "incomplete" ? "Finish subscription" : "Subscribe"}</SubscribeButton>}>
            {me.subscription_status === "past_due" ? "Your payment failed, so you have no platform access. Update your payment method below; access returns once payment is confirmed." : `You have no platform access without an active subscription. Complete your $${MONTHLY_PRICE_USD}/month subscription below; access returns once activation is confirmed.`}
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          {me.stripe_customer_id && api.mode === "supabase" && (
            <>
              <Button variant="secondary" loading={portal.isPending} onClick={() => portal.mutate(undefined, { onSuccess: go })}>
                Change card or billing info <ExternalLink />
              </Button>
              {(me.subscription_status === "active" || me.subscription_status === "trialing" || me.subscription_status === "past_due") && (
                <Button variant="ghost" loading={portal.isPending} onClick={() => portal.mutate(undefined, { onSuccess: go })}>
                  Cancel subscription <ExternalLink />
                </Button>
              )}
            </>
          )}
          {api.demo && me.subscription_status === "trialing" && active && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                api.demo?.expireTrial();
                router.refresh();
                window.location.reload();
              }}
            >
              Demo: expire trial
            </Button>
          )}
        </div>
        <p className="text-xs text-muted">Payments are processed securely by Stripe. RealtyBridge never stores your card details.</p>
      </CardBody>
    </Card>
  );
}

function DeleteAccount() {
  const router = useRouter();
  const qc = useQueryClient();
  const del = useAction(() => api.deleteMyAccount(), { invalidate: [] });
  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><Trash2 className="size-4 text-slate-400" /> Delete account</span>} />
      <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">Cancel your subscription immediately and permanently remove your account, deals, matches, reviews and notifications. If cancellation fails, your account will not be deleted. This can&apos;t be undone.</p>
        <Button
          variant="danger"
          loading={del.isPending}
          onClick={() => {
            if (!window.confirm("Cancel your subscription immediately and permanently delete your RealtyBridge account? This can't be undone.")) return;
            del.mutate(undefined, { onSuccess: () => { qc.clear(); router.push("/login"); } });
          }}
        >
          Delete my account
        </Button>
      </CardBody>
    </Card>
  );
}
