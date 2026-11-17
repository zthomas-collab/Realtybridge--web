import type {
  AgentNeed,
  AgentSummary,
  AppNotification,
  BlockedUser,
  Deal,
  DealContractor,
  ContractorAreaDeal,
  DealInput,
  DealInterest,
  InvestorMetrics,
  Match,
  MatchOutcome,
  Profile,
  ProfileUpdate,
  PublicProfile,
  Review,
  RealtorService,
  ReviewInput,
  UserRole,
  VerificationStatus,
} from "@/lib/types";
import type { ClosedDealRef, TrackRecord } from "@/lib/domain/track-record";
import type { ReferralAgreement, ReferralUpdate } from '@/lib/domain/referral';

export interface RatedProfile extends PublicProfile {
  avg_rating: number | null;
  review_count: number;
  /** realtors: what they work on; empty for investors */
  services: RealtorService[];
  /** contracted deals both parties confirmed sold */
  closed_deals: number;
  /** contracted deals both parties confirmed cancelled */
  cancelled_deals: number;
}

/** What anyone signed in can see on an investor's or realtor's public profile page. */
export interface MemberPublicProfile extends RatedProfile {
  bio: string | null;
  markets: string[];
  counties: string[];
  license_state: string | null;
  /** realtors only; self-reported */
  license_number: string | null;
  /** investors only: what they are looking to buy */
  buybox_min_price: number | null;
  buybox_max_price: number | null;
  buybox_property_types: string[];
  buybox_deal_types?: string[];
  buybox_notes: string | null;
  /** realtors only */
  deals_last_year: number | null;
  experience_history: string | null;
  verification_status: VerificationStatus;
  created_at: string;
}

export interface MemberProfileView {
  profile: MemberPublicProfile;
  track: Omit<TrackRecord, "recent"> & { recent: (ClosedDealRef & { counterparty: PublicProfile })[] };
}

export interface InterestWithRealtor extends DealInterest {
  realtor: RatedProfile;
}

export interface InvestorDealRow extends Deal {
  interest_count: number;
  referral?: ReferralAgreement | null;
  match: (Match & { realtor: PublicProfile }) | null;
}

export interface DealDetail {
  deal: Deal;
  investor: RatedProfile;
  /** investor (owner) only */
  interests: InterestWithRealtor[];
  match: (Match & { realtor: PublicProfile; investor: PublicProfile }) | null;
  /** realtor viewer only */
  my_interest: DealInterest | null;
  referral: ReferralAgreement | null;
}

export interface BrowseFilters {
  state?: string;
  agentNeed?: AgentNeed;
  /** case-insensitive city prefix */
  city?: string;
}

export interface BrowseDealRow extends Omit<Deal, "address_line"> {
  investor: RatedProfile;
  my_interest: DealInterest | null;
}

export interface RealtorDealRow {
  interest: DealInterest;
  deal: Omit<Deal, "address_line"> & { address_line: string | null };
  investor: PublicProfile;
  match: Match | null;
}

export interface ReviewWithParties extends Review {
  reviewer: PublicProfile;
  reviewee: PublicProfile;
}

export interface PendingReview {
  match: Match;
  deal: Pick<Deal, "id" | "title" | "city" | "state">;
  counterparty: PublicProfile;
}

export interface BlockWithUser extends BlockedUser {
  blocked: PublicProfile;
  deal: Pick<Deal, "id" | "title"> | null;
}

export interface FreeAccountGrant {
  email: string;
  note: string | null;
  role?: "realtor" | "contractor";
  created_at: string;
}

export interface AdminMember {
  id: string;
  role: UserRole;
  email: string;
  first_name: string | null;
  last_name: string | null;
  brokerage_name: string | null;
  company_name: string | null;
  subscription_status: import("@/lib/types").SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_end: string | null;
  complimentary: boolean;
  created_at: string;
  /** states the member works in / serves */
  markets?: string[];
}

export interface AdminOverview {
  members: AdminMember[];
  deal_statuses: string[];
  /** created_at of every deal posted */
  deal_dates: string[];
  deals: { investor_id: string; status: string; asking_price: number | null; state?: string | null; id?: string; title?: string; address_line?: string | null; city?: string; zip?: string | null; created_at?: string }[];
  match_statuses: string[];
  matches?: Match[];
  /** status of every realtor listing posted */
  listing_statuses?: string[];
}

export interface AdminQueue {
  flagged_reviews: ReviewWithParties[];
  /** investor and realtor reported different outcomes */
  disputed_matches: (Match & { deal: Pick<Deal, "id" | "title" | "city" | "state">; investor: PublicProfile; realtor: PublicProfile })[];
}

export interface RealtorListingInput {
  title: string;
  address_line: string | null;
  city: string;
  state: string;
  county: string | null;
  zip: string | null;
  property_type: string;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  list_price: number | null;
  days_on_market: number | null;
  description: string | null;
}

export interface RealtorListing extends RealtorListingInput {
  id: string;
  realtor_id: string;
  status: "active" | "removed";
  created_at: string;
  agent: { first_name: string | null; last_name: string | null; brokerage_name: string | null; avatar_url: string | null; email: string; phone: string | null } | null;
}

export interface Api {
  network: import('@/lib/domain/realtor-network').NetworkApi;
  mode: "demo" | "supabase";

