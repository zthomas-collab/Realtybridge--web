import { ArrowUpRight } from "lucide-react";
import { partnerDomain, type Partner } from "@/lib/domain/partners";
import { cn } from "@/lib/utils";

/**
 * Whole card is one link: the logo and name hyperlink out to the partner's own site.
 * White logos sit on a navy plaque with screen blending; dark-ink logos
 * (logoPlaque "light") sit on a light plaque instead.
 */
export function PartnerCard({ partner }: { partner: Partner }) {
  return (
    <a
      href={partner.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-[var(--radius-card)] border border-border bg-surface p-5 transition hover:border-brand-200 hover:shadow-md"
    >
      <span
        className={cn(
          "flex h-32 items-center justify-center overflow-hidden rounded-lg px-6",
          partner.logoPlaque === "light" ? "bg-canvas" : "bg-navy",
        )}
      >
        <img
          src={partner.image}
          alt={partner.imageAlt}
          width={400}
          height={300}
          loading="lazy"
          className={cn(
            partner.logoFill ? "h-full w-full object-cover" : "max-h-24 w-auto object-contain",
            !partner.logoFill && partner.logoPlaque !== "light" && "mix-blend-screen",
          )}
        />
      </span>
      <span className="mt-4 flex items-start justify-between gap-3">
        <span className="text-base font-semibold text-navy">{partner.name}</span>
        <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted transition-colors group-hover:text-brand-700" aria-hidden="true" />
      </span>
      {partner.tagline ? (
        <span className="mt-1 text-sm font-medium text-brand-700 italic">{partner.tagline}</span>
      ) : null}
      <span className="mt-2 flex-1 text-sm leading-relaxed text-muted">{partner.blurb}</span>
      <span className="mt-4 text-sm font-medium text-brand-700 group-hover:underline">{partnerDomain(partner.url)}</span>
    </a>
  );
}
