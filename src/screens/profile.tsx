
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Camera } from "lucide-react";
import { memberBadges } from "@/lib/domain/badges";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { keys, useAction, useMe } from "@/lib/hooks";
import { US_STATES } from "@/lib/domain/states";
import type { Profile } from "@/lib/types";
import { Avatar, Badge, Button, ButtonLink, Card, CardBody, CardHeader, Field, Input, PageHeader, PageLoader, Select, Textarea } from "@/components/ui";
import { VerificationBadge } from "@/components/badges";
import { StateMultiSelect } from "@/components/state-multi-select";
import { CountyPicker } from "@/components/county-picker";
import { keepCountiesInStates } from "@/lib/domain/counties";
import { BuyBoxDealTypePicker, BuyBoxTypePicker } from "@/components/buybox";
import { TrackRecordCard } from "@/components/track-record";
import { ServicePicker } from "@/components/services";
import { toast } from "@/components/toast";
import { ContractorServices } from "@/components/contractor-services";
import { NetworkPreferencesEditor } from '@/components/network-preferences';
import { networkEligible } from '@/lib/domain/realtor-network';
import { AccountContact } from '@/components/account-contact';
import { ProfileScorecard } from '@/components/profile-scorecard';

export default function ProfilePage() {
  const { data: me } = useMe();
  if (!me) return <PageLoader />;
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={me.role === "realtor" ? "Profile & License" : "Profile"} description={me.role === "realtor" ? "Investors see your profile, services, success rate and reviews when you express interest." : me.role === "contractor" ? "Investors see your services and contact info on deals in the states and counties you cover." : "Realtors see your profile, success rate and reviews when you post a deal."} />
      <div className="space-y-6">
        <AccountContact me={me} />
        <MyBadges me={me} />
        {me.role !== "contractor" && <MyTrackRecord me={me} />}
        <BasicInfo me={me} />
        {me.role === "investor" && <BuyBox me={me} />}
        {me.role === "realtor" && <RealtorLicense me={me} />}
        {me.role === "realtor" && <RealtorExperience me={me} />}
        {networkEligible(me) && <section className="space-y-5 border-t border-border pt-6"><h2 className="text-lg font-semibold">Realtor Referral Network coverage & preferences</h2><NetworkPreferencesEditor /></section>}
        {me.role === "contractor" && <ContractorServices me={me} />}
      </div>
    </div>
  );
}

function MyBadges({ me }: { me: Profile }) {
  const { data } = useQuery({ queryKey: keys.member(me.id), queryFn: () => api.memberProfile(me.id) });
  if (!data) return null;
  const badges = memberBadges({ role: me.role, created_at: data.profile.created_at, completed_deals: data.track.completed_deals, avg_rating: data.profile.avg_rating, review_count: data.profile.review_count });
  return (
    <Card>
      <CardHeader title="Your badges" description={badges.length ? "Shown on your public profile." : "Earn badges by closing deals and getting great reviews."} />
      {badges.length > 0 && (
        <CardBody>
          <ul className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <li key={b.key}>
                <Badge tone="blue" title={b.criteria}>
                  <Award /> {b.label}
                </Badge>
                <p className="mt-1 text-xs text-muted">{b.criteria}</p>
              </li>
            ))}
          </ul>
        </CardBody>
      )}
    </Card>
  );
}

// ───────────────────────────── Track record ─────────────────────────────

function MyTrackRecord({ me }: { me: Profile }) {
  const { data } = useQuery({ queryKey: keys.member(me.id), queryFn: () => api.memberProfile(me.id) });
  const reviews = useQuery({ queryKey: keys.reviewsAbout(me.id), queryFn: () => api.reviewsAbout(me.id) });
  if (!data) return null;
  return (
    <>
    {reviews.data && <ProfileScorecard reviews={reviews.data} track={data.track} />}
    <TrackRecordCard
      track={data.track}
      role={me.role}
      title="Your RealtyBridge track record"
      action={
        <ButtonLink href={`/${me.role === "realtor" ? "realtors" : "investors"}/${me.id}`} variant="secondary" size="sm">
          View public profile
        </ButtonLink>
      }
    />
    </>
  );
}

