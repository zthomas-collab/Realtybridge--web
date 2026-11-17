import { useQuery } from "@tanstack/react-query";
import { Hammer, Home, Mail, Phone } from "lucide-react";
import { api } from "@/lib/api";
import { hasActiveBilling, isProfileComplete, TRIAL_DAYS, trialDaysLeft } from "@/lib/domain/paywall";
import { CONTRACTOR_MONTHLY_PRICE_USD } from "@/lib/domain/contractors";
import { formatUsPhone } from "@/lib/domain/phone";
import { stateName } from "@/lib/domain/states";
import type { Profile } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { ConnectionsPrompt, LocationInfo, LocationReminder, PROFILE_LOCATION_HREF, hasLocation } from "@/components/community";
import { Alert, Badge, ButtonLink, Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui";

export function ContractorDashboard({ me }: { me: Profile }) {
  const active = hasActiveBilling(me);
  const days = trialDaysLeft(me);
  const ready = isProfileComplete(me) && (me.contractor_services?.length ?? 0) > 0;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Contractor dashboard" description="Investors see you at the bottom of their deals in the areas you cover." />
      <LocationReminder me={me} />
      {!ready && (
        <Alert tone="blue" title="Finish your profile" action={<ButtonLink href="/profile">Go to profile</ButtonLink>}>
          Add your phone, service area and the services you offer so investors can find you.
        </Alert>
      )}
      {!active && (
        <Alert tone="red" title={me.subscription_status === "none" ? "Start your free trial to be listed" : "Your listing is hidden"} action={<ButtonLink href="/settings#billing">Billing</ButtonLink>}>
          Contractor listings are ${CONTRACTOR_MONTHLY_PRICE_USD}/month after a {TRIAL_DAYS}-day free trial. The trial begins only when you subscribe and complete checkout. No platform access until your trial or subscription is active.
        </Alert>
      )}
      <Card>
        <CardHeader title={<span className="flex items-center gap-2"><Hammer className="size-4 text-slate-400" /> Your listing</span>} />
        <CardBody className="space-y-2 text-sm">
          <p>Status: <span className="font-medium">{active ? (days != null ? `Listed — free trial, ${days} day${days === 1 ? "" : "s"} left` : "Listed") : "Not listed"}</span></p>
          <p>Service area: {me.markets.length ? me.markets.map(stateName).join(", ") : "None yet"}</p>
          <p>Services: {me.contractor_services?.length ?? 0} selected</p>
        </CardBody>
      </Card>
      {active && <AreaDeals located={hasLocation(me)} />}
      <ConnectionsPrompt me={me} />
    </div>
  );
}

function AreaDeals({ located }: { located: boolean }) {
  const { data } = useQuery({ queryKey: ["contractor-area-deals"], queryFn: api.dealsForContractor });
  if (!data) return null;
  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-2"><Home className="size-4 text-slate-400" /> Property connections in your area <LocationInfo /></span>}
        description={data.length ? `${data.length} active propert${data.length === 1 ? "y" : "ies"} where you're shown to the investor` : undefined}
      />
      {data.length === 0 ? (
        located ? (
          <EmptyState icon={<Home />} title="No Matching Deals Right Now" description="Try expanding your search area or adjusting your filters to discover more opportunities." />
        ) : (
          <EmptyState icon={<Home />} title="Let's Find Your Next Opportunity!" description="Set your location to discover deals and connections in your area." action={<ButtonLink href={PROFILE_LOCATION_HREF}>Complete My Profile</ButtonLink>} />
        )
      ) : (
        <ul className="divide-y divide-border">
          {data.map((d) => (
            <li key={d.id} className="flex flex-col gap-2 px-5 py-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{d.title}</p>
                {d.in_county && <Badge tone="green">In your county</Badge>}
              </div>
              <p className="text-xs text-muted">
                {d.city}, {d.state}{d.county ? ` · ${d.county} County` : ""} · {timeAgo(d.created_at)}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span>Investor: {d.investor_name || "Member"}</span>
                {d.investor_phone && <a href={`tel:${d.investor_phone}`} className="flex items-center gap-1.5 text-brand-600 hover:underline"><Phone className="size-4" /> {formatUsPhone(d.investor_phone)}</a>}
                <a href={`mailto:${d.investor_email}`} className="flex items-center gap-1.5 text-brand-600 hover:underline"><Mail className="size-4" /> {d.investor_email}</a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
