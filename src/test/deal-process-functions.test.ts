import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), adminFrom: vi.fn(), send: vi.fn() }));
vi.mock('@tanstack/react-start', () => ({ createServerFn: () => {
  const builder = { middleware: () => builder, inputValidator: () => builder, handler: (fn: unknown) => fn };
  return builder;
} }));
vi.mock('@/integrations/supabase/auth-middleware', () => ({ requireSupabaseAuth: {} }));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: { from: mocks.adminFrom } }));
vi.mock('@/lib/email-templates/send-email', () => ({ sendTemplateEmail: mocks.send }));
import { applyAndNotify, reportOutcomeAndNotify } from '@/lib/deal-process.functions';

function query(data: unknown) {
  const result = { data, error: null };
  const chain: Record<string, unknown> = {};
  for (const name of ['select', 'eq', 'in']) chain[name] = () => chain;
  chain.single = chain.maybeSingle = () => Promise.resolve(result);
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}
const context = { userId: 'investor', supabase: { rpc: mocks.rpc, from: mocks.from } };
const base = { id: 'match', deal_id: 'deal', investor_id: 'investor', realtor_id: 'realtor', status: 'active', investor_outcome: null, realtor_outcome: null };
type Handler = (args: { data: Record<string, unknown>; context: typeof context }) => Promise<unknown>;
const report = reportOutcomeAndNotify as unknown as Handler;
const apply = applyAndNotify as unknown as Handler;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({ error: null });
  mocks.send.mockResolvedValue({ sent: true });
  mocks.adminFrom.mockImplementation((table: string) => query(table === 'deals' ? { title: 'Property', investor_id: 'investor' } : table === 'profiles' ? [{ id: 'investor', email: 'investor@example.test', first_name: 'Investor' }, { id: 'realtor', email: 'realtor@example.test', first_name: 'Realtor' }] : []));
});
describe('Individual deal event emails', () => {
  it('notifies both sides on the first close report, with the unreported side directed to report first', async () => {
    mocks.from.mockReturnValueOnce(query(base)).mockReturnValueOnce(query({ ...base, investor_outcome: 'sold' }));
    await report({ data: { matchId: 'match', outcome: 'sold' }, context });
    expect(mocks.rpc).toHaveBeenCalledWith('report_match_outcome', { p_match_id: 'match', p_outcome: 'sold' });
    expect(mocks.send).toHaveBeenCalledWith('deal-review', 'investor@example.test', expect.objectContaining({ templateData: expect.objectContaining({ needsOutcome: false, dealUrl: 'https://realtybridge.app/reviews' }) }));
    expect(mocks.send).toHaveBeenCalledWith('deal-review', 'realtor@example.test', expect.objectContaining({ templateData: expect.objectContaining({ needsOutcome: true, dealUrl: 'https://realtybridge.app/deals/deal' }) }));
  });
  it('rejects a caller outside the selected investor and Realtor without sending', async () => {
    mocks.from.mockReturnValueOnce(query(base));
    await expect(report({ data: { matchId: 'match', outcome: 'sold' }, context: { ...context, userId: 'outsider' } })).rejects.toThrow('not available');
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('skips a party who already reviewed', async () => {
    mocks.from.mockReturnValueOnce(query(base)).mockReturnValueOnce(query({ ...base, investor_outcome: 'cancelled' }));
    const original = mocks.adminFrom.getMockImplementation();
    mocks.adminFrom.mockImplementation((table: string) => table === 'reviews' ? query([{ reviewer_id: 'investor' }]) : original?.(table));
    await report({ data: { matchId: 'match', outcome: 'cancelled' }, context });
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send.mock.calls[0]?.[1]).toBe('realtor@example.test');
  });
  it('only reminds the newly eligible party when the second report arrives', async () => {
    const previous = { ...base, investor_outcome: 'sold' };
    mocks.from.mockReturnValueOnce(query(previous)).mockReturnValueOnce(query({ ...previous, realtor_outcome: 'sold', status: 'completed' }));
    await report({ data: { matchId: 'match', outcome: 'sold' }, context: { ...context, userId: 'realtor' } });
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send.mock.calls[0]?.[1]).toBe('realtor@example.test');
  });
  it('email failure does not erase a successfully recorded outcome', async () => {
    mocks.from.mockReturnValueOnce(query(base)).mockReturnValueOnce(query({ ...base, investor_outcome: 'sold' }));
    mocks.send.mockRejectedValue(new Error('Email unavailable'));
    await expect(report({ data: { matchId: 'match', outcome: 'sold' }, context })).resolves.toBeUndefined();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it('sends an application follow-up only to the deal owner after RPC success', async () => {
    mocks.from.mockReturnValue(query({ first_name: 'Test', last_name: 'Realtor' }));
    mocks.adminFrom.mockImplementation((table: string) => query(table === 'deal_interests' ? { id: 'application' } : table === 'deals' ? { investor_id: 'investor', title: 'Property' } : { email: 'investor@example.test' }));
    await apply({ data: { dealId: 'deal', message: null, acknowledged: true }, context: { ...context, userId: 'realtor' } });
    expect(mocks.send).toHaveBeenCalledWith('deal-application', 'investor@example.test', expect.objectContaining({ idempotencyKey: 'deal-application-application' }));
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
});