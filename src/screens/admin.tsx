
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Check, ChevronDown, DollarSign, Flag, Gift, Home, Scale, ShieldCheck, Signpost, Users, X } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { stateTally, realtorsByState, dailyActivity, investorMembers, monthlyAmount, subscriberState, summarize, type SubscriberState } from "@/lib/domain/admin-metrics";
import Link from "@/lib/next/link";
import { useState } from "react";
import { api, type AdminQueue } from "@/lib/api";
import { keys, useAction, useMe } from "@/lib/hooks";
import { stateName } from "@/lib/domain/states";
import type { MatchOutcome } from "@/lib/types";
import { fullName, timeAgo } from "@/lib/utils";
import { Badge, Button, Card, Input, EmptyState, Select, PageHeader, PageLoader, Tabs } from "@/components/ui";
import { Stars } from "@/components/stars";
import { AdminFiles } from '@/components/admin-files';

// Deals go live on post; new or changed Realtor licenses wait in the Licenses tab for admin review.
type Tab = "overview" | "subscribers" | "investors" | "properties" | "files" | "disputes" | "reviews" | "free" | 'referrals' | "licenses";

export default function AdminPage() {
  const { data: me } = useMe();
  const [tab, setTab] = useState<Tab>("overview");
  const { data, error } = useQuery({ queryKey: keys.admin, queryFn: api.adminQueue, enabled: me?.role === "admin" });

  if (me && me.role !== "admin") return <Card><EmptyState icon={<ShieldCheck />} title="Admins only" /></Card>;
  if (error) return <Card><EmptyState icon={<X />} title="Couldn't load the moderation queue" description={error.message} /></Card>;
  if (!data) return <PageLoader />;

  return (
    <>
      <PageHeader title="Admin" description="Metrics, subscribers and moderation." />
      <Card>
        <div className="px-4">
          <Tabs<Tab>
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "overview", label: "Metrics" },
              { value: "subscribers", label: "Subscribers" },
              { value: "licenses", label: "Licenses" },
              { value: "investors", label: "Investors" },
              { value: "properties", label: "Properties" },
              { value: "files", label: "Matched & closed files" },
              { value: "disputes", label: "Disputed outcomes", count: data.disputed_matches.length },
              { value: "reviews", label: "Flagged reviews", count: data.flagged_reviews.length },
              { value: "free", label: "Free accounts" },
              { value: 'referrals', label: 'Referral agreements' },
            ]}
          />
        </div>
        {tab === "overview" && <Overview />}
        {tab === "subscribers" && <Subscribers />}
        {tab === "investors" && <Investors />}
        {tab === "properties" && <Properties />}
        {tab === "files" && <FilesTracking />}
        {tab === "disputes" && <Disputes items={data.disputed_matches} />}
        {tab === "reviews" && <Reviews items={data.flagged_reviews} />}
        {tab === "free" && <FreeAccounts />}
        {tab === 'referrals' && <Referrals />}
        {tab === "licenses" && <Licenses />}
      </Card>
    </>
  );
}

