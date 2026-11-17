import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DealPage from '@/screens/deals-id';

const { apply, getDeal } = vi.hoisted(() => ({ apply: vi.fn().mockResolvedValue(undefined), getDeal: vi.fn() }));
vi.mock('@/lib/hooks', () => ({
  keys: { deal: (id: string) => ['deal', id] },
  useMe: () => ({ data: { id: 'realtor', role: 'realtor', verification_status: 'verified', subscription_status: 'active', complimentary: true, terms_version: 'current', first_name: 'Test', last_name: 'Realtor' } }),
  useAction: (fn: (value: unknown) => Promise<unknown>) => ({ mutate: (value: unknown) => fn(value), isPending: false }),
}));
vi.mock('@/lib/api', () => ({ api: { getDeal, expressInterest: apply } }));
vi.mock('@/lib/next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('Listing application acknowledgment', () => {
  it('cannot submit until checked, and passes the acknowledgment with the application', async () => {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.setAttribute('open', ''); } });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.removeAttribute('open'); } });
    getDeal.mockResolvedValue({
      deal: { id: 'deal', investor_id: 'investor', title: 'Test listing', agent_need: 'listing_agent', referral_required: true, city: 'Wytheville', state: 'VA', status: 'live', created_at: '2026-10-18T12:00:00Z' },
      investor: { id: 'investor', first_name: 'Test', last_name: 'Investor', services: [], closed_deals: 0, cancelled_deals: 0, avg_rating: null, review_count: 0 },
      my_interest: null, match: null, referral: null, interests: [],
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><DealPage params={{ id: 'deal' }} /></QueryClientProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'Apply for Opportunity' }));
    const submit = screen.getByRole('button', { name: 'Submit application' });
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    await waitFor(() => expect(apply).toHaveBeenCalledWith('deal', null, true));
  });
});