// ───────────────────────────── Basic info ─────────────────────────────

function BasicInfo({ me }: { me: Profile }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    first_name: me.first_name ?? "",
    last_name: me.last_name ?? "",
    company_name: me.company_name ?? "",
    bio: me.bio ?? "",
    markets: me.markets,
    counties: me.counties ?? [],
    services: me.services ?? [],
  });
  const [touched, setTouched] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isRealtor = me.role === "realtor";

  const errors = {
    first_name: !form.first_name.trim() ? "First name is required" : null,
    last_name: !form.last_name.trim() ? "Last name is required" : null,
    markets: form.markets.length === 0 ? "Choose at least one state" : null,
    services: isRealtor && form.services.length === 0 ? "Choose at least one service" : null,
  };
  const valid = Object.values(errors).every((e) => !e);

  const save = useAction(
    async () => {
      const saved = await api.updateProfile({
        ...form,
        counties: keepCountiesInStates(form.counties, form.markets),
        services: isRealtor ? form.services : [],
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        company_name: form.company_name.trim() || null,
        bio: form.bio.trim() || null,
      });
      qc.setQueryData(keys.me, saved);
      return saved;
    },
    { success: "Profile saved" },
  );
  const avatar = useAction((f: File) => api.uploadAvatar(f), { success: "Photo updated", invalidate: [keys.me] });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const show = (k: keyof typeof errors) => (touched ? errors[k] : null);

  return (
    <Card>
      <CardHeader title="Basic info" />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (valid) save.mutate(undefined);
        }}
      >
        <CardBody className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar person={me} size={72} />
              <button type="button" onClick={() => fileRef.current?.click()} aria-label="Upload profile photo" className="absolute -right-1 -bottom-1 flex size-8 items-center justify-center rounded-full border border-border bg-white text-slate-600 shadow-sm hover:text-brand-600">
                <Camera className="size-4" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && f.size > 5 * 1024 * 1024) toast.error("Photos must be under 5MB");
                  else if (f) avatar.mutate(f);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="text-sm">
              <p className="font-medium">Profile photo</p>
              <p className="text-muted">A clear headshot builds trust. PNG or JPG, up to 5MB.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" htmlFor="first_name" error={show("first_name")}>
              <Input id="first_name" autoComplete="given-name" value={form.first_name} aria-invalid={!!show("first_name")} onChange={(e) => set("first_name", e.target.value)} />
            </Field>
            <Field label="Last name" htmlFor="last_name" error={show("last_name")}>
              <Input id="last_name" autoComplete="family-name" value={form.last_name} aria-invalid={!!show("last_name")} onChange={(e) => set("last_name", e.target.value)} />
            </Field>
            <Field label={me.role === "realtor" ? "Team name (optional)" : "Company name"} htmlFor="company">
              <Input id="company" autoComplete="organization" value={form.company_name} onChange={(e) => set("company_name", e.target.value)} />
            </Field>
          </div>

          <Field label="Bio" htmlFor="bio" hint={me.role === "investor" ? "What you invest in, your strategy and how you work with agents. Use the buy box below for price and property types." : "Your specialties, neighborhoods and experience with novation listings."}>
            <Textarea id="bio" maxLength={2000} value={form.bio} onChange={(e) => set("bio", e.target.value)} />
          </Field>

          <Field label={me.role === "investor" ? "States I work in" : "States I serve"} htmlFor="markets" error={show("markets")} hint={me.role === "investor" ? "Agents in these states will see your deals." : me.role === "contractor" ? "Your service area — investors with deals in these states will see you." : "You'll see deals posted in these states."}>
            <StateMultiSelect id="markets" value={form.markets} onChange={(v) => set("markets", v)} invalid={!!show("markets")} />
          </Field>

          <Field label={isRealtor ? "Counties I serve" : "Counties I work in"} htmlFor="counties" hint="Optional — narrow down where you work so the right agents and investors find you.">
            <CountyPicker states={form.markets} value={form.counties} onChange={(v) => set("counties", v)} />
          </Field>

          {isRealtor && (
            <Field label="What you work on" error={show("services")} hint="Pick everything you offer. Investors see this on your profile and when you express interest.">
              <ServicePicker value={form.services} onChange={(v) => set("services", v)} invalid={!!show("services")} />
            </Field>
          )}
        </CardBody>
        <div className="flex justify-end border-t border-border px-5 py-3">
          <Button type="submit" loading={save.isPending}>
            Save profile
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ───────────────────────────── Realtor license ─────────────────────────────

