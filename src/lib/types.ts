// Mirrors supabase/migrations (0001_init.sql + 0002_self_serve_posting_and_license.sql)

import type { DealType } from "@/lib/domain/deal-type";

export type { DealType };
export type UserRole = "investor" | "realtor" | "contractor" | "admin";
/**
 * Derived in SQL from the realtor's license number: "verified" means a license number is on file.
 * It's self-reported, not checked by RealtyBridge, so the UI never calls it verified.
 * Investors and admins stay "not_submitted".
 */
export type VerificationStatus = "not_submitted" | "verified";
export type AgentNeed = "listing_agent" | "buyers_agent";
/** Deals go live when posted. "rejected" only exists on posts from before admin approval was removed. */
export type DealStatus = "live" | "matched" | "sold" | "withdrawn" | "rejected";
export type InterestStatus = "interested" | "accepted" | "declined" | "withdrawn";
export type MatchStatus = "active" | "completed" | "cancelled";
export type MatchOutcome = "sold" | "cancelled";
export type RealtorService = "novation" | "flat_fee_listing" | "buyers_agent" | "short_sale";
export type SubscriptionStatus = "none" | "trialing" | "active" | "past_due" | "canceled" | "incomplete";

export interface Profile {
  id: string;
  role: UserRole;
  /** Member profiles on this account; `role` is the active one. */
  roles?: UserRole[];
  /** Subscription price lookup key currently paid for. */
  billing_plan?: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  markets: string[];
  /** "ST:County Name" entries within markets */
  counties?: string[];
  verification_status: VerificationStatus;
  verified_at: string | null;
  verification_note: string | null;
  license_number: string | null;
  license_state: string | null;
  brokerage_name: string | null;
  /** realtors only: what they work on (any combination) */
  services: RealtorService[];
  /** investors only: buy box — what they are looking to buy */
  buybox_min_price: number | null;
  buybox_max_price: number | null;
  buybox_property_types: string[];
  buybox_deal_types?: string[];
  buybox_notes: string | null;
  /** realtors only: self-reported deals closed last year */
  deals_last_year?: number | null;
  /** realtors only: experience / work history */
  experience_history?: string | null;
  /** contractors only: services offered (see CONTRACTOR_SERVICES) */
  contractor_services?: string[];
  website?: string | null;
  push_notifications: boolean;
  terms_version: string | null;
  terms_accepted_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id?: string | null;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_end: string | null;
  /** Free access granted by an admin; counts as active billing. */
  complimentary?: boolean;
  /** Permanent Pro access for Realtors active at the Pro launch. Admin-only. */
  grandfathered_premium?: boolean;
  created_at: string;
}

export type ProfileUpdate = Partial<
  Pick<
    Profile,
    | "first_name"
    | "last_name"
    | "company_name"
    | "phone"
    | "avatar_url"
    | "bio"
    | "markets"
    | "counties"
    | "license_number"
    | "license_state"
    | "brokerage_name"
    | "services"
    | "buybox_min_price"
    | "buybox_max_price"
    | "buybox_property_types"
    | "buybox_deal_types"
    | "buybox_notes"
    | "deals_last_year"
    | "experience_history"
    | "contractor_services"
    | "website"
    | "push_notifications"
  >
>;

export interface Deal {
  id: string;
  investor_id: string;
  agent_need: AgentNeed;
  referral_required?: boolean;
  title: string;
  address_line: string | null;
  city: string;
  state: string;
  zip: string | null;
  county?: string | null;
  property_type: string;
  /** Deal strategy the investor posted; null on deals posted before deal types existed. */
  deal_type: DealType | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  asking_price: number | null;
  arv: number | null;
  terms: string | null;
  description: string | null;
  status: DealStatus;
  rejection_reason: string | null;
  sold_at: string | null;
  created_at: string;
}

export type DealInput = Pick<
  Deal,
  | "agent_need"
  | "title"
  | "address_line"
  | "city"
  | "state"
  | "zip"
  | "county"
  | "property_type"
  | "deal_type"
  | "beds"
  | "baths"
  | "sqft"
  | "asking_price"
  | "arv"
  | "terms"
  | "description"
>;

export interface DealInterest {
  id: string;
  deal_id: string;
  realtor_id: string;
  message: string | null;
  status: InterestStatus;
  referral_acknowledged_at?: string | null;
  referral_acknowledgment?: string | null;
  created_at: string;
}

export interface Match {
  id: string;
  deal_id: string;
  investor_id: string;
  realtor_id: string;
  interest_id: string;
  status: MatchStatus;
  /** each party's report; the match closes only when both agree (see report_match_outcome) */
  investor_outcome: MatchOutcome | null;
  investor_reported_at: string | null;
  realtor_outcome: MatchOutcome | null;
  realtor_reported_at: string | null;
  resolved_by_admin: boolean;
  created_at: string;
  completed_at: string | null;
}

export const REVIEW_CATEGORIES = [
  { key: "communication", label: "Communication" },
  { key: "contract_accuracy", label: "Contract Accuracy" },
  { key: "speed_to_close", label: "Speed to Close" },
  { key: "market_knowledge", label: "Market Knowledge" },
  { key: "knowledge", label: "Knowledge (Deals & Strategy)" },
  { key: "professionalism", label: "Respect & Professionalism" },
  { key: "follow_through", label: "Follow-Through" },
  { key: "problem_solving", label: "Problem Solving" },
  { key: "team_player", label: "Team Player (Investor/Realtor)" },
] as const;

export type ReviewCategory = (typeof REVIEW_CATEGORIES)[number]["key"];

export interface Review {
  id: string;
  match_id: string;
  reviewer_id: string;
  reviewee_id: string;
  state: string;
  rating: number;
  communication: number | null;
  contract_accuracy: number | null;
  speed_to_close: number | null;
  market_knowledge: number | null;
  knowledge?: number | null;
  professionalism?: number | null;
  follow_through?: number | null;
  problem_solving?: number | null;
  team_player?: number | null;
  body: string | null;
  is_flagged: boolean;
  flag_reason: string | null;
  hidden: boolean;
  created_at: string;
}

export type ReviewInput = Pick<Review, "match_id" | "rating" | "body"> & Partial<Record<ReviewCategory, number | null>>;

export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  deal_id: string | null;
  reason: string | null;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface InvestorMetrics {
  deals_posted: number;
  live_deals: number;
  realtors_interested: number;
  matches_made: number;
  /** matches both parties confirmed sold */
  sold_deals: number;
  /** matches both parties confirmed cancelled */
  cancelled_matches: number;
  avg_rating: number | null;
  review_count: number;
}

export interface AgentSummary {
  id: string;
  first_name: string | null;
  last_name: string | null;
  brokerage_name: string | null;
  avatar_url: string | null;
  avg_rating: number | null;
  review_count: number;
  services: RealtorService[];
  closed_deals: number;
  cancelled_deals: number;
}

/** Minimal public view of another user, joined onto lists. */
export type PublicProfile = Pick<
  Profile,
  "id" | "role" | "first_name" | "last_name" | "company_name" | "avatar_url" | "brokerage_name"
>;

/** Contractor listed on a deal for the investor and matched realtor. */
export interface DealContractor {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  avatar_url: string | null;
  email: string;
  phone: string | null;
  website: string | null;
  contractor_services: string[];
  counties: string[];
  bio: string | null;
}

export interface ContractorAreaDeal {
  id: string;
  title: string;
  city: string;
  state: string;
  county: string | null;
  status: string;
  created_at: string;
  in_county: boolean;
  investor_name: string;
  investor_email: string;
  investor_phone: string | null;
}
