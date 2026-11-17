import { useQuery } from "@tanstack/react-query";
import { Mail, MapPin, Phone, Signpost } from "lucide-react";
import { useState } from "react";
import { api, type RealtorListing, type RealtorListingInput } from "@/lib/api";
import { keys, useAction, useMe } from "@/lib/hooks";
import { listingAreaMatch, sortListingsForInvestor } from "@/lib/domain/listings";
import { PROPERTY_TYPE_LABEL } from "@/lib/domain/buybox";
import { stateName, US_STATES } from "@/lib/domain/states";
import { hasActiveBilling } from "@/lib/domain/paywall";
import { formatUsPhone } from '@/lib/domain/phone';
import { fullName, timeAgo } from "@/lib/utils";
import { Alert, Avatar, Badge, Button, ButtonLink, Card, CardBody, CardHeader, EmptyState, Field, Input, PageHeader, PageLoader, Select, Textarea } from "@/components/ui";
import { useCountyCatalog } from "@/components/county-picker";
import type { Profile } from "@/lib/types";

const money = (n: number | null) => (n == null ? null : `$${Number(n).toLocaleString()}`);

export default function ListingsPage() {
  const { data: me } = useMe();
  const { data, error } = useQuery({ queryKey: keys.listings, queryFn: api.listListings, enabled: !!me });
  if (!me || (!data && !error)) return <PageLoader />;
  if (me.role === "realtor") return <RealtorListings me={me} rows={(data ?? []).filter((l) => l.realtor_id === me.id)} />;
  if (me.role !== "investor" && me.role !== "admin") return <Card><EmptyState icon={<Signpost />} title="Listings are for investors and realtors" /></Card>;
  if (error) return <Card><EmptyState icon={<Signpost />} title="Couldn't load listings" description={error.message} /></Card>;
  const rows = sortListingsForInvestor(data ?? [], me.markets, me.counties ?? []);
  return (
    <>
      <PageHeader title="Listings in My Area" description="On-market properties realtors want in front of investors. Listings in the areas on your profile show first." />
      {rows.length === 0 ? (
        <Card><EmptyState icon={<Signpost />} title="No listings yet" description="When realtors post on-market listings, they'll show up here." /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((l) => <ListingCard key={l.id} l={l} match={listingAreaMatch(l, me.markets, me.counties ?? [])} />)}
        </div>
      )}
    </>
  );
}

function ListingCard({ l, match, onRemove }: { l: RealtorListing; match?: "county" | "state" | null; onRemove?: () => void }) {
  const facts = [l.beds != null && `${l.beds} bd`, l.baths != null && `${l.baths} ba`, l.sqft != null && `${l.sqft.toLocaleString()} sqft`, l.days_on_market != null && `${l.days_on_market} days on market`].filter(Boolean);
  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-semibold">{l.title}</h2>
            <p className="flex items-center gap-1 text-sm text-muted"><MapPin className="size-4" />{[l.address_line, l.city, l.county, stateName(l.state)].filter(Boolean).join(", ")}</p>
          </div>
          <div className="text-right">
            {money(l.list_price) && <p className="text-lg font-semibold tabular-nums">{money(l.list_price)}</p>}
            {match === "county" && <Badge tone="green">In your county</Badge>}
            {match === "state" && <Badge tone="blue">In your state</Badge>}
          </div>
        </div>
        <p className="text-sm text-muted">{[PROPERTY_TYPE_LABEL[l.property_type] ?? l.property_type, ...facts].join(" · ")} · posted {timeAgo(l.created_at)}</p>
        {l.description && <p className="text-sm whitespace-pre-line text-ink">{l.description}</p>}
        {l.agent && !onRemove && (
          <div className="flex items-start gap-3 border-t border-border pt-3">
            <div className="shrink-0"><Avatar person={l.agent} size={36} /></div>
            <div className="min-w-0 flex-1 text-sm">
              <h3 className="mb-1 font-semibold">Realtor contact</h3>
              <p className="font-medium">{fullName(l.agent)}{l.agent.brokerage_name && <span className="text-muted"> · {l.agent.brokerage_name}</span>}</p>
              <div className="mt-2 space-y-1.5">
                <a className="flex min-w-0 items-start gap-2 text-brand-700 hover:underline" href={`mailto:${l.agent.email}`}><Mail className="mt-0.5 size-3.5 shrink-0" /><span className="min-w-0 break-all">{l.agent.email}</span></a>
                {l.agent.phone ? <a className="flex items-center gap-2 text-brand-700 hover:underline" href={`tel:${l.agent.phone}`}><Phone className="size-3.5 shrink-0" />{formatUsPhone(l.agent.phone)}</a> : <p className="text-muted">No phone number on file yet</p>}
              </div>
            </div>
          </div>
        )}
        {onRemove && <Button variant="secondary" size="sm" onClick={onRemove}>Remove listing</Button>}
      </CardBody>
    </Card>
  );
}

const EMPTY = { title: "", address_line: "", city: "", state: "", county: "", zip: "", property_type: "single_family", beds: "", baths: "", sqft: "", list_price: "", days_on_market: "", description: "" };
const num = (v: string) => (v.trim() === "" ? null : Number(v));

