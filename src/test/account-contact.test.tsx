import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountContact } from '@/components/account-contact';
import { keys } from '@/lib/hooks';
import type { Profile } from '@/lib/types';
const { updateProfile } = vi.hoisted(() => ({ updateProfile: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { updateProfile } }));
vi.mock('@/components/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const profile = { id: 'member', role: 'investor', roles: ['investor','realtor'], email: 'member@example.com', phone: null } as Profile;
function open() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><AccountContact me={profile} /></QueryClientProvider>);
  return client;
}
describe('Account-wide contact details', () => {
  it('uses the account email rather than a separate posting email', () => {
    open();
    expect((screen.getByLabelText('Contact email') as HTMLInputElement).value).toBe('member@example.com');
  });
  it('saves only contact phone and caches the returned multi-role account', async () => {
    updateProfile.mockResolvedValue({ ...profile, phone: '+17045551234' });
    const client = open();
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '7045551234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save contact' }));
    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({ phone: '(704) 555-1234' }));
    await waitFor(() => expect(client.getQueryData(keys.me)).toEqual({ ...profile, phone: '+17045551234' }));
  });
  it('rejects invalid phone numbers without changing the account', () => {
    open();
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save contact' }));
    expect(updateProfile).not.toHaveBeenCalled();
  });
});