import { useState } from "react";
import { ArrowRight, BadgeCheck, ChevronDown, EyeOff, Hammer, Lock, MapPin, Star, Wallet } from "lucide-react";
import Link from "@/lib/next/link";
import { ButtonLink } from "@/components/ui";
import { LogoMark, Wordmark } from "@/components/logo";
import { PartnerCard } from "@/components/partner-card";
import { PARTNERS } from "@/lib/domain/partners";
import { cn } from "@/lib/utils";
import homeImage from "@/assets/realtybridge-home.jpg";


const SIGNUP = { investor: "/signup?role=investor", realtor: "/signup?role=realtor", contractor: "/signup?role=contractor" } as const;
const VERIFIED = "Every realtor account lists their license number and licensing state. Only licensed realtor accounts can see the properties investors post.";

function RoleButtons({ center = false }: { center?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-3", center && "items-center")}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink href={SIGNUP.investor} size="lg">Post a deal — free <ArrowRight /></ButtonLink>
        <ButtonLink href={SIGNUP.realtor} size="lg" variant="secondary">See investors in my area</ButtonLink>
      </div>
      <Link href={SIGNUP.contractor} className="text-sm font-medium text-brand-700 hover:underline">Contractor? Get in front of local investors for <span className="whitespace-nowrap">$6/mo →</span></Link>
    </div>
  );
}

const STEPS = {
  investor: { label: "Investors", cta: "Post a deal — free", steps: ["Post your deal and buy box, with terms disclosed.", "Verified realtors in that area raise their hand.", "Compare their scores and reviews, then choose your partner."] },
  realtor: { label: "Realtors", cta: "Join as a realtor", steps: ["Choose the ZIP codes you serve.", "See private investor deals and what local investors are buying.", "Bring investors deals before you list publicly."] },
  contractor: { label: "Contractors", cta: "Join as a contractor", steps: ["Join the areas you serve.", "Get seen by investors with active rehab projects.", "Build your rating on completed jobs."] },
} as const;

const FAQ = [
  ["Who can see my deal?", "Only licensed realtor accounts in that property's area, plus you."],
  ["Is RealtyBridge free for realtors?", "Yes. Realtors join free and see deal previews nationwide. RealtyBridge Pro ($25/month or $275/year) unlocks full deal details, investor contact and messaging."],
  ["How are realtors verified?", VERIFIED],
  ["Will I get spammed?", "No. Only area realtors see your post, you decide who to talk to, and poor behavior shows up in reviews."],
  ["What do I need to disclose when I post a deal?", "Your deal terms and your interest in the property, such as owner, under contract, or assignment."],
  ["Does RealtyBridge replace MLS rules?", "No. Realtors remain responsible for seller consent, disclosures, and their local MLS rules for anything they market."],
  ["How do reviews work?", "After a transaction is completed or canceled, the investor and realtor each review the other. Reviews build each member's score over time."],
];

