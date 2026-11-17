
import { useQuery } from "@tanstack/react-query";
import { Bath, BedDouble, MapPin, Ruler, Search, ShieldCheck } from "lucide-react";
import Link from "@/lib/next/link";
import { useRouter, useSearchParams } from "@/lib/next/navigation";
import { Suspense, useDeferredValue, useState } from "react";
import { api, type BrowseDealRow } from "@/lib/api";
import { keys, useMe } from "@/lib/hooks";
import { AGENT_NEED_COPY, countByNeed, realtorStates } from "@/lib/domain/agent-need";
import { stateName, US_STATES } from "@/lib/domain/states";
import type { AgentNeed, Profile } from "@/lib/types";
import { formatMoney, formatPrice, fullName, timeAgo } from "@/lib/utils";
import { Alert, Avatar, Badge, ButtonLink, Card, EmptyState, Input, PageHeader, PageLoader, Select, Tabs } from "@/components/ui";
import { AgentNeedBadge } from "@/components/badges";
import { DEAL_TYPE_LABEL } from "@/lib/domain/deal-type";
import { RatingInline } from "@/components/stars";
import { SuccessRateInline } from "@/components/track-record";

type NeedTab = "all" | AgentNeed;

export default function BrowsePage() {
  const { data: me } = useMe();
  if (!me) return <PageLoader />;
  return (
    <Suspense fallback={<PageLoader />}>
      <Browse me={me} />
    </Suspense>
  );
}

function Browse({ me }: { me: Profile }) {
  const params = useSearchParams();
  const router = useRouter();
  const need = (params.get("need") as NeedTab) || "all";
  const [area, setArea] = useState<string>("mine");
  const [city, setCity] = useState("");
  const deferredCity = useDeferredValue(city);

  const verified = me.verification_status === "verified";
  const myStates = realtorStates(me);
  const stateFilter = area === "mine" || area === "all" ? undefined : area;
  const filters = { state: stateFilter, city: deferredCity.trim() || undefined };

  const { data, isLoading } = useQuery({
    queryKey: keys.browse(filters),
    queryFn: () => api.browseDeals(filters),
    enabled: verified,
  });

  // area + city filter server-side; the agent-type tab filters here so every tab can show its count
  const inArea = (data ?? []).filter((d) => area !== "mine" || myStates.has(d.state));
  const counts = countByNeed(inArea);
  const rows = need === "all" ? inArea : inArea.filter((d) => d.agent_need === need);

  const setNeed = (v: NeedTab) => router.replace(v === "all" ? "/browse" : `/browse?need=${v}`);

  return (
    <>
      <PageHeader
        title="Properties in your area"
        description="Live properties where investors need a listing agent or a buyer's agent. Street addresses are shared once you're matched."
      />

      {!verified ? (
        <Alert tone="yellow" icon={<ShieldCheck />} title="Add your license number to see properties" action={<ButtonLink href="/profile#license" size="sm">Add license #</ButtonLink>}>
          Investors only share properties with licensed agents.
        </Alert>
      ) : (
        <Card>
          <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center">
            <div className="relative md:w-72">
              <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Select aria-label="Area" value={area} onChange={(e) => setArea(e.target.value)} className="pl-9">
                <option value="mine">My area ({[...myStates].join(", ") || "set your markets"})</option>
                <option value="all">All states</option>
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="relative md:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input aria-label="City" placeholder="Filter by city" value={city} onChange={(e) => setCity(e.target.value)} className="pl-9" />
            </div>
            <p className="text-sm text-muted md:ml-auto">
              {rows.length} propert{rows.length === 1 ? "y" : "ies"}
            </p>
          </div>
          <div className="px-4">
            <Tabs<NeedTab>
              value={need}
              onChange={setNeed}
              tabs={[
                { value: "all", label: "All", count: inArea.length },
                { value: "listing_agent", label: "Needs listing agent", count: counts.listing_agent },
                { value: "buyers_agent", label: "Needs buyer's agent", count: counts.buyers_agent },
              ]}
            />
          </div>

          <div className="p-4">
            {isLoading ? (
              <PageLoader />
            ) : rows.length === 0 ? (
              <EmptyState
                icon={<MapPin />}
                title="No live properties match"
                description={area === "mine" && myStates.size === 0 ? "Add the states you serve on your profile to see properties in your area." : "Try another area, city or tab. We'll notify you when an investor posts in your markets."}
                action={area === "mine" && myStates.size === 0 ? <ButtonLink href="/profile" size="sm">Set your markets</ButtonLink> : undefined}
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[...rows]
                  .map((d) => ({ d, local: !!d.county && (me.counties ?? []).includes(`${d.state}:${d.county}`) }))
                  .sort((a, b) => Number(b.local) - Number(a.local))
                  .map(({ d, local }) => (
                    <PropertyCard key={d.id} deal={d} local={local} />
                  ))}
              </div>
            )}
            {stateFilter && !myStates.has(stateFilter) && rows.length > 0 && (
              <p className="mt-4 text-xs text-muted">{stateName(stateFilter)} isn&apos;t in your markets. Make sure you&apos;re licensed there before expressing interest.</p>
            )}
          </div>
        </Card>
      )}
    </>
  );
}

