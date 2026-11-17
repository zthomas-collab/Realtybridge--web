import type { Profile } from '@/lib/types';

export const NETWORK_SOURCE = 'realtor_network' as const;
export const NETWORK_TYPES = ['Buyer', 'Seller', 'Buyer & Seller', 'Commercial', 'Land', 'Rental', 'Other'] as const;
export const NETWORK_URGENCY = ['Immediate', 'Within 30 Days', '30–90 Days', 'Flexible'] as const;
export const NETWORK_STATUSES = { open: 'Open', interested: 'Realtors Interested', connected: 'Connected', closed: 'Closed', cancelled: 'Cancelled', expired: 'Expired' } as const;
export type NetworkStatus = keyof typeof NETWORK_STATUSES;
export function networkEligible(p: Pick<Profile, 'role' | 'license_number'>) { return p.role === 'realtor' && Boolean(p.license_number?.trim()); }
export function networkAcceptsInterest(status: NetworkStatus) { return status === 'open' || status === 'interested'; }
export function networkModerationVisible(r: Pick<NetworkReferral, 'status' | 'hidden'>) { return r.hidden || ['open','interested','connected'].includes(r.status); }
export function networkAgreementAllowed(owner: string, selected: string | null, user: string, status: NetworkStatus, brokerage: boolean, licensing: boolean) {
  return (owner === user || selected === user) && (status === 'connected' || status === 'closed') && brokerage && licensing;
}
export interface NetworkInput {
  referral_type: typeof NETWORK_TYPES[number]; state: string; city: string; county: string | null; zip: string | null;
  property_type: string; min_price: number; max_price: number; description: string; preferred_experience: string;
  fee_offered: string | null; urgency: typeof NETWORK_URGENCY[number];
}
export interface NetworkMember {
  id: string; first_name: string | null; last_name: string | null; avatar_url: string | null; brokerage_name: string | null;
  markets: string[]; counties: string[]; services: string[]; license_number: string | null; license_state: string | null;
  experience_history: string | null; cities: string[]; zip_codes: string[]; specialties: string[]; primary_market: string | null; credentials: string | null;
}
export interface NetworkReferral extends NetworkInput {
  id: string; owner_id: string; referral_source: typeof NETWORK_SOURCE; status: NetworkStatus; selected_realtor_id: string | null;
  hidden: boolean; moderation_note: string | null; created_at: string; updated_at: string; owner: NetworkMember;
}
export interface NetworkResponse { id: string; referral_id: string; realtor_id: string; interested: boolean; created_at: string; realtor: NetworkMember }
export interface NetworkMessage { id: string; response_id: string; sender_id: string; body: string; created_at: string }
export interface NetworkNotification { id: string; referral_id: string | null; event: string; title: string; read_at: string | null; created_at: string }
export interface NetworkPreferences {
  cities: string[]; zip_codes: string[]; primary_market: string | null; specialties: string[]; credentials: string | null;
  notify_area: boolean; notify_interest: boolean; notify_message: boolean; notify_connection: boolean; notify_status: boolean;
}
export const DEFAULT_NETWORK_PREFERENCES: NetworkPreferences = { cities: [], zip_codes: [], primary_market: null, specialties: [], credentials: null, notify_area: true, notify_interest: true, notify_message: true, notify_connection: true, notify_status: true };
export interface NetworkAgreement { reference: string; recorded_by: string; created_at: string }
export interface NetworkDetail { referral: NetworkReferral; responses: NetworkResponse[]; activity: { id: string; event: string; created_at: string }[]; agreement: NetworkAgreement | null }
export interface NetworkReport { id: string; referral_id: string; reporter_id: string; reported_user_id: string | null; reason: string; resolved: boolean; created_at: string }
export interface NetworkApi {
  list(): Promise<NetworkReferral[]>;
  detail(id: string): Promise<NetworkDetail>;
  messages(responseId: string): Promise<NetworkMessage[]>;
  preferences(): Promise<NetworkPreferences>;
  notifications(): Promise<NetworkNotification[]>;
  admin(): Promise<{ referrals: NetworkReferral[]; reports: NetworkReport[]; responses: { realtor_id: string; interested: boolean }[]; messageCount: number }>;
  action(action: string, payload?: Record<string, unknown>): Promise<{ id?: string; response_id?: string }>;
}