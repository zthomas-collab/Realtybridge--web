
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Search } from "lucide-react";
import Link from "@/lib/next/link";
import { useRouter, useSearchParams } from "@/lib/next/navigation";
import { Suspense } from "react";
import { api } from "@/lib/api";
import { keys, useMe } from "@/lib/hooks";
import type { DealStatus, Profile } from "@/lib/types";
import { formatMoney, formatPrice, fullName, timeAgo } from "@/lib/utils";
import { Avatar, Badge, ButtonLink, Card, EmptyState, PageHeader, PageLoader, Tabs } from "@/components/ui";
import { AgentNeedBadge, DealStatusBadge } from "@/components/badges";
import { DEAL_TYPE_LABEL } from "@/lib/domain/deal-type";

export default function MyDealsPage() {
  const { data: me } = useMe();
  if (!me) return <PageLoader />;
  return (
    <Suspense fallback={<PageLoader />}>
      {me.role === "realtor" ? <RealtorDeals /> : <InvestorDeals me={me} />}
    </Suspense>
  );
}

type Filter = "all" | DealStatus;

function InvestorDeals({ me }: { me: Profile }) {
  const params = useSearchParams();
  const router = useRouter();
  const filter = (params.get("status") as Filter) || "all";
  const { data } = useQuery({ queryKey: keys.myDeals, queryFn: api.listMyDeals, enabled: me.role === "investor" });
  if (!data) return <PageLoader />;

  const count = (s: DealStatus) => data.filter((d) => d.status === s).length;
  const rows = filter === "all" ? data : data.filter((d) => d.status === filter);

  return (
    <>
      <PageHeader title="My Deals" description="Track every posting from live through sale." action={<ButtonLink href="/deals/new">+ Post a Deal</ButtonLink>} />
      <Card>
        <div className="px-4">
          <Tabs<Filter>
            value={filter}
            onChange={(v) => router.replace(v === "all" ? "/deals" : `/deals?status=${v}`)}
            tabs={[
              { value: "all", label: "All", count: data.length },
              { value: "live", label: "Live", count: count("live") },
              { value: "matched", label: "Matched", count: count("matched") },
              { value: "sold", label: "Sold", count: count("sold") },
            ]}
          />
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={<Briefcase />} title={filter === "all" ? "You haven't posted any deals yet" : "Nothing here"} action={filter === "all" && <ButtonLink href="/deals/new">Post your first deal</ButtonLink>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-slate-50/60 text-left text-xs font-medium tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-5 py-3 font-medium">Deal</th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">Price</th>
                  <th className="px-5 py-3 font-medium">Agents</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((d) => (
                  <tr key={d.id} className="cursor-pointer hover:bg-slate-50" onClick={() => router.push(`/deals/${d.id}`)}>
                    <td className="max-w-xs px-5 py-3.5">
                      <Link href={`/deals/${d.id}`} className="block truncate font-medium text-ink hover:text-brand-600">
                        {d.title}
                      </Link>
                      <p className="text-xs text-muted">
                        {d.city}, {d.state} · posted {timeAgo(d.created_at)}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <AgentNeedBadge need={d.agent_need} />
                        {d.deal_type && <Badge tone="gray">{DEAL_TYPE_LABEL[d.deal_type] ?? d.deal_type}</Badge>}
                      </div>
                    </td>
                    <td className="hidden px-5 py-3.5 tabular-nums md:table-cell">{formatPrice(d.asking_price)}</td>
                    <td className="px-5 py-3.5">
                      {d.match ? (
                        <span className="flex items-center gap-2">
                          <Avatar person={d.match.realtor} size={24} />
                          <span className="truncate">{fullName(d.match.realtor)}</span>
                        </span>
                      ) : d.interest_count ? (
                        <Badge tone="purple">{d.interest_count} {d.referral_required ? 'applications' : 'interested'}</Badge>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <DealStatusBadge status={d.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function RealtorDeals() {
  const { data } = useQuery({ queryKey: keys.myInterests, queryFn: api.listMyInterests });
  if (!data) return <PageLoader />;
  const label = { interested: "Awaiting investor", accepted: "Matched", declined: "Not selected", withdrawn: "Withdrawn" } as const;
  const tone = { interested: "yellow", accepted: "green", declined: "gray", withdrawn: "gray" } as const;

  return (
    <>
      <PageHeader title="My Deals" description="Deals you've raised your hand on, and the ones you've been matched to." action={<ButtonLink href="/browse" variant="secondary"><Search /> Properties in my area</ButtonLink>} />
      <Card>
        {data.length === 0 ? (
          <EmptyState icon={<Briefcase />} title="No deals yet" description="See live properties in your area that need a listing or buyer's agent, and express interest." action={<ButtonLink href="/browse">Properties in my area</ButtonLink>} />
        ) : (
          <ul className="divide-y divide-border">
            {data.map(({ interest, deal, investor, match }) => (
              <li key={interest.id}>
                <Link href={`/deals/${deal.id}`} className="flex flex-col gap-3 px-5 py-4 hover:bg-slate-50 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{deal.title}</p>
                    <div className="my-1 flex flex-wrap items-center gap-1.5">
                      <AgentNeedBadge need={deal.agent_need} />
                      {deal.deal_type && <Badge tone="gray">{DEAL_TYPE_LABEL[deal.deal_type] ?? deal.deal_type}</Badge>}
                    </div>
                    <p className="text-xs text-muted">
                      {deal.city}, {deal.state} · {formatPrice(deal.asking_price)} · {fullName(investor)}
                      {investor.company_name ? `, ${investor.company_name}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {match?.status === "completed" ? <Badge tone="purple">Sold</Badge> : <Badge tone={tone[interest.status]}>{label[interest.status]}</Badge>}
                    <span className="text-xs text-muted">{timeAgo(interest.created_at)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
