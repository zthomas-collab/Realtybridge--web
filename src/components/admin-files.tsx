import { useState } from 'react';
import { Files } from 'lucide-react';
import type { AdminOverview } from '@/lib/api/types';
import { fileMatchesFilter, type FileFilter } from '@/lib/domain/admin-files';
import { fullName } from '@/lib/utils';
import Link from '@/lib/next/link';
import { Badge, EmptyState, Input, Select } from '@/components/ui';

export function AdminFiles({ data }: { data: AdminOverview }) {
  const [filter, setFilter] = useState<FileFilter>('all');
  const [search, setSearch] = useState('');
  const matches = data.matches ?? [];
  const deals = new Map(data.deals.map(deal => [deal.id, deal]));
  const members = new Map(data.members.map(member => [member.id, member]));
  const rows = matches.filter(match => {
    const deal = deals.get(match.deal_id);
    const investor = members.get(match.investor_id);
    const realtor = members.get(match.realtor_id);
    const text = [deal?.title, deal?.address_line, deal?.city, deal?.state, investor && fullName(investor), investor?.email, realtor && fullName(realtor), realtor?.email].filter(Boolean).join(' ').toLowerCase();
    return fileMatchesFilter(match, filter) && text.includes(search.trim().toLowerCase());
  });
  const date = (value: string | null) => value ? new Date(value).toLocaleDateString('en-US') : 'Not recorded';
  const party = (id: string, role: 'investors' | 'realtors') => {
    const member = members.get(id);
    return <div className="min-w-0">
      <p className="text-xs text-muted">{role === 'investors' ? 'Investor' : 'Realtor'}</p>
      <Link href={`/${role}/${id}`} className="break-words font-medium text-brand-600 hover:underline">{member ? fullName(member) || member.email : 'View profile'}</Link>
      {member && <a href={`mailto:${member.email}`} className="block break-all text-muted hover:underline">{member.email}</a>}
    </div>;
  };
  return <section className="space-y-4 p-5">
    <h2 className="text-base font-semibold">Matched &amp; closed files</h2>
    <dl className="grid grid-cols-2 gap-4 border-b border-border pb-4 sm:grid-cols-4">
      {(['all', 'matched', 'closed', 'cancelled'] as const).map(value => <div key={value}>
        <dt className="text-xs text-muted">{{ all: 'Total matches', matched: 'Matched / open', closed: 'Closed / sold', cancelled: 'Cancelled' }[value]}</dt>
        <dd className="mt-1 text-2xl font-semibold tabular-nums">{matches.filter(match => fileMatchesFilter(match, value)).length}</dd>
      </div>)}
    </dl>
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input aria-label="Search files" placeholder="Search property, member or email" value={search} onChange={event => setSearch(event.target.value)} className="flex-1" />
      <Select aria-label="File status" value={filter} onChange={event => setFilter(event.target.value as FileFilter)} className="sm:w-48">
        <option value="all">All files</option><option value="matched">Matched / open</option><option value="closed">Closed / sold</option><option value="cancelled">Cancelled</option>
      </Select>
    </div>
    {!rows.length ? <EmptyState icon={<Files />} title={matches.length ? 'No files match your filters' : 'No matched files yet'} /> : <ul className="divide-y divide-border">
      {rows.map(match => {
        const deal = deals.get(match.deal_id);
        const address = [deal?.address_line, deal?.city, deal?.state, deal?.zip].filter(Boolean).join(', ');
        return <li key={match.id} className="grid gap-4 py-4 text-sm lg:grid-cols-[2fr_1fr_1fr]">
          <div className="min-w-0">
            <Link href={`/deals/${match.deal_id}`} className="break-words font-semibold text-brand-600 hover:underline">{deal?.title || address || 'View property'}</Link>
            {address && <p className="mt-1 break-words text-muted">{address}</p>}
            <div className="mt-2"><Badge tone={match.status === 'completed' ? 'green' : match.status === 'cancelled' ? 'red' : 'blue'}>{match.status === 'completed' ? 'Closed / sold' : match.status === 'cancelled' ? 'Cancelled' : 'Matched / open'}</Badge></div>
            <p className="mt-2 text-xs text-muted">Matched {date(match.created_at)}{match.status !== 'active' && ` · ${match.status === 'completed' ? 'Closed' : 'Cancelled'} ${date(match.completed_at)}`}</p>
            <p className="mt-1 text-xs text-muted">Investor reported: {match.investor_outcome || 'Awaiting report'} · Realtor reported: {match.realtor_outcome || 'Awaiting report'}</p>
          </div>
          {party(match.investor_id, 'investors')}{party(match.realtor_id, 'realtors')}
        </li>;
      })}
    </ul>}
  </section>;
}