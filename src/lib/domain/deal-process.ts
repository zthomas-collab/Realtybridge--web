import type { Match } from '@/lib/types';
import type { AgreementStatus } from './referral';
import { canLeaveReview } from './match-outcome';

export const REVIEW_REMINDER_DAYS = 21;
const DAY = 86_400_000;

/** Each party's clock starts on their report; confirmed close is the fallback. */
export function reviewReminderDue(match: Match, userId: string, reviewed: boolean, now = Date.now()): boolean {
  if (reviewed || ![match.investor_id, match.realtor_id].includes(userId) || !canLeaveReview(match, userId)) return false;
  const reported = userId === match.investor_id ? match.investor_reported_at : match.realtor_reported_at;
  const at = reported ?? match.completed_at;
  return !!at && now >= Date.parse(at) + REVIEW_REMINDER_DAYS * DAY;
}

export function matchNeedsContact(match: Match, userId: string): boolean {
  return match.status === 'active' && [match.investor_id, match.realtor_id].includes(userId)
    && match.investor_outcome == null && match.realtor_outcome == null;
}

export type TransactionStage = 'selection' | 'pending' | 'open' | 'confirm' | 'disputed' | 'review' | 'complete' | 'inactive';

/** Outcomes take priority over paperwork, and only the reporting party can review an open match. */
export function transactionStage(input: { status: string; match: Match | null; agreementStatus?: AgreementStatus | null; userId: string; reviewed?: boolean }): TransactionStage {
  const { status, match, agreementStatus, userId, reviewed = false } = input;
  if (!match) return status === 'live' ? 'selection' : 'inactive';
  if (![match.investor_id, match.realtor_id].includes(userId)) return 'inactive';
  if (match.status !== 'active') return reviewed ? 'complete' : 'review';
  const mine = userId === match.investor_id ? match.investor_outcome : match.realtor_outcome;
  const theirs = userId === match.investor_id ? match.realtor_outcome : match.investor_outcome;
  if (mine && theirs && mine !== theirs) return 'disputed';
  if (mine) return reviewed ? 'confirm' : 'review';
  if (theirs) return 'confirm';
  return agreementStatus && agreementStatus !== 'signed' ? 'pending' : 'open';
}

export const TRANSACTION_NEXT_STEP: Record<TransactionStage, { title: string; message: string; action: string }> = {
  selection: { title: 'Choose your Realtor', message: 'Review interested Realtors, their profiles and past reviews. Select one to assign the agent to your property, then contact each other.', action: 'Review Realtors' },
  pending: { title: 'Pending — prepare your file', message: 'Your Realtor is selected. Call or email them to discuss the property and arrange the referral and listing paperwork. Check your inbox and spam folder for the referral agreement.', action: 'View pending steps' },
  open: { title: 'Open file — stay in contact', message: 'Reach out to your selected Realtor and agree on the next steps. When the transaction ends, report sold or cancelled and review your connection.', action: 'Track transaction' },
  confirm: { title: 'Closing confirmation needed', message: 'Check both parties’ reported outcomes. Confirm sold or cancelled; the final transaction status waits for matching reports or admin resolution.', action: 'Check outcome' },
  disputed: { title: 'Outcome needs resolution', message: 'The investor and Realtor reported different outcomes. Contact realtybridgeadmin@gmail.com for help. Your own report already unlocks your review.', action: 'View reports' },
  review: { title: 'Complete your transaction review', message: 'Review the Realtor connected to this property. You can review after your own outcome report without waiting for the other party.', action: 'Leave a review' },
  complete: { title: 'Transaction recorded', message: 'Your outcome and review are recorded for this connection.', action: 'View transaction' },
  inactive: { title: 'Property no longer open', message: 'This property is not seeking a Realtor.', action: 'View property' },
};