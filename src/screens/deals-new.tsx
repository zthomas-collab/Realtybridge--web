
import { ArrowLeft, Info, KeyRound, Signpost } from "lucide-react";
import Link from "@/lib/next/link";
import { useRouter } from "@/lib/next/navigation";
import { useState } from "react";
import { z } from "zod";
import { api } from "@/lib/api";
import { useAction, useMe } from "@/lib/hooks";
import { canPostDeal } from "@/lib/domain/paywall";
import { US_STATES } from "@/lib/domain/states";
import { AGENT_NEED_COPY, AGENT_NEEDS } from "@/lib/domain/agent-need";
import { DEAL_TYPES, DEAL_TYPE_VALUES, dealTypeHint } from "@/lib/domain/deal-type";
import type { AgentNeed, DealInput, DealType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button, Card, CardBody, CardHeader, Field, Input, PageLoader, Select, Textarea } from "@/components/ui";
import { PaywallGate } from "@/components/paywall";
import { useCountyCatalog } from "@/components/county-picker";

const optionalNumber = z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().positive("Must be greater than 0").nullable());

const schema = z.object({
  agent_need: z.enum(["listing_agent", "buyers_agent"]),
  deal_type: z.enum(DEAL_TYPE_VALUES, { error: "Choose a deal type" }),
  title: z.string().trim().min(3, "Give the deal a short headline").max(140),
  address_line: z.string().trim().min(3, "Street address is required"),
  city: z.string().trim().min(2, "City is required"),
  state: z.string().length(2, "Choose a state"),
  zip: z.string().trim().regex(/^\d{5}$/, "5-digit ZIP"),
  county: z.string().trim().min(1, "Choose a county").max(80),
  property_type: z.string(),
  beds: optionalNumber,
  baths: optionalNumber,
  sqft: optionalNumber,
  asking_price: z.preprocess((v) => (v === "tbd" ? null : v === "" ? undefined : Number(v)), z.number({ error: "Enter a price or choose TBD" }).positive().nullable()),
  arv: optionalNumber,
  terms: z.string().trim().min(10, "Add the terms for this listing so agents know what you're offering").max(2000),
  description: z.string().trim().max(5000).nullable(),
});

const EMPTY = { agent_need: "listing_agent" as AgentNeed, deal_type: "" as DealType | "", title: "", address_line: "", city: "", state: "", zip: "", county: "", property_type: "single_family", beds: "", baths: "", sqft: "", asking_price: "", arv: "", terms: "", description: "" };

