import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DealPage from '@/screens/deals-id';

const { getDeal, investorContact, member } = vi.hoisted(() => ({ getDeal: vi.fn(), investorContact: vi.fn(), member: { id: 'realtor', role: 'realtor' } }));
vi.mock('@/lib/hooks', () => ({ keys: { deal: (id: string) => ['deal', id] }, useMe: () => ({ data: member }), useAction: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock('@/lib/api', () => ({ api: { getDeal, investorContact } }));
vi.mock('@/lib/next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock('@/components/deal-realtors', () => ({ DealRealtors: () => null }));
vi.mock('@/components/deal-contractors', () => ({ DealContractors: () => null }));

function openDeal(phone: string | null, role = 'realtor') {
  member.role = role;
  getDeal.mockResolvedValue({ deal: { id: 'property', investor_id: 'investor', title: 'Investor property', agent_need: 'listing_agent', city: 'Charlotte', state: 'NC', status: 'live', created_at: '2026-11-13T12:00:00Z' }, investor: { id: 'investor', first_name: 'Test', last_name: 'Investor', avg_rating: null, review_count: 0, closed_deals: 0, cancelled_deals: 0 }, my_interest: null, match: null, referral: null, interests: [] });
  investorContact.mockResolvedValue({ email: 'investor@example.com', phone });
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><DealPage params={{ id: 'property' }} /></QueryClientProvider>);
}
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('Posting investor contact on Realtor deal views', () => {
  it('provides investor email before the Realtor submits interest', async () => {
    openDeal('+17045551234');
    expect((await screen.findByRole('link', { name: 'investor@example.com' })).getAttribute('href')).toBe('mailto:investor@example.com');
    expect(investorContact).toHaveBeenCalledWith('property');
  });
  it('provides the investor phone before selection', async () => {
    openDeal('+17045551234');
    const phone = await screen.findByRole('link', { name: '(704) 555-1234' });
    expect(phone.getAttribute('href')).toBe('tel:+17045551234');
  });
  it('does not invent a phone number when none is saved', async () => {
    openDeal(null);
    await screen.findByRole('link', { name: 'investor@example.com' });
    expect(document.querySelector('a[href^="tel:"]')).toBeNull();
  });
  it('does not request investor contact for another investor viewing the page', async () => {
    openDeal('+17045551234', 'investor');
    await screen.findByRole('heading', { name: 'Investor property' });
    expect(investorContact).not.toHaveBeenCalled();
  });
});