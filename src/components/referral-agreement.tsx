import { useState } from 'react';
import { AGREEMENT_LABELS, canRecordReferralCommission, referralFee, type AgreementStatus, type ReferralAgreement } from '@/lib/domain/referral';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import type { MatchStatus } from '@/lib/types';
import { Badge, Button, Checkbox, Field, Input, Select, Textarea } from '@/components/ui';
import { formatMoney } from '@/lib/utils';

export function ReferralAgreementEditor({ agreement: a, matchStatus }: { agreement: ReferralAgreement; matchStatus: MatchStatus }) {
  const [status, setStatus] = useState<AgreementStatus>(a.agreement_status);
  const [reference, setReference] = useState(a.agreement_reference || '');
  const [commission, setCommission] = useState(a.commission_basis == null ? '' : String(a.commission_basis));
  const [paid, setPaid] = useState(!!a.fee_paid_at);
  const [notes, setNotes] = useState(a.notes || '');
  const eligible = canRecordReferralCommission(status, matchStatus);
  const save = useAction(() => api.updateReferralAgreement(a.match_id, { status, reference: reference.trim() || null, commission: eligible && commission !== '' ? Number(commission) : null, paid: eligible && paid, notes: notes.trim() || null }), { success: 'Referral agreement updated' });
  return <form className="space-y-3" onSubmit={e => { e.preventDefault(); save.mutate(undefined); }}>
    <div className="flex flex-wrap items-center gap-2"><Badge>{AGREEMENT_LABELS[a.agreement_status]}</Badge><Badge>{matchStatus === 'completed' ? 'Closed' : matchStatus === 'cancelled' ? 'Cancelled' : 'Listing in progress'}</Badge></div>
    <Field label="Agreement status" htmlFor={`status-${a.match_id}`}><Select id={`status-${a.match_id}`} value={status} onChange={e => setStatus(e.target.value as AgreementStatus)}>{Object.entries(AGREEMENT_LABELS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</Select></Field>
    <Field label="Brokerage agreement reference" htmlFor={`reference-${a.match_id}`}><Input id={`reference-${a.match_id}`} value={reference} onChange={e => setReference(e.target.value)} required={status === 'signed'} maxLength={1000} /></Field>
    {eligible && <>
      <Field label="Commission basis from executed agreement ($)" htmlFor={`commission-${a.match_id}`}><Input id={`commission-${a.match_id}`} type="number" min="0" step="0.01" value={commission} onChange={e => setCommission(e.target.value)} /></Field>
      <p className="text-sm text-muted">25% referral fee: {commission === '' ? '—' : formatMoney(referralFee(Number(commission)))}</p>
      <Checkbox id={`paid-${a.match_id}`} checked={paid} onChange={setPaid}>Referral fee paid</Checkbox>
    </>}
    <Field label="Referral / closing notes" htmlFor={`notes-${a.match_id}`}><Textarea id={`notes-${a.match_id}`} value={notes} onChange={e => setNotes(e.target.value)} maxLength={5000} /></Field>
    <p className="text-xs text-muted">The separate brokerage agreement governs the referral. Commission terms, not sale price, determine the fee, subject to applicable licensing and referral laws.</p>
    <Button type="submit" loading={save.isPending}>Save agreement</Button>
  </form>;
}