import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Circle } from 'lucide-react';
import { api, type DealDetail } from '@/lib/api';
import { keys } from '@/lib/hooks';
import { transactionStage, TRANSACTION_NEXT_STEP } from '@/lib/domain/deal-process';
import { canLeaveReview } from '@/lib/domain/match-outcome';
import { Alert, ButtonLink } from '@/components/ui';
import { timeAgo } from '@/lib/utils';

export function TransactionProgress({ data, userId }: { data: DealDetail; userId: string }) {
  const written = useQuery({ queryKey: keys.reviewsWritten, queryFn: api.reviewsWritten });
  const match = data.match;
  const reviewed = written.data?.some(r => r.match_id === match?.id) ?? false;
  const stage = transactionStage({ status: data.deal.status, match, agreementStatus: data.referral?.agreement_status, userId, reviewed });
  const next = TRANSACTION_NEXT_STEP[stage];
  if (!match || stage === 'inactive') return null;
  const milestones = [
    { label: 'Property posted', at: data.deal.created_at, done: true },
    { label: 'Realtor selected', at: match.created_at, done: true },
    ...(data.referral ? [{ label: 'Referral agreement signed', at: data.referral.signed_at, done: data.referral.agreement_status === 'signed' }] : []),
    { label: 'Investor outcome reported', at: match.investor_reported_at, done: !!match.investor_outcome, detail: match.investor_outcome },
    { label: 'Realtor outcome reported', at: match.realtor_reported_at, done: !!match.realtor_outcome, detail: match.realtor_outcome },
    { label: 'Final outcome confirmed', at: match.completed_at, done: match.status !== 'active', detail: match.status === 'completed' ? 'sold' : match.status === 'cancelled' ? 'cancelled' : null },
    { label: 'Your connection review', at: written.data?.find(r => r.match_id === match.id)?.created_at, done: reviewed },
  ];
  return <section aria-label="Transaction progress" className="space-y-4 border-y border-border py-5">
    <h2 className="text-base font-semibold">Transaction progress</h2>
    <Alert title={next.title} tone={stage === 'pending' || stage === 'confirm' || stage === 'disputed' ? 'yellow' : 'blue'} action={canLeaveReview(match, userId) && !reviewed ? <ButtonLink href="/reviews" size="sm" variant="secondary">Leave a review</ButtonLink> : undefined}>{next.message}</Alert>
    <ol className="grid gap-3 sm:grid-cols-2">
      {milestones.map(item => <li key={item.label} className="flex gap-2 text-sm">
        {item.done ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /> : <Circle className="mt-0.5 size-4 shrink-0 text-muted" />}
        <div><p className="font-medium">{item.label}{item.detail ? ` — ${item.detail}` : ''}</p><p className="text-xs text-muted">{item.at ? timeAgo(item.at) : item.done ? 'Recorded' : 'Pending'}</p></div>
      </li>)}
    </ol>
    {data.referral && <p className="text-sm text-muted">Arrange the listing agreement directly with your Realtor. Only the referral agreement’s recorded signature is tracked here.</p>}
    <p className="text-xs text-muted">Reviews are linked to this selected investor–Realtor connection, not an independent verification of the sale.</p>
  </section>;
}