function Disputes({ items }: { items: AdminQueue["disputed_matches"] }) {
  const resolve = useAction(({ id, outcome }: { id: string; outcome: MatchOutcome }) => api.adminResolveMatch(id, outcome), { success: "Match resolved" });
  if (!items.length) return <EmptyState icon={<Scale />} title="No disputed outcomes" description="When an investor and realtor report different outcomes for a deal, it shows up here." />;
  const said = (o: MatchOutcome | null) => (o === "sold" ? <Badge tone="green">Sold</Badge> : <Badge tone="red">Cancelled</Badge>);
  return (
    <ul className="divide-y divide-border">
      {items.map((m) => (
        <li key={m.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1 text-sm">
            <Link href={`/deals/${m.deal.id}`} className="font-medium hover:text-brand-600">
              {m.deal.title}
            </Link>
            <p className="text-muted">
              {m.deal.city}, {m.deal.state} · matched {timeAgo(m.created_at)}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
              <span className="flex items-center gap-2">
                Investor {fullName(m.investor)} said {said(m.investor_outcome)}
              </span>
              <span className="flex items-center gap-2">
                Realtor {fullName(m.realtor)} said {said(m.realtor_outcome)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" loading={resolve.isPending && resolve.variables?.outcome === "cancelled"} onClick={() => resolve.mutate({ id: m.id, outcome: "cancelled" })}>
              Resolve as cancelled
            </Button>
            <Button size="sm" variant="success" loading={resolve.isPending && resolve.variables?.outcome === "sold"} onClick={() => resolve.mutate({ id: m.id, outcome: "sold" })}>
              Resolve as sold
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Reviews({ items }: { items: AdminQueue["flagged_reviews"] }) {
  const moderate = useAction(({ id, hide }: { id: string; hide: boolean }) => api.adminModerateReview(id, hide), { success: "Review moderated" });
  if (!items.length) return <EmptyState icon={<Flag />} title="No flagged reviews" />;
  return (
    <ul className="divide-y divide-border">
      {items.map((r) => (
        <li key={r.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 text-sm">
            <p>
              <span className="font-medium">{fullName(r.reviewer)}</span> <span className="text-muted">reviewed</span> <span className="font-medium">{fullName(r.reviewee)}</span>
              <span className="text-muted"> · {stateName(r.state)} · {timeAgo(r.created_at)}</span>
            </p>
            <Stars value={r.rating} size={14} className="mt-1" />
            {r.body && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-slate-700">{r.body}</p>}
            {r.flag_reason && (
              <p className="mt-2 flex items-start gap-1.5 text-amber-800">
                <Flag className="mt-0.5 size-3.5 shrink-0" /> Reported: {r.flag_reason}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => moderate.mutate({ id: r.id, hide: false })}>
              Keep visible
            </Button>
            <Button size="sm" variant="danger" onClick={() => moderate.mutate({ id: r.id, hide: true })}>
              Hide review
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function FreeAccounts() {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [role, setRole] = useState<"realtor" | "contractor">("realtor");
  const { data: grants } = useQuery({ queryKey: ["admin", "free-accounts"], queryFn: api.adminFreeAccounts });
  const grant = useAction(async () => {
    await api.adminGrantFree(email, note.trim() || null, role);
    setEmail("");
    setNote("");
  }, { success: "Free access granted — sign-in link emailed" });
  const revoke = useAction((e: string) => api.adminRevokeFree(e), { success: "Free access removed" });
  return (
    <div className="px-5 py-4">
      <p className="text-sm text-muted">
        Give someone a free realtor or contractor account — no subscription needed. Works for existing accounts and for emails that haven't signed up yet.
      </p>
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (email.trim()) grant.mutate(undefined);
        }}
      >
        <Input type="email" required placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1" aria-label="Email" />
        <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} className="flex-1" aria-label="Note" />
        <Select value={role} onChange={(e) => setRole(e.target.value as "realtor" | "contractor")} aria-label="Account type" className="sm:w-40">
          <option value="realtor">Realtor</option>
          <option value="contractor">Contractor</option>
        </Select>
        <Button type="submit" loading={grant.isPending}>Give free account</Button>
      </form>
      {!grants?.length ? (
        <EmptyState icon={<Gift />} title="No free accounts yet" />
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {grants.map((g) => (
            <li key={g.email} className="flex items-center gap-3 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{g.email}</p>
                <p className="text-muted">{g.role === "contractor" ? "Contractor" : "Realtor"} · {g.note ? `${g.note} · ` : ""}granted {timeAgo(g.created_at)}</p>
              </div>
              <Button size="sm" variant="secondary" loading={revoke.isPending && revoke.variables === g.email} onClick={() => revoke.mutate(g.email)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function useOverview() {
  return useQuery({ queryKey: ["admin", "overview"], queryFn: api.adminOverview });
}

function Referrals() {
  const { data, error } = useQuery({ queryKey: ['admin', 'referrals'], queryFn: api.adminReferrals });
  const { data: overview, error: contactError } = useOverview();
  const complete = useAction((matchId: string) => api.completeReferralDashboardItem(matchId), { success: 'Referral completed', invalidate: [['admin', 'referrals']] });
  if (error || contactError) return <EmptyState icon={<X />} title="Couldn’t load referral agreements" description={(error || contactError)?.message} />;
  if (!data || !overview) return <PageLoader />;
  if (!data.length) return <EmptyState icon={<Scale />} title="No outstanding referral agreements" />;
  return <ul className="divide-y divide-border">{data.map(a => {
    const email = overview.members.find(member => member.id === a.match.realtor_id)?.email;
    const address = [a.deal.address_line, a.deal.city, a.deal.state, a.deal.zip].filter(Boolean).join(', ');
    return <li key={a.match_id} className="flex flex-col gap-2 p-5 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-5">
      <Link href={`/deals/${a.deal.id}`} className="min-w-0 break-words font-semibold text-brand-600 hover:underline">{address || 'Address not provided'}</Link>
      {email ? <a href={`mailto:${email}`} className="min-w-0 break-all text-brand-600 hover:underline">{email}</a> : <span className="text-muted">Email not provided</span>}
      <Button size="sm" variant="secondary" className="self-start shrink-0 sm:self-auto" loading={complete.isPending && complete.variables === a.match_id} disabled={complete.isPending} onClick={() => complete.mutate(a.match_id)}><Check className="size-4" />Complete</Button>
    </li>;
  })}</ul>;
}

function FilesTracking() {
  const { data, error } = useOverview();
  if (error) return <EmptyState icon={<X />} title="Couldn’t load files" description={error.message} />;
  if (!data) return <PageLoader />;
  return <AdminFiles data={data} />;
}

function Properties() {
  const { data, error } = useOverview();
  const close = useAction((dealId: string) => api.withdrawDeal(dealId), { success: 'Deal closed' });
  if (error) return <EmptyState icon={<X />} title="Couldn’t load properties" description={error.message} />;
  if (!data) return <PageLoader />;
  const properties = data.deals.filter(deal => deal.status === 'live');
  if (!properties.length) return <EmptyState icon={<Home />} title="No properties seeking a Realtor" />;
  const members = new Map(data.members.map(member => [member.id, member]));
  return <div className="p-5">
    <h2 className="text-base font-semibold">Properties posted for a Realtor match</h2>
    <ul className="mt-3 divide-y divide-border">
      {properties.map(deal => {
        const owner = members.get(deal.investor_id);
        const address = [deal.address_line, deal.city, deal.state, deal.zip].filter(Boolean).join(', ');
        return <li key={deal.id} className="flex flex-col gap-3 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            {deal.id && <Link href={`/deals/${deal.id}`} className="break-words font-semibold text-brand-600 hover:underline">{deal.title || address || 'Property'}</Link>}
            {address && <p className="mt-1 break-words text-muted">{address}</p>}
            <p className="mt-1 text-muted">{deal.status === 'live' ? 'Seeking Realtor' : deal.status.charAt(0).toUpperCase() + deal.status.slice(1).replaceAll('_', ' ')}</p>
          </div>
          <div className="min-w-0 sm:w-64">
            <p className="text-xs text-muted">Posted by</p>
            <Link href={`/investors/${deal.investor_id}`} className="break-words font-medium text-brand-600 hover:underline">{owner ? fullName(owner) || owner.email : 'View investor profile'}</Link>
            {owner && <p className="break-all text-muted">{owner.email}</p>}
          </div>
          <Button size="sm" variant="secondary" className="self-start shrink-0 sm:self-auto" loading={close.isPending && close.variables === deal.id} disabled={close.isPending} onClick={() => { if (window.confirm(`Close "${deal.title || address || 'this property'}"? It will be removed from the deal feed and this list.`) && deal.id) close.mutate(deal.id); }}><X className="size-4" />Close deal</Button>
        </li>;
      })}
    </ul>
  </div>;
}

function Overview() {
  const { data } = useOverview();
  if (!data) return <PageLoader />;
  const s = summarize(data);
  return (
    <div className="space-y-4 p-5">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <MetricCard label="Accounts set up" value={s.total_members} icon={<Users />} sub={`${s.investors} investors · ${s.realtors} realtors · ${s.new_this_week} this week`} />
      <MetricCard label="Subscribers" value={s.subscribers} icon={<DollarSign />} tone="green" sub={`${s.paying} paying · ${s.trial} on trial`} />
      <MetricCard label="Active deals posted" value={s.live_deals} icon={<Home />} tone="blue" sub={`${s.total_deals} posted all time`} />
      <MetricCard label="Active realtor listings" value={s.active_listings} icon={<Signpost />} tone="violet" sub={`${s.total_listings} posted all time`} />
      <MetricCard label="Matched files" value={s.total_matches} icon={<Users />} tone="blue" sub={`${s.active_matches} active · ${s.closed_matches} closed`} />
    </div>
    <ActivityChart data={dailyActivity(data)} />
    <StateTally rows={stateTally(data.members, data.deals)} />
    <RealtorsByState rows={realtorsByState(data.members)} />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard label="Monthly revenue" value={`$${s.mrr.toLocaleString()}`} icon={<DollarSign />} tone="green" sub={`${s.paying} paying realtors`} />
      <MetricCard label="On free trial" value={s.trial} icon={<BarChart3 />} tone="amber" sub={`${s.lapsed} lapsed / canceled`} />
      <MetricCard label="Free accounts" value={s.free} icon={<Gift />} tone="violet" />
      <MetricCard label="Active matches" value={s.active_matches} icon={<Scale />} tone="slate" />
    </div>
    </div>
  );
}

const STATE_BADGE: Record<SubscriberState, { label: string; tone: "green" | "yellow" | "blue" | "red" | "gray" }> = {
  paying: { label: "Paying", tone: "green" },
  trial: { label: "Trial", tone: "yellow" },
  free: { label: "Free", tone: "blue" },
  lapsed: { label: "Lapsed", tone: "red" },
  none: { label: "Not started", tone: "gray" },
};

function DeleteMember({ id, name }: { id: string; name: string }) {
  const del = useAction((uid: string) => api.adminDeleteMember(uid), { success: "Account deleted" });
  return (
    <Button size="sm" variant="danger" loading={del.isPending}
      onClick={() => { if (window.confirm(`Cancel ${name}'s subscription immediately and permanently delete their account? Their deals, matches, reviews and messages will be removed. If cancellation fails, the account will not be deleted. This can't be undone.`)) del.mutate(id); }}>
      Delete
    </Button>
  );
}

function Subscribers() {
  const { data } = useOverview();
  const [filter, setFilter] = useState<SubscriberState | "all">("all");
  if (!data) return <PageLoader />;
  const realtors = data.members.filter((m) => m.role === "realtor").map((m) => ({ m, st: subscriberState(m) }));
  const rows = realtors.filter((r) => filter === "all" || r.st === filter);
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString() : "—");
  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap gap-2">
        {(["all", "paying", "trial", "free", "lapsed", "none"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "primary" : "secondary"} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : STATE_BADGE[f].label} ({f === "all" ? realtors.length : realtors.filter((r) => r.st === f).length})
          </Button>
        ))}
      </div>
      {!rows.length ? (
        <EmptyState icon={<Users />} title="No realtors here yet" />
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr><th className="py-2 pr-4">Realtor</th><th className="pr-4">Status</th><th className="pr-4">Amount</th><th className="pr-4">Trial ends / renews</th><th className="pr-4">Joined</th><th></th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(({ m, st }) => (
                <tr key={m.id}>
                  <td className="py-3 pr-4">
                    <Link href={`/realtors/${m.id}`} className="font-medium hover:text-brand-600">{fullName(m) || m.email}</Link>
                    <p className="text-muted">{m.email}{m.brokerage_name ? ` · ${m.brokerage_name}` : ""}</p>
                  </td>
                  <td className="pr-4"><Badge tone={STATE_BADGE[st].tone}>{STATE_BADGE[st].label}</Badge></td>
                  <td className="pr-4 tabular-nums">${monthlyAmount(st)}/mo</td>
                  <td className="pr-4">{fmt(st === "trial" ? m.trial_ends_at : m.current_period_end)}</td>
                  <td className="pr-4">{fmt(m.created_at)}</td>
                  <td className="text-right"><DeleteMember id={m.id} name={fullName(m) || m.email} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ActivityChart({ data }: { data: ReturnType<typeof dailyActivity> }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-white p-5">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">Last 30 days</p>
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="day" tickFormatter={(d: string) => d.slice(5)} fontSize={11} />
            <YAxis allowDecimals={false} fontSize={11} width={28} />
            <Tooltip />
            <Legend />
            <Bar dataKey="accounts" name="New accounts" fill="var(--color-brand-600)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="deals" name="Deals posted" fill="var(--color-emerald-500)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Investors() {
  const { data } = useOverview();
  if (!data) return <PageLoader />;
  const rows = investorMembers(data);
  const csv = () => {
    const lines = [["Name", "Email"], ...rows.map((m) => [fullName(m), m.email])];
    const blob = new Blob([lines.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "realtybridge-investors.csv";
    a.click();
  };
  if (!rows.length) return <EmptyState icon={<Users />} title="No investors yet" />;
  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">{rows.length} investor {rows.length === 1 ? "account" : "accounts"}</p>
        <Button size="sm" variant="secondary" onClick={csv}>Download emails (CSV)</Button>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr><th className="py-2 pr-4">Investor</th><th className="pr-4">Email</th><th></th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((m) => (
              <tr key={m.id}>
                <td className="py-3 pr-4">
                  <Link href={`/investors/${m.id}`} className="font-medium hover:text-brand-600">{fullName(m) || m.email}</Link>
                </td>
                <td className="pr-4 text-muted">{m.email}</td>
                <td className="text-right"><DeleteMember id={m.id} name={fullName(m) || m.email} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RealtorsByState({ rows }: { rows: ReturnType<typeof realtorsByState> }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-white p-5">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">Realtor accounts by state served</p>
      {!rows.length ? (
        <p className="mt-3 text-sm text-muted">No realtors have picked their states yet.</p>
      ) : (
        <div className="mt-3 divide-y divide-border">
          {rows.map((r) => {
            const expanded = open === r.state;
            return (
              <div key={r.state}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : r.state)}
                  className="flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm font-semibold hover:text-brand-600"
                >
                  <span>
                    {stateName(r.state)} <span className="font-normal text-muted">· {r.realtors.length} {r.realtors.length === 1 ? "realtor" : "realtors"}</span>
                  </span>
                  <ChevronDown className={`size-4 shrink-0 text-muted transition-transform ${expanded ? "rotate-180" : ""}`} />
                </button>
                {expanded && (
                  <ul className="mb-2 divide-y divide-border rounded-lg border border-border bg-slate-50 px-3">
                    {r.realtors.map((realtor) => (
                      <li key={realtor.email} className="flex flex-wrap items-baseline gap-x-2 py-2 text-sm">
                        <span className="font-medium">{realtor.name}</span>
                        {realtor.brokerage && <span className="text-muted">· {realtor.brokerage}</span>}
                        <a href={`mailto:${realtor.email}`} className="break-all text-brand-600 hover:underline">{realtor.email}</a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StateTally({ rows }: { rows: ReturnType<typeof stateTally> }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-white p-5">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">Deals &amp; members by state</p>
      {!rows.length ? (
        <p className="mt-3 text-sm text-muted">No one has picked their states yet.</p>
      ) : (
        <div className="mt-3 max-h-80 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr><th className="py-2 pr-4">State</th><th className="pr-4 text-right">Deals posted</th><th className="pr-4 text-right">Investors (work in)</th><th className="pr-4 text-right">Realtors (serve)</th><th className="text-right">Members</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.state}>
                  <td className="py-2 pr-4 font-medium">{stateName(r.state)}</td>
                  <td className="pr-4 text-right font-semibold tabular-nums">{r.deals}</td>
                  <td className="pr-4 text-right tabular-nums">{r.investors}</td>
                  <td className="pr-4 text-right tabular-nums">{r.realtors}</td>
                  <td className="text-right tabular-nums">{r.investors + r.realtors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Licenses() {
  const { data } = useQuery({ queryKey: ["admin", "licenses"], queryFn: api.adminPendingLicenses });
  const review = useAction(({ id, approve }: { id: string; approve: boolean }) => api.adminReviewLicense(id, approve, approve ? undefined : "License could not be confirmed. Please check the number and state."), { success: "License reviewed" });
  if (!data) return <PageLoader />;
  if (data.length === 0) return <EmptyState icon={<ShieldCheck />} title="No licenses waiting for review" description="New or changed Realtor licenses appear here until you verify them." />;
  return (
    <ul className="divide-y divide-border">
      {data.map((p) => (
        <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <Link href={`/realtors/${p.id}`} className="font-medium hover:underline">{fullName(p)}</Link>
            <p className="text-sm text-muted-foreground">{p.email}{p.brokerage_name ? ` · ${p.brokerage_name}` : ""}</p>
            <p className="text-sm">License {p.license_number} · {p.license_state ?? "—"}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={review.isPending} onClick={() => review.mutate({ id: p.id, approve: true })}><Check className="h-4 w-4" /> Verify</Button>
            <Button size="sm" variant="secondary" disabled={review.isPending} onClick={() => review.mutate({ id: p.id, approve: false })}><X className="h-4 w-4" /> Needs action</Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
