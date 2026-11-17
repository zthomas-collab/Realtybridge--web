import { ArrowRight } from "lucide-react";
import Link from "@/lib/next/link";
import { ButtonLink } from "@/components/ui";
import { LogoMark, Wordmark } from "@/components/logo";
import { PartnerCard } from "@/components/partner-card";
import { PARTNERS } from "@/lib/domain/partners";
import { CONTACT_EMAIL } from "@/lib/legal/terms";

export default function PartnersPage() {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-border bg-surface">
        <nav aria-label="Main navigation" className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-20 sm:px-6">
          <Link href="/" aria-label="RealtyBridge home" className="flex min-w-0 items-center gap-2">
            <LogoMark /><Wordmark className="hidden text-xl sm:inline" />
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <ButtonLink href="/login" variant="ghost">Sign in</ButtonLink>
            <ButtonLink href="/signup?role=investor">Get started</ButtonLink>
          </div>
        </nav>
      </header>

      <main>
        <section className="border-b border-border bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
            <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-brand-700 uppercase sm:text-xs">
              <span className="size-1.5 shrink-0 rounded-full bg-teal" aria-hidden="true" />
              Partners
            </p>
            <h1 className="mt-5 text-[1.55rem] leading-[1.15] font-bold tracking-tight text-navy sm:text-[2.5rem] sm:leading-[1.08]">
              <span className="block text-balance">Partners we work with.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-balance text-ink/85 sm:text-lg">
              Every partner below is a real organization, and their logo links straight to their own website. We add more as RealtyBridge grows into new markets.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-semibold text-navy sm:text-3xl">Current partners</h2>
          <div className="mx-auto mt-8 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PARTNERS.map((p) => <PartnerCard key={p.url} partner={p} />)}
          </div>

        </section>

        <section className="border-t border-border bg-brand-50">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-[var(--radius-card)] bg-navy p-8 text-white md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <h2 className="text-2xl font-semibold">Want your organization here?</h2>
              <p className="mt-2 text-white/80">
                Partners are listed on this page and on the homepage, with their logo linking to their own site.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3">
              {CONTACT_EMAIL ? (
                <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex h-11 items-center justify-center rounded-lg bg-white px-5 text-sm font-medium text-navy hover:bg-brand-50">
                  Email {CONTACT_EMAIL}
                </a>
              ) : (
                <ButtonLink href="/signup?role=investor" size="lg" variant="secondary">Join RealtyBridge <ArrowRight /></ButtonLink>
              )}
              <Link href="/terms" className="text-sm font-medium text-white/80 hover:text-white hover:underline">Terms &amp; Privacy</Link>
            </div>
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