function PropertyCard({ deal: d, local }: { deal: BrowseDealRow; local: boolean }) {
  return (
    <Link href={`/deals/${d.id}`} className="group">
      <div className="flex h-full flex-col rounded-[var(--radius-card)] border border-border bg-white transition-shadow group-hover:border-brand-200 group-hover:shadow-md">
        <div className="flex-1 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <AgentNeedBadge need={d.agent_need} />
              {d.deal_type && <Badge tone="gray">{DEAL_TYPE_LABEL[d.deal_type] ?? d.deal_type}</Badge>}
              {local && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">In your county</span>}
            </span>
            <span className="text-xs text-muted">{timeAgo(d.created_at)}</span>
          </div>
          <h2 className="mt-3 line-clamp-2 font-semibold text-ink group-hover:text-brand-700">{d.title}</h2>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted">
            <MapPin className="size-3.5" /> {d.city}{d.county ? `, ${d.county}` : ""}, {d.state} {d.zip}
          </p>
          <p className="mt-3 text-2xl font-semibold tabular-nums">{formatPrice(d.asking_price)}</p>
          <p className="text-xs text-muted">
            {AGENT_NEED_COPY[d.agent_need].priceLabel}
            {d.arv ? ` · ARV ${formatMoney(d.arv)}` : ""}
          </p>
          <div className="mt-3 flex gap-4 text-sm text-slate-600 [&_svg]:size-4 [&_svg]:text-slate-400">
            {d.beds != null && (
              <span className="flex items-center gap-1">
                <BedDouble /> {d.beds}
              </span>
            )}
            {d.baths != null && (
              <span className="flex items-center gap-1">
                <Bath /> {d.baths}
              </span>
            )}
            {d.sqft != null && (
              <span className="flex items-center gap-1">
                <Ruler /> {d.sqft.toLocaleString()}
              </span>
            )}
          </div>
          {d.terms && <p className="mt-3 line-clamp-2 text-sm text-slate-600">{d.terms}</p>}
        </div>
        <div className="flex items-center gap-3 border-t border-border px-5 py-3">
          <Avatar person={d.investor} size={28} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{fullName(d.investor)}</p>
            <RatingInline avg={d.investor.avg_rating} count={d.investor.review_count} size={11} />
            <div className="mt-1">
              <SuccessRateInline sold={d.investor.closed_deals} cancelled={d.investor.cancelled_deals} />
            </div>
          </div>
          {d.my_interest && <Badge tone="green">{d.referral_required ? 'Application sent' : 'Interest sent'}</Badge>}
        </div>
      </div>
    </Link>
  );
}
