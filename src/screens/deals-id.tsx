import { canExpressInterest } from "@/lib/domain/paywall";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Ban, Bath, BedDouble, Check, CircleDollarSign, Handshake, Mail, MapPin, Phone, Ruler, Users, X } from "lucide-react";
import Link from "@/lib/next/link";
import { useState } from "react";
import { api, type DealDetail, type InterestWithRealtor } from "@/lib/api";
import { keys, useAction, useMe } from "@/lib/hooks";
import { formatUsPhone } from "@/lib/domain/phone";
import { stateName } from "@/lib/domain/states";
import type { Profile } from "@/lib/types";
import { formatMoney, formatPrice, fullName, timeAgo } from "@/lib/utils";
import { Alert, Avatar, Badge, Button, ButtonLink, Card, CardBody, CardHeader, Checkbox, Dialog, EmptyState, Field, PageLoader, Textarea } from "@/components/ui";
import { AgentNeedBadge, DealStatusBadge } from "@/components/badges";
import { canLeaveReview, outcomeState } from "@/lib/domain/match-outcome";
import type { Match, MatchOutcome } from "@/lib/types";
import { AGENT_NEED_COPY } from "@/lib/domain/agent-need";
import { RatingInline } from "@/components/stars";
import { SuccessRateBar, SuccessRateInline } from "@/components/track-record";
import { ServiceChips } from "@/components/services";
import { DealContractors } from "@/components/deal-contractors";
import { DealRealtors } from "@/components/deal-realtors";
import { offersServiceFor, servicesForNeed } from "@/lib/domain/services";
import { DEAL_TYPE_LABEL } from "@/lib/domain/deal-type";
import { AGREEMENT_LABELS, REFERRAL_ACKNOWLEDGMENT } from '@/lib/domain/referral';
import { TransactionProgress } from '@/components/transaction-progress';

