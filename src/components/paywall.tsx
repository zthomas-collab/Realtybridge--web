
import { Check, CreditCard, Lock, ScrollText, UserRound } from "lucide-react";
import { SubscribeButton } from "@/components/checkout";
import { MONTHLY_PRICE_USD, YEARLY_PRICE_USD, type PaywallBlock } from "@/lib/domain/paywall";
import { ButtonLink, Card } from "@/components/ui";

const ICON = {
  not_investor: <Lock />,
  terms_required: <ScrollText />,
  profile_incomplete: <UserRound />,
  billing_required: <CreditCard />,
  trial_expired: <CreditCard />,
};

const TITLE = {
  not_investor: "Investor accounts only",
  terms_required: "Accept the conduct agreement first",
  profile_incomplete: "Finish your profile to post deals",
  billing_required: "Upgrade to RealtyBridge Pro",
  trial_expired: "Your Pro access has ended",
};

export function PaywallGate({ block }: { block: PaywallBlock }) {
  const isBilling = block.code === "billing_required" || block.code === "trial_expired";

  return (
    <Card className="mx-auto max-w-xl overflow-hidden">
      <div className="bg-gradient-to-b from-brand-50 to-white px-6 pt-8 pb-6 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm ring-1 ring-border [&_svg]:size-6">{ICON[block.code]}</div>
        <h1 className="text-xl font-semibold">{TITLE[block.code]}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">{block.message}</p>
      </div>

      {isBilling && (
        <div className="px-6 pb-2">
          <div className="rounded-[var(--radius-card)] border border-border p-5">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-semibold">${MONTHLY_PRICE_USD}</span>
              <span className="text-muted">/month</span>
            </div>
            <p className="mt-1 text-sm font-medium text-emerald-700">or ${YEARLY_PRICE_USD}/year — save $25. No trial, cancel anytime.</p>
            <ul className="mt-4 space-y-2 text-sm">
              {["Full deal addresses and descriptions nationwide", "Investor names, phone and email", "Express interest and message members", "Investor track records and reviews"].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="size-4 text-brand-600" /> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 px-6 py-5">
        {isBilling ? (
          <>
            <SubscribeButton size="lg" interval="month">Go Pro — ${MONTHLY_PRICE_USD}/month</SubscribeButton>
            <SubscribeButton size="lg" interval="year" variant="secondary">Go Pro — ${YEARLY_PRICE_USD}/year</SubscribeButton>
          </>
        ) : "href" in block ? (
          <ButtonLink href={block.href} size="lg">
            Continue
          </ButtonLink>
        ) : (
          <ButtonLink href="/dashboard" size="lg" variant="secondary">
            Back to dashboard
          </ButtonLink>
        )}
        {isBilling && <p className="text-center text-xs text-muted">Secure payment by Stripe. Cancel anytime from Settings.</p>}
      </div>
    </Card>
  );
}
