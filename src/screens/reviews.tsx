
import { useQuery } from "@tanstack/react-query";
import { Flag, MessageSquareText, PenLine, Star } from "lucide-react";
import { useState } from "react";
import { api, type PendingReview, type ReviewWithParties } from "@/lib/api";
import { keys, useAction, useMe } from "@/lib/hooks";
import { summarizeByState, summarizeReviews, validateCompleteReviewScores, emptyReviewScores } from "@/lib/domain/ratings";
import { stateName } from "@/lib/domain/states";
import { REVIEW_CATEGORIES, type Profile, type ReviewCategory } from "@/lib/types";
import { fullName, timeAgo } from "@/lib/utils";
import { Alert, Avatar, Badge, Button, Card, CardBody, CardHeader, Dialog, EmptyState, Field, PageHeader, PageLoader, Tabs, Textarea } from "@/components/ui";
import { Stars, StarInput } from "@/components/stars";
import { ProfileScorecard } from "@/components/profile-scorecard";

export default function ReviewsPage() {
  const { data: me } = useMe();
  const [tab, setTab] = useState<"received" | "written">("received");
  const received = useQuery({ queryKey: keys.reviewsAbout(me?.id ?? ""), queryFn: () => me ? api.reviewsAbout(me.id) : Promise.resolve([]), enabled: !!me });
  const written = useQuery({ queryKey: keys.reviewsWritten, queryFn: api.reviewsWritten });
  const pending = useQuery({ queryKey: keys.pendingReviews, queryFn: api.pendingReviews });

  if (!me || !received.data || !written.data || !pending.data) return <PageLoader />;

  return (
    <div className="space-y-6">
      <PageHeader title="My Reviews" description={me.role === "investor" ? "What realtors say about working with you, and your reviews of them." : "What investors say about working with you, and your reviews of them."} />

      {pending.data.length > 0 && <PendingReviews items={pending.data} me={me} />}

      <RatingOverview reviews={received.data} role={me.role} />

      <Card>
        <div className="px-4">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "received", label: "Received", count: received.data.length },
              { value: "written", label: "Written by you", count: written.data.length },
            ]}
          />
        </div>
        <ReviewList reviews={tab === "received" ? received.data : written.data} mode={tab} />
      </Card>
    </div>
  );
}

