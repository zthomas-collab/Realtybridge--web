import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { keys } from '@/lib/hooks';
import { Alert, ButtonLink } from '@/components/ui';
import { reviewReminderDue } from '@/lib/domain/deal-process';

export function PendingReviewPrompts({ userId }: { userId: string }) {
  const pending = useQuery({ queryKey: keys.pendingReviews, queryFn: api.pendingReviews });
  if (!pending.data?.length) return null;
  return <section aria-label="Reviews to complete" className="space-y-3">
    {pending.data.map(row => <Alert key={row.match.id} tone="yellow" title={`${reviewReminderDue(row.match, userId, false) ? 'Review overdue' : 'Leave a review'}: ${row.deal.title}`} action={<ButtonLink href="/reviews" size="sm" variant="secondary">Review connection</ButtonLink>}>
      Your outcome is recorded. Review your connection without waiting for the other party.
    </Alert>)}
  </section>;
}