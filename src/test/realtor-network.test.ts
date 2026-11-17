import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { NETWORK_SOURCE, NETWORK_TYPES, NETWORK_URGENCY, NETWORK_STATUSES, networkEligible, networkAcceptsInterest, networkModerationVisible, networkAgreementAllowed } from '@/lib/domain/realtor-network';
describe('Independent Realtor Referral Network rules', () => {
  it('requires a Realtor account with a nonblank license on file', () => {
    expect(networkEligible({ role: 'realtor', license_number: 'NC1234' })).toBe(true);
    for (const role of ['investor','contractor','admin'] as const) expect(networkEligible({ role, license_number: 'NC1234' })).toBe(false);
    expect(networkEligible({ role: 'realtor', license_number: ' ' })).toBe(false);
    expect(networkEligible({ role: 'realtor', license_number: null })).toBe(false);
  });
  it('supports the seven requested opportunity types', () => { expect(NETWORK_TYPES).toEqual(['Buyer','Seller','Buyer & Seller','Commercial','Land','Rental','Other']); });
  it('supports the four requested urgency choices', () => { expect(NETWORK_URGENCY).toEqual(['Immediate','Within 30 Days','30–90 Days','Flexible']); });
  it('stops interest on Connected, Closed, Cancelled and Expired and permits reopening', () => {
    expect(networkAcceptsInterest('open')).toBe(true); expect(networkAcceptsInterest('interested')).toBe(true);
    for (const status of ['connected','closed','cancelled','expired'] as const) expect(networkAcceptsInterest(status)).toBe(false);
    expect(Object.keys(NETWORK_STATUSES)).toHaveLength(6);
  });
  it('hides closed, cancelled and expired posts from oversight unless removed for moderation', () => {
    for (const status of ['closed','cancelled','expired'] as const) {
      expect(networkModerationVisible({ status, hidden: false })).toBe(false);
      expect(networkModerationVisible({ status, hidden: true })).toBe(true);
    }
    for (const status of ['open','interested','connected'] as const) expect(networkModerationVisible({ status, hidden: false })).toBe(true);
  });
  it('requires connected-party membership plus brokerage and licensing confirmations', () => {
    expect(networkAgreementAllowed('owner','selected','owner','connected',true,true)).toBe(true);
    expect(networkAgreementAllowed('owner','selected','selected','closed',true,true)).toBe(true);
    expect(networkAgreementAllowed('owner','selected','stranger','connected',true,true)).toBe(false);
    expect(networkAgreementAllowed('owner','selected','owner','open',true,true)).toBe(false);
    expect(networkAgreementAllowed('owner','selected','owner','connected',false,true)).toBe(false);
    expect(networkAgreementAllowed('owner','selected','owner','connected',true,false)).toBe(false);
  });
  it('never invokes legacy deal, assignment, fee or notification writes', () => {
    expect(NETWORK_SOURCE).toBe('realtor_network');
    const sql = ['0024_realtor_network_storage.sql','0025_realtor_network_actions.sql','0026_network_admin_engagement_count.sql','0027_network_agreement_privacy_on_reopen.sql'].map(f => readFileSync(`drizzle/migrations/${f}`,'utf8')).join('\n');
    expect(sql).not.toMatch(/(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+public\.(?:deals|matches|referral_agreements|notifications)\b/i);
    expect(sql).not.toMatch(/(?:post_deal|accept_interest|notify_realtors_of_deal|finalize_match|update_referral_agreement)\s*\(/i);
    expect(sql).toContain("referral_source='realtor_network'");
    expect(sql).toContain('UNIQUE(referral_id,realtor_id)');
    expect(sql).toContain('FOR UPDATE');
  });
  it('archives agreements for original parties before a connection is replaced', () => {
    const sql = readFileSync('drizzle/migrations/0027_network_agreement_privacy_on_reopen.sql','utf8');
    expect(sql).toContain('OLD.selected_realtor_id IS DISTINCT FROM NEW.selected_realtor_id');
    expect(sql).toContain('DELETE FROM public.network_agreements WHERE referral_id=OLD.id');
    expect(sql).toContain('owner_id=auth.uid() OR realtor_id=auth.uid()');
    expect(sql).toContain('r.owner_id=p.id AND public.network_can_read(r.id)');
    expect(sql).toContain('x.realtor_id=p.id AND public.network_thread_access(x.id)');
  });
});