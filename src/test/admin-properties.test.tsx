import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import AdminPage from '@/screens/admin';

const { overview } = vi.hoisted(() => ({ overview: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: {
  adminQueue: async () => ({ disputed_matches: [], flagged_reviews: [] }),
  adminOverview: overview,
} }));
vi.mock('@/lib/hooks', async original => ({ ...await original<typeof import('@/lib/hooks')>(), useMe: () => ({ data: { role: 'admin' } }) }));
vi.mock('@/lib/next/link', () => ({ default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props}>{children}</a> }));
vi.mock('recharts', () => ({ ResponsiveContainer: () => null, BarChart: () => null, Bar: () => null, Tooltip: () => null, XAxis: () => null, YAxis: () => null, Legend: () => null }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('lists only properties seeking a Realtor, excluding every non-live status', async () => {
  const deals = ['live', 'matched', 'sold', 'withdrawn', 'rejected'].map(status => ({ id: status, investor_id: 'investor', title: `${status} property`, status, city: 'Wytheville', state: 'VA', created_at: '2026-11-01T12:00:00Z' }));
  overview.mockResolvedValue({ members: [], deals, deal_statuses: [], match_statuses: [], deal_dates: [] });
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AdminPage /></QueryClientProvider>);
  fireEvent.click(await screen.findByRole('tab', { name: 'Properties' }));
  await screen.findByRole('link', { name: 'live property' });
  for (const status of ['matched', 'sold', 'withdrawn', 'rejected']) {
    expect(screen.queryByRole('link', { name: `${status} property` })).toBeNull();
  }
  expect(deals).toHaveLength(5);
});

it('removes a property from admin Properties after it becomes matched while retaining the record', async () => {
  const property = { id: 'property', investor_id: 'investor', title: '123 Main Street', status: 'live', city: 'Wytheville', state: 'VA', created_at: '2026-11-01T12:00:00Z' };
  const data = { members: [], deals: [property], deal_statuses: [], match_statuses: [], deal_dates: [] };
  overview.mockResolvedValue(data);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><AdminPage /></QueryClientProvider>);
  fireEvent.click(await screen.findByRole('tab', { name: 'Properties' }));
  await screen.findByRole('link', { name: '123 Main Street' });
  const matchedData = { ...data, deals: [{ ...property, status: 'matched' }] };
  overview.mockResolvedValue(matchedData);
  await client.invalidateQueries({ queryKey: ['admin', 'overview'] });
  await waitFor(() => expect(screen.queryByRole('link', { name: '123 Main Street' })).toBeNull());
  expect(matchedData.deals).toHaveLength(1);
  expect(matchedData.deals[0].status).toBe('matched');
});