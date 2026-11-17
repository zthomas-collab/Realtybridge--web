import { BookOpen, CheckCircle2, Handshake, MessageCircle, ShieldCheck, Star, Timer, Zap } from "lucide-react";
import { summarizeReviews } from "@/lib/domain/ratings";
import { successRate } from "@/lib/domain/track-record";
import { REVIEW_CATEGORIES, type Review } from "@/lib/types";
import type { TrackRecord } from "@/lib/domain/track-record";
import { Card, CardBody, CardHeader } from "@/components/ui";
import { Stars } from "@/components/stars";

const categoryIcons = {
  communication: MessageCircle, contract_accuracy: CheckCircle2, speed_to_close: Timer,
  market_knowledge: BookOpen, knowledge: BookOpen, professionalism: ShieldCheck,
  follow_through: CheckCircle2, problem_solving: Zap, team_player: Handshake,
};

export function ProfileScorecard({ reviews, track }: { reviews: Review[]; track?: TrackRecord }) {
  const summary = summarizeReviews(reviews);
  const rate = track ? successRate(track.completed_deals, track.cancelled_deals) : null;
  return (
    <section aria-label="Member scorecard" className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader title="Overall rating" />
          <CardBody>
            <div className="flex flex-wrap items-center gap-5">
              <div>
                <p className="text-5xl font-semibold text-navy tabular-nums">{summary.average?.toFixed(1) ?? "—"}<span className="ml-2 text-xl text-muted">/ 5.0</span></p>
                <Stars value={summary.average} size={22} className="mt-3" />
              </div>
              <p className="border-l border-border pl-5 text-sm text-muted"><span className="block text-2xl font-semibold text-ink tabular-nums">{summary.count}</span>transaction review{summary.count === 1 ? "" : "s"}</p>
            </div>
          </CardBody>
        </Card>
        {track && <Card>
          <CardHeader title="Professional track record" />
          <CardBody className="grid grid-cols-2 gap-5">
            {[
              ["Completed deals", track.completed_deals], ["Cancelled deals", track.cancelled_deals],
              ["Ongoing deals", track.active_matches], ["Success rate", rate == null ? "—" : `${rate}%`],
            ].map(([label, value]) => <div key={label}><p className="text-2xl font-semibold text-navy tabular-nums">{value}</p><p className="mt-1 text-xs text-muted">{label}</p></div>)}
          </CardBody>
        </Card>}
      </div>
      <Card>
        <CardHeader title="Category ratings" description="Peer reviews" />
        <CardBody className="space-y-4">
          {REVIEW_CATEGORIES.map(({ key, label }) => {
            const value = summary.categories[key];
            const Icon = categoryIcons[key];
            return <div key={key} className="grid grid-cols-[minmax(0,1fr)_5rem_2rem] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_2rem]">
              <span className="flex items-start gap-2 text-sm text-ink"><Icon className="mt-0.5 size-4 shrink-0 text-muted" />{label}</span>
              <progress className="scorecard-progress h-2 w-full" max={5} value={value ?? 0} aria-label={`${label}: ${value == null ? "Not yet rated" : `${value} out of 5`}`} />
              <span className="text-right text-sm font-semibold tabular-nums">{value?.toFixed(1) ?? "—"}</span>
            </div>;
          })}
        </CardBody>
      </Card>
    </section>
  );
}