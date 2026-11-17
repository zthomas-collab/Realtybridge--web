import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { DEFAULT_NETWORK_PREFERENCES, type NetworkPreferences } from '@/lib/domain/realtor-network';
import { Button, Checkbox, Field, Input, Textarea } from '@/components/ui';

export function NetworkPreferencesEditor() {
  const query = useQuery({ queryKey: ['network', 'preferences'], queryFn: () => api.network.preferences() });
  if (!query.data) return <p className="text-muted">{query.error?.message ?? 'Loading preferences…'}</p>;
  return <Editor initial={query.data} />;
}
function Editor({ initial }: { initial: NetworkPreferences }) {
  const [form, setForm] = useState({ ...DEFAULT_NETWORK_PREFERENCES, ...initial });
  const [cities, setCities] = useState(initial.cities.join(', '));
  const [zips, setZips] = useState(initial.zip_codes.join(', '));
  const split = (v: string) => [...new Set(v.split(',').map(s => s.trim()).filter(Boolean))];
  const save = useAction(() => api.network.action('preferences', { ...form, cities: split(cities), zip_codes: split(zips) }), { success: 'Network preferences saved', invalidate: [['network']] });
  return <form className="space-y-5" onSubmit={e => { e.preventDefault(); save.mutate(undefined); }}>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Cities served (ST:City, comma-separated)"><Input value={cities} placeholder="NC:Charlotte, NC:Wilmington" onChange={e => setCities(e.target.value)} /></Field>
      <Field label="ZIP codes served (comma-separated)"><Input value={zips} placeholder="28202, 28401" onChange={e => setZips(e.target.value)} pattern="\s*([0-9]{5}\s*(,\s*[0-9]{5}\s*)*)?" /></Field>
      <Field label="Primary market"><Input value={form.primary_market ?? ''} onChange={e => setForm({ ...form, primary_market: e.target.value })} /></Field>
      <Field label="Professional credentials (self-reported)"><Input value={form.credentials ?? ''} onChange={e => setForm({ ...form, credentials: e.target.value })} /></Field>
    </div>
    <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="mb-3 font-medium">Representation & specialties</legend>{['Residential', 'Commercial', 'Buyer representation', 'Seller representation'].map(s => <Checkbox key={s} id={`network-specialty-${s}`} checked={form.specialties.includes(s)} onChange={v => setForm({ ...form, specialties: v ? [...form.specialties, s] : form.specialties.filter(x => x !== s) })}>{s}</Checkbox>)}</fieldset>
    <fieldset className="space-y-3"><legend className="mb-3 font-medium">Network notifications</legend>{(['area', 'interest', 'message', 'connection', 'status'] as const).map(kind => { const key = `notify_${kind}` as const; const labels = { area: 'Referrals in my service area', interest: 'Interest in my referrals', message: 'Private messages', connection: 'Selected connections', status: 'Referral status changes' }; return <Checkbox key={key} id={key} checked={form[key]} onChange={v => setForm({ ...form, [key]: v })}>{labels[kind]}</Checkbox>; })}</fieldset>
    <Button type="submit" loading={save.isPending}>Save network preferences</Button>
  </form>;
}