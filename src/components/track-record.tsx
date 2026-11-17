import { Handshake, KeyRound, MapPin, Signpost, Trophy, Users } from "lucide-react";
import Link from "@/lib/next/link";
import type { MemberProfileView } from "@/lib/api";
import type { UserRole } from "@/lib/types";
import { stateName } from "@/lib/domain/states";
import { successRate } from "@/lib/domain/track-record";
import { fullName, timeAgo } from "@/lib/utils";
import { Avatar, Badge, Card, CardHeader, EmptyState } from "@/components/ui";
import { AgentNeedBadge } from "./badges";

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-border p-4">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg]:size-5 ${tone}`}>{icon}</span>
      <div>
        <p className="text-2xl leading-none font-semibold tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}

/** "Deals completed with realtors on RealtyBridge": shown on public investor profiles and the investor's own profile. */
export function TrackRecordCard({
  track,
  role,
  title = "RealtyBridge track record",
  action,
}: {
  track: MemberProfileView["track"];
  role: UserRole;
  title?: string;
  action?: React.ReactNode;
}) {
  const other = role === "realtor" ? "investors" : "realtors";
  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><Trophy className="size-4 text-brand-600" /> {title}</span>} description={`Deals contracted with ${other} on RealtyBridge. A deal only counts once both the investor and the realtor confirm it sold or cancelled.`} action={action} />
      <div className="space-y-5 p-5">
        <SuccessRateBar sold={track.completed_deals} cancelled={track.cancelled_deals} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<Handshake />} label={`Deals completed with ${other}`} value={track.completed_deals} tone="bg-brand-50 text-brand-600" />
          <Stat icon={<Signpost />} label={role === "realtor" ? "As listing agent" : "With a listing agent"} value={track.as_listing} tone="bg-slate-100 text-navy" />
          <Stat icon={<KeyRound />} label={role === "realtor" ? "As buyer's agent" : "With a buyer's agent"} value={track.as_buyers} tone="bg-brand-50 text-brand-600" />
          <Stat icon={<Users />} label={`Different ${other} worked with`} value={track.counterparties_worked_with} tone="bg-violet-50 text-violet-600" />
        </div>

        {track.states.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-medium tracking-wide text-muted uppercase">
              <MapPin className="size-3.5" /> Closed in
            </span>
            {track.states.map((s) => (
              <Badge key={s.state} tone="gray">
                {stateName(s.state)} · {s.count}
              </Badge>
            ))}
          </div>
        )}
        {track.active_matches > 0 && (
          <p className="text-sm text-muted">
            Currently working with {role === "realtor" ? "an investor" : "a realtor"} on <span className="font-medium text-ink">{track.active_matches}</span> more deal{track.active_matches === 1 ? "" : "s"}.
          </p>
        )}
      </div>

      {track.recent.length === 0 ? (
        <div className="border-t border-border">
          <EmptyState icon={<Handshake />} title="No completed deals on RealtyBridge yet" description="Closed deals appear here once a matched deal is marked sold." />
        </div>
      ) : (
        <div className="border-t border-border">
          <p className="px-5 pt-4 text-xs font-medium tracking-wide text-muted uppercase">Recently closed</p>
          <ul className="divide-y divide-border">
            {track.recent.map((c) => (
              <li key={c.match_id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.title}</p>
                  <p className="text-xs text-muted">
                    {c.city}, {c.state} · closed {timeAgo(c.closed_at)}
                  </p>
                </div>
                <AgentNeedBadge need={c.agent_need} />
                <span className="flex items-center gap-2 text-sm sm:w-44">
                  <Avatar person={c.counterparty} size={22} />
                  <span className="truncate">with {fullName(c.counterparty)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function rateTone(rate: number) {
  if (rate >= 80) return { text: "text-emerald-700", bar: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (rate >= 50) return { text: "text-amber-700", bar: "bg-amber-500", chip: "bg-amber-50 text-amber-800 border-amber-200" };
  return { text: "text-red-700", bar: "bg-red-500", chip: "bg-red-50 text-red-700 border-red-200" };
}

/** Headline success rate: sold ÷ (sold + cancelled) on contracted deals, with the split shown as a bar. */
export function SuccessRateBar({ sold, cancelled }: { sold: number; cancelled: number }) {
  const rate = successRate(sold, cancelled);
  const contracted = sold + cancelled;
  if (rate == null) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-border p-4 text-sm text-muted">
        <span className="font-medium text-ink">Success rate:</span> not enough history yet. It appears once a contracted deal is confirmed sold or cancelled by both sides.
      </div>
    );
  }
  const tone = rateTone(rate);
  return (
    <div className="rounded-[var(--radius-card)] border border-border p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">Success rate on contracted deals</p>
          <p className={`mt-1 text-4xl font-semibold tabular-nums ${tone.text}`}>{rate}%</p>
        </div>
        <p className="text-sm text-muted">
          <span className="font-medium text-emerald-700">{sold} sold</span> · <span className="font-medium text-red-700">{cancelled} cancelled</span> of {contracted} contracted
        </p>
      </div>
      <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${sold} sold, ${cancelled} cancelled`}>
        <div className="bg-emerald-500" style={{ width: `${(sold / contracted) * 100}%` }} />
        <div className="bg-red-400" style={{ width: `${(cancelled / contracted) * 100}%` }} />
      </div>
    </div>
  );
}

/** Compact success-rate chip for cards and lists. */
export function SuccessRateInline({ sold, cancelled, investorId }: { sold: number; cancelled: number; investorId?: string }) {
  const rate = successRate(sold, cancelled);
  const body =
    rate == null ? (
      <span className="text-xs text-muted">No closed deals yet</span>
    ) : (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${rateTone(rate).chip}`}>
        {rate}% success · {sold}/{sold + cancelled} sold
      </span>
    );
  return investorId ? (
    <Link href={`/investors/${investorId}`} className="hover:underline">
      {body}
    </Link>
  ) : (
    body
  );
}
