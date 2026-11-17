import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAction, useRealMe } from '@/lib/hooks';
import { NETWORK_STATUSES, networkModerationVisible } from '@/lib/domain/realtor-network';
import { fullName } from '@/lib/utils';
import { Badge, Button, ButtonLink, Dialog, EmptyState, PageHeader, PageLoader, Textarea } from '@/components/ui';
import { Shield } from 'lucide-react';
export default function NetworkAdmin() {
  const { data: me } = useRealMe(); const [selected, setSelected] = useState<string | null>(null); const [reason, setReason] = useState('');
  const query = useQuery({ queryKey: ['network', 'admin'], queryFn: () => api.network.admin(), enabled: me?.role === 'admin' });
  const action = useAction(({ kind, payload }: { kind: string; payload: Record<string, unknown> }) => api.network.action(kind, payload), { invalidate: [['network']], success: 'Network moderation saved' });
  if (me && me.role !== 'admin') return <EmptyState icon={<Shield />} title="Admins only" />;
  if (query.error) return <p role="alert">{query.error.message}</p>;
  if (!query.data) return <PageLoader />;
  const { referrals, reports, responses, messageCount } = query.data;
  const visible = referrals.filter(networkModerationVisible);
  const states = [...new Set(visible.map(r => r.state))].sort();
  const participants = new Set([...referrals.map(r => r.owner_id), ...responses.map(r => r.realtor_id)]).size;
  return <div className="space-y-6"><ButtonLink href="/admin" variant="link">← Admin</ButtonLink><PageHeader title="Realtor Network Oversight" description="Independent network activity" /><dl className="grid grid-cols-2 gap-5 border-y border-border py-5 lg:grid-cols-4">{[['Network referrals', referrals.length], ['Participants', participants], ['Connections', referrals.filter(r => r.selected_realtor_id).length], ['Private messages', messageCount]].map(([label,value]) => <div key={label}><dt className="text-sm text-muted">{label}</dt><dd className="text-2xl font-semibold">{value}</dd></div>)}</dl>
    <section><h2 className="mb-3 text-lg font-semibold">Geographic demand</h2><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-border"><th className="py-3">State</th><th>Posts</th><th>Connected</th></tr></thead><tbody>{states.map(s => <tr key={s} className="border-b border-border"><td className="py-3">{s}</td><td>{visible.filter(r => r.state === s).length}</td><td>{visible.filter(r => r.state === s && r.selected_realtor_id).length}</td></tr>)}</tbody></table></div></section>
    <section><h2 className="mb-3 text-lg font-semibold">Reported posts and users</h2>{!reports.filter(r => !r.resolved).length && <p className="text-muted">No outstanding reports.</p>}{reports.filter(r => !r.resolved).map(report => <div key={report.id} className="space-y-2 border-b border-border py-4"><p className="break-words text-sm">{report.reason}</p><p className="text-xs text-muted">Reported Realtor: {report.reported_user_id}</p><div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => setSelected(report.referral_id)}>Review / remove post</Button><Button size="sm" onClick={() => action.mutate({ kind: 'resolve_report', payload: { id: report.id } })}>Resolve report</Button></div></div>)}</section>
    <section><h2 className="mb-3 text-lg font-semibold">Network posts</h2>{visible.map(r => <article key={r.id} className="space-y-3 border-b border-border py-5"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{r.referral_type} · {r.city}, {r.state}</h3><Badge>{r.hidden ? 'Removed' : NETWORK_STATUSES[r.status]}</Badge></div><p className="text-sm text-muted">{fullName(r.owner)} · {r.owner.brokerage_name}</p><p className="whitespace-pre-wrap break-words text-sm">{r.description}</p><Button size="sm" variant={r.hidden ? 'secondary' : 'danger'} onClick={() => r.hidden ? action.mutate({ kind: 'moderate', payload: { id: r.id, hidden: false, reason: 'Restored after review' } }) : setSelected(r.id)}>{r.hidden ? 'Restore post' : 'Remove post'}</Button></article>)}</section>
    <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} title="Remove network post"><form className="space-y-3" onSubmit={e => { e.preventDefault(); action.mutate({ kind: 'moderate', payload: { id: selected, hidden: true, reason } }, { onSuccess: () => { setSelected(null); setReason(''); } }); }}><Textarea required aria-label="Moderation reason" value={reason} onChange={e => setReason(e.target.value)} /><Button variant="danger" loading={action.isPending}>Remove post</Button></form></Dialog>
  </div>;
}