function RealtorLicense({ me }: { me: Profile }) {
  const initial = { license_number: me.license_number ?? "", license_state: me.license_state ?? "", brokerage_name: me.brokerage_name ?? "" };
  const [form, setForm] = useState(initial);
  const [touched, setTouched] = useState(false);
  useEffect(() => setForm({ license_number: me.license_number ?? "", license_state: me.license_state ?? "", brokerage_name: me.brokerage_name ?? "" }), [me.license_number, me.license_state, me.brokerage_name]);

  const number = form.license_number.trim();
  const error = !number ? "License number is required" : number.length < 2 || number.length > 40 ? "Enter a valid license number" : null;
  const save = useAction(
    () => api.updateProfile({ license_number: number, license_state: form.license_state || null, brokerage_name: form.brokerage_name.trim() || null }),
    { success: "License saved", invalidate: [keys.me] },
  );

  return (
    <Card id="license" className="scroll-mt-24">
      <CardHeader title="Real estate license" description="Add your license number to see properties and express interest." action={<VerificationBadge status={me.verification_status} />} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (!error) save.mutate(undefined);
        }}
      >
        <CardBody className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="License number" htmlFor="lic" error={touched ? error : null}>
              <Input id="lic" required maxLength={40} value={form.license_number} aria-invalid={touched && !!error} onChange={(e) => setForm({ ...form, license_number: e.target.value })} />
            </Field>
            <Field label="Licensing state (optional)" htmlFor="lic-state">
              <Select id="lic-state" value={form.license_state} onChange={(e) => setForm({ ...form, license_state: e.target.value })}>
                <option value="">Select a state</option>
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Brokerage name (optional)" htmlFor="brokerage" className="sm:col-span-2">
              <Input id="brokerage" value={form.brokerage_name} onChange={(e) => setForm({ ...form, brokerage_name: e.target.value })} />
            </Field>
          </div>
          <p className="text-xs text-muted">
            By saving, you confirm this is your own active real estate license. Investors see your license number on your profile and can look it up with your state&apos;s licensing board.
          </p>
        </CardBody>
        <div className="flex justify-end border-t border-border px-5 py-3">
          <Button type="submit" loading={save.isPending}>
            Save license
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ───────────────────────────── Realtor experience ─────────────────────────────

function RealtorExperience({ me }: { me: Profile }) {
  const init = () => ({ deals: me.deals_last_year != null ? String(me.deals_last_year) : "", history: me.experience_history ?? "" });
  const [form, setForm] = useState(init);
  useEffect(() => setForm(init()), [me.deals_last_year, me.experience_history]); // eslint-disable-line react-hooks/exhaustive-deps
  const n = form.deals.trim() === "" ? null : Number(form.deals);
  const error = n != null && (!Number.isInteger(n) || n < 0 || n > 10000) ? "Enter a whole number" : null;
  const save = useAction(() => api.updateProfile({ deals_last_year: n, experience_history: form.history.trim() || null }), { success: "Experience saved", invalidate: [keys.me] });
  return (
    <Card>
      <CardHeader title="Experience & history" description="Shown on your public profile so investors can see your track record outside RealtyBridge." />
      <form onSubmit={(e) => { e.preventDefault(); if (!error) save.mutate(undefined); }}>
        <CardBody className="space-y-4">
          <Field label="Deals completed last year" htmlFor="deals-last-year" error={error}>
            <Input id="deals-last-year" type="number" min={0} max={10000} step={1} inputMode="numeric" className="sm:w-40" value={form.deals} onChange={(e) => setForm({ ...form, deals: e.target.value })} />
          </Field>
          <Field label="History" htmlFor="history">
            <Textarea id="history" rows={5} maxLength={4000} placeholder="Years in real estate, deal types you've closed, notable results…" value={form.history} onChange={(e) => setForm({ ...form, history: e.target.value })} />
          </Field>
        </CardBody>
        <div className="flex justify-end border-t border-border px-5 py-3">
          <Button type="submit" loading={save.isPending}>Save experience</Button>
        </div>
      </form>
    </Card>
  );
}

