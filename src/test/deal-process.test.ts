import { describe, expect, it } from 'vitest';
import { reviewReminderDue, matchNeedsContact, transactionStage } from '@/lib/domain/deal-process';
import type { Match } from '@/lib/types';

const match: Match = { id: 'match', deal_id: 'deal', interest_id: 'interest', investor_id: 'investor', realtor_id: 'realtor', status: 'active', investor_outcome: null, realtor_outcome: null, investor_reported_at: null, realtor_reported_at: null, completed_at: null, resolved_by_admin: false, created_at: '2026-11-01T12:00:00Z' };
describe('Deal process reminders', () => {
  it('reminds the investor to select a Realtor until a live property has a match', () => {
    expect(transactionStage({ status: 'live', match: null, userId: 'investor' })).toBe('selection');
    expect(transactionStage({ status: 'withdrawn', match: null, userId: 'investor' })).toBe('inactive');
  });
  it('keeps the file pending until the recorded referral agreement is signed', () => {
    expect(transactionStage({ status: 'matched', match, agreementStatus: 'pending', userId: 'investor' })).toBe('pending');
    expect(transactionStage({ status: 'matched', match, agreementStatus: 'sent', userId: 'investor' })).toBe('pending');
    expect(transactionStage({ status: 'matched', match, agreementStatus: 'signed', userId: 'investor' })).toBe('open');
  });
  it('prompts an investor for closing confirmation when the Realtor reports an outcome', () => {
    expect(transactionStage({ status: 'matched', match: { ...match, realtor_outcome: 'sold' }, agreementStatus: 'pending', userId: 'investor' })).toBe('confirm');
  });
  it('unlocks the investor review on their own sold or cancelled report without mutual confirmation', () => {
    for (const investor_outcome of ['sold', 'cancelled'] as const) {
      expect(transactionStage({ status: 'matched', match: { ...match, investor_outcome }, userId: 'investor' })).toBe('review');
    }
  });
  it('continues tracking confirmation after the investor has already reviewed', () => {
    expect(transactionStage({ status: 'matched', match: { ...match, investor_outcome: 'sold' }, userId: 'investor', reviewed: true })).toBe('confirm');
  });
  it('does not describe a disputed transaction as confirmed or open', () => {
    expect(transactionStage({ status: 'matched', match: { ...match, investor_outcome: 'sold', realtor_outcome: 'cancelled' }, userId: 'investor' })).toBe('disputed');
  });
  it('only completes a closed transaction once the viewer has reviewed', () => {
    const closed = { ...match, status: 'completed' as const };
    expect(transactionStage({ status: 'sold', match: closed, userId: 'investor' })).toBe('review');
    expect(transactionStage({ status: 'sold', match: closed, userId: 'investor', reviewed: true })).toBe('complete');
    expect(transactionStage({ status: 'sold', match: closed, userId: 'outsider' })).toBe('inactive');
  });
  it('both selected parties need contact prompts while the deal is active', () => {
    expect(matchNeedsContact(match, 'investor')).toBe(true);
    expect(matchNeedsContact(match, 'realtor')).toBe(true);
    expect(matchNeedsContact(match, 'stranger')).toBe(false);
    expect(matchNeedsContact({ ...match, status: 'completed' }, 'investor')).toBe(false);
  });
  it('stops contact prompts when either party reports the file closed', () => {
    expect(matchNeedsContact({ ...match, investor_outcome: 'sold' }, 'realtor')).toBe(false);
  });
  it('review is overdue exactly three weeks after the reporting party closes their file', () => {
    const closed = { ...match, investor_outcome: 'sold' as const, investor_reported_at: '2026-11-01T12:00:00Z' };
    expect(reviewReminderDue(closed, 'investor', false, Date.parse('2026-11-22T11:59:59Z'))).toBe(false);
    expect(reviewReminderDue(closed, 'investor', false, Date.parse('2026-11-22T12:00:00Z'))).toBe(true);
    expect(reviewReminderDue(closed, 'realtor', false, Date.parse('2026-11-22T12:00:00Z'))).toBe(false);
  });
  it('never prompts a completed review or unrelated member', () => {
    const closed = { ...match, status: 'completed' as const, completed_at: '2026-11-01T12:00:00Z' };
    const now = Date.parse('2026-12-01T12:00:00Z');
    expect(reviewReminderDue(closed, 'investor', true, now)).toBe(false);
    expect(reviewReminderDue(closed, 'stranger', false, now)).toBe(false);
    expect(reviewReminderDue(closed, 'realtor', false, now)).toBe(true);
  });
});