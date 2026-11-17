import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Bell, Handshake, MapPin, Plus, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction, useRealMe } from '@/lib/hooks';
import { networkEligible, networkAcceptsInterest, NETWORK_STATUSES, NETWORK_TYPES, type NetworkReferral } from '@/lib/domain/realtor-network';
import { US_STATES } from '@/lib/domain/states';
import { formatMoney, fullName, timeAgo } from '@/lib/utils';
import Link from '@/lib/next/link';
import { useRouter } from '@/lib/next/navigation';
import { Badge, Button, ButtonLink, Card, Dialog, EmptyState, Input, PageHeader, PageLoader, Select, Tabs } from '@/components/ui';
import { NetworkReferralForm } from '@/components/network-referral-form';
import { NetworkPreferencesEditor } from '@/components/network-preferences';
type Tab = 'browse' | 'mine' | 'connections' | 'notifications' | 'preferences';
export default function RealtorNetwork() {
  const { data: me } = useRealMe();
  if (!me) return <PageLoader />;
  if (!networkEligible(me)) return <><PageHeader title="Realtor Referral Network" /><EmptyState icon={<Handshake />} title="Realtor license number required" action={<ButtonLink href="/profile#license">Profile & License</ButtonLink>} /></>;
  return <Board userId={me.id} />;
}
function Board({ userId }: { userId: string }) {
  const [tab, setTab] = useState<Tab>('browse'); const [posting, setPosting] = useState(false);
  const [state, setState] = useState(''); const [city, setCity] = useState(''); const [area, setArea] = useState(''); const [type, setType] = useState(''); const [status, setStatus] = useState('');
  const router = useRouter();
  const query = useQuery({ queryKey: ['network', 'referrals'], queryFn: () => api.network.list(), refetchInterval: 30000 });
  const notes = useQuery({ queryKey: ['network', 'notifications'], queryFn: () => api.network.notifications(), refetchInterval: 15000 });
  const read = useAction(() => api.network.action('read_notifications'), { invalidate: [['network', 'notifications']] });
  const referrals = (query.data ?? []).filter(r => !r.hidden && (tab === 'mine' ? r.owner_id === userId : tab === 'connections' ? Boolean(r.selected_realtor_id) && (r.owner_id === userId || r.selected_realtor_id === userId) : r.owner_id !== userId && networkAcceptsInterest(r.status))).filter(r => (!state || r.state === state) && (!city || r.city.toLowerCase().includes(city.toLowerCase())) && (!area || `${r.county ?? ''} ${r.zip ?? ''}`.toLowerCase().includes(area.toLowerCase())) && (!type || r.referral_type === type) && (!status || r.status === status));
  return <div className="space-y-6">
    <PageHeader title="Realtor Referral Network" description="Realtor-to-Realtor opportunities" action={<Button onClick={() => setPosting(true)}><Plus />Post a Referral</Button>} />
    <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ value: 'browse', label: 'Available Referrals' }, { value: 'mine', label: 'My Posted Referrals' }, { value: 'connections', label: 'My Referral Connections' }, { value: 'notifications', label: 'Notifications', count: notes.data?.filter(n => !n.read_at).length }, { value: 'preferences', label: 'Coverage & Preferences' }]} />
    {tab === 'preferences' ? <NetworkPreferencesEditor /> : tab === 'notifications' ? <section className="space-y-4"><Button variant="secondary" onClick={() => read.mutate(undefined)}>Mark all read</Button>{notes.data?.map(n => <Link key={n.id} href={`/realtor-network/${n.referral_id}`} className="flex items-start gap-3 border-b border-border py-4"><Bell className="size-4 shrink-0 text-primary" /><div><p className={n.read_at ? 'text-muted' : 'font-medium'}>{n.title}</p><p className="text-xs text-muted">{timeAgo(n.created_at)}</p></div></Link>)}{!notes.data?.length && <EmptyState icon={<Bell />} title="No network notifications" />}</section> : <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Select aria-label="Search state" value={state} onChange={e => setState(e.target.value)}><option value="">All states</option>{US_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</Select><Input aria-label="Search city" placeholder="City" value={city} onChange={e => setCity(e.target.value)} /><Input aria-label="Search county or ZIP" placeholder="County or ZIP" value={area} onChange={e => setArea(e.target.value)} /><Select aria-label="Search referral type" value={type} onChange={e => setType(e.target.value)}><option value="">All referral types</option>{NETWORK_TYPES.map(t => <option key={t}>{t}</option>)}</Select><Select aria-label="Search status" value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{Object.entries(NETWORK_STATUSES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</Select></div>
      {query.error ? <p role="alert" className="text-destructive">{query.error.message}</p> : query.isLoading ? <PageLoader /> : referrals.length ? <div className="grid gap-4 lg:grid-cols-2">{referrals.map(r => <ReferralCard key={r.id} referral={r} />)}</div> : <EmptyState icon={<Search />} title={tab === 'mine' ? 'No posted referrals yet' : tab === 'connections' ? 'No referral connections yet' : 'No available referrals found'} />}
    </>}
    <Dialog open={posting} onClose={() => setPosting(false)} title="Post a Referral"><NetworkReferralForm done={id => { setPosting(false); router.push(`/realtor-network/${id}`); }} /></Dialog>
  </div>;
}
function ReferralCard({ referral: r }: { referral: NetworkReferral }) {
  return <Card className="flex flex-col gap-4 p-5"><div className="flex flex-wrap items-center justify-between gap-2"><Badge>{r.referral_type}</Badge><Badge tone={r.status === 'connected' ? 'green' : 'blue'}>{NETWORK_STATUSES[r.status]}</Badge></div><div><Link href={`/realtor-network/${r.id}`} className="text-lg font-semibold text-ink">{r.city}, {r.state}</Link><p className="mt-1 text-sm text-muted">{r.property_type} · {formatMoney(r.min_price)}–{formatMoney(r.max_price)}</p></div><p className="line-clamp-3 text-sm">{r.description}</p><div className="mt-auto border-t border-border pt-3"><p className="text-sm font-medium">{fullName(r.owner)}</p><p className="text-sm text-muted">{r.owner.brokerage_name ?? 'Brokerage not provided'}</p><p className="mt-1 text-xs text-muted">{timeAgo(r.created_at)} · {r.urgency}</p></div><ButtonLink href={`/realtor-network/${r.id}`} variant="secondary">View referral</ButtonLink></Card>;
}