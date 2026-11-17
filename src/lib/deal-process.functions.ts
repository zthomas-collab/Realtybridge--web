import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { canLeaveReview } from '@/lib/domain/match-outcome';
import type { Match } from '@/lib/types';

/** Fixed investor recipient, derived from the authorized application event. */
export const applyAndNotify = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ dealId: z.string().uuid(), message: z.string().max(1000).nullable(), acknowledged: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const result = await context.supabase.rpc('apply_for_opportunity', { p_deal_id: data.dealId, p_message: data.message ?? undefined, p_acknowledged: data.acknowledged });
    if (result.error) throw new Error(result.error.message);
    try {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const { data: application } = await supabaseAdmin.from('deal_interests').select('id').eq('deal_id', data.dealId).eq('realtor_id', context.userId).eq('status', 'interested').maybeSingle();
      if (!application) return;
      const { data: deal } = await supabaseAdmin.from('deals').select('investor_id,title').eq('id', data.dealId).single();
      if (!deal) return;
      const { data: investor } = await supabaseAdmin.from('profiles').select('email').eq('id', deal.investor_id).single();
      const { data: realtor } = await context.supabase.from('profiles').select('first_name,last_name').eq('id', context.userId).single();
      if (!investor?.email) return;
      const { sendTemplateEmail } = await import('@/lib/email-templates/send-email');
      await sendTemplateEmail('deal-application', investor.email, { templateData: { dealTitle: deal.title, otherName: [realtor?.first_name, realtor?.last_name].filter(Boolean).join(' ') || 'A Realtor', dealUrl: `https://realtybridge.app/deals/${data.dealId}` }, idempotencyKey: `deal-application-${application.id}` });
    } catch { console.error('Deal application email could not be sent'); }
  });

/** Outcome RPC authorizes the match first; emails never prevent recording the outcome. */
export const reportOutcomeAndNotify = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ matchId: z.string().uuid(), outcome: z.enum(['sold', 'cancelled']) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: previous, error: readError } = await context.supabase.from('matches').select('*').eq('id', data.matchId).single();
    if (readError || !previous || ![previous.investor_id, previous.realtor_id].includes(context.userId)) throw new Error('This connection is not available');
    const result = await context.supabase.rpc('report_match_outcome', { p_match_id: data.matchId, p_outcome: data.outcome });
    if (result.error) throw new Error(result.error.message);
    const { data: current } = await context.supabase.from('matches').select('*').eq('id', data.matchId).single();
    if (!current) return;
    try {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const [{ data: deal }, { data: people }, { data: reviews, error: reviewError }] = await Promise.all([
        supabaseAdmin.from('deals').select('title').eq('id', current.deal_id).single(),
        supabaseAdmin.from('profiles').select('id,email,first_name,last_name').in('id', [current.investor_id, current.realtor_id]),
        supabaseAdmin.from('reviews').select('reviewer_id').eq('match_id', current.id),
      ]);
      if (reviewError) throw reviewError;
      const investor = people?.find(p => p.id === current.investor_id);
      const realtor = people?.find(p => p.id === current.realtor_id);
      const { sendTemplateEmail } = await import('@/lib/email-templates/send-email');
      const send = async (recipient: typeof investor, other: typeof realtor) => {
        if (!recipient?.email || reviews?.some(r => r.reviewer_id === recipient.id)) return;
        const eligible = canLeaveReview(current as Match, recipient.id);
        const wasEligible = canLeaveReview(previous as Match, recipient.id);
        const firstReport = previous.investor_outcome == null && previous.realtor_outcome == null;
        if (!firstReport && (wasEligible || !eligible)) return;
        await sendTemplateEmail('deal-review', recipient.email, { templateData: { dealTitle: deal?.title, otherName: [other?.first_name, other?.last_name].filter(Boolean).join(' ') || 'your connection', needsOutcome: !eligible, dealUrl: eligible ? 'https://realtybridge.app/reviews' : `https://realtybridge.app/deals/${current.deal_id}` }, idempotencyKey: `deal-${eligible ? 'review' : 'outcome'}-${current.id}-${recipient.id}` });
      };
      await Promise.allSettled([send(investor, realtor), send(realtor, investor)]).then(results => { if (results.some(r => r.status === 'rejected')) console.error('Deal outcome email could not be sent'); });
    } catch { console.error('Deal outcome email could not be sent'); }
  });