function RealtorListings({ me, rows }: { me: Profile; rows: RealtorListing[] }) {
  const [form, setForm] = useState(EMPTY);
  const [err, setErr] = useState<string | null>(null);
  const { data: counties } = useCountyCatalog();
  const post = useAction((i: RealtorListingInput) => api.postListing(i), { success: "Listing posted for investors", invalidate: [keys.listings] });
  const remove = useAction((id: string) => api.removeListing(id), { success: "Listing removed", invalidate: [keys.listings] });
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });
  const canPost = hasActiveBilling(me);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.title.trim().length < 3 || !form.city.trim() || !form.state) return setErr("Add a headline, city and state.");
    setErr(null);
    post.mutate(
      { title: form.title.trim(), address_line: form.address_line.trim() || null, city: form.city.trim(), state: form.state, county: form.county || null, zip: form.zip.trim() || null, property_type: form.property_type, beds: num(form.beds), baths: num(form.baths), sqft: num(form.sqft), list_price: num(form.list_price), days_on_market: num(form.days_on_market), description: form.description.trim() || null },
      { onSuccess: () => setForm(EMPTY) },
    );
  }

  return (
    <>
      <PageHeader title="My Listings" description="Post an on-market listing that isn't moving. Every investor on RealtyBridge sees it, with your phone and email, and investors in that area see it first." />
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader title="Post a listing" />
          <CardBody>
            {!canPost ? (
              <Alert tone="yellow" title="Subscription required" action={<ButtonLink href="/settings" size="sm">Go to billing</ButtonLink>}>Start your trial or subscription to post listings.</Alert>
            ) : (
              <form onSubmit={submit} className="grid gap-4 sm:grid-cols-6">
                <Field label="Headline" htmlFor="l-title" className="sm:col-span-6"><Input id="l-title" placeholder="e.g. 3/2 ranch, motivated seller, price reduced" value={form.title} onChange={set("title")} /></Field>
                <Field label="Street address (optional)" htmlFor="l-addr" className="sm:col-span-6"><Input id="l-addr" value={form.address_line} onChange={set("address_line")} /></Field>
                <Field label="City" htmlFor="l-city" className="sm:col-span-3"><Input id="l-city" value={form.city} onChange={set("city")} /></Field>
                <Field label="State" htmlFor="l-state" className="sm:col-span-2">
                  <Select id="l-state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value, county: "" })}>
                    <option value="">Select</option>
                    {US_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
                  </Select>
                </Field>
                <Field label="ZIP" htmlFor="l-zip" className="sm:col-span-1"><Input id="l-zip" inputMode="numeric" maxLength={5} value={form.zip} onChange={set("zip")} /></Field>
                <Field label="County" htmlFor="l-county" className="sm:col-span-3">
                  <Select id="l-county" value={form.county} onChange={set("county")} disabled={!form.state}>
                    <option value="">{form.state ? "Select a county" : "Choose a state first"}</option>
                    {(counties?.[form.state] ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </Field>
                <Field label="Property type" htmlFor="l-type" className="sm:col-span-3">
                  <Select id="l-type" value={form.property_type} onChange={set("property_type")}>
                    {Object.entries(PROPERTY_TYPE_LABEL).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                  </Select>
                </Field>
                <Field label="List price" htmlFor="l-price" className="sm:col-span-3"><Input id="l-price" inputMode="numeric" value={form.list_price} onChange={set("list_price")} /></Field>
                <Field label="Days on market" htmlFor="l-dom" className="sm:col-span-3"><Input id="l-dom" inputMode="numeric" value={form.days_on_market} onChange={set("days_on_market")} /></Field>
                <Field label="Beds" htmlFor="l-beds" className="sm:col-span-2"><Input id="l-beds" inputMode="decimal" value={form.beds} onChange={set("beds")} /></Field>
                <Field label="Baths" htmlFor="l-baths" className="sm:col-span-2"><Input id="l-baths" inputMode="decimal" value={form.baths} onChange={set("baths")} /></Field>
                <Field label="Sqft" htmlFor="l-sqft" className="sm:col-span-2"><Input id="l-sqft" inputMode="numeric" value={form.sqft} onChange={set("sqft")} /></Field>
                <Field label="Details" htmlFor="l-desc" className="sm:col-span-6"><Textarea id="l-desc" rows={4} placeholder="Condition, why it's sitting, seller flexibility, showing access…" value={form.description} onChange={set("description")} /></Field>
                {err && <p className="text-sm text-red-600 sm:col-span-6">{err}</p>}
                <div className="sm:col-span-6"><Button type="submit" loading={post.isPending}>Post listing</Button></div>
              </form>
            )}
          </CardBody>
        </Card>
        <div className="space-y-4">
          {rows.length === 0 ? (
            <Card><EmptyState icon={<Signpost />} title="No active listings" description="Listings you post appear here." /></Card>
          ) : (
            rows.map((l) => <ListingCard key={l.id} l={l} onRemove={() => confirm("Remove this listing? Investors will no longer see it.") && remove.mutate(l.id)} />)
          )}
        </div>
      </div>
    </>
  );
}