// ───────────────────────────── Investor buy box ─────────────────────────────

function BuyBox({ me }: { me: Profile }) {
  const [form, setForm] = useState({
    min: me.buybox_min_price != null ? String(me.buybox_min_price) : "",
    max: me.buybox_max_price != null ? String(me.buybox_max_price) : "",
    types: me.buybox_property_types,
    dealTypes: me.buybox_deal_types ?? [],
    notes: me.buybox_notes ?? "",
  });
  useEffect(
    () =>
      setForm({
        min: me.buybox_min_price != null ? String(me.buybox_min_price) : "",
        max: me.buybox_max_price != null ? String(me.buybox_max_price) : "",
        types: me.buybox_property_types,
        dealTypes: me.buybox_deal_types ?? [],
        notes: me.buybox_notes ?? "",
      }),
    [me.buybox_min_price, me.buybox_max_price, me.buybox_property_types, me.buybox_deal_types, me.buybox_notes],
  );
  const [touched, setTouched] = useState(false);

  const toNum = (v: string): number | null => {
    const n = Number(v.replace(/[^0-9.]/g, ""));
    return v.trim() && !Number.isNaN(n) && n >= 0 ? Math.round(n) : null;
  };
  const min = toNum(form.min);
  const max = toNum(form.max);
  const error = min != null && max != null && min > max ? "Minimum price can't be higher than the maximum" : null;

  const save = useAction(
    () => api.updateProfile({ buybox_min_price: min, buybox_max_price: max, buybox_property_types: form.types, buybox_deal_types: form.dealTypes, buybox_notes: form.notes.trim() || null }),
    { success: "Buy box saved", invalidate: [keys.me] },
  );

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Card id="buybox" className="scroll-mt-24">
      <CardHeader title="Buy box" description="Tell agents what you're looking to buy. It shows on your public profile and next to your deals." />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (!error) save.mutate(undefined);
        }}
      >
        <CardBody className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Minimum price" htmlFor="bb-min" hint="Optional" error={touched ? error : null}>
              <Input id="bb-min" inputMode="numeric" placeholder="$50,000" value={form.min} aria-invalid={touched && !!error} onChange={(e) => set("min", e.target.value)} />
            </Field>
            <Field label="Maximum price" htmlFor="bb-max" hint="Optional">
              <Input id="bb-max" inputMode="numeric" placeholder="$250,000" value={form.max} aria-invalid={touched && !!error} onChange={(e) => set("max", e.target.value)} />
            </Field>
          </div>
          <Field label="Property types" htmlFor="bb-types" hint="Pick everything you buy.">
            <BuyBoxTypePicker value={form.types} onChange={(v) => set("types", v)} />
          </Field>
          <Field label="Deal types">
            <BuyBoxDealTypePicker value={form.dealTypes} onChange={(v) => set("dealTypes", v)} />
          </Field>
          <Field label="Criteria" htmlFor="bb-notes" hint="Optional — condition, strategy (fix and flip, rental, novation), neighborhoods, anything agents should know.">
            <Textarea id="bb-notes" maxLength={1000} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </CardBody>
        <div className="flex justify-end border-t border-border px-5 py-3">
          <Button type="submit" loading={save.isPending}>
            Save buy box
          </Button>
        </div>
      </form>
    </Card>
  );
}
