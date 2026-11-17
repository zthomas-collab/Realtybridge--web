import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DealPage from '@/screens/deals-id';

const { accept, getDeal } = vi.hoisted(() => ({ accept: vi.fn().mockResolvedValue(undefined), getDeal: vi.fn() }));
vi.mock('@/lib/hooks', () => ({
  keys: { deal: (id: string) => ['deal', id] },
  useMe: () => ({ data: { id: 'investor', role: 'investor' } }),
  useAction: (fn: (value: unknown) => Promise<unknown>) => ({ mutate: (value: unknown, options?: { onSuccess?: () => void }) => fn(value).then(() => options?.onSuccess?.()), isPending: false }),
}));
vi.mock('@/lib/api', () => ({ api: { getDeal, acceptInterest: accept } }));
vi.mock('@/components/deal-realtors', () => ({ DealRealtors: () => null }));
vi.mock('@/components/deal-contractors', () => ({ DealContractors: () => null }));
vi.mock('@/lib/next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('Investor selects the Realtor for a matched file', () => {
  it('only submits the selected interest after the investor confirms the match', async () => {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.setAttribute('open', ''); } });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.removeAttribute('open'); } });
    getDeal.mockResolvedValue({
      deal: { id: 'property', investor_id: 'investor', title: '123 Main Street', agent_need: 'listing_agent', city: 'Wytheville', state: 'VA', status: 'live', created_at: '2026-11-01T12:00:00Z' },
      investor: { id: 'investor' }, my_interest: null, match: null, referral: null,
      interests: [{ id: 'selected-interest', realtor_id: 'realtor', status: 'interested', realtor: { id: 'realtor', first_name: 'Test', last_name: 'Realtor', services: [], closed_deals: 0, cancelled_deals: 0, avg_rating: null, review_count: 0 } }],
    });
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><DealPage params={{ id: 'property' }} /></QueryClientProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'Select Realtor' }));
    expect(accept).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
    expect(accept).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Select Realtor' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm match' }));
    await waitFor(() => expect(accept).toHaveBeenCalledExactlyOnceWith('selected-interest'));
  });
});