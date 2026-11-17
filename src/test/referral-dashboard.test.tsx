import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import AdminPage from '@/screens/admin';

const { adminReferrals, completeReferralDashboardItem } = vi.hoisted(() => ({ adminReferrals: vi.fn(), completeReferralDashboardItem: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: {
  adminQueue: async () => ({ disputed_matches: [], flagged_reviews: [] }),
  adminOverview: async () => ({ members: [{ id: 'realtor', email: 'agent@example.com', created_at: '2026-10-23T12:00:00Z' }], deal_statuses: [], match_statuses: [], deal_dates: [], deals: [] }),
  adminReferrals, completeReferralDashboardItem,
} }));
vi.mock('@/lib/hooks', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/hooks')>(), useMe: () => ({ data: { role: 'admin' } }) }));
vi.mock('@/lib/next/link', () => ({ default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props}>{children}</a> }));
vi.mock('@/components/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('recharts', () => ({ ResponsiveContainer: () => null, BarChart: () => null, Bar: () => null, Tooltip: () => null, XAxis: () => null, YAxis: () => null, Legend: () => null }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('completes the selected referral and refreshes the dashboard without changing deal or agreement status', async () => {
  const row = { match_id: 'selected-match', match: { realtor_id: 'realtor' }, deal: { id: 'deal', address_line: '123 Main St', city: 'Wytheville', state: 'VA', zip: '24382' } };
  adminReferrals.mockResolvedValue([row]);
  completeReferralDashboardItem.mockImplementation(async () => { adminReferrals.mockResolvedValue([]); });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><AdminPage /></QueryClientProvider>);
  fireEvent.click(await screen.findByRole('tab', { name: 'Referral agreements' }));
  await screen.findByRole('link', { name: '123 Main St, Wytheville, VA, 24382' });
  fireEvent.click(await screen.findByRole('button', { name: 'Complete' }));
  await waitFor(() => expect(completeReferralDashboardItem).toHaveBeenCalledWith('selected-match'));
  await screen.findByText('No outstanding referral agreements');
  expect(screen.queryByRole('link', { name: '123 Main St, Wytheville, VA, 24382' })).toBeNull();
});