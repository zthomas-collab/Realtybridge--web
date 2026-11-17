export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          deal_id: string | null
          id: string
          reason: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          deal_id?: string | null
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          deal_id?: string | null
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      complimentary_grants: {
        Row: {
          created_at: string
          email: string
          granted_by: string | null
          note: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          email: string
          granted_by?: string | null
          note?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          email?: string
          granted_by?: string | null
          note?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "complimentary_grants_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complimentary_grants_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_interests: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          message: string | null
          realtor_id: string
          referral_acknowledged_at: string | null
          referral_acknowledgment: string | null
          status: Database["public"]["Enums"]["interest_status"]
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: string
          message?: string | null
          realtor_id: string
          referral_acknowledged_at?: string | null
          referral_acknowledgment?: string | null
          status?: Database["public"]["Enums"]["interest_status"]
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: string
          message?: string | null
          realtor_id?: string
          referral_acknowledged_at?: string | null
          referral_acknowledgment?: string | null
          status?: Database["public"]["Enums"]["interest_status"]
        }
        Relationships: [
          {
            foreignKeyName: "deal_interests_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_interests_realtor_id_fkey"
            columns: ["realtor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_interests_realtor_id_fkey"
            columns: ["realtor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          address_line: string | null
          agent_need: Database["public"]["Enums"]["agent_need"]
          arv: number | null
          asking_price: number | null
          baths: number | null
          beds: number | null
          city: string
          county: string | null
          created_at: string
          deal_type: string | null
          description: string | null
          id: string
          investor_id: string
          property_type: string
          referral_required: boolean
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sold_at: string | null
          sqft: number | null
          state: string
          status: Database["public"]["Enums"]["deal_status"]
          terms: string | null
          title: string
          updated_at: string
          zip: string | null
        }
        Insert: {
          address_line?: string | null
          agent_need?: Database["public"]["Enums"]["agent_need"]
          arv?: number | null
          asking_price?: number | null
          baths?: number | null
          beds?: number | null
          city: string
          county?: string | null
          created_at?: string
          deal_type?: string | null
          description?: string | null
          id?: string
          investor_id: string
          property_type?: string
          referral_required?: boolean
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sold_at?: string | null
          sqft?: number | null
          state: string
          status?: Database["public"]["Enums"]["deal_status"]
          terms?: string | null
          title: string
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address_line?: string | null
          agent_need?: Database["public"]["Enums"]["agent_need"]
          arv?: number | null
          asking_price?: number | null
          baths?: number | null
          beds?: number | null
          city?: string
          county?: string | null
          created_at?: string
          deal_type?: string | null
          description?: string | null
          id?: string
          investor_id?: string
          property_type?: string
          referral_required?: boolean
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sold_at?: string | null
          sqft?: number | null
          state?: string
          status?: Database["public"]["Enums"]["deal_status"]
          terms?: string | null
          title?: string
          updated_at?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          completed_at: string | null
          created_at: string
          deal_id: string
          id: string
          interest_id: string
          investor_id: string
          investor_outcome: Database["public"]["Enums"]["match_outcome"] | null
          investor_reported_at: string | null
          realtor_id: string
          realtor_outcome: Database["public"]["Enums"]["match_outcome"] | null
          realtor_reported_at: string | null
          resolved_by_admin: boolean
          status: Database["public"]["Enums"]["match_status"]
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deal_id: string
          id?: string
          interest_id: string
          investor_id: string
          investor_outcome?: Database["public"]["Enums"]["match_outcome"] | null
          investor_reported_at?: string | null
          realtor_id: string
          realtor_outcome?: Database["public"]["Enums"]["match_outcome"] | null
          realtor_reported_at?: string | null
          resolved_by_admin?: boolean
          status?: Database["public"]["Enums"]["match_status"]
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deal_id?: string
          id?: string
          interest_id?: string
          investor_id?: string
          investor_outcome?: Database["public"]["Enums"]["match_outcome"] | null
          investor_reported_at?: string | null
          realtor_id?: string
          realtor_outcome?: Database["public"]["Enums"]["match_outcome"] | null
          realtor_reported_at?: string | null
          resolved_by_admin?: boolean
          status?: Database["public"]["Enums"]["match_status"]
        }
        Relationships: [
          {
            foreignKeyName: "matches_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_interest_id_fkey"
            columns: ["interest_id"]
            isOneToOne: false
            referencedRelation: "deal_interests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_realtor_id_fkey"
            columns: ["realtor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_realtor_id_fkey"
            columns: ["realtor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_followups: {
        Row: {
          sent_at: string
          template: string
          user_id: string
        }
        Insert: {
          sent_at?: string
          template: string
          user_id: string
        }
        Update: {
          sent_at?: string
          template?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_followups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_followups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      network_activity: {
        Row: {
          actor_id: string | null
          created_at: string
          event: string
          id: string
          referral_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event: string
          id?: string
          referral_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event?: string
          id?: string
          referral_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_activity_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_activity_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_activity_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "network_referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      network_agreement_history: {
        Row: {
          archived_at: string
          created_at: string
          id: string
          owner_id: string
          realtor_id: string
          recorded_by: string
          reference: string
          referral_id: string
        }
        Insert: {
          archived_at?: string
          created_at: string
          id?: string
          owner_id: string
          realtor_id: string
          recorded_by: string
          reference: string
          referral_id: string
        }
        Update: {
          archived_at?: string
          created_at?: string
          id?: string
          owner_id?: string
          realtor_id?: string
          recorded_by?: string
          reference?: string
          referral_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_agreement_history_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_agreement_history_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_agreement_history_realtor_id_fkey"
            columns: ["realtor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_agreement_history_realtor_id_fkey"
            columns: ["realtor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_agreement_history_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_agreement_history_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_agreement_history_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "network_referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      network_agreements: {
        Row: {
          brokerage_approved: boolean
          created_at: string
          licensing_confirmed: boolean
          recorded_by: string
          reference: string
          referral_id: string
        }
        Insert: {
          brokerage_approved: boolean
          created_at?: string
          licensing_confirmed: boolean
          recorded_by: string
          reference: string
          referral_id: string
        }
        Update: {
          brokerage_approved?: boolean
          created_at?: string
          licensing_confirmed?: boolean
          recorded_by?: string
          reference?: string
          referral_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_agreements_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_agreements_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_agreements_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: true
            referencedRelation: "network_referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      network_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          response_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          response_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          response_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_messages_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "network_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      network_notifications: {
        Row: {
          created_at: string
          event: string
          id: string
          read_at: string | null
          referral_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          read_at?: string | null
          referral_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          read_at?: string | null
          referral_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_notifications_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "network_referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      network_profiles: {
        Row: {
          cities: string[]
          credentials: string | null
          notify_area: boolean
          notify_connection: boolean
          notify_interest: boolean
          notify_message: boolean
          notify_status: boolean
          primary_market: string | null
          specialties: string[]
          user_id: string
          zip_codes: string[]
        }
        Insert: {
          cities?: string[]
          credentials?: string | null
          notify_area?: boolean
          notify_connection?: boolean
          notify_interest?: boolean
          notify_message?: boolean
          notify_status?: boolean
          primary_market?: string | null
          specialties?: string[]
          user_id: string
          zip_codes?: string[]
        }
        Update: {
          cities?: string[]
          credentials?: string | null
          notify_area?: boolean
          notify_connection?: boolean
          notify_interest?: boolean
          notify_message?: boolean
          notify_status?: boolean
          primary_market?: string | null
          specialties?: string[]
          user_id?: string
          zip_codes?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "network_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      network_referrals: {
        Row: {
          city: string
          county: string | null
          created_at: string
          description: string
          fee_offered: string | null
          hidden: boolean
          id: string
          max_price: number
          min_price: number
          moderation_note: string | null
          owner_id: string
          preferred_experience: string
          property_type: string
          referral_source: string
          referral_type: string
          selected_realtor_id: string | null
          state: string
          status: string
          updated_at: string
          urgency: string
          zip: string | null
        }
        Insert: {
          city: string
          county?: string | null
          created_at?: string
          description: string
          fee_offered?: string | null
          hidden?: boolean
          id?: string
          max_price: number
          min_price: number
          moderation_note?: string | null
          owner_id: string
          preferred_experience: string
          property_type: string
          referral_source?: string
          referral_type: string
          selected_realtor_id?: string | null
          state: string
          status?: string
          updated_at?: string
          urgency: string
          zip?: string | null
        }
        Update: {
          city?: string
          county?: string | null
          created_at?: string
          description?: string
          fee_offered?: string | null
          hidden?: boolean
          id?: string
          max_price?: number
          min_price?: number
          moderation_note?: string | null
          owner_id?: string
          preferred_experience?: string
          property_type?: string
          referral_source?: string
          referral_type?: string
          selected_realtor_id?: string | null
          state?: string
          status?: string
          updated_at?: string
          urgency?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "network_referrals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_referrals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_referrals_selected_realtor_id_fkey"
            columns: ["selected_realtor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_referrals_selected_realtor_id_fkey"
            columns: ["selected_realtor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      network_reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          referral_id: string
          reported_user_id: string | null
          reporter_id: string
          resolved: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          referral_id: string
          reported_user_id?: string | null
          reporter_id: string
          resolved?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          referral_id?: string
          reported_user_id?: string | null
          reporter_id?: string
          resolved?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "network_reports_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "network_referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      network_responses: {
        Row: {
          created_at: string
          id: string
          interested: boolean
          realtor_id: string
          referral_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interested?: boolean
          realtor_id: string
          referral_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interested?: boolean
          realtor_id?: string
          referral_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_responses_realtor_id_fkey"
            columns: ["realtor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_responses_realtor_id_fkey"
            columns: ["realtor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_responses_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "network_referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          billing_plan: string | null
          bio: string | null
          brokerage_name: string | null
          buybox_deal_types: string[]
          buybox_max_price: number | null
          buybox_min_price: number | null
          buybox_notes: string | null
          buybox_property_types: string[]
          company_name: string | null
          complimentary: boolean
          contractor_services: string[]
          counties: string[]
          created_at: string
          current_period_end: string | null
          deals_last_year: number | null
          email: string
          experience_history: string | null
          first_name: string | null
          grandfathered_premium: boolean
          id: string
          last_name: string | null
          license_number: string | null
          license_state: string | null
          markets: string[]
          phone: string | null
          push_notifications: boolean
          role: Database["public"]["Enums"]["user_role"]
          roles: Database["public"]["Enums"]["user_role"][]
          services: Database["public"]["Enums"]["realtor_service"][]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          terms_accepted_at: string | null
          terms_version: string | null
          trial_ends_at: string | null
          updated_at: string
          verification_note: string | null
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          billing_plan?: string | null
          bio?: string | null
          brokerage_name?: string | null
          buybox_deal_types?: string[]
          buybox_max_price?: number | null
          buybox_min_price?: number | null
          buybox_notes?: string | null
          buybox_property_types?: string[]
          company_name?: string | null
          complimentary?: boolean
          contractor_services?: string[]
          counties?: string[]
          created_at?: string
          current_period_end?: string | null
          deals_last_year?: number | null
          email: string
          experience_history?: string | null
          first_name?: string | null
          grandfathered_premium?: boolean
          id: string
          last_name?: string | null
          license_number?: string | null
          license_state?: string | null
          markets?: string[]
          phone?: string | null
          push_notifications?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          roles?: Database["public"]["Enums"]["user_role"][]
          services?: Database["public"]["Enums"]["realtor_service"][]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          terms_accepted_at?: string | null
          terms_version?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          verification_note?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          billing_plan?: string | null
          bio?: string | null
          brokerage_name?: string | null
          buybox_deal_types?: string[]
          buybox_max_price?: number | null
          buybox_min_price?: number | null
          buybox_notes?: string | null
          buybox_property_types?: string[]
          company_name?: string | null
          complimentary?: boolean
          contractor_services?: string[]
          counties?: string[]
          created_at?: string
          current_period_end?: string | null
          deals_last_year?: number | null
          email?: string
          experience_history?: string | null
          first_name?: string | null
          grandfathered_premium?: boolean
          id?: string
          last_name?: string | null
          license_number?: string | null
          license_state?: string | null
          markets?: string[]
          phone?: string | null
          push_notifications?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          roles?: Database["public"]["Enums"]["user_role"][]
          services?: Database["public"]["Enums"]["realtor_service"][]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          terms_accepted_at?: string | null
          terms_version?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          verification_note?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      realtor_listings: {
        Row: {
          address_line: string | null
          baths: number | null
          beds: number | null
          city: string
          county: string | null
          created_at: string
          days_on_market: number | null
          description: string | null
          id: string
          list_price: number | null
          property_type: string
          realtor_id: string
          sqft: number | null
          state: string
          status: string
          title: string
          zip: string | null
        }
        Insert: {
          address_line?: string | null
          baths?: number | null
          beds?: number | null
          city: string
          county?: string | null
          created_at?: string
          days_on_market?: number | null
          description?: string | null
          id?: string
          list_price?: number | null
          property_type?: string
          realtor_id: string
          sqft?: number | null
          state: string
          status?: string
          title: string
          zip?: string | null
        }
        Update: {
          address_line?: string | null
          baths?: number | null
          beds?: number | null
          city?: string
          county?: string | null
          created_at?: string
          days_on_market?: number | null
          description?: string | null
          id?: string
          list_price?: number | null
          property_type?: string
          realtor_id?: string
          sqft?: number | null
          state?: string
          status?: string
          title?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "realtor_listings_realtor_id_fkey"
            columns: ["realtor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "realtor_listings_realtor_id_fkey"
            columns: ["realtor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_agreements: {
        Row: {
          agreement_reference: string | null
          agreement_status: string
          commission_basis: number | null
          dashboard_completed_at: string | null
          fee_paid_at: string | null
          match_id: string
          notes: string | null
          referral_fee: number | null
          sent_at: string | null
          signed_at: string | null
          updated_at: string
        }
        Insert: {
          agreement_reference?: string | null
          agreement_status?: string
          commission_basis?: number | null
          dashboard_completed_at?: string | null
          fee_paid_at?: string | null
          match_id: string
          notes?: string | null
          referral_fee?: number | null
          sent_at?: string | null
          signed_at?: string | null
          updated_at?: string
        }
        Update: {
          agreement_reference?: string | null
          agreement_status?: string
          commission_basis?: number | null
          dashboard_completed_at?: string | null
          fee_paid_at?: string | null
          match_id?: string
          notes?: string | null
          referral_fee?: number | null
          sent_at?: string | null
          signed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_agreements_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string | null
          communication: number | null
          contract_accuracy: number | null
          created_at: string
          flag_reason: string | null
          follow_through: number | null
          hidden: boolean
          id: string
          is_flagged: boolean
          knowledge: number | null
          market_knowledge: number | null
          match_id: string
          problem_solving: number | null
          professionalism: number | null
          rating: number
          reviewee_id: string
          reviewer_id: string
          speed_to_close: number | null
          state: string
          team_player: number | null
        }
        Insert: {
          body?: string | null
          communication?: number | null
          contract_accuracy?: number | null
          created_at?: string
          flag_reason?: string | null
          follow_through?: number | null
          hidden?: boolean
          id?: string
          is_flagged?: boolean
          knowledge?: number | null
          market_knowledge?: number | null
          match_id: string
          problem_solving?: number | null
          professionalism?: number | null
          rating: number
          reviewee_id: string
          reviewer_id: string
          speed_to_close?: number | null
          state: string
          team_player?: number | null
        }
        Update: {
          body?: string | null
          communication?: number | null
          contract_accuracy?: number | null
          created_at?: string
          flag_reason?: string | null
          follow_through?: number | null
          hidden?: boolean
          id?: string
          is_flagged?: boolean
          knowledge?: number | null
          market_knowledge?: number | null
          match_id?: string
          problem_solving?: number | null
          professionalism?: number | null
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
          speed_to_close?: number | null
          state?: string
          team_player?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      terms_acceptances: {
        Row: {
          accepted_at: string
          id: string
          user_agent: string | null
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          user_agent?: string | null
          user_id: string
          version: string
        }
        Update: {
          accepted_at?: string
          id?: string
          user_agent?: string | null
          user_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "terms_acceptances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "terms_acceptances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          avg_rating: number | null
          bio: string | null
          brokerage_name: string | null
          buybox_deal_types: string[] | null
          buybox_max_price: number | null
          buybox_min_price: number | null
          buybox_notes: string | null
          buybox_property_types: string[] | null
          cancelled_deals: number | null
          closed_deals: number | null
          company_name: string | null
          counties: string[] | null
          created_at: string | null
          deals_last_year: number | null
          experience_history: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          license_number: string | null
          license_state: string | null
          markets: string[] | null
          review_count: number | null
          role: Database["public"]["Enums"]["user_role"] | null
          services: Database["public"]["Enums"]["realtor_service"][] | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Relationships: []
      }
      rating_summaries: {
        Row: {
          avg_communication: number | null
          avg_contract_accuracy: number | null
          avg_follow_through: number | null
          avg_knowledge: number | null
          avg_market_knowledge: number | null
          avg_problem_solving: number | null
          avg_professionalism: number | null
          avg_rating: number | null
          avg_speed_to_close: number | null
          avg_team_player: number | null
          review_count: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rating_summaries_by_state: {
        Row: {
          avg_rating: number | null
          review_count: number | null
          state: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_interest: {
        Args: { p_interest_id: string }
        Returns: {
          completed_at: string | null
          created_at: string
          deal_id: string
          id: string
          interest_id: string
          investor_id: string
          investor_outcome: Database["public"]["Enums"]["match_outcome"] | null
          investor_reported_at: string | null
          realtor_id: string
          realtor_outcome: Database["public"]["Enums"]["match_outcome"] | null
          realtor_reported_at: string | null
          resolved_by_admin: boolean
          status: Database["public"]["Enums"]["match_status"]
        }
        SetofOptions: {
          from: "*"
          to: "matches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      accept_terms: {
        Args: { p_user_agent?: string; p_version: string }
        Returns: undefined
      }
      add_role: {
        Args: { p_role: Database["public"]["Enums"]["user_role"] }
        Returns: undefined
      }
      admin_grant_free: {
        Args: {
          p_email: string
          p_note?: string
          p_role?: Database["public"]["Enums"]["user_role"]
        }
        Returns: undefined
      }
      admin_resolve_match: {
        Args: {
          p_match_id: string
          p_outcome: Database["public"]["Enums"]["match_outcome"]
        }
        Returns: undefined
      }
      admin_review_license: {
        Args: { p_approve: boolean; p_note?: string; p_user: string }
        Returns: undefined
      }
      admin_revoke_free: { Args: { p_email: string }; Returns: undefined }
      agents_in_state: {
        Args: { p_state: string }
        Returns: {
          avatar_url: string
          avg_rating: number
          brokerage_name: string
          cancelled_deals: number
          closed_deals: number
          first_name: string
          id: string
          last_name: string
          review_count: number
          services: Database["public"]["Enums"]["realtor_service"][]
        }[]
      }
      apply_for_opportunity: {
        Args: {
          p_acknowledged?: boolean
          p_deal_id: string
          p_message?: string
        }
        Returns: {
          created_at: string
          deal_id: string
          id: string
          message: string | null
          realtor_id: string
          referral_acknowledged_at: string | null
          referral_acknowledgment: string | null
          status: Database["public"]["Enums"]["interest_status"]
        }
        SetofOptions: {
          from: "*"
          to: "deal_interests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      are_valid_us_states: { Args: { codes: string[] }; Returns: boolean }
      browse_deals: {
        Args: {
          p_agent_need?: Database["public"]["Enums"]["agent_need"]
          p_city?: string
          p_deal_id?: string
          p_state?: string
        }
        Returns: {
          agent_need: Database["public"]["Enums"]["agent_need"]
          arv: number
          asking_price: number
          baths: number
          beds: number
          city: string
          county: string
          created_at: string
          deal_type: string
          description: string
          id: string
          investor_id: string
          property_type: string
          sqft: number
          state: string
          status: Database["public"]["Enums"]["deal_status"]
          terms: string
          title: string
          zip: string
        }[]
      }
      can_access_platform: { Args: { uid: string }; Returns: boolean }
      can_post_deal: { Args: { uid: string }; Returns: boolean }
      claim_role: {
        Args: { p_role: Database["public"]["Enums"]["user_role"] }
        Returns: undefined
      }
      claim_roles: {
        Args: { p_roles: Database["public"]["Enums"]["user_role"][] }
        Returns: undefined
      }
      community_counts: { Args: never; Returns: Json }
      complete_referral_dashboard_item: {
        Args: { p_match_id: string }
        Returns: undefined
      }
      contractors_for_deal: {
        Args: { p_deal_id: string }
        Returns: {
          avatar_url: string
          bio: string
          company_name: string
          contractor_services: string[]
          counties: string[]
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string
          website: string
        }[]
      }
      current_terms_version: { Args: never; Returns: string }
      deals_for_contractor: {
        Args: never
        Returns: {
          city: string
          county: string
          created_at: string
          id: string
          in_county: boolean
          investor_email: string
          investor_name: string
          investor_phone: string
          state: string
          status: string
          title: string
        }[]
      }
      decline_interest: { Args: { p_interest_id: string }; Returns: undefined }
      express_interest: {
        Args: { p_deal_id: string; p_message?: string }
        Returns: {
          created_at: string
          deal_id: string
          id: string
          message: string | null
          realtor_id: string
          referral_acknowledged_at: string | null
          referral_acknowledgment: string | null
          status: Database["public"]["Enums"]["interest_status"]
        }
        SetofOptions: {
          from: "*"
          to: "deal_interests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      finalize_match: {
        Args: {
          p_by_admin: boolean
          p_match_id: string
          p_outcome: Database["public"]["Enums"]["match_outcome"]
        }
        Returns: undefined
      }
      has_accepted_terms: { Args: { uid: string }; Returns: boolean }
      has_active_billing: { Args: { uid: string }; Returns: boolean }
      interest_investor_contact: {
        Args: { p_deal_id: string }
        Returns: {
          email: string
          phone: string
        }[]
      }
      interested_deals: {
        Args: never
        Returns: {
          address_line: string
          agent_need: Database["public"]["Enums"]["agent_need"]
          arv: number
          asking_price: number
          baths: number
          beds: number
          city: string
          created_at: string
          deal_type: string
          description: string
          id: string
          investor_id: string
          property_type: string
          rejection_reason: string
          sold_at: string
          sqft: number
          state: string
          status: Database["public"]["Enums"]["deal_status"]
          terms: string
          title: string
          zip: string
        }[]
      }
      investor_metrics: { Args: never; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      is_blocked_from_deal: {
        Args: {
          d: Database["public"]["Tables"]["deals"]["Row"]
          viewer: string
        }
        Returns: boolean
      }
      is_valid_us_state: { Args: { code: string }; Returns: boolean }
      listing_contacts: {
        Args: never
        Returns: {
          avatar_url: string
          brokerage_name: string
          email: string
          first_name: string
          last_name: string
          listing_id: string
          phone: string
        }[]
      }
      match_contact: {
        Args: { p_match_id: string }
        Returns: {
          email: string
          phone: string
        }[]
      }
      member_track_record: { Args: { p_user: string }; Returns: Json }
      network_action: {
        Args: { p_action: string; p_payload?: Json }
        Returns: Json
      }
      network_admin_message_count: { Args: never; Returns: number }
      network_area_match: {
        Args: {
          p_city: string
          p_county: string
          p_state: string
          p_user: string
          p_zip: string
        }
        Returns: boolean
      }
      network_can_read: { Args: { p_id: string }; Returns: boolean }
      network_eligible: { Args: { p_user: string }; Returns: boolean }
      network_members: { Args: { p_ids: string[] }; Returns: Json }
      network_notify: {
        Args: {
          p_event: string
          p_ref: string
          p_title: string
          p_user: string
        }
        Returns: undefined
      }
      network_thread_access: { Args: { p_id: string }; Returns: boolean }
      normalize_roles: {
        Args: { p_roles: Database["public"]["Enums"]["user_role"][] }
        Returns: Database["public"]["Enums"]["user_role"][]
      }
      notify: {
        Args: { b: string; l: string; t: string; uid: string }
        Returns: undefined
      }
      notify_realtors_of_deal: {
        Args: { d: Database["public"]["Tables"]["deals"]["Row"] }
        Returns: undefined
      }
      post_deal: {
        Args: { payload: Json }
        Returns: {
          address_line: string | null
          agent_need: Database["public"]["Enums"]["agent_need"]
          arv: number | null
          asking_price: number | null
          baths: number | null
          beds: number | null
          city: string
          county: string | null
          created_at: string
          deal_type: string | null
          description: string | null
          id: string
          investor_id: string
          property_type: string
          referral_required: boolean
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sold_at: string | null
          sqft: number | null
          state: string
          status: Database["public"]["Enums"]["deal_status"]
          terms: string | null
          title: string
          updated_at: string
          zip: string | null
        }
        SetofOptions: {
          from: "*"
          to: "deals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      realtors_for_deal: {
        Args: { p_deal_id: string }
        Returns: {
          avatar_url: string
          avg_rating: number
          brokerage_name: string
          cancelled_deals: number
          closed_deals: number
          first_name: string
          id: string
          last_name: string
          review_count: number
          services: Database["public"]["Enums"]["realtor_service"][]
        }[]
      }
      referral_flags: {
        Args: { p_ids: string[] }
        Returns: {
          id: string
          referral_required: boolean
        }[]
      }
      report_match_outcome: {
        Args: {
          p_match_id: string
          p_outcome: Database["public"]["Enums"]["match_outcome"]
        }
        Returns: undefined
      }
      require_platform_access: { Args: never; Returns: undefined }
      required_plan: {
        Args: { p_roles: Database["public"]["Enums"]["user_role"][] }
        Returns: string
      }
      start_trial: { Args: never; Returns: undefined }
      switch_role: {
        Args: { p_role: Database["public"]["Enums"]["user_role"] }
        Returns: undefined
      }
      update_referral_agreement: {
        Args: {
          p_commission?: number
          p_match_id: string
          p_notes?: string
          p_paid?: boolean
          p_reference?: string
          p_status: string
        }
        Returns: undefined
      }
    }
    Enums: {
      agent_need: "listing_agent" | "buyers_agent"
      deal_status:
        | "pending_approval"
        | "live"
        | "matched"
        | "sold"
        | "withdrawn"
        | "rejected"
      interest_status: "interested" | "accepted" | "declined" | "withdrawn"
      match_outcome: "sold" | "cancelled"
      match_status: "active" | "completed" | "cancelled"
      realtor_service:
        | "novation"
        | "flat_fee_listing"
        | "buyers_agent"
        | "short_sale"
      subscription_status:
        | "none"
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "incomplete"
      user_role: "investor" | "realtor" | "admin" | "contractor"
      verification_status:
        | "not_submitted"
        | "pending_review"
        | "verified"
        | "action_needed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      agent_need: ["listing_agent", "buyers_agent"],
      deal_status: [
        "pending_approval",
        "live",
        "matched",
        "sold",
        "withdrawn",
        "rejected",
      ],
      interest_status: ["interested", "accepted", "declined", "withdrawn"],
      match_outcome: ["sold", "cancelled"],
      match_status: ["active", "completed", "cancelled"],
      realtor_service: [
        "novation",
        "flat_fee_listing",
        "buyers_agent",
        "short_sale",
      ],
      subscription_status: [
        "none",
        "trialing",
        "active",
        "past_due",
        "canceled",
        "incomplete",
      ],
      user_role: ["investor", "realtor", "admin", "contractor"],
      verification_status: [
        "not_submitted",
        "pending_review",
        "verified",
        "action_needed",
      ],
    },
  },
} as const
