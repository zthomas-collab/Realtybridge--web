import { countyLabel } from "@/lib/domain/counties";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Award, Building2, CalendarDays, MapPin, MessageSquareText, UserX } from "lucide-react";
import { memberBadges } from "@/lib/domain/badges";
import { api } from "@/lib/api";
import { keys } from "@/lib/hooks";
import { DEAL_TYPE_LABEL, priceRangeLabel, PROPERTY_TYPE_LABEL } from "@/lib/domain/buybox";
import { stateName } from "@/lib/domain/states";
import { successRate } from "@/lib/domain/track-record";
import { REVIEW_CATEGORIES } from "@/lib/types";
import { fullName, timeAgo } from "@/lib/utils";
import { Avatar, Badge, ButtonLink, Card, CardHeader, EmptyState, PageLoader } from "@/components/ui";
import { VerificationBadge } from "@/components/badges";
import { RatingInline, Stars } from "@/components/stars";
import { TrackRecordCard } from "@/components/track-record";
import { ServiceChips } from "@/components/services";
import { ProfileScorecard } from "@/components/profile-scorecard";

/** Public profile of an investor or realtor: success rate, services (realtors), track record and reviews. */
export function MemberProfile({ id }: { id: string }) {
  const { data, error } = useQuery({ queryKey: keys.member(id), queryFn: () => api.memberProfile(id) });
  const reviews = useQuery({ queryKey: keys.reviewsAbout(id), queryFn: () => api.reviewsAbout(id) });

  if (error)
    return (
      <Card>
        <EmptyState icon={<UserX />} title="Profile unavailable" description={error.message} action={<ButtonLink href="/dashboard" variant="secondary">Back to dashboard</ButtonLink>} />
      </Card>
    );
  if (!data) return <PageLoader />;
  const p = data.profile;
  const isRealtor = p.role === "realtor";
  const rate = successRate(data.track.completed_deals, data.track.cancelled_deals);
  const visible = (reviews.data ?? []).filter((r) => !r.hidden);
  const categories = REVIEW_CATEGORIES;
  const areas = [...new Set([...(p.license_state ? [p.license_state] : []), ...p.markets])];

  return (
    <div className="space-y-6">
      <button onClick={() => history.back()} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Back
      </button>

      <Card className="p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar person={p} size={80} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{fullName(p)}</h1>
              {isRealtor && <VerificationBadge status={p.verification_status} />}
              <Badge tone="gray" className="capitalize">
                {p.role}
              </Badge>
            </div>
            {isRealtor ? (
              (p.brokerage_name || p.license_number) && (
                <p className="flex flex-wrap items-center gap-1.5 text-muted">
                  <Building2 className="size-4" />
                  {[p.brokerage_name, p.license_number && `License #${p.license_number}${p.license_state ? ` (${p.license_state})` : ""}`].filter(Boolean).join(" · ")}
                </p>
              )
            ) : (
              p.company_name && <p className="text-muted">{p.company_name}</p>
            )}
            <div className="mt-3">
              <RatingInline avg={p.avg_rating} count={p.review_count} />
            </div>
            {(() => {
              const badges = memberBadges({ role: p.role, created_at: p.created_at, completed_deals: data.track.completed_deals, avg_rating: p.avg_rating, review_count: p.review_count }).slice(0, 3);
              return badges.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {badges.map((b) => (
                    <Badge key={b.key} tone="blue" title={b.criteria}>
                      <Award /> {b.label}
                    </Badge>
                  ))}
                </div>
              ) : null;
            })()}
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
              {areas.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4" /> {isRealtor ? "Serves" : "Works in"} {areas.map(stateName).join(", ")}
                </span>
              )}
              {p.counties?.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4" /> Counties: {p.counties.map(countyLabel).join(" · ")}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-4" /> Member since {new Date(p.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
            </div>
            {isRealtor && (
              <div className="mt-4">
                <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">Works with</p>
                {p.services.length ? <ServiceChips services={p.services} /> : <p className="text-sm text-muted">No services listed yet.</p>}
              </div>
            )}
            {isRealtor && (p.deals_last_year != null || p.experience_history) && (
              <div className="mt-4">
                <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">Experience</p>
                {p.deals_last_year != null && (
                  <p className="text-sm text-slate-700"><span className="font-semibold tabular-nums">{p.deals_last_year}</span> {p.deals_last_year === 1 ? "deal" : "deals"} completed last year</p>
                )}
                {p.experience_history && <p className="mt-1.5 max-w-3xl text-sm whitespace-pre-line text-slate-700">{p.experience_history}</p>}
              </div>
            )}
            {!isRealtor &&
              (p.buybox_property_types.length > 0 || (p.buybox_deal_types?.length ?? 0) > 0 || p.buybox_min_price != null || p.buybox_max_price != null || p.buybox_notes) && (
                <div className="mt-4">
                  <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">Buy box</p>
                  <p className="text-sm text-slate-700">
                    {priceRangeLabel(p.buybox_min_price, p.buybox_max_price)}
                    {p.buybox_property_types.length > 0 && ` · ${p.buybox_property_types.map((t) => PROPERTY_TYPE_LABEL[t] ?? t).join(", ")}`}
                  </p>
                  {p.buybox_notes && <p className="mt-1.5 max-w-3xl text-sm whitespace-pre-line text-slate-700">{p.buybox_notes}</p>}
                  {(p.buybox_deal_types?.length ?? 0) > 0 && (
                    <p className="mt-1.5 text-sm text-ink">Deal types: {p.buybox_deal_types?.map((type) => DEAL_TYPE_LABEL[type] ?? type).join(", ")}</p>
                  )}
                </div>
              )}
            {p.bio && <p className="mt-4 max-w-3xl text-sm whitespace-pre-line text-slate-700">{p.bio}</p>}
          </div>
          <div className="rounded-[var(--radius-card)] bg-brand-50 px-5 py-4 text-center sm:min-w-48">
            <p className="text-4xl font-semibold text-brand-700 tabular-nums">{rate != null ? `${rate}%` : "—"}</p>
            <p className="mt-1 text-xs font-medium text-brand-800">success rate on contracted deals</p>
            <p className="mt-1 text-xs text-muted">
              {data.track.completed_deals} sold · {data.track.cancelled_deals} cancelled
            </p>
          </div>
        </div>
      </Card>

      {reviews.data && <ProfileScorecard reviews={reviews.data} track={data.track} />}
      <TrackRecordCard track={data.track} role={p.role} />

      <Card>
        <CardHeader title={isRealtor ? "Reviews from investors" : "Reviews from realtors"} description={visible.length ? `${visible.length} review${visible.length === 1 ? "" : "s"}` : undefined} />
        {visible.length === 0 ? (
          <EmptyState icon={<MessageSquareText />} title="No reviews yet" />
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((r) => (
              <li key={r.id} className="flex gap-3 px-5 py-4">
                <Avatar person={r.reviewer} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="font-medium">{fullName(r.reviewer)}</p>
                    <Stars value={r.rating} size={13} />
                    <span className="text-xs text-muted">
                      {stateName(r.state)} · {timeAgo(r.created_at)}
                    </span>
                  </div>
                  {r.body && <p className="mt-1.5 text-sm text-slate-700">{r.body}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {categories.map(({ key, label }) =>
                      r[key] != null ? (
                        <Badge key={key} tone="gray">
                          {label} {r[key]}/5
                        </Badge>
                      ) : null,
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
