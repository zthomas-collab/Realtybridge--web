import { describe, expect, it } from 'vitest';
import { canRecordReferralCommission, newOpportunityRequiresReferral, referralFee } from '@/lib/domain/referral';

describe('Brokerage referral rules', () => {
  it('requires the referral workflow for new listing-agent opportunities', () => expect(newOpportunityRequiresReferral('listing_agent')).toBe(true));
  it('preserves buyer-agent deals outside the referral workflow', () => expect(newOpportunityRequiresReferral('buyers_agent')).toBe(false));
  it('calculates 25 percent of the executed agreement commission basis', () => expect(referralFee(12000)).toBe(3000));
  it('does not allow referral commission tracking before the agreement is signed', () => expect(canRecordReferralCommission('sent', 'completed')).toBe(false));
  it('does not allow referral commission tracking before closing', () => expect(canRecordReferralCommission('signed', 'active')).toBe(false));
  it('allows commission tracking for a signed agreement after closing', () => expect(canRecordReferralCommission('signed', 'completed')).toBe(true));
});