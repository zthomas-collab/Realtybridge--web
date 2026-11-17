import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_NETWORK_PREFERENCES, type NetworkApi, type NetworkDetail, type NetworkMember, type NetworkReferral, type NetworkResponse } from '@/lib/domain/realtor-network';

const sb = () => supabase as unknown as SupabaseClient;
function result<T>(r: { data: T; error: { message: string } | null }): T { if (r.error) throw new Error(r.error.message); return r.data; }
async function people(ids: string[]) {
  if (!ids.length) return new Map<string, NetworkMember>();
  const rows = result(await sb().rpc('network_members', { p_ids: [...new Set(ids)] })) as NetworkMember[];
  return new Map(rows.map(p => [p.id, p]));
}
async function attach(rows: Omit<NetworkReferral, 'owner'>[]): Promise<NetworkReferral[]> {
  const members = await people(rows.map(r => r.owner_id));
  return rows.map(r => { const owner = members.get(r.owner_id); if (!owner) throw new Error('Realtor profile unavailable'); return { ...r, owner }; });
}
export const networkApi: NetworkApi = {
  async list() { return attach(result(await sb().from('network_referrals').select('*').order('created_at', { ascending: false })) ?? []); },
  async detail(id) {
    const [ref, responses, activity, agreement] = await Promise.all([
      sb().from('network_referrals').select('*').eq('id', id).single(),
      sb().from('network_responses').select('*').eq('referral_id', id).order('created_at'),
      sb().from('network_activity').select('id,event,created_at').eq('referral_id', id).order('created_at', { ascending: false }),
      sb().from('network_agreements').select('reference,recorded_by,created_at').eq('referral_id', id).maybeSingle(),
    ]);
    const rows = result(responses) as Omit<NetworkResponse, 'realtor'>[];
    const members = await people(rows.map(r => r.realtor_id));
    const [referral] = await attach([result(ref)]);
    if (!referral) throw new Error('Referral unavailable');
    return { referral, responses: rows.map(r => { const realtor = members.get(r.realtor_id); if (!realtor) throw new Error('Realtor profile unavailable'); return { ...r, realtor }; }), activity: result(activity), agreement: result(agreement) } as NetworkDetail;
  },
  async messages(responseId) { return result(await sb().from('network_messages').select('*').eq('response_id', responseId).order('created_at')) ?? []; },
  async preferences() { const { data: { user } } = await sb().auth.getUser(); if (!user) throw new Error('Sign in required'); return result(await sb().from('network_profiles').select('*').eq('user_id', user.id).maybeSingle()) ?? DEFAULT_NETWORK_PREFERENCES; },
  async notifications() { return result(await sb().from('network_notifications').select('*').order('created_at', { ascending: false }).limit(100)) ?? []; },
  async admin() {
    const allowed = result(await sb().rpc('is_admin')); if (!allowed) throw new Error('Admins only');
    const [referrals, reports, responses, messages] = await Promise.all([this.list(), sb().from('network_reports').select('*').order('created_at', { ascending: false }), sb().from('network_responses').select('realtor_id,interested'), sb().rpc('network_admin_message_count')]);
    return { referrals, reports: result(reports) ?? [], responses: result(responses) ?? [], messageCount: Number(result(messages)) };
  },
  async action(action, payload = {}) { return result(await sb().rpc('network_action', { p_action: action, p_payload: payload })); },
};