  me(): Promise<Profile>;
  updateProfile(patch: ProfileUpdate): Promise<Profile>;
  /** Click-through acceptance of the current Professional Conduct Agreement & Terms of Service. */
  acceptTerms(): Promise<void>;
  /** Make another of the account's member profiles (investor / realtor / contractor) the active one. */
  switchRole(role: "investor" | "realtor" | "contractor"): Promise<void>;
  /** Add a member profile to the account and switch to it. */
  addRole(role: "investor" | "realtor" | "contractor"): Promise<void>;
  uploadAvatar(file: File): Promise<string>;

  /** Members per role who signed in within the last 30 days. */
  communityCounts(): Promise<{ investors: number; realtors: number; contractors: number }>;
  investorMetrics(): Promise<InvestorMetrics>;
  listMyDeals(): Promise<InvestorDealRow[]>;
  getDeal(id: string): Promise<DealDetail>;
  /** Goes live immediately; realtors serving the state are notified. */
  postDeal(input: DealInput): Promise<Deal>;
  withdrawDeal(id: string): Promise<void>;
  acceptInterest(interestId: string): Promise<void>;
  declineInterest(interestId: string): Promise<void>;
  /** Report sold or cancelled. The match closes only when both parties report the same outcome. */
  reportMatchOutcome(matchId: string, outcome: MatchOutcome): Promise<void>;
  /** Counterparty contact details — only available to the two parties of a match. */
  matchContact(matchId: string): Promise<{ email: string; phone: string | null } | null>;
  /** Investor contact details — available to realtors who expressed interest in the deal. */
  investorContact(dealId: string): Promise<{ email: string; phone: string | null } | null>;

  /** Paying contractors covering the deal area — deal investor and matched realtor only. */
  contractorsForDeal(dealId: string): Promise<DealContractor[]>;
  /** Contractors with active billing: live/matched deals in their service area with the investor's contact. */
  dealsForContractor(): Promise<ContractorAreaDeal[]>;

  /** Investors: all active realtor listings with agent contact. Realtors: their own active listings. */
  listListings(): Promise<RealtorListing[]>;
  postListing(input: RealtorListingInput): Promise<void>;
  removeListing(id: string): Promise<void>;

  browseDeals(filters?: BrowseFilters): Promise<BrowseDealRow[]>;
  expressInterest(dealId: string, message: string | null, acknowledged?: boolean): Promise<void>;
  updateReferralAgreement(matchId: string, input: ReferralUpdate): Promise<void>;
  completeReferralDashboardItem(matchId: string): Promise<void>;
  adminReferrals(): Promise<(ReferralAgreement & { match: Match; deal: Deal; investor: PublicProfile; realtor: PublicProfile })[]>;
  withdrawInterest(interestId: string): Promise<void>;
  listMyInterests(): Promise<RealtorDealRow[]>;

  reviewsAbout(userId: string): Promise<ReviewWithParties[]>;
  reviewsWritten(): Promise<ReviewWithParties[]>;
  pendingReviews(): Promise<PendingReview[]>;
  createReview(input: ReviewInput): Promise<void>;
  flagReview(id: string, reason: string): Promise<void>;

  listBlocked(): Promise<BlockWithUser[]>;
  blockUser(blockedId: string, dealId: string | null, reason: string | null): Promise<void>;
  unblock(id: string): Promise<void>;

  agentsInState(state: string): Promise<AgentSummary[]>;
  /** Deal owner: local platform realtors, separate from applicants and active connections. */
  realtorsForDeal(dealId: string): Promise<AgentSummary[]>;

  /** Active matches for the signed-in investor or realtor, with the deal and the other party. */
  activeConnections(): Promise<{ match: Match; deal: Pick<Deal, "id" | "title" | "city" | "state">; counterparty: PublicProfile }[]>;

  /** Public investor or realtor profile with their on-platform track record and success rate. */
  memberProfile(userId: string): Promise<MemberProfileView>;

  notifications(): Promise<AppNotification[]>;
  markNotificationsRead(): Promise<void>;
  subscribeNotifications(onChange: () => void): () => void;

  adminQueue(): Promise<AdminQueue>;
  adminModerateReview(id: string, hide: boolean): Promise<void>;
  adminResolveMatch(matchId: string, outcome: MatchOutcome): Promise<void>;
  adminOverview(): Promise<AdminOverview>;
  adminPendingLicenses(): Promise<PendingLicense[]>;
  adminReviewLicense(userId: string, approve: boolean, note?: string): Promise<void>;
  adminFreeAccounts(): Promise<FreeAccountGrant[]>;
  adminGrantFree(email: string, note: string | null, role: "realtor" | "contractor"): Promise<void>;
  adminRevokeFree(email: string): Promise<void>;
  /** Permanently deletes an investor or realtor account. */
  adminDeleteMember(userId: string): Promise<void>;

  /** Returns a Stripe Checkout URL to redirect to (supabase mode), or null when handled in-app (demo). */
  startSubscription(): Promise<string | null>;
  openBillingPortal(): Promise<string | null>;

  /** Permanently deletes the signed-in investor or realtor account, then signs out. */
  deleteMyAccount(): Promise<void>;
  signOut(): Promise<void>;

  /** Demo mode only */
  demo?: {
    switchPersona(role: UserRole): void;
    reset(): void;
    expireTrial(): void;
  };
}

export class ApiError extends Error {}

export interface PendingLicense { id: string; email: string; first_name: string | null; last_name: string | null; brokerage_name: string | null; license_number: string | null; license_state: string | null; updated_at: string }