function RatingOverview({ reviews, role }: { reviews: ReviewWithParties[]; role: Profile["role"] }) {
  const byState = summarizeByState(reviews.filter((r) => !r.hidden));
  return (
    <div>
      <ProfileScorecard reviews={reviews} />
      {role === "realtor" && Object.keys(byState).length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-border px-5 py-3">
          <span className="text-xs font-medium text-muted uppercase">By state</span>
          {Object.entries(byState).map(([st, sum]) => (
            <Badge key={st} tone="gray">
              {st}: {sum.average?.toFixed(1)} ★ ({sum.count})
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewList({ reviews, mode }: { reviews: ReviewWithParties[]; mode: "received" | "written" }) {
  const [flagging, setFlagging] = useState<ReviewWithParties | null>(null);
  if (reviews.length === 0)
    return <EmptyState icon={<MessageSquareText />} title={mode === "received" ? "No reviews yet" : "You haven't written any reviews"} description="Reviews unlock after a matched deal closes." />;
  return (
    <>
      <ul className="divide-y divide-border">
        {reviews.map((r) => {
          const person = mode === "received" ? r.reviewer : r.reviewee;
          return (
            <li key={r.id} className="px-5 py-5">
              <div className="flex items-start gap-3">
                <Avatar person={person} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="font-medium">
                      {mode === "written" && <span className="font-normal text-muted">You reviewed </span>}
                      {fullName(person)}
                    </p>
                    <Stars value={r.rating} size={14} />
                    <span className="text-xs text-muted">
                      {stateName(r.state)} · {timeAgo(r.created_at)}
                    </span>
                    {r.hidden && <Badge tone="gray">Hidden by moderator</Badge>}
                    {r.is_flagged && !r.hidden && <Badge tone="yellow">Under review</Badge>}
                  </div>
                  {r.body && <p className="mt-2 text-sm text-slate-700">{r.body}</p>}
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
                    {REVIEW_CATEGORIES.map(({ key, label }) =>
                      r[key] != null ? (
                        <span key={key} className="text-xs text-muted">
                          {label} <span className="font-medium text-ink">{r[key]}/5</span>
                        </span>
                      ) : null,
                    )}
                  </div>
                </div>
                {mode === "received" && !r.is_flagged && !r.hidden && (
                  <Button variant="ghost" size="sm" onClick={() => setFlagging(r)} aria-label="Report review">
                    <Flag /> <span className="hidden sm:inline">Report</span>
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <FlagDialog review={flagging} onClose={() => setFlagging(null)} />
    </>
  );
}

function FlagDialog({ review, onClose }: { review: ReviewWithParties | null; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const flag = useAction(() => {
    if (!review) throw new Error("Choose a review to report");
    return api.flagReview(review.id, reason.trim());
  }, { success: "Thanks, a moderator will take a look" });
  return (
    <Dialog
      open={!!review}
      onClose={onClose}
      title="Report this review"
      description="Moderators remove reviews that are abusive, false, or about a different transaction."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={reason.trim().length < 10} loading={flag.isPending} onClick={() => flag.mutate(undefined, { onSuccess: onClose })}>
            Submit report
          </Button>
        </>
      }
    >
      <Field label="What's wrong with this review?" htmlFor="flag-reason" hint="At least 10 characters">
        <Textarea id="flag-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
    </Dialog>
  );
}

// ───────────── Write a review ─────────────

function PendingReviews({ items, me }: { items: PendingReview[]; me: Profile }) {
  const [active, setActive] = useState<PendingReview | null>(null);
  return (
    <Card className="border-brand-200">
      <CardHeader title={<span className="flex items-center gap-2"><PenLine className="size-4 text-brand-600" /> Waiting for your review</span>} description="Your feedback helps everyone on RealtyBridge choose who to work with." />
      <ul className="divide-y divide-border">
        {items.map((p) => (
          <li key={p.match.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
            <Avatar person={p.counterparty} size={36} />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{fullName(p.counterparty)}</p>
              <p className="truncate text-xs text-muted">
                {p.deal.title} · {p.deal.city}, {p.deal.state}
              </p>
            </div>
            <Button onClick={() => setActive(p)}>
              Review {me.role === "investor" ? "realtor" : "investor"}
            </Button>
          </li>
        ))}
      </ul>
      <ReviewDialog item={active} onClose={() => setActive(null)} me={me} />
    </Card>
  );
}

function ReviewDialog({ item, onClose, me }: { item: PendingReview | null; onClose: () => void; me: Profile }) {
  const [rating, setRating] = useState(0);
  const [scores, setScores] = useState<Record<ReviewCategory, number>>(emptyReviewScores);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = useAction(
    () => {
      if (!item) throw new Error("Choose a transaction to review");
      return api.createReview({
        match_id: item.match.id,
        rating,
        body: body.trim() || null,
        ...Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, v || null])),
      });
    },
    { success: "Review posted" },
  );

  function close() {
    setRating(0);
    setScores(emptyReviewScores());
    setBody("");
    setError(null);
    onClose();
  }

  const categories = REVIEW_CATEGORIES;

  return (
    <Dialog
      open={!!item}
      onClose={close}
      title={item ? `Review ${fullName(item.counterparty)}` : ""}
      description={item ? `${item.deal.title} · ${stateName(item.deal.state)}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            loading={submit.isPending}
            onClick={() => {
              const err = rating ? validateCompleteReviewScores({ rating, ...Object.fromEntries(Object.entries(scores).map(([key, value]) => [key, value || null])) }) : "Choose an overall star rating";
              setError(err);
              if (!err) submit.mutate(undefined, { onSuccess: close });
            }}
          >
            Post review
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="mb-1 text-sm font-medium">Overall rating</p>
          <StarInput value={rating} onChange={setRating} label="Overall rating" />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
        <div className="grid gap-3 rounded-[var(--radius-card)] bg-slate-50 p-4">
          {categories.map(({ key, label }) => (
            <div key={key} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-slate-700">{label}</span>
              <StarInput value={scores[key]} onChange={(v) => setScores({ ...scores, [key]: v })} size={20} label={label} />
            </div>
          ))}
        </div>
        <Field label="Written review" htmlFor="review-body" hint="Be specific and factual. Reviews are visible to other members.">
          <Textarea id="review-body" maxLength={3000} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
        <Alert tone="blue">Reviews can&apos;t be edited after posting.</Alert>
      </div>
    </Dialog>
  );
}
