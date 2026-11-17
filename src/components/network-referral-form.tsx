import { useState } from 'react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { NETWORK_TYPES, NETWORK_URGENCY, type NetworkInput } from '@/lib/domain/realtor-network';
import { US_STATES } from '@/lib/domain/states';
import { Button, Field, Input, Select, Textarea } from '@/components/ui';
export function NetworkReferralForm({ initial, id, done }: { initial?: NetworkInput; id?: string; done: (id: string) => void }) {
  const [form, setForm] = useState<NetworkInput>(initial ?? { referral_type: 'Buyer', state: '', city: '', county: null, zip: null, property_type: 'Single Family', min_price: 0, max_price: 0, description: '', preferred_experience: '', fee_offered: null, urgency: 'Flexible' });
  const set = <K extends keyof NetworkInput>(key: K, value: NetworkInput[K]) => setForm(f => ({ ...f, [key]: value }));
  const save = useAction(async () => { const r = await api.network.action(id ? 'edit' : 'post', { id, input: form }); const next = id ?? r.id; if (next) done(next); }, { success: id ? 'Referral updated' : 'Referral posted', invalidate: [['network']] });
  return <form className="space-y-5" onSubmit={e => { e.preventDefault(); save.mutate(undefined); }}>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Referral type"><Select aria-label="Referral type" value={form.referral_type} onChange={e => set('referral_type', e.target.value as NetworkInput['referral_type'])}>{NETWORK_TYPES.map(t => <option key={t}>{t}</option>)}</Select></Field>
      <Field label="State"><Select required aria-label="State" value={form.state} onChange={e => set('state', e.target.value)}><option value="">Select state</option>{US_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</Select></Field>
      <Field label="City"><Input required aria-label="City" value={form.city} onChange={e => set('city', e.target.value)} /></Field>
      <Field label="County"><Input required={!form.zip} aria-label="County" placeholder="Mecklenburg County" value={form.county ?? ''} onChange={e => set('county', e.target.value || null)} /></Field>
      <Field label="ZIP code"><Input required={!form.county} aria-label="ZIP code" pattern="[0-9]{5}" value={form.zip ?? ''} onChange={e => set('zip', e.target.value || null)} /></Field>
      <Field label="Property type"><Select aria-label="Property type" value={form.property_type} onChange={e => set('property_type', e.target.value)}>{['Single Family', 'Condo', 'Townhouse', 'Multifamily', 'Commercial', 'Land', 'Other'].map(s => <option key={s}>{s}</option>)}</Select></Field>
      <Field label="Estimated minimum price"><Input aria-label="Estimated minimum price" required type="number" min="0" value={form.min_price} onChange={e => set('min_price', Number(e.target.value))} /></Field>
      <Field label="Estimated maximum price"><Input aria-label="Estimated maximum price" required type="number" min={form.min_price} value={form.max_price} onChange={e => set('max_price', Number(e.target.value))} /></Field>
      <Field label="Referral fee offered (optional)"><Input aria-label="Referral fee offered" maxLength={200} value={form.fee_offered ?? ''} onChange={e => set('fee_offered', e.target.value || null)} /></Field>
      <Field label="Urgency"><Select aria-label="Urgency" value={form.urgency} onChange={e => set('urgency', e.target.value as NetworkInput['urgency'])}>{NETWORK_URGENCY.map(t => <option key={t}>{t}</option>)}</Select></Field>
    </div>
    <Field label="Brief description of the opportunity"><Textarea aria-label="Brief description of the opportunity" required maxLength={4000} value={form.description} onChange={e => set('description', e.target.value)} /></Field>
    <Field label="Preferred agent experience or specialty"><Textarea aria-label="Preferred agent experience or specialty" required value={form.preferred_experience} onChange={e => set('preferred_experience', e.target.value)} /></Field>
    <p className="text-sm text-muted">Do not include your client’s name, contact details or identifying information. Referral arrangements are negotiated by the licensed parties, subject to applicable law and brokerage approval. RealtyBridge does not administer or guarantee payment.</p>
    <Button type="submit" loading={save.isPending}>{id ? 'Save changes' : 'Post Referral'}</Button>
  </form>;
}