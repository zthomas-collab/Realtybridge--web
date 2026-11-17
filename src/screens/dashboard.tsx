
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Circle,
  CreditCard,
  Handshake,
  Home,
  KeyRound,
  Radio,
  Signpost,
  ShieldCheck,
  Sparkles,
  Target,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "@/lib/next/link";
import { useRouter } from "@/lib/next/navigation";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { keys, useMe } from "@/lib/hooks";
import { ContractorDashboard } from "@/components/contractor-dashboard";
import { PendingReviewPrompts } from '@/components/deal-next-steps';
import { matchNeedsContact, transactionStage, TRANSACTION_NEXT_STEP } from '@/lib/domain/deal-process';
import { checklistProgress, investorChecklist, realtorChecklist, type ChecklistStep } from "@/lib/domain/onboarding";
import { canPostDeal, MONTHLY_PRICE_USD, trialDaysLeft } from "@/lib/domain/paywall";
import { successRate } from "@/lib/domain/track-record";
import { stateName } from "@/lib/domain/states";
import type { Profile } from "@/lib/types";
import { cn, formatMoney, formatPrice, timeAgo } from "@/lib/utils";
import { Alert, ButtonLink, Card, CardHeader, EmptyState, PageLoader } from "@/components/ui";
import { AgentNeedBadge, DealStatusBadge } from "@/components/badges";
import { countByNeed, realtorStates } from "@/lib/domain/agent-need";
import { MetricCard } from "@/components/metric-card";
import { AgentFinder } from "@/components/agent-finder";
import { RatingInline } from "@/components/stars";
import { ConnectionsPrompt, LocationInfo, LocationReminder, PROFILE_LOCATION_HREF, hasLocation } from "@/components/community";

export default function DashboardPage() {
  const { data: me, isLoading } = useMe();
  const router = useRouter();
  useEffect(() => {
    if (me?.role === "admin") router.replace("/admin");
  }, [me, router]);

  if (isLoading || !me) return <PageLoader />;
  if (me.role === "realtor") return <RealtorDashboard me={me} />;
  if (me.role === "investor") return <InvestorDashboard me={me} />;
  if (me.role === "contractor") return <ContractorDashboard me={me} />;
  return <PageLoader />;
}

// ───────────────────────────── Get started checklist ─────────────────────────────