export default function HomePage() {
  const [tab, setTab] = useState<keyof typeof STEPS>("investor");
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-border bg-surface">
        <nav aria-label="Main navigation" className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-20 sm:px-6">
          <Link href="/" aria-label="RealtyBridge home" className="flex min-w-0 items-center gap-2">
            <LogoMark /><Wordmark className="hidden text-xl sm:inline" />
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <ButtonLink href="/login" variant="ghost">Sign in</ButtonLink>
            <a href="#get-started" className="inline-flex h-11 items-center gap-1.5 rounded-full bg-brand-600 px-5 text-sm font-bold text-white shadow-lg shadow-brand-600/40 ring-2 ring-brand-300 ring-offset-2 transition hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-xl sm:px-6 sm:text-base">Sign up now →</a>
          </div>
        </nav>
      </header>
      <main>
        <section id="get-started" className="relative isolate scroll-mt-4 overflow-hidden">
          <img src={homeImage} alt="A residential property with a landscaped front yard and teal front door" width={1536} height={1024} fetchPriority="high" className="absolute inset-0 -z-20 size-full object-cover object-right" />
          <div className="home-photo-scrim absolute inset-0 -z-10" />
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-24 lg:py-28">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-surface/80 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-brand-700 uppercase backdrop-blur-sm sm:text-xs">
                <span className="size-1.5 shrink-0 rounded-full bg-teal" aria-hidden="true" />
                Private deal network<span className="hidden sm:inline"> for investors, realtors &amp; contractors</span>
              </p>
              <h1 className="mt-5 text-[1.55rem] leading-[1.15] font-bold tracking-tight text-navy sm:text-[2.75rem] sm:leading-[1.08]">
                <span className="block text-balance">Private deals.</span>
                <span className="block text-balance">Verified local agents.</span>
                <span className="block text-balance text-brand-700">Reviewed after every close.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-balance text-ink/85 sm:text-lg">Investors post deals free. Only verified realtors in that property's area can see them. After closing, both sides review each other — so every connection you make is an informed one.</p>
              <p className="mt-3 max-w-xl text-base font-semibold text-navy sm:text-lg">Don't hope for the best — take a bridge to real data on who you choose to work with.</p>
              <div className="mt-8"><RoleButtons /></div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-surface">
          <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-6 text-sm font-medium text-ink sm:px-6 md:grid-cols-4">
            {[[MapPin, "Area-locked visibility"], [BadgeCheck, "Verified realtor accounts"], [Star, "Two-way reviews on real transactions"], [Wallet, "Free for investors"]].map(([Icon, t]) => {
              const I = Icon as typeof MapPin;
              return <li key={t as string} className="flex items-center gap-2"><I className="size-5 shrink-0 text-brand-600" aria-hidden="true" />{t as string}</li>;
            })}
          </ul>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-semibold text-navy sm:text-3xl">How it works</h2>
          <div role="tablist" className="mt-6 inline-flex rounded-lg bg-brand-50 p-1 text-sm font-medium">
            {(Object.keys(STEPS) as (keyof typeof STEPS)[]).map((k) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("rounded-md px-3 py-1.5 sm:px-4", tab === k ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink")}>{STEPS[k].label}</button>
            ))}
          </div>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {STEPS[tab].steps.map((s, i) => (
              <li key={s} className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
                <span className="flex size-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">{i + 1}</span>
                <p className="mt-3 text-ink">{s}</p>
              </li>
            ))}
          </ol>
          <div className="mt-6"><ButtonLink href={SIGNUP[tab]}>{STEPS[tab].cta} <ArrowRight /></ButtonLink></div>
        </section>

        <section className="border-y border-border bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl font-semibold text-navy sm:text-3xl">Why it's different</h2>
            <div className="mt-8 grid gap-8 md:grid-cols-3">
              {[[BadgeCheck, "Verified connections", VERIFIED], [EyeOff, "Private by design", "Your deal is visible only to vetted realtors in that property's area. No public listing. No blast to the internet."], [Lock, "Educated decisions", "Reviews unlock only on completed or canceled transactions, so every score comes from a real deal, not a favor."]].map(([Icon, h, b]) => {
                const I = Icon as typeof MapPin;
                return <div key={h as string}><I className="mb-3 size-7 text-brand-600" aria-hidden="true" /><h3 className="text-lg font-semibold">{h as string}</h3><p className="mt-2 text-sm leading-relaxed text-muted">{b as string}</p></div>;
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
          <div className="grid gap-8 rounded-[var(--radius-card)] border border-border bg-surface p-8 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-brand-700 uppercase">For realtors</p>
              <h2 className="mt-2 text-2xl font-semibold text-navy sm:text-3xl">Investors are posting. Be the agent they choose.</h2>
              <p className="mt-3 text-ink/85">Licensed realtors are the only ones who see investor properties in their area. Build a verified track record with reviews from real transactions.</p>
            </div>
            <ul className="space-y-3 text-sm text-ink">
              {["Join free and preview deals nationwide", "See private investor deals in the ZIPs you serve", "Refer clients to other realtors nationwide through the Realtor Referral Network", "Earn reviews that prove your work"].map((t) => (
                <li key={t} className="flex gap-2"><BadgeCheck className="size-5 shrink-0 text-brand-600" aria-hidden="true" />{t}</li>
              ))}
              <li className="pt-2"><ButtonLink href={SIGNUP.realtor}>Join free <ArrowRight /></ButtonLink></li>
            </ul>
          </div>
        </section>


        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="flex flex-col gap-6 rounded-[var(--radius-card)] bg-navy p-8 text-white md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <Hammer className="mb-3 size-7 text-teal" aria-hidden="true" />
              <h2 className="text-2xl font-semibold">Every deal needs a crew.</h2>
              <p className="mt-2 text-white/80">See contractors serving the area of your deal, rated by investors who've worked with them.</p>
            </div>
            <ButtonLink href={SIGNUP.contractor} size="lg" variant="secondary">Join as a contractor — $6/mo</ButtonLink>
          </div>
        </section>

        <section className="border-y border-border bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl font-semibold text-navy sm:text-3xl">Pricing</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {([
                ["investor", "Investors", "Free", "Post deals and buy boxes, review agents, find contractors.", null, "Post a deal — free"],
                ["realtor", "Realtors", "Free · Pro $25/mo", "See private investor deals in your ZIPs and refer to realtors nationwide.", "Pro: $25/month or $275/year.", "Join free"],
                ["contractor", "Contractors", "$6/month", "Get listed for investors in your service area.", null, "Join as a contractor"],
              ] as const).map(([r, name, price, body, note, cta]) => (
                <div key={r} className="flex flex-col rounded-[var(--radius-card)] border border-border p-6">
                  <h3 className="font-semibold text-muted">{name}</h3>
                  <p className="mt-2 text-3xl font-bold text-navy">{price}</p>
                  {note && <p className="mt-2 text-sm font-medium text-brand-700">{note}</p>}
                  <p className="mt-3 flex-1 text-sm text-ink">{body}</p>
                  <div className="mt-6"><ButtonLink href={SIGNUP[r]} variant={r === "investor" ? "primary" : "secondary"}>{cta}</ButtonLink></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="partners" className="border-y border-border bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-navy sm:text-3xl">Partners</h2>
                <p className="mt-2 max-w-2xl text-sm text-muted sm:text-base">RealtyBridge works with organizations that help investors, agents and contractors get deals done.</p>
              </div>
              <Link href="/partners" className="text-sm font-medium text-brand-700 hover:underline">All partners →</Link>
            </div>
            <div className="mx-auto mt-8 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PARTNERS.map((p) => <PartnerCard key={p.url} partner={p} />)}
            </div>

          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">

          <h2 className="text-2xl font-semibold text-navy sm:text-3xl">Questions</h2>
          <div className="mt-6 divide-y divide-border rounded-[var(--radius-card)] border border-border bg-surface">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">{q}<ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" /></summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-brand-50">
          <div className="mx-auto max-w-7xl px-4 py-14 text-center sm:px-6">
            <h2 className="mb-6 text-2xl font-semibold text-navy sm:text-3xl">Make your next connection an educated one.</h2>
            <RoleButtons center />
          </div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-muted sm:px-6">
        <div>
          <p>RealtyBridge — Private deals. Verified connections. Real reviews.</p>
          <p className="mt-1">Available nationwide. Now launching in Wilmington/Leland NC, Myrtle Beach SC, and Charlotte NC.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/partners" className="text-brand-700 hover:underline">Partners</Link>
          <Link href="/terms" className="text-brand-700 hover:underline">Terms &amp; Privacy</Link>
        </div>

      </footer>
    </div>
  );
}