export default function DealPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: me } = useMe();
  const { data, error } = useQuery({ queryKey: keys.deal(id), queryFn: () => api.getDeal(id) });

  if (error)
    return (
      <Card>
        <EmptyState icon={<X />} title="Deal unavailable" description={error.message} action={<ButtonLink href="/dashboard" variant="secondary">Back to dashboard</ButtonLink>} />
      </Card>
    );
  if (!data || !me) return <PageLoader />;

  const isOwner = data.deal.investor_id === me.id;
  const d = data.deal;

  return (
    <div className="space-y-6">
      <Link href={me.role === "realtor" && !data.my_interest ? "/browse" : "/deals"} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Back
      </Link>

      {isOwner && d.status === 'live' && !data.match && <Alert title="Next step: choose your Realtor" tone="blue">
        {data.interests.some(i => i.status === 'interested') ? 'A Realtor has expressed interest. Select your Realtor below to mark this property as matched and assign them to your file.' : 'Your property is awaiting Realtor interest. Local profiles are not matches; choose from Realtors who submit interest below.'} Once selected, call or email each other to agree on next steps.
      </Alert>}
      {!isOwner && me.role === 'realtor' && d.status === 'live' && !data.match && (!data.my_interest || data.my_interest.status === 'withdrawn') && <Alert title="Next step: express interest in this property" tone="blue">Review the property and investor, then submit your interest below. Your interest tells the investor you want to work together; their selection marks the property matched and shares your contact details.</Alert>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardBody>
              <div className="flex flex-wrap items-center gap-2">
                <AgentNeedBadge need={d.agent_need} />
                {d.deal_type && <Badge tone="gray">{DEAL_TYPE_LABEL[d.deal_type] ?? d.deal_type}</Badge>}
                <DealStatusBadge status={d.status} />
                <span className="text-xs text-muted">Posted {timeAgo(d.created_at)}</span>
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight">{d.title}</h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                <MapPin className="size-4" />
                {d.address_line ? `${d.address_line}, ` : ""}
                {d.city}{d.county ? `, ${d.county}` : ""}, {stateName(d.state)} {d.zip}
              </p>
              {!d.address_line && !isOwner && <p className="mt-1 text-xs text-muted">The street address is shared once you&apos;re matched.</p>}

              <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
                <Stat icon={<CircleDollarSign />} label={AGENT_NEED_COPY[d.agent_need].priceLabel} value={formatPrice(d.asking_price)} />
                <Stat icon={<CircleDollarSign />} label="ARV" value={formatMoney(d.arv)} />
                <Stat icon={<BedDouble />} label="Beds" value={d.beds ?? "—"} />
                <Stat icon={<Bath />} label="Baths" value={d.baths ?? "—"} />
                <Stat icon={<Ruler />} label="Sq ft" value={d.sqft?.toLocaleString() ?? "—"} />
              </dl>
            </CardBody>
          </Card>

          {isOwner && <OwnerActions data={data} />}
          {data.match && (isOwner || data.match.realtor_id === me.id) && <TransactionProgress data={data} userId={me.id} />}

          {(d.terms || d.description) && (
            <Card>
              <CardBody className="space-y-5">
                {d.terms && (
                  <section>
                    <h2 className="text-sm font-semibold">{AGENT_NEED_COPY[d.agent_need].termsLabel}</h2>
                    <p className="mt-1 text-sm whitespace-pre-line text-slate-700">{d.terms}</p>
                  </section>
                )}
                {d.description && (
                  <section>
                    <h2 className="text-sm font-semibold">Description</h2>
                    <p className="mt-1 text-sm whitespace-pre-line text-slate-700">{d.description}</p>
                  </section>
                )}
              </CardBody>
            </Card>
          )}

          {isOwner && <InterestedRealtors data={data} />}
          {isOwner && <DealRealtors dealId={d.id} area={`${d.county || d.city}, ${stateName(d.state)}`} />}
          {(isOwner || (me.role === "realtor" && data.match?.realtor_id === me.id && data.match.status !== "cancelled")) && <DealContractors dealId={d.id} />}
        </div>

        <aside className="space-y-6">
          {data.match && <MatchCard data={data} me={me} />}
          {!isOwner && <InvestorCard data={data} showContact={me.role === 'realtor'} />}
          {me.role === "realtor" && !data.match && <ExpressInterest data={data} me={me} />}
        </aside>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-xs text-muted [&_svg]:size-3.5">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 text-base font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

// ───────────── Investor: interested realtors ─────────────

function InterestedRealtors({ data }: { data: DealDetail }) {
  const [blocking, setBlocking] = useState<InterestWithRealtor | null>(null);
  const [selecting, setSelecting] = useState<InterestWithRealtor | null>(null);
  const accept = useAction((id: string) => api.acceptInterest(id), { success: "Matched! Contact details are now shared." });
  const decline = useAction((id: string) => api.declineInterest(id), { success: "Interest declined" });
  const open = data.interests.filter((i) => i.status === "interested");
  const closed = data.interests.filter((i) => i.status !== "interested");

  return (
    <Card>
      <CardHeader title="Choose your Realtor" description={`Select an interested Realtor to mark this property matched. Ratings shown are for ${stateName(data.deal.state)}.`} action={<Badge tone="purple">{data.interests.length} {data.deal.referral_required ? 'applications' : 'interested'} · {open.length} waiting</Badge>} />
      {data.interests.length === 0 ? (
        <EmptyState icon={<Users />} title="No interest yet" description={data.deal.status === "live" ? "Licensed agents in this market can see your deal. You'll be notified when someone raises their hand." : "Agents can express interest once your deal is live."} />
      ) : (
        <ul className="divide-y divide-border">
          {[...open, ...closed].map((i) => (
            <li key={i.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
              <Avatar person={i.realtor} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/realtors/${i.realtor.id}`} className="font-medium hover:text-brand-600 hover:underline">
                    {fullName(i.realtor)}
                  </Link>
                  {i.status === "accepted" && <Badge tone="green">Selected · Matched</Badge>}
                  {i.status === "declined" && <Badge>{data.deal.referral_required ? 'Not selected' : 'Declined'}</Badge>}
                </div>
                <p className="text-xs text-muted">{i.realtor.brokerage_name}</p>
                {data.deal.referral_required && i.referral_acknowledged_at && <p className="mt-1 text-xs text-muted">25% brokerage referral acknowledged</p>}
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <RatingInline avg={i.realtor.avg_rating} count={i.realtor.review_count} size={12} />
                  <SuccessRateInline sold={i.realtor.closed_deals} cancelled={i.realtor.cancelled_deals} />
                </div>
                <ServiceChips services={i.realtor.services} highlight={servicesForNeed(data.deal.agent_need)} className="mt-2" />
                {i.realtor.services.length > 0 && !offersServiceFor(i.realtor.services, data.deal.agent_need) && (
                  <p className="mt-1 text-xs text-amber-700">
                    Doesn&apos;t list {data.deal.agent_need === "buyers_agent" ? "buyer's agent" : "novation, flat-fee or short-sale listing"} work
                  </p>
                )}
                {i.message && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">“{i.message}”</p>}
              </div>
              {i.status === "interested" && data.deal.status === "live" && (
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="ghost" aria-label={`Block ${fullName(i.realtor)}`} onClick={() => setBlocking(i)}>
                    <Ban />
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => decline.mutate(i.id)} disabled={decline.isPending}>
                    Decline
                  </Button>
                  <Button size="sm" onClick={() => setSelecting(i)} disabled={accept.isPending}>
                    <Check /> Select Realtor
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <Dialog open={!!selecting} onClose={() => { if (!accept.isPending) setSelecting(null); }} title="Select Realtor & mark matched?" description={selecting ? `${fullName(selecting.realtor)} · ${data.deal.title}` : undefined} footer={<>
        <Button variant="secondary" disabled={accept.isPending} onClick={() => setSelecting(null)}>Go back</Button>
        <Button loading={accept.isPending} disabled={!selecting || data.deal.status !== 'live'} onClick={() => {
          if (!selecting || data.deal.status !== 'live' || selecting.status !== 'interested') return;
          accept.mutate(selecting.id, { onSuccess: () => setSelecting(null) });
        }}><Handshake /> Confirm match</Button>
      </>}>
        <p className="text-sm text-muted">This selects this Realtor for your file, marks the property as matched, and shares contact details with both of you. Other interested Realtors will not be selected. Call or email your selected Realtor next.</p>
      </Dialog>
      <BlockDialog interest={blocking} dealId={data.deal.id} dealTitle={data.deal.title} onClose={() => setBlocking(null)} />
    </Card>
  );
}

function BlockDialog({ interest, dealId, dealTitle, onClose }: { interest: InterestWithRealtor | null; dealId: string; dealTitle: string; onClose: () => void }) {
  const [everywhere, setEverywhere] = useState(false);
  const [reason, setReason] = useState("");
  const block = useAction(
    async () => {
      if (!interest) return;
      await api.blockUser(interest.realtor_id, everywhere ? null : dealId, reason.trim() || null);
      await api.declineInterest(interest.id);
    },
    { success: "Realtor blocked" },
  );
  return (
    <Dialog
      open={!!interest}
      onClose={onClose}
      title={`Block ${interest ? fullName(interest.realtor) : ""}?`}
      description="They won't be notified. You can unblock them any time from Blocked Realtors."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" loading={block.isPending} onClick={() => block.mutate(undefined, { onSuccess: onClose })}>
            Block
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Checkbox id="block-all" checked={everywhere} onChange={setEverywhere}>
          <span className="font-medium text-ink">Hide all my future deals from this realtor</span>
          <span className="block text-muted">Otherwise they&apos;re only blocked from “{dealTitle}”.</span>
        </Checkbox>
        <Field label="Reason (private, optional)" htmlFor="block-reason">
          <Textarea id="block-reason" className="min-h-16" value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}

function OwnerActions({ data }: { data: DealDetail }) {
  const withdraw = useAction(() => api.withdrawDeal(data.deal.id), { success: "Deal withdrawn" });
  const d = data.deal;
  return (
    <Card>
      <CardHeader title="Deal status" />
      <CardBody className="space-y-3 text-sm">
        {d.status === "rejected" && <Alert tone="red" title="Not approved">{d.rejection_reason ?? "Contact support for details."}</Alert>}
        {d.status === "live" && (
          <p className="text-muted">
            Live. Agents in {stateName(d.state)} were notified that you need a {d.agent_need === "buyers_agent" ? "buyer's" : "listing"} agent.
          </p>
        )}
        {d.status === "matched" && <p className="text-muted">Matched — your selected Realtor is assigned to this file. Call or email them using the contact details above. When the file ends, report sold or cancelled and leave your review immediately. The final status waits for both reports to agree or admin resolution.</p>}
        {d.status === "withdrawn" && <p className="text-muted">Withdrawn. Agents can no longer see this deal.</p>}
        {d.status === "sold" && <Alert tone="green" title="Sold">Closed {d.sold_at ? timeAgo(d.sold_at) : ""}. Don&apos;t forget to leave a review.</Alert>}
        {d.status === "live" && (
          <Button variant="secondary" className="w-full" loading={withdraw.isPending} onClick={() => confirm("Withdraw this deal? Agents will no longer see it.") && withdraw.mutate(undefined)}>
            Withdraw deal
          </Button>
        )}
      </CardBody>
    </Card>
  );
}

// ───────────── Shared: match ─────────────

function MatchCard({ data, me }: { data: DealDetail; me: Profile }) {
  const m = data.match;
  const contact = useQuery({ queryKey: ['contact', m?.id], queryFn: () => m ? api.matchContact(m.id) : Promise.resolve(null), enabled: !!m });
  if (!m) return null;
  const other = m.investor_id === me.id ? m.realtor : m.investor;
  const pendingReferral = m.status === "active" && data.referral && data.referral.agreement_status !== "signed";
  const heading = m.status === "completed" ? "Sold with" : m.status === "cancelled" ? "Previously matched with" : pendingReferral ? "Connection pending" : data.referral ? "Accepted connection" : "Matched with";

  return (
    <Card className="border-brand-200">
      <CardHeader title={<span className="flex items-center gap-2"><Handshake className="size-4 text-brand-600" /> {heading} {m.status === "active" && data.referral && <Badge tone={pendingReferral ? "yellow" : "green"}>{pendingReferral ? "Pending" : "Accepted"}</Badge>}</span>} />
      <CardBody className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar person={other} size={44} />
          <div className="min-w-0">
            <Link href={m.investor_id === me.id ? `/realtors/${other.id}` : `/investors/${other.id}`} className="font-medium hover:text-brand-600 hover:underline">{fullName(other)}</Link>
            <p className="truncate text-xs text-muted">{other.role === "realtor" ? other.brokerage_name : other.company_name}</p>
          </div>
        </div>
        {pendingReferral && (
          <Alert tone="yellow" title="Next steps">
            <p>{me.id === m.realtor_id
              ? "Congratulations! The investor has chosen you as the agent. Check your email inbox and spam folder for the referral agreement. Feel free to reach out to the investor using the contact information below to discuss the property!"
              : me.id === m.investor_id
                ? "Congratulations on your selected agent! Reach out using the contact information below to discuss the property."
                : "The investor has selected their agent. Both parties can reach out using their shared contact information while the agreements are prepared."}</p>
            <p className="mt-2">The connection stays pending while the referral and listing agreements are being signed.</p>
            <p className="mt-2">The Realtor should check their email inbox and spam folder for the referral agreement. If there are any issues, contact <a href="mailto:realtybridgeadmin@gmail.com" className="font-medium underline break-all">realtybridgeadmin@gmail.com</a>.</p>
          </Alert>
        )}
        {!pendingReferral && m.status === "active" && !m.investor_outcome && !m.realtor_outcome && (
          <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm">
            <p className="font-medium text-brand-700">You're connected — reach out to {other.first_name ?? "your match"} now!</p>
            <p className="mt-1 text-muted">
              {m.investor_id === me.id
                ? "Call or email your Realtor to introduce yourself and talk through next steps on this deal."
                : "Call or email the investor to introduce yourself and talk through next steps on this deal."}
            </p>
          </div>
        )}
        {contact.data && (
          <div className="space-y-1.5 text-sm">
            <a href={`mailto:${contact.data.email}`} className="flex items-center gap-2 text-brand-600 hover:underline">
              <Mail className="size-4" /> {contact.data.email}
            </a>
            {contact.data.phone ? (
              <a href={`tel:${contact.data.phone}`} className="flex items-center gap-2 text-brand-600 hover:underline">
                <Phone className="size-4" /> {formatUsPhone(contact.data.phone)}
              </a>
            ) : (
              <p className="flex items-center gap-2 text-muted">
                <Phone className="size-4" /> No phone number on file yet
              </p>
            )}
          </div>
        )}
        <OutcomePanel match={m} me={me} otherName={other.first_name ?? "Your match"} />
        {data.referral && <div className="space-y-2 border-t border-border pt-4">
          <p className="text-sm font-medium">Brokerage referral agreement <Badge>{AGREEMENT_LABELS[data.referral.agreement_status]}</Badge></p>
          {data.referral.agreement_status !== 'signed' ? (
            <Alert tone="yellow" title="Referral agreement not signed yet">
              The 25% brokerage referral agreement must be signed before this file can close. Check your email inbox and spam folder, sign it promptly, and RealtyBridge will check it off here once received. If there are any issues, contact <a href="mailto:realtybridgeadmin@gmail.com" className="font-medium underline break-all">realtybridgeadmin@gmail.com</a>.
            </Alert>
          ) : (
            <Alert tone="green" title="Referral agreement signed">
              The 25% brokerage referral agreement is signed and on file.
            </Alert>
          )}
          <p className="text-xs text-muted">A separate 25% brokerage referral agreement is prepared and sent for signatures. The referral is based on the executed agreement’s commission terms, not sale price.</p>
        </div>}
      </CardBody>
    </Card>
  );
}

/**
 * Two-party close-out: each side reports sold or cancelled, and the match only closes when both agree.
 * Disagreements go to an admin.
 */
function OutcomePanel({ match: m, me, otherName }: { match: Match; me: Profile; otherName: string }) {
  const report = useAction((outcome: MatchOutcome) => api.reportMatchOutcome(m.id, outcome), { success: "Your answer was recorded" });
  const s = outcomeState(m, me.id);
  const label = (o: MatchOutcome) => (o === "sold" ? "sold" : "cancelled");
  const busy = (o: MatchOutcome) => report.isPending && report.variables === o;

  if (s.kind === "closed") {
    return (
      <div className="space-y-3 border-t border-border pt-4">
        <Alert tone={s.outcome === "sold" ? "green" : "blue"} title={s.outcome === "sold" ? "Confirmed sold by both parties" : "Confirmed cancelled by both parties"}>
          {s.byAdmin ? "Resolved by a RealtyBridge admin." : null}
        </Alert>
        <ButtonLink href="/reviews" variant="secondary" className="w-full">
          Leave a review
        </ButtonLink>
      </div>
    );
  }

  const buttons = (primary: MatchOutcome | null) => (
    <div className="flex flex-col gap-2">
      <Button variant={primary === "cancelled" ? "secondary" : "success"} loading={busy("sold")} disabled={report.isPending} onClick={() => report.mutate("sold")}>
        <Check /> {primary === "sold" ? "Confirm sold" : "Report sold"}
      </Button>
      <Button variant={primary === "cancelled" ? "danger" : "ghost"} size={primary === "cancelled" ? "md" : "sm"} loading={busy("cancelled")} disabled={report.isPending} onClick={() => report.mutate("cancelled")}>
        {primary === "cancelled" ? "Confirm cancelled" : "Report cancelled"}
      </Button>
    </div>
  );

  return (
    <div className="space-y-3 border-t border-border pt-4">
      {s.kind === "awaiting_both" && (
        <>
          <p className="text-sm text-muted">File closed? Report sold or cancelled, then review {otherName} right away. The final deal count waits for matching reports, but your review does not.</p>
          {buttons(null)}
        </>
      )}
      {s.kind === "awaiting_you" && (
        <>
          <Alert tone="yellow" title={`${otherName} reported this deal ${label(s.theirs)}`}>
            Confirm to close it, or report the other outcome and an admin will review.
          </Alert>
          {buttons(s.theirs)}
        </>
      )}
      {s.kind === "awaiting_them" && (
        <>
          <Alert tone="blue" title={`You reported ${label(s.yours)}`}>
            Waiting for {otherName} to confirm. You can change your answer until then — and you can already leave a review.
          </Alert>
          <ButtonLink href="/reviews" variant="secondary" className="w-full">
            Review {otherName}
          </ButtonLink>
          <Button variant="ghost" size="sm" className="w-full" loading={report.isPending} onClick={() => report.mutate(s.yours === "sold" ? "cancelled" : "sold")}>
            Change to {s.yours === "sold" ? "cancelled" : "sold"}
          </Button>
        </>
      )}
      {s.kind === "disputed" && (
        <>
          <Alert tone="red" title="Outcomes don't match">
            You reported {label(s.yours)}; {otherName} reported {label(s.theirs)}. An admin will review, or either of you can change your answer.
          </Alert>
          <ButtonLink href="/reviews" variant="secondary" className="w-full">
            Review {otherName}
          </ButtonLink>
          <Button variant="secondary" size="sm" className="w-full" loading={report.isPending} onClick={() => report.mutate(s.theirs)}>
            Change mine to {label(s.theirs)}
          </Button>
        </>
      )}
    </div>
  );
}

// ───────────── Realtor view ─────────────

function InvestorCard({ data, showContact }: { data: DealDetail; showContact: boolean }) {
  const inv = data.investor;
  if (!inv.id) {
    return (
      <Card>
        <CardHeader title="Posted by" />
        <CardBody className="space-y-3">
          <div className="select-none blur-sm" aria-hidden>Investor name · Company LLC · (555) 555-0100</div>
          <p className="text-sm text-muted">Upgrade to RealtyBridge Pro to see the investor&apos;s name, contact info, track record and the full property details.</p>
          <ButtonLink href="/settings#billing" size="sm" className="w-full">Upgrade to Pro — $25/mo or $275/yr</ButtonLink>
        </CardBody>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader title="Posted by" />
      <CardBody className="space-y-3">
        <div className="flex items-center gap-3">
          <Avatar person={inv} size={44} />
          <div className="min-w-0">
            <p className="font-medium">{fullName(inv)}</p>
            {inv.company_name && <p className="truncate text-xs text-muted">{inv.company_name}</p>}
          </div>
        </div>
        <RatingInline avg={inv.avg_rating} count={inv.review_count} />
        <SuccessRateBar sold={inv.closed_deals} cancelled={inv.cancelled_deals} />
        {showContact && <InvestorContactPrompt dealId={data.deal.id} investorName={fullName(inv)} awaitingSelection={data.my_interest?.status === 'interested' && !data.match} />}
        <ButtonLink href={`/investors/${inv.id}`} variant="secondary" size="sm" className="w-full">
          View profile &amp; track record
        </ButtonLink>
      </CardBody>
    </Card>
  );
}

/** Investor contacts are authorized per deal, independently of expressing interest. */
function InvestorContactPrompt({ dealId, investorName, awaitingSelection }: { dealId: string; investorName: string; awaitingSelection: boolean }) {
  const contact = useQuery({ queryKey: ['investor-contact', dealId], queryFn: () => api.investorContact(dealId) });
  if (contact.isPending) return <p className="text-sm text-muted" role="status">Loading investor contact…</p>;
  if (contact.isError) return <div className="space-y-2 text-sm"><p role="alert" className="text-muted">Investor contact could not be loaded.</p><Button variant="secondary" size="sm" onClick={() => contact.refetch()}>Try again</Button></div>;
  if (!contact.data) return null;
  return (
    <div className="space-y-2 border-t border-border pt-3 text-sm">
      <p className="font-medium text-ink">Investor contact</p>
      {awaitingSelection && <><p className="font-medium text-brand-700">Next step: reach out to {investorName}</p><p className="text-muted">Introduce yourself by email or phone while the investor reviews applications. Reaching out now helps them choose you.</p></>}
      <div className="space-y-1.5 pt-1">
        <a href={`mailto:${contact.data.email}`} className="flex min-w-0 items-start gap-2 text-brand-600 hover:underline">
          <Mail className="mt-0.5 size-4 shrink-0" /> <span className="min-w-0 break-all">{contact.data.email}</span>
        </a>
        {contact.data.phone ? (
          <a href={`tel:${contact.data.phone}`} className="flex items-center gap-2 text-brand-600 hover:underline">
            <Phone className="size-4" /> {formatUsPhone(contact.data.phone)}
          </a>
        ) : (
          <p className="flex items-center gap-2 text-muted">
            <Phone className="size-4" /> No phone number on file yet
          </p>
        )}
      </div>
    </div>
  );
}

function ExpressInterest({ data, me }: { data: DealDetail; me: Profile }) {
  const [message, setMessage] = useState("");
  const [ackOpen, setAckOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const referral = !!data.deal.referral_required;
  const send = useAction(() => api.expressInterest(data.deal.id, message.trim() || null, acknowledged), { success: referral ? 'Application sent. The investor has been notified.' : "Interest sent. The investor has been notified." });
  const withdraw = useAction((id: string) => api.withdrawInterest(id), { success: "Interest withdrawn" });
  const mine = data.my_interest;

  if (mine && mine.status !== "withdrawn") {
    return (
      <Card>
        <CardBody className="space-y-3">
          <Alert tone={mine.status === "declined" ? "blue" : "green"} title={mine.status === "declined" ? "Not selected" : referral ? 'Application sent' : "Interest sent"}>
            {mine.status === "interested" ? `Sent ${timeAgo(mine.created_at)}. Awaiting investor selection — this property is not matched to you yet.` : null}
          </Alert>
          {mine.status === "interested" && (
            <Button variant="ghost" size="sm" className="w-full" onClick={() => withdraw.mutate(mine.id)} loading={withdraw.isPending}>
              {referral ? 'Withdraw application' : 'Withdraw interest'}
            </Button>
          )}
        </CardBody>
      </Card>
    );
  }

  if (me.verification_status !== "verified") {
    return (
      <Alert tone="yellow" title="Add your license number to express interest" action={<ButtonLink href="/profile#license" size="sm">Add license #</ButtonLink>} />
    );
  }

  const gate = canExpressInterest(me);
  if (!gate.allowed) {
    return (
      <Alert tone="yellow" title="RealtyBridge Pro required" action={"href" in gate.block ? <ButtonLink href={gate.block.href} size="sm">Upgrade to Pro</ButtonLink> : undefined}>
        {gate.block.message}
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader
        title={data.deal.agent_need === "buyers_agent" ? "Have a buyer for this property?" : "Want this listing?"}
        description="Express interest to be considered. The investor selects their Realtor and marks the property matched."
      />
      <CardBody className="space-y-3">
        <Field label="Note to investor (optional)" htmlFor="msg">
          <Textarea
            id="msg"
            maxLength={1000}
            placeholder={
              data.deal.agent_need === "buyers_agent"
                ? "Buyers you have lined up, their financing, how quickly they can tour and close…"
                : "Your experience in this area, recent comps, how quickly you can list…"
            } value={message} onChange={(e) => setMessage(e.target.value)} />
        </Field>
        <Button className="w-full" size="lg" onClick={() => { if (referral) { setAcknowledged(false); setAckOpen(true); } else send.mutate(undefined); }} loading={send.isPending}>
          {referral ? 'Apply for Opportunity' : 'Interested in Deal'}
        </Button>
        <Dialog open={ackOpen} onClose={() => setAckOpen(false)} title="Brokerage referral acknowledgment" footer={<><Button variant="secondary" onClick={() => setAckOpen(false)}>Cancel</Button><Button disabled={!acknowledged} loading={send.isPending} onClick={() => send.mutate(undefined, { onSuccess: () => setAckOpen(false) })}>Submit application</Button></>}>
          <Checkbox id="referral-acknowledgment" checked={acknowledged} onChange={setAcknowledged}>{REFERRAL_ACKNOWLEDGMENT}</Checkbox>
          <p className="mt-4 text-sm text-muted">This acknowledgment does not replace the separate brokerage referral agreement. The 25% referral is based on commission terms in the executed agreement, not the property’s sale price, subject to applicable licensing and referral laws.</p>
        </Dialog>
      </CardBody>
    </Card>
  );
}
