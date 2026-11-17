import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), send: vi.fn() }));
vi.mock('@tanstack/react-start', () => ({ createServerFn: () => {
  const chain = { middleware: () => chain, inputValidator: () => chain, handler: (fn: unknown) => fn };
  return chain;
} }));
vi.mock('@/integrations/supabase/auth-middleware', () => ({ requireSupabaseAuth: {} }));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: { from: mocks.from } }));
vi.mock('@/lib/email-templates/send-email', () => ({ sendTemplateEmail: mocks.send }));
import { acceptInterestAndNotify } from '@/lib/match.functions';

const match = { id: 'match', deal_id: 'deal', investor_id: 'investor', realtor_id: 'realtor' };
function query(data: unknown) {
  const chain = { select: () => chain, eq: () => chain, in: () => chain, maybeSingle: () => Promise.resolve({ data }), then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data }).then(resolve) };
  return chain;
}
type Handler = (args: { data: { interestId: string }; context: { supabase: { rpc: typeof mocks.rpc } } }) => Promise<unknown>;
const accept = acceptInterestAndNotify as unknown as Handler;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({ data: match, error: null });
  mocks.send.mockResolvedValue({ sent: true });
  mocks.from.mockImplementation((table: string) => query(table === 'deals' ? { title: 'Property', referral_required: true } : [
    { id: 'investor', email: 'investor@example.test', phone: '111', first_name: 'Investor' },
    { id: 'realtor', email: 'realtor@example.test', phone: '222', first_name: 'Realtor' },
  ]));
});
describe('Selection notifications', () => {
  it.each(['angela@thejaywhiteteam.com', ' ANGELA@THEJAYWHITETEAM.COM ', 'zach@trunorthpropertypartners.com', ' ZACH@TRUNORTHPROPERTYPARTNERS.COM '])('does not send excluded members referral selection notices (%s), while still notifying the investor and Brock', async (email) => {
    mocks.from.mockImplementation((table: string) => query(table === 'deals' ? { title: 'Property', referral_required: true } : [
      { id: 'investor', email: 'investor@example.test' },
      { id: 'realtor', email },
    ]));
    await accept({ data: { interestId: 'interest' }, context: { supabase: { rpc: mocks.rpc } } });
    expect(mocks.send.mock.calls.some((call) => call[1] === email)).toBe(false);
    expect(mocks.send.mock.calls.some((call) => call[1] === 'Brock.zevan@gmail.com')).toBe(false);
    expect(mocks.send).toHaveBeenCalledWith('match-made', 'investor@example.test', expect.anything());
  });
  it('does not send Angela pending referral paperwork notices as an investor', async () => {
    mocks.from.mockImplementation((table: string) => query(table === 'deals' ? { title: 'Property', referral_required: true } : [
      { id: 'investor', email: 'angela@thejaywhiteteam.com' },
      { id: 'realtor', email: 'realtor@example.test' },
    ]));
    await accept({ data: { interestId: 'interest' }, context: { supabase: { rpc: mocks.rpc } } });
    expect(mocks.send.mock.calls.some((call) => call[1] === 'angela@thejaywhiteteam.com')).toBe(false);
    expect(mocks.send).toHaveBeenCalledWith('opportunity-selected', 'realtor@example.test', expect.anything());
  });
  it('keeps Angela ordinary non-referral match notifications', async () => {
    mocks.from.mockImplementation((table: string) => query(table === 'deals' ? { title: 'Property', referral_required: false } : [
      { id: 'investor', email: 'investor@example.test' },
      { id: 'realtor', email: 'angela@thejaywhiteteam.com' },
    ]));
    await accept({ data: { interestId: 'interest' }, context: { supabase: { rpc: mocks.rpc } } });
    expect(mocks.send).toHaveBeenCalledWith('match-made', 'angela@thejaywhiteteam.com', expect.anything());
  });
  it('notifies the investor of pending paperwork with their selected Realtor contact', async () => {
    await accept({ data: { interestId: 'interest' }, context: { supabase: { rpc: mocks.rpc } } });
    expect(mocks.send).toHaveBeenCalledWith('match-made', 'investor@example.test', expect.objectContaining({ templateData: expect.objectContaining({ referralRequired: true, otherEmail: 'realtor@example.test', otherPhone: '222' }), idempotencyKey: 'match-made-match-investor' }));
  });
  it('still notifies the selected Realtor and Brock of the same authorized selection event', async () => {
    await accept({ data: { interestId: 'interest' }, context: { supabase: { rpc: mocks.rpc } } });
    expect(mocks.send).toHaveBeenCalledWith('opportunity-selected', 'realtor@example.test', expect.objectContaining({ templateData: expect.objectContaining({ investorEmail: 'investor@example.test', investorPhone: '111' }) }));
    expect(mocks.send).toHaveBeenCalledWith('brokerage-referral', 'Brock.zevan@gmail.com', expect.objectContaining({ idempotencyKey: 'brokerage-referral-match' }));
  });
  it('does not send any notification when ownership checks reject selection', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'Forbidden' } });
    await accept({ data: { interestId: 'interest' }, context: { supabase: { rpc: mocks.rpc } } });
    expect(mocks.send).not.toHaveBeenCalled();
  });
});