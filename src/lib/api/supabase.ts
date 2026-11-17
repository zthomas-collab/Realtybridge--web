import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { networkApi } from './network';
import { supabase } from "@/integrations/supabase/client";
import type {
  AgentSummary,
  AppNotification,
  BlockedUser,
  Deal,
  DealInterest,
  InvestorMetrics,
  Match,
  Profile,
  Review,
  DealContractor,
  ContractorAreaDeal,
} from "@/lib/types";
import { deleteMemberAccount, deleteMyAccount, grantFreeAccount } from "@/lib/admin.functions";
import { emailDealMatches } from "@/lib/deal-notify.functions";
import { toE164 } from "@/lib/domain/phone";
import { validateCompleteReviewScores } from "@/lib/domain/ratings";
import { canLeaveReview, isDisputed } from "@/lib/domain/match-outcome";
import { TERMS_VERSION } from "@/lib/legal/terms";
import type { TrackRecord } from "@/lib/domain/track-record";
import type { ReferralAgreement } from '@/lib/domain/referral';
import { ApiError, type AdminMember, type Api, type BrowseDealRow, type BrowseFilters, type FreeAccountGrant, type MemberPublicProfile, type RatedProfile, type ReviewWithParties, type RealtorListing } from "./types";

// Untyped view of the generated client: the hand-written domain types in @/lib/types describe the rows.
const sb = () => supabase as unknown as SupabaseClient;

function check<T>(res: { data: T; error: PostgrestError | null }): T {
  if (res.error) {
    // RPCs raise friendly messages; strip the PAYWALL: prefix used for client detection
    throw new ApiError(res.error.message.replace(/^PAYWALL:\s*/, ""));
  }
  return res.data;
}

async function uid(): Promise<string> {
  const { data } = await sb().auth.getUser();
  if (!data.user) throw new ApiError("Not signed in");
  return data.user.id;
}

const PUBLIC_COLS = "id, role, first_name, last_name, company_name, avatar_url, brokerage_name, services, avg_rating, review_count, closed_deals, cancelled_deals";

/** Batch-load public profiles (with ratings) for a set of user ids. */
async function publicProfiles(ids: string[]): Promise<Map<string, RatedProfile>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const rows = check(await sb().from("public_profiles").select(PUBLIC_COLS).in("id", unique)) as RatedProfile[];
  return new Map(rows.map((r) => [r.id, r]));
}

/** Stand-in for investors hidden from free Realtors (browse_deals returns no investor_id). */
const LOCKED_INVESTOR = { id: "", first_name: "Investor", last_name: null, company_name: null, avatar_url: null, avg_rating: null, review_count: 0, closed_deals: 0, cancelled_deals: 0, role: "investor", markets: [], services: [] };

function must<T>(map: Map<string, T>, id: string | null): T {
  if (!id) return LOCKED_INVESTOR as unknown as T;
  const v = map.get(id);
  if (!v) throw new ApiError("Profile unavailable");
  return v;
}

async function attachParties(reviews: Review[]): Promise<ReviewWithParties[]> {
  const people = await publicProfiles(reviews.flatMap((r) => [r.reviewer_id, r.reviewee_id]));
  return reviews.map((r) => ({ ...r, reviewer: must(people, r.reviewer_id), reviewee: must(people, r.reviewee_id) }));
}

async function upload(bucket: string, file: File): Promise<string> {
  const id = await uid();
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb().storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw new ApiError(error.message);
  return path;
}

