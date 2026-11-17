import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn(), adminFrom: vi.fn(), send: vi.fn() }));
vi.mock('@tanstack/react-start', () => ({ createServerFn: () => {
  const builder = { middleware: () => builder, inputValidator: () => builder, handler: (fn: unknown) => fn };
  return builder;
} }));
vi.mock('@/integrations/supabase/auth-middleware', () => ({ requireSupabaseAuth: {} }));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: { from: mocks.adminFrom } }));
vi.mock('@/lib/email-templates/send-email', () => ({ sendTemplateEmail: mocks.send }));
import { emailDealMatches } from '@/lib/deal-notify.functions';
import { TEMPLATES } from '@/lib/email-templates/registry';

function query(data: unknown) {
  const result = { data, error: null };
  const chain: Record<string, unknown> = {};
  for (const name of ['select', 'eq', 'in']) chain[name] = () => chain;
  chain.maybeSingle = () => Promise.resolve(result);
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

const deal = { id: 'property-1', investor_id: 'investor', title: '123 Main Street', county: 'Wythe County', state: 'VA', asking_price: 185000, agent_need: 'listing_agent', status: 'live', created_at: new Date().toISOString() };
const context = { userId: 'investor', supabase: { from: mocks.from } };
type Handler = (args: { data: { dealId: string }; context: typeof context }) => Promise<{ sent: number }>;
const notify = emailDealMatches as unknown as Handler;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.from.mockReturnValue(query(deal));
  mocks.adminFrom.mockImplementation((table: string) => query(table === 'profiles' ? [{ id: 'investor', email: 'investor@example.test', first_name: 'Test', last_name: 'Investor' }] : []));
  mocks.send.mockResolvedValue({ sent: true });
});

describe('New investor property operational emails', () => {
  it('emails Rica for every posted property even without local Realtor matches', async () => {
    await notify({ data: { dealId: deal.id }, context });
    expect(mocks.send).toHaveBeenCalledWith('investor-property-posted-rica', 'Rica@bzthree.com', expect.objectContaining({
      idempotencyKey: 'investor-property-posted-rica-property-1',
      templateData: expect.objectContaining({ dealTitle: '123 Main Street', area: 'Wythe County, VA', dealUrl: 'https://realtybridge.app/deals/property-1' }),
    }));
    expect(TEMPLATES['investor-property-posted-rica']?.to).toBe('Rica@bzthree.com');
  });

  it('emails Brock for every posted property independently of local matching', async () => {
    await notify({ data: { dealId: deal.id }, context });
    expect(mocks.send).toHaveBeenCalledWith('investor-property-posted-brock', 'brock.zevan@gmail.com', expect.objectContaining({ idempotencyKey: 'investor-property-posted-brock-property-1' }));
    expect(TEMPLATES['investor-property-posted-brock']?.to).toBe('brock.zevan@gmail.com');
  });

  it('does not send or load privileged data for another investor’s property', async () => {
    await notify({ data: { dealId: deal.id }, context: { ...context, userId: 'outsider' } });
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it('keeps retry keys stable and distinguishes different property posts', async () => {
    await notify({ data: { dealId: deal.id }, context });
    await notify({ data: { dealId: deal.id }, context });
    mocks.from.mockReturnValue(query({ ...deal, id: 'property-2' }));
    await notify({ data: { dealId: 'property-2' }, context });
    const keys = mocks.send.mock.calls.filter(([template]) => template === 'investor-property-posted-rica').map(([, , options]) => options.idempotencyKey);
    expect(keys).toEqual(['investor-property-posted-rica-property-1', 'investor-property-posted-rica-property-1', 'investor-property-posted-rica-property-2']);
  });

  it('one failed notification does not stop the other recipient or investor confirmation', async () => {
    mocks.send.mockImplementation((template: string) => template === 'investor-property-posted-rica' ? Promise.reject(new Error('Email unavailable')) : Promise.resolve({ sent: true }));
    await expect(notify({ data: { dealId: deal.id }, context })).resolves.toEqual({ sent: 2 });
    expect(mocks.send).toHaveBeenCalledWith('investor-property-posted-brock', 'brock.zevan@gmail.com', expect.anything());
    expect(mocks.send).toHaveBeenCalledWith('realtors-matched', 'investor@example.test', expect.anything());
  });

  it('does not retry a suppressed operational recipient', async () => {
    mocks.send.mockImplementation((template: string) => Promise.resolve(template === 'investor-property-posted-rica' ? { sent: false, reason: 'recipient_suppressed' } : { sent: true }));
    await expect(notify({ data: { dealId: deal.id }, context })).resolves.toEqual({ sent: 2 });
    expect(mocks.send.mock.calls.filter(([template]) => template === 'investor-property-posted-rica')).toHaveLength(1);
  });
});