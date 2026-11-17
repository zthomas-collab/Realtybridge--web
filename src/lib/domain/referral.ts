import type { AgentNeed, MatchStatus } from '@/lib/types';

export const REFERRAL_RATE = 0.25;
export const REFERRAL_ACKNOWLEDGMENT = "I understand that, if selected for this listing opportunity, a 25% brokerage referral fee will be payable under a separate referral agreement.";
export type AgreementStatus = 'pending' | 'sent' | 'signed';
export const AGREEMENT_LABELS: Record<AgreementStatus, string> = { pending: 'Pending', sent: 'Sent', signed: 'Signed' };
export function newOpportunityRequiresReferral(need: AgentNeed) { return need === 'listing_agent'; }
export function referralFee(commission: number) { return Math.round(commission * REFERRAL_RATE * 100) / 100; }
export function canRecordReferralCommission(status: AgreementStatus, match: MatchStatus) { return status === 'signed' && match === 'completed'; }

export interface ReferralAgreement {
  match_id: string;
  dashboard_completed_at: string | null;
  agreement_status: AgreementStatus;
  agreement_reference: string | null;
  sent_at: string | null;
  signed_at: string | null;
  commission_basis: number | null;
  referral_fee: number | null;
  fee_paid_at: string | null;
  notes: string | null;
  updated_at: string;
}
export interface ReferralUpdate {
  status: AgreementStatus;
  reference: string | null;
  commission: number | null;
  paid: boolean;
  notes: string | null;
}