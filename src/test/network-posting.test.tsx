import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { NetworkReferralForm } from '@/components/network-referral-form';
const { action } = vi.hoisted(() => ({ action: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { network: { action } } }));
vi.mock('@/components/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('posts the specified Charlotte buyer referral through the independent network service', async () => {
  action.mockResolvedValue({ id: 'network-only-referral' });
  const done = vi.fn(); const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><NetworkReferralForm done={done} /></QueryClientProvider>);
  for (const [label,value] of [['State','NC'],['City','Charlotte'],['County','Mecklenburg County'],['ZIP code','28202'],['Estimated minimum price','450000'],['Estimated maximum price','550000'],['Brief description of the opportunity','Buyer relocating to Charlotte'],['Preferred agent experience or specialty','Local buyer representation']] as const) fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Post Referral' }));
  await waitFor(() => expect(action).toHaveBeenCalledWith('post', { id: undefined, input: expect.objectContaining({ referral_type: 'Buyer', state: 'NC', city: 'Charlotte', county: 'Mecklenburg County', zip: '28202', min_price: 450000, max_price: 550000, fee_offered: null }) }));
  await waitFor(() => expect(done).toHaveBeenCalledWith('network-only-referral'));
  expect(action).toHaveBeenCalledTimes(1);
});