/** Role-specific onboarding steps; hidden once everything is done. */
function GetStarted({ steps }: { steps: ChecklistStep[] }) {
  const progress = checklistProgress(steps);
  if (progress.done === progress.total) return null;
  const cols = steps.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3";
  return (
    <Card>
      <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="size-4 text-brand-600" /> Get started with RealtyBridge
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {progress.done} of {progress.total} complete
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 sm:w-56" role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progress.percent}%` }} />
        </div>
      </div>
      <ol className={cn("grid divide-y divide-border sm:divide-x sm:divide-y-0", cols)}>
        {steps.map((s, i) => {
          const isNext = !s.done && steps.slice(0, i).every((p) => p.done);
          return (
            <li key={s.id}>
              <Link href={s.href} className={cn("flex h-full gap-3 p-4 transition-colors hover:bg-slate-50 sm:flex-col", isNext && "bg-brand-50/50")}>
                {s.done ? <CheckCircle2 className="size-5 shrink-0 text-emerald-500" /> : <Circle className={cn("size-5 shrink-0", isNext ? "text-brand-600" : "text-slate-300")} />}
                <span>
                  <span className={cn("block text-sm font-medium", s.done ? "text-slate-400 line-through" : "text-ink")}>
                    {i + 1}. {s.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{s.description}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

// ───────────────────────────── Investor ─────────────────────────────

function InvestorDashboard({ me }: { me: Profile }) {
  const metrics = useQuery({ queryKey: keys.metrics, queryFn: api.investorMetrics });
  const deals = useQuery({ queryKey: keys.myDeals, queryFn: api.listMyDeals });
  const written = useQuery({ queryKey: keys.reviewsWritten, queryFn: api.reviewsWritten });

  if (!metrics.data) return <PageLoader />;
  const m = metrics.data;

  const steps = investorChecklist({ profile: me, dealsPosted: m.deals_posted, matchesMade: m.matches_made });
  const gate = canPostDeal(me);
  const days = trialDaysLeft(me);
  const rate = successRate(m.sold_deals, m.cancelled_matches);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {me.first_name ?? "there"}</h1>
          <p className="mt-1 text-sm text-muted">Here&apos;s what&apos;s happening with your novation deals.</p>
        </div>
        <ButtonLink href="/deals/new">
          <span className="text-lg leading-none">+</span> Post a Deal
        </ButtonLink>
      </div>

      {me.role === "realtor" && days != null && (
        <Alert
          tone={days <= 3 ? "yellow" : "blue"}
          icon={<CreditCard />}
          title={`${days} day${days === 1 ? "" : "s"} left in your free trial`}
          action={
            <ButtonLink href="/settings#billing" variant="secondary" size="sm">
              Manage billing
            </ButtonLink>
          }
        >
          Your subscription continues at ${MONTHLY_PRICE_USD}/month after the trial. Cancel anytime.
        </Alert>
      )}
      {!gate.allowed && gate.block.code !== "not_investor" && gate.block.code !== "profile_incomplete" && (
        <Alert tone="yellow" icon={<CreditCard />} title="Posting is locked" action={<ButtonLink href={gate.block.href} size="sm">Fix this</ButtonLink>}>
          {gate.block.message}
        </Alert>
      )}

      <LocationReminder me={me} />
      <GetStarted steps={steps} />

      <PendingReviewPrompts userId={me.id} />
      {deals.data?.filter(d => d.status === 'live' || d.match?.status === 'active').map(d => {
        const stage = transactionStage({ status: d.status, match: d.match, agreementStatus: d.referral?.agreement_status, userId: me.id, reviewed: written.data?.some(r => r.match_id === d.match?.id) });
        if (stage === 'review') return null; // The review list above already supplies this action.
        const next = TRANSACTION_NEXT_STEP[stage];
        return <Alert key={d.id} tone={stage === 'pending' || stage === 'confirm' || stage === 'disputed' ? 'yellow' : 'blue'} title={`${next.title}: ${d.title}`} action={<ButtonLink href={`/deals/${d.id}`} size="sm" variant="secondary">{next.action}</ButtonLink>}>
          {next.message}
        </Alert>;
      })}

      <section aria-label="Activity" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Deals Posted" value={m.deals_posted} icon={<Briefcase />} href="/deals" />
        <MetricCard label="Live Deals" value={m.live_deals} icon={<Radio />} tone="green" sub="Active public postings" href="/deals?status=live" />
        <MetricCard label="Realtors Interested" value={m.realtors_interested} icon={<Users />} tone="violet" sub="Incoming agent leads" href="/deals" />
        <MetricCard label="Matches Made" value={m.matches_made} icon={<Handshake />} tone="amber" sub="Realtors selected for your files" href="/deals?status=matched" />
        <MetricCard label="Sold Deals" value={m.sold_deals} icon={<TrendingUp />} tone="green" sub="Confirmed by both parties" href="/deals?status=sold" />
        <MetricCard
          label="Rating"
          value={m.avg_rating != null ? m.avg_rating.toFixed(1) : "—"}
          icon={<Star />}
          tone="amber"
          sub={<RatingInline avg={m.avg_rating} count={m.review_count} size={12} />}
          href="/reviews"
        />
        <MetricCard
          label="Success Rate"
          value={rate != null ? `${rate}%` : "—"}
          icon={<Target />}
          tone={rate == null ? "slate" : rate >= 80 ? "green" : rate >= 50 ? "amber" : "rose"}
          sub={rate != null ? `${m.sold_deals} sold · ${m.cancelled_matches} cancelled` : "Shows once a contracted deal closes"}
          href={`/investors/${me.id}`}
        />
        <AgentFinder viewer="investor" />
      </section>

      <Card>
        <CardHeader
          title="Recent deals"
          action={
            <Link href="/deals" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
              View all <ArrowRight className="size-4" />
            </Link>
          }
        />
        {!deals.data?.length ? (
          <EmptyState icon={<Home />} title="No deals yet" description="Post your first novation deal and agents in that market will be able to raise their hand." action={<ButtonLink href="/deals/new">Post a Deal</ButtonLink>} />
        ) : (
          <ul className="divide-y divide-border">
            {deals.data.slice(0, 5).map((d) => (
              <li key={d.id}>
                <Link href={`/deals/${d.id}`} className="flex flex-col gap-2 px-5 py-3.5 hover:bg-slate-50 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.title}</p>
                    <p className="text-xs text-muted">
                      {d.city}, {d.state} · {formatPrice(d.asking_price)} · {timeAgo(d.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {d.interest_count > 0 && <span className="text-xs font-medium text-violet-700">{d.interest_count} {d.referral_required ? 'applications' : 'interested'}</span>}
                    <DealStatusBadge status={d.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConnectionsPrompt me={me} />
    </div>
  );
}

// ───────────────────────────── Realtor ─────────────────────────────

function RealtorDashboard({ me }: { me: Profile }) {
  const interests = useQuery({ queryKey: keys.myInterests, queryFn: api.listMyInterests });
  const browse = useQuery({ queryKey: keys.browse(), queryFn: () => api.browseDeals(), enabled: me.verification_status === "verified" });
  const reviews = useQuery({ queryKey: keys.reviewsAbout(me.id), queryFn: () => api.reviewsAbout(me.id) });
  const track = useQuery({ queryKey: keys.member(me.id), queryFn: () => api.memberProfile(me.id) });

  if (!interests.data || !reviews.data) return <PageLoader />;
  const rows = interests.data;
  const active = rows.filter((r) => r.match?.status === "active").length;
  const closed = rows.filter((r) => r.match?.status === "completed").length;
  // same source as the public profile so the two always agree
  const sold = track.data?.track.completed_deals ?? 0;
  const cancelled = track.data?.track.cancelled_deals ?? 0;
  const rate = successRate(sold, cancelled);
  const visible = reviews.data.filter((r) => !r.hidden);
  const avg = visible.length ? visible.reduce((a, r) => a + r.rating, 0) / visible.length : null;
  const myStates = realtorStates(me);
  const inMarket = (browse.data ?? []).filter((d) => myStates.has(d.state));
  const needCounts = countByNeed(inMarket);
  const steps = realtorChecklist({
    profile: me,
    interestsSent: rows.filter((r) => r.interest.status !== "withdrawn").length,
    matchesMade: rows.filter((r) => r.match).length,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {me.first_name ?? "there"}</h1>
        <p className="mt-1 text-sm text-muted">Properties in your area where investors need a listing agent or a buyer&apos;s agent.</p>
      </div>

      {me.verification_status !== "verified" && (
        <Alert tone="yellow" icon={<ShieldCheck />} title="Add your license number to see properties" action={<ButtonLink href="/profile#license" size="sm">Add license #</ButtonLink>}>
          Investors only share properties with licensed agents.
        </Alert>
      )}

      <section className="flex flex-wrap items-center justify-between gap-4 border-y border-border py-5">
        <h2 className="text-lg font-semibold">Realtor Referral Network</h2>
        <ButtonLink href="/realtor-network" variant="secondary"><Handshake />Browse & Post Referrals</ButtonLink>
      </section>

      <LocationReminder me={me} />
      <GetStarted steps={steps} />

      <PendingReviewPrompts userId={me.id} />
      {rows.filter(r => r.match && matchNeedsContact(r.match, me.id)).map(r => <Alert key={r.match?.id} title={`Contact the investor: ${r.deal.title}`} action={<ButtonLink href={`/deals/${r.deal.id}`} size="sm" variant="secondary">Contact investor</ButtonLink>}>
        You have been selected. Call or email the investor to discuss next steps; report the outcome and review each other when the file closes.
      </Alert>)}
      {rows.filter(r => r.interest.status === 'interested' && !r.match && r.deal.status === 'live').map(r => <Alert key={r.interest.id} title={`Awaiting investor selection: ${r.deal.title}`} action={<ButtonLink href={`/deals/${r.deal.id}`} size="sm" variant="secondary">View property</ButtonLink>}>
        Your interest is submitted. The investor must select you before this property becomes a match. Once selected, contact the investor and agree on next steps.
      </Alert>)}
      {!!inMarket.some(d => !d.my_interest) && <Alert title="Next step: choose a deal" action={<ButtonLink href="/browse" size="sm" variant="secondary">Find a deal</ButtonLink>}>Review properties in your area and submit your interest. The investor selects their Realtor before contact details are shared.</Alert>}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Need a listing agent" value={needCounts.listing_agent} icon={<Signpost />} tone="slate" sub="Live in your area" href="/browse?need=listing_agent" />
        <MetricCard label="Need a buyer's agent" value={needCounts.buyers_agent} icon={<KeyRound />} tone="blue" sub="Live in your area" href="/browse?need=buyers_agent" />
        <MetricCard label="Interests sent" value={rows.length} icon={<Users />} tone="violet" href="/deals" />
        <MetricCard label="Active matches" value={active} icon={<Handshake />} tone="amber" sub={`${closed} closed`} href="/deals" />
        <MetricCard label="Rating" value={avg != null ? avg.toFixed(1) : "—"} icon={<Star />} tone="amber" sub={<RatingInline avg={avg} count={visible.length} size={12} />} href="/reviews" />
        <MetricCard
          label="Success Rate"
          value={rate != null ? `${rate}%` : "—"}
          icon={<Target />}
          tone={rate == null ? "slate" : rate >= 80 ? "green" : rate >= 50 ? "amber" : "rose"}
          sub={rate != null ? `${sold} sold · ${cancelled} cancelled` : "Shows once a contracted deal closes"}
          href={`/realtors/${me.id}`}
        />
        <AgentFinder viewer="realtor" />
      </section>

      <Card>
        <CardHeader
          title={<span className="flex items-center gap-1.5">New in your area <LocationInfo /></span>}
          description={myStates.size ? [...myStates].map(stateName).join(", ") : undefined}
          action={
            <Link href="/browse" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
              See all <ArrowRight className="size-4" />
            </Link>
          }
        />
        {!inMarket.length ? (
          hasLocation(me) ? (
            <EmptyState icon={<Home />} title="No Matching Deals Right Now" description="Try expanding your search area or adjusting your filters to discover more opportunities." />
          ) : (
            <EmptyState icon={<Home />} title="Let's Find Your Next Opportunity!" description="Set your location to discover deals and connections in your area." action={<ButtonLink href={PROFILE_LOCATION_HREF}>Complete My Profile</ButtonLink>} />
          )
        ) : (
          <ul className="divide-y divide-border">
            {inMarket.slice(0, 6).map((d) => (
              <li key={d.id}>
                <Link href={`/deals/${d.id}`} className="flex flex-col gap-2 px-5 py-3.5 hover:bg-slate-50 sm:flex-row sm:items-center">
                  <div className="shrink-0 sm:w-52">
                    <AgentNeedBadge need={d.agent_need} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.title}</p>
                    <p className="text-xs text-muted">
                      {d.city}, {d.state} · {formatPrice(d.asking_price)} · {timeAgo(d.created_at)}
                    </p>
                  </div>
                  {d.my_interest ? <span className="text-xs font-medium text-emerald-700">Interest sent</span> : <span className="text-xs font-medium text-brand-600">View property →</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConnectionsPrompt me={me} />
    </div>
  );
}