export const supabaseApi: Api = {
  network: networkApi,
  mode: "supabase",

  async me() {
    const id = await uid();
    return check(await sb().from("profiles").select("*").eq("id", id).single()) as Profile;
  },

  async updateProfile(patch) {
    if (patch.phone) {
      const e164 = toE164(patch.phone);
      if (!e164) throw new ApiError("Enter a valid US phone number");
      patch = { ...patch, phone: e164 };
    }
    const id = await uid();
    return check(await sb().from("profiles").update(patch).eq("id", id).select("*").single()) as Profile;
  },

  async acceptTerms() {
    check(await sb().rpc("accept_terms", { p_version: TERMS_VERSION, p_user_agent: navigator.userAgent }));
  },

  async switchRole(role) {
    check(await sb().rpc("switch_role", { p_role: role }));
  },

  async addRole(role) {
    check(await sb().rpc("add_role", { p_role: role }));
  },

  async uploadAvatar(file) {
    const path = await upload("avatars", file);
    // Private bucket: a long-lived signed link (1 year) that signed-in members can load.
    const { data, error } = await sb().storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365);
    if (error || !data) throw new ApiError(error?.message ?? "Upload failed");
    const url = data.signedUrl;
    await supabaseApi.updateProfile({ avatar_url: url });
    return url;
  },

  async communityCounts() {
    return check(await sb().rpc("community_counts")) as { investors: number; realtors: number; contractors: number };
  },

  async investorMetrics() {
    return check(await sb().rpc("investor_metrics")) as InvestorMetrics;
  },

  async listMyDeals() {
    const id = await uid();
    const deals = check(await sb().from("deals").select("*").eq("investor_id", id).order("created_at", { ascending: false })) as Deal[];
    const ids = deals.map((d) => d.id);
    if (ids.length === 0) return [];
    const [interests, matches, referrals] = await Promise.all([
      sb().from("deal_interests").select("deal_id,status").in("deal_id", ids).neq("status", "withdrawn"),
      sb().from("matches").select("*").in("deal_id", ids).neq("status", "cancelled"),
      sb().from('referral_agreements').select('*, match:matches!inner(deal_id)').in('match.deal_id', ids),
    ]);
    const agreements = check(referrals) as (ReferralAgreement & { match: { deal_id: string } })[];
    const ms = check(matches) as Match[];
    const people = await publicProfiles(ms.map((m) => m.realtor_id));
    const counts = new Map<string, number>();
    for (const i of check(interests) as { deal_id: string; status: string }[]) {
      if (i.status !== 'interested' && !deals.find(d => d.id === i.deal_id)?.referral_required) continue;
      counts.set(i.deal_id, (counts.get(i.deal_id) ?? 0) + 1);
    }
    return deals.map((d) => {
      const m = ms.find((x) => x.deal_id === d.id);
      return { ...d, referral: m ? agreements.find(r => r.match_id === m.id) ?? null : null, interest_count: counts.get(d.id) ?? 0, match: m ? { ...m, realtor: must(people, m.realtor_id) } : null };
    });
  },

  async getDeal(id) {
    const me = await uid();
    // owner / admin / matched realtor can read the full row; other realtors go through browse_deals
    let deal = (check(await sb().from("deals").select("*").eq("id", id).maybeSingle()) as Deal | null) ?? null;
    if (!deal) {
      const rows = check(await sb().rpc("browse_deals", { p_deal_id: id })) as Omit<Deal, "address_line">[];
      if (rows[0]) deal = { ...rows[0], address_line: null, rejection_reason: null, sold_at: null };
      else {
        const applied = check(await sb().rpc('interested_deals')) as Deal[];
        deal = applied.find(d => d.id === id) ?? null;
        if (!deal) throw new ApiError("This deal is not available");
      }
    }
    const isOwner = deal.investor_id === me;
    const flags = check(await sb().rpc('referral_flags', { p_ids: [id] })) as { id: string; referral_required: boolean }[];
    deal.referral_required = flags[0]?.referral_required ?? false;
    const [interestsRes, matchRes, mineRes] = await Promise.all([
      isOwner ? sb().from("deal_interests").select("*").eq("deal_id", id).neq("status", "withdrawn").order("created_at") : Promise.resolve({ data: [], error: null }),
      sb().from("matches").select("*").eq("deal_id", id).neq("status", "cancelled").maybeSingle(),
      sb().from("deal_interests").select("*").eq("deal_id", id).eq("realtor_id", me).maybeSingle(),
    ]);
    const interests = check(interestsRes) as DealInterest[];
    const match = check(matchRes) as Match | null;
    const referral = match ? check(await sb().from('referral_agreements').select('*').eq('match_id', match.id).maybeSingle()) as ReferralAgreement | null : null;
    const people = await publicProfiles([...(deal.investor_id ? [deal.investor_id] : []), ...interests.map((i) => i.realtor_id), ...(match ? [match.realtor_id] : [])]);

    // per-state rating for each interested realtor
    const stateRatings = new Map<string, { avg_rating: number | null; review_count: number }>();
    if (interests.length) {
      const rows = check(
        await sb().from("rating_summaries_by_state").select("user_id, avg_rating, review_count").eq("state", deal.state).in("user_id", interests.map((i) => i.realtor_id)),
      ) as { user_id: string; avg_rating: number; review_count: number }[];
      rows.forEach((r) => stateRatings.set(r.user_id, r));
    }

    return {
      deal,
      referral,
      investor: must(people, deal.investor_id),
      interests: interests.map((i) => ({
        ...i,
        realtor: { ...must(people, i.realtor_id), ...(stateRatings.get(i.realtor_id) ?? { avg_rating: null, review_count: 0 }) },
      })),
      match: match ? { ...match, realtor: must(people, match.realtor_id), investor: must(people, match.investor_id) } : null,
      my_interest: (check(mineRes) as DealInterest | null) ?? null,
    };
  },

  async postDeal(input) {
    const deal = check(await sb().rpc("post_deal", { payload: input })) as Deal;
    // Emails matched realtors their lead and the investor the matched-realtor list; never blocks posting.
    emailDealMatches({ data: { dealId: deal.id } }).catch((e) => console.error("deal match emails failed", e));
    return deal;
  },

  async withdrawDeal(id) {
    check(await sb().from("deals").update({ status: "withdrawn" }).eq("id", id));
  },

  async acceptInterest(interestId) {
    const { acceptInterestAndNotify } = await import("@/lib/match.functions");
    const r = await acceptInterestAndNotify({ data: { interestId } });
    if (r.error) throw new Error(r.error);
  },

  async declineInterest(interestId) {
    check(await sb().rpc("decline_interest", { p_interest_id: interestId }));
  },

  async reportMatchOutcome(matchId, outcome) {
    const { reportOutcomeAndNotify } = await import('@/lib/deal-process.functions');
    await reportOutcomeAndNotify({ data: { matchId, outcome } });
  },

  async contractorsForDeal(dealId) {
    return (check(await sb().rpc("contractors_for_deal", { p_deal_id: dealId })) ?? []) as DealContractor[];
  },

  async dealsForContractor() {
    return (check(await sb().rpc("deals_for_contractor")) ?? []) as ContractorAreaDeal[];
  },

  async matchContact(matchId) {
    const rows = check(await sb().rpc("match_contact", { p_match_id: matchId })) as { email: string; phone: string | null }[];
    return rows[0] ?? null;
  },

  async investorContact(dealId) {
    const rows = check(await sb().rpc("interest_investor_contact", { p_deal_id: dealId })) as { email: string; phone: string | null }[];
    return rows[0] ?? null;
  },

  async browseDeals({ state, agentNeed, city }: BrowseFilters = {}) {
    const me = await uid();
    const rows = check(
      await sb().rpc("browse_deals", { p_state: state ?? null, p_agent_need: agentNeed ?? null, p_city: city?.trim() || null }),
    ) as Omit<Deal, "address_line">[];
    const [people, mine] = await Promise.all([
      publicProfiles(rows.map((r) => r.investor_id).filter(Boolean)),
      sb().from("deal_interests").select("*").eq("realtor_id", me),
    ]);
    const myInterests = check(mine) as DealInterest[];
    const flags = rows.length ? check(await sb().rpc('referral_flags', { p_ids: rows.map(r => r.id) })) as { id: string; referral_required: boolean }[] : [];
    return rows.map(
      (r): BrowseDealRow => ({
        ...r,
        referral_required: flags.find(f => f.id === r.id)?.referral_required ?? false,
        rejection_reason: null,
        sold_at: null,
        investor: must(people, r.investor_id),
        my_interest: myInterests.find((i) => i.deal_id === r.id) ?? null,
      }),
    );
  },

  async expressInterest(dealId, message, acknowledged = false) {
    const { applyAndNotify } = await import('@/lib/deal-process.functions');
    await applyAndNotify({ data: { dealId, message, acknowledged } });
  },

  async updateReferralAgreement(matchId, input) {
    check(await sb().rpc('update_referral_agreement', { p_match_id: matchId, p_status: input.status, p_reference: input.reference, p_commission: input.commission, p_paid: input.paid, p_notes: input.notes }));
  },

  async completeReferralDashboardItem(matchId) {
    check(await sb().rpc('complete_referral_dashboard_item', { p_match_id: matchId }));
  },

  async adminReferrals() {
    const rows = check(await sb().from('referral_agreements').select('*, match:matches(*)').is('dashboard_completed_at', null).order('updated_at', { ascending: false })) as (ReferralAgreement & { match: Match | null })[];
    const people = await publicProfiles(rows.flatMap(r => r.match ? [r.match.investor_id, r.match.realtor_id] : []));
    const ids = rows.flatMap(r => r.match ? [r.match.deal_id] : []);
    const deals = ids.length ? check(await sb().from('deals').select('*').in('id', ids)) as Deal[] : [];
    return rows.flatMap(r => {
      const m = r.match;
      const deal = deals.find(d => d.id === m?.deal_id);
      if (!m || !deal) return [];
      return [{ ...r, match: m, deal, investor: must(people, m.investor_id), realtor: must(people, m.realtor_id) }];
    });
  },

  async withdrawInterest(interestId) {
    check(await sb().from("deal_interests").update({ status: "withdrawn" }).eq("id", interestId));
  },

  async listMyInterests() {
    const me = await uid();
    const [interestsRes, dealsRes, matchesRes] = await Promise.all([
      sb().from("deal_interests").select("*").eq("realtor_id", me).order("created_at", { ascending: false }),
      sb().rpc("interested_deals"),
      sb().from("matches").select("*").eq("realtor_id", me),
    ]);
    const interests = check(interestsRes) as DealInterest[];
    const deals = check(dealsRes) as Deal[];
    const flags = deals.length ? check(await sb().rpc('referral_flags', { p_ids: deals.map(d => d.id) })) as { id: string; referral_required: boolean }[] : [];
    for (const deal of deals) deal.referral_required = flags.find(f => f.id === deal.id)?.referral_required ?? false;
    const matches = check(matchesRes) as Match[];
    const people = await publicProfiles(deals.map((d) => d.investor_id));
    return interests.flatMap((i) => {
      const deal = deals.find((d) => d.id === i.deal_id);
      if (!deal) return [];
      return [{ interest: i, deal, investor: must(people, deal.investor_id), match: matches.find((m) => m.deal_id === deal.id) ?? null }];
    });
  },

  async reviewsAbout(userId) {
    const rows = check(await sb().from("reviews").select("*").eq("reviewee_id", userId).order("created_at", { ascending: false })) as Review[];
    return attachParties(rows);
  },

  async reviewsWritten() {
    const me = await uid();
    const rows = check(await sb().from("reviews").select("*").eq("reviewer_id", me).order("created_at", { ascending: false })) as Review[];
    return attachParties(rows);
  },

  async pendingReviews() {
    const me = await uid();
    const [matchesRes, mineRes] = await Promise.all([
      sb().from("matches").select("*, deal:deals(id, title, city, state)").or(`investor_id.eq.${me},realtor_id.eq.${me}`),
      sb().from("reviews").select("match_id").eq("reviewer_id", me),
    ]);
    const done = new Set((check(mineRes) as { match_id: string }[]).map((r) => r.match_id));
    const matches = (check(matchesRes) as (Match & { deal: Pick<Deal, "id" | "title" | "city" | "state"> | null })[]).filter((m) => !done.has(m.id) && m.deal && canLeaveReview(m, me));
    const people = await publicProfiles(matches.map((m) => (m.investor_id === me ? m.realtor_id : m.investor_id)));
    return matches.map(({ deal, ...m }) => ({
      match: m,
      deal: deal!,
      counterparty: must(people, m.investor_id === me ? m.realtor_id : m.investor_id),
    }));
  },

  async createReview(input) {
    const error = validateCompleteReviewScores(input);
    if (error) throw new ApiError(error);
    const me = await uid();
    const m = check(await sb().from("matches").select("*").eq("id", input.match_id).single()) as Match;
    const reviewee = m.investor_id === me ? m.realtor_id : m.investor_id;
    // state is filled in by the validate_review trigger
    check(await sb().from("reviews").insert({ ...input, reviewer_id: me, reviewee_id: reviewee, state: "TX" }));
  },

  async flagReview(id, reason) {
    check(await sb().from("reviews").update({ is_flagged: true, flag_reason: reason }).eq("id", id));
  },

  async listBlocked() {
    const me = await uid();
    const rows = check(await sb().from("blocked_users").select("*, deal:deals(id, title)").eq("blocker_id", me).order("created_at", { ascending: false })) as (BlockedUser & {
      deal: { id: string; title: string } | null;
    })[];
    const people = await publicProfiles(rows.map((r) => r.blocked_id));
    return rows.map((r) => ({ ...r, blocked: must(people, r.blocked_id) }));
  },

  async blockUser(blockedId, dealId, reason) {
    const me = await uid();
    const res = await sb().from("blocked_users").insert({ blocker_id: me, blocked_id: blockedId, deal_id: dealId, reason });
    if (res.error && res.error.code !== "23505") check(res); // ignore duplicates
  },

  async unblock(id) {
    check(await sb().from("blocked_users").delete().eq("id", id));
  },

  async agentsInState(state) {
    return check(await sb().rpc("agents_in_state", { p_state: state })) as AgentSummary[];
  },

  async realtorsForDeal(dealId) {
    return check(await sb().rpc("realtors_for_deal", { p_deal_id: dealId })) as AgentSummary[];
  },

  async activeConnections() {
    const me = await uid();
    const matches = (check(
      await sb().from("matches").select("*, deal:deals(id, title, city, state)").eq("status", "active").or(`investor_id.eq.${me},realtor_id.eq.${me}`).order("created_at", { ascending: false }),
    ) as (Match & { deal: Pick<Deal, "id" | "title" | "city" | "state"> | null })[]).filter((m) => m.deal);
    const other = (m: Match) => (m.investor_id === me ? m.realtor_id : m.investor_id);
    const people = await publicProfiles(matches.map(other));
    return matches.filter((m) => people.has(other(m))).map(({ deal, ...m }) => ({ match: m, deal: deal!, counterparty: people.get(other(m))! }));
  },

  async memberProfile(userId) {
    const [profileRes, trackRes] = await Promise.all([
      sb()
        .from("public_profiles")
        .select(`${PUBLIC_COLS}, bio, markets, counties, license_state, license_number, verification_status, created_at, buybox_min_price, buybox_max_price, buybox_property_types, buybox_deal_types, buybox_notes, deals_last_year, experience_history`)
        .eq("id", userId)
        .in("role", ["investor", "realtor"])
        .maybeSingle(),
      sb().rpc("member_track_record", { p_user: userId }),
    ]);
    const profile = check(profileRes) as MemberPublicProfile | null;
    if (!profile) throw new ApiError("Profile not found");
    const track = check(trackRes) as TrackRecord;
    const people = await publicProfiles(track.recent.map((c) => c.counterparty_id));
    return { profile, track: { ...track, recent: track.recent.map((c) => ({ ...c, counterparty: must(people, c.counterparty_id) })) } };
  },

  async notifications() {
    return check(await sb().from("notifications").select("*").order("created_at", { ascending: false }).limit(30)) as AppNotification[];
  },

  async markNotificationsRead() {
    check(await sb().from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null));
  },

  subscribeNotifications(onChange) {
    const channel = sb()
      .channel("notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, onChange)
      .subscribe();
    return () => {
      void sb().removeChannel(channel);
    };
  },

  async adminQueue() {
    const [reviewsRes, matchesRes] = await Promise.all([
      sb().from("reviews").select("*").eq("is_flagged", true).order("created_at"),
      // both sides answered; PostgREST can't compare two columns, so disagreement is filtered below
      sb().from("matches").select("*, deal:deals(id, title, city, state)").eq("status", "active").not("investor_outcome", "is", null).not("realtor_outcome", "is", null),
    ]);
    const disputed = (check(matchesRes) as (Match & { deal: Pick<Deal, "id" | "title" | "city" | "state"> })[]).filter(isDisputed);
    const people = await publicProfiles(disputed.flatMap((m) => [m.investor_id, m.realtor_id]));
    return {
      flagged_reviews: await attachParties(check(reviewsRes) as Review[]),
      disputed_matches: disputed.map((m) => ({ ...m, investor: must(people, m.investor_id), realtor: must(people, m.realtor_id) })),
    };
  },

  async adminModerateReview(id, hide) {
    check(await sb().from("reviews").update({ hidden: hide, is_flagged: false }).eq("id", id));
  },

  async adminResolveMatch(matchId, outcome) {
    check(await sb().rpc("admin_resolve_match", { p_match_id: matchId, p_outcome: outcome }));
  },

  async listListings() {
    const [rows, contacts] = await Promise.all([
      sb().from("realtor_listings").select("*").eq("status", "active").order("created_at", { ascending: false }),
      sb().rpc("listing_contacts"),
    ]);
    const byId = new Map((check(contacts) as ({ listing_id: string } & NonNullable<RealtorListing["agent"]>)[]).map((c) => [c.listing_id, c]));
    return (check(rows) as Omit<RealtorListing, "agent">[]).map((l) => ({ ...l, agent: byId.get(l.id) ?? null }));
  },

  async postListing(input) {
    const id = await uid();
    check(await sb().from("realtor_listings").insert({ ...input, realtor_id: id }));
  },

  async removeListing(id) {
    check(await sb().from("realtor_listings").update({ status: "removed" }).eq("id", id));
  },

  async adminPendingLicenses() {
    const { data, error } = await sb().from("profiles").select("id, email, first_name, last_name, brokerage_name, license_number, license_state, updated_at").eq("verification_status", "pending_review").order("updated_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async adminReviewLicense(userId, approve, note) {
    check(await sb().rpc("admin_review_license", { p_user: userId, p_approve: approve, p_note: note ?? undefined }));
  },

  async adminOverview() {
    const [profiles, deals, matches, listings] = await Promise.all([
      sb().from("profiles").select("id, role, email, first_name, last_name, brokerage_name, company_name, subscription_status, trial_ends_at, current_period_end, complimentary, created_at, markets").order("created_at", { ascending: false }),
      sb().from("deals").select("id, title, address_line, city, zip, status, created_at, investor_id, asking_price, state").order("created_at", { ascending: false }),
      sb().from("matches").select("*").order("created_at", { ascending: false }),
      sb().from("realtor_listings").select("status"),
    ]);
    return {
      members: check(profiles) as AdminMember[],
      deal_statuses: (check(deals) as { status: string }[]).map((d) => d.status),
      deals: check(deals) ?? [],
      deal_dates: (check(deals) as { created_at: string }[]).map((d) => d.created_at),
      match_statuses: (check(matches) as { status: string }[]).map((m) => m.status),
      matches: (check(matches) ?? []) as Match[],
      listing_statuses: (check(listings) as { status: string }[]).map((l) => l.status),
    };
  },

  async adminFreeAccounts() {
    return check(await sb().from("complimentary_grants").select("email, note, role, created_at").order("created_at", { ascending: false })) as FreeAccountGrant[];
  },

  async adminGrantFree(email, note, role) {
    const r = await grantFreeAccount({ data: { email, note, role } });
    if (r.error) throw new ApiError(r.error);
  },

  async adminDeleteMember(userId) {
    const r = await deleteMemberAccount({ data: { userId } });
    if (r.error) throw new ApiError(r.error);
  },

  async adminRevokeFree(email) {
    check(await sb().rpc("admin_revoke_free", { p_email: email }));
  },

  // Checkout is the embedded SubscribeButton; this path is kept for the Api contract.
  async startSubscription() {
    throw new ApiError("Use the subscribe button to start checkout");
  },
  async openBillingPortal() {
    const { createBillingPortal } = await import("@/lib/payments.functions");
    const { getStripeEnvironment } = await import("@/lib/stripe");
    const r = await createBillingPortal({ data: { environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/settings` } });
    if ("error" in r) throw new ApiError(r.error);
    return r.url;
  },

  async deleteMyAccount() {
    const r = await deleteMyAccount();
    if (r.error) throw new ApiError(r.error);
    await sb().auth.signOut();
  },

  async signOut() {
    await sb().auth.signOut();
  },
};