export default function NewDealPage() {
  const { data: me } = useMe();
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { data: counties } = useCountyCatalog();
  const post = useAction((input: DealInput) => api.postDeal(input), { success: "Your deal is live" });

  if (!me) return <PageLoader />;
  const gate = canPostDeal(me);
  if (!gate.allowed) return <PaywallGate block={gate.block} />;

  const copy = AGENT_NEED_COPY[form.agent_need];
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ ...form, description: form.description || null });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    post.mutate(parsed.data as DealInput, { onSuccess: (deal) => router.push(`/deals/${deal.id}`) });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/deals" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> My Deals
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Post a property</h1>
      <p className="mt-1 mb-6 text-sm text-muted">It goes live as soon as you post it. Licensed agents serving that state are notified and can express interest.</p>

      <form onSubmit={submit} noValidate className="space-y-6">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">What do you need?</legend>
          <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
            {AGENT_NEEDS.map((need) => {
              const selected = form.agent_need === need;
              return (
                <button
                  key={need}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setForm({ ...form, agent_need: need })}
                  className={cn(
                    "flex items-start gap-3 rounded-[var(--radius-card)] border bg-white p-4 text-left transition-colors",
                    selected ? "border-brand-600 ring-3 ring-brand-100" : "border-border hover:border-brand-200",
                  )}
                >
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg]:size-5", selected ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500")}>
                    {need === "listing_agent" ? <Signpost /> : <KeyRound />}
                  </span>
                  <span>
                    <span className="block font-medium text-ink">{AGENT_NEED_COPY[need].investorPrompt}</span>
                    <span className="mt-0.5 block text-sm text-muted">{AGENT_NEED_COPY[need].investorHint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">Deal type</legend>
          <div role="radiogroup" aria-label="Deal type" className="grid gap-2 sm:grid-cols-3">
            {DEAL_TYPES.map((type) => {
              const selected = form.deal_type === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    setForm({ ...form, deal_type: type.value });
                    setErrors((e) => {
                      const next = { ...e };
                      delete next.deal_type;
                      return next;
                    });
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-[var(--radius-card)] border bg-white px-3 py-2.5 text-left text-sm font-medium transition-colors",
                    selected ? "border-brand-600 text-ink ring-3 ring-brand-100" : errors.deal_type ? "border-red-300 text-ink" : "border-border text-slate-600 hover:border-brand-200",
                  )}
                >
                  <span className={cn("flex size-4 shrink-0 items-center justify-center rounded-full border", selected ? "border-brand-600 bg-brand-600" : "border-slate-300")}>
                    {selected && <span className="size-1.5 rounded-full bg-white" />}
                  </span>
                  {type.label}
                </button>
              );
            })}
          </div>
          {errors.deal_type && <p className="mt-2 text-xs text-red-600">{errors.deal_type}</p>}
          {!errors.deal_type && dealTypeHint(form.deal_type) && <p className="mt-2 text-xs text-muted">{dealTypeHint(form.deal_type)}</p>}
        </fieldset>

        <Card>
          <CardHeader title="Property" />
          <CardBody className="grid gap-4 sm:grid-cols-6">
            <Field label="Headline" htmlFor="title" error={errors.title} className="sm:col-span-6">
              <Input id="title" placeholder={form.agent_need === "listing_agent" ? "e.g. 3/2 ranch near downtown, cosmetic rehab done" : "e.g. 3/2 flip ready to sell — looking for agents with buyers"} value={form.title} onChange={set("title")} aria-invalid={!!errors.title} />
            </Field>
            <Field label="Street address" htmlFor="address" error={errors.address_line} hint="Only shown to the agent you match with." className="sm:col-span-6">
              <Input id="address" autoComplete="street-address" value={form.address_line} onChange={set("address_line")} aria-invalid={!!errors.address_line} />
            </Field>
            <Field label="City" htmlFor="city" error={errors.city} className="sm:col-span-3">
              <Input id="city" value={form.city} onChange={set("city")} aria-invalid={!!errors.city} />
            </Field>
            <Field label="State" htmlFor="state" error={errors.state} className="sm:col-span-2">
              <Select id="state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value, county: "" })} aria-invalid={!!errors.state}>
                <option value="">Select</option>
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="ZIP" htmlFor="zip" error={errors.zip} className="sm:col-span-1">
              <Input id="zip" inputMode="numeric" maxLength={5} value={form.zip} onChange={set("zip")} aria-invalid={!!errors.zip} />
            </Field>
            <Field label="County" htmlFor="county" error={errors.county} hint="Agents who serve this county are notified first." className="sm:col-span-3">
              <Select id="county" value={form.county} onChange={set("county")} disabled={!form.state} aria-invalid={!!errors.county}>
                <option value="">{form.state ? "Select a county" : "Choose a state first"}</option>
                {(counties?.[form.state] ?? []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Property type" htmlFor="ptype" className="sm:col-span-3">
              <Select id="ptype" value={form.property_type} onChange={set("property_type")}>
                <option value="single_family">Single family</option>
                <option value="townhome">Townhome</option>
                <option value="condo">Condo</option>
                <option value="multi_family">Multi-family (2–4)</option>
                <option value="manufactured">Manufactured</option>
                <option value="land">Land</option>
              </Select>
            </Field>
            <Field label="Beds" htmlFor="beds" error={errors.beds} className="sm:col-span-1">
              <Input id="beds" type="number" min={0} step={1} value={form.beds} onChange={set("beds")} />
            </Field>
            <Field label="Baths" htmlFor="baths" error={errors.baths} className="sm:col-span-1">
              <Input id="baths" type="number" min={0} step={0.5} value={form.baths} onChange={set("baths")} />
            </Field>
            <Field label="Sq ft" htmlFor="sqft" error={errors.sqft} className="sm:col-span-1">
              <Input id="sqft" type="number" min={0} value={form.sqft} onChange={set("sqft")} />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Pricing & terms" description="Agents see your terms before they express interest." />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label={copy.priceLabel} htmlFor="price" error={errors.asking_price}>
              <div className="flex items-center gap-3">
                <Input id="price" type="number" min={0} step={1000} placeholder={form.asking_price === "tbd" ? "TBD" : "$"} disabled={form.asking_price === "tbd"} value={form.asking_price === "tbd" ? "" : form.asking_price} onChange={set("asking_price")} aria-invalid={!!errors.asking_price} />
                <label className="flex shrink-0 items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.asking_price === "tbd"} onChange={(e) => setForm({ ...form, asking_price: e.target.checked ? "tbd" : "" })} /> TBD
                </label>
              </div>
            </Field>
            <Field label="ARV (optional)" htmlFor="arv" error={errors.arv}>
              <Input id="arv" type="number" min={0} step={1000} placeholder="$" value={form.arv} onChange={set("arv")} />
            </Field>
            <Field label={copy.termsLabel} htmlFor="terms" hint={copy.termsHint} error={errors.terms} className="sm:col-span-2">
              <Textarea id="terms" maxLength={2000} placeholder={copy.termsPlaceholder} value={form.terms} onChange={set("terms")} aria-invalid={!!errors.terms} />
            </Field>
            <Field label="Description" htmlFor="desc" className="sm:col-span-2">
              <Textarea id="desc" className="min-h-32" value={form.description} onChange={set("description")} />
            </Field>
          </CardBody>
        </Card>

        <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-xs text-muted">
            <Info className="size-4 shrink-0" /> Deals are reviewed by our team before going live, usually within a few hours.
          </p>
          <Button type="submit" size="lg" loading={post.isPending}>
            Post deal
          </Button>
        </div>
      </form>
    </div>
  );
}
