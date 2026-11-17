<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Admin file history uses Api.adminOverview match records; cancelled files stay separate from sold files to preserve outcomes.

- RealtyBridge screens live in `src/screens/` and are mounted by thin route files; signed-in screens use the client-only `_app` layout, while the public homepage renders with SSR. `src/lib/next/*` shims keep the ported Next.js Link/router calls working — why: preserves original app code and makes public content crawlable.
- All data goes through the single `Api` interface in `src/lib/api`, implemented against Lovable Cloud in `supabase.ts`; business rules are enforced in SQL RPCs/triggers and mirrored in `src/lib/domain` — why: screens stay backend-agnostic and the database is the source of truth.
- Investor deal application/outcome actions use authenticated server functions that run the existing RPC before fixed-recipient event emails; review urgency is derived from party-report timestamps in a shared domain rule — why: recipient authorization stays server-side and reminders require no email queue or polling infrastructure.
- Investor transaction prompts share a domain stage selector and display stored event timestamps; listing paperwork is not inferred from referral signatures — why: dashboard and property steps stay consistent without claiming unrecorded completion.
- New investor property operational notices use recipient-locked templates in the existing post notification function after owner authorization, with per-property/template idempotency keys — why: every post alerts the intended operational contacts independently of geographic lead matching without arbitrary-recipient sending or duplicate retries.
- Investor Realtor selection uses a confirmation dialog and the existing accept-interest action, not a separate property-status toggle — why: selecting the Realtor and marking the property matched must remain one atomic operation.
- Realtor networking uses the dedicated Api.network service, network-prefixed tables/RPCs, events and query keys; never reuse investor deal/match/referral records or lead notifications — why: member-negotiated networking must remain isolated from company referrals, fees and analytics.
- Listing referrals use immutable deal eligibility, RPC-recorded application acknowledgments and one agreement per selected match; admin-only agreement updates govern commission tracking — why: applicants cannot bypass consent or access another party’s referral records.
- The admin referral list resolves contact emails from the existing admin overview query and hides rows with dashboard_completed_at; completion uses an admin-checked RPC independent of agreement status or deal outcome — why: finishing dashboard work must not change member referral terms or transaction records.
- Deal realtor discovery uses the owner-only `realtors_for_deal` RPC with the same area/block rules as lead notifications; it returns public profile summaries independently of applications — why: posting reveals local realtors without creating connections or exposing contact details.
- Buy box deal strategies use a separate profile array exposed by the member profile view and a shared domain catalog — why: selections persist independently of property types and display consistently.
- Profile saves immediately cache the returned owner profile, and action success waits for affected queries to refresh — why: member names stay consistent across navigation, lists and profiles after saving.
- The signed-in area is the client-only `_app` layout, whose `beforeLoad` redirects to `/login` — why: the session lives in browser storage.
- Member access is account-wide via hasPlatformAccess / SQL can_access_platform; Realtors always enter (free previews), while Pro features (full deal fields, contacts, messaging, interest, lead detail) check has_active_billing, which honors admin-only profiles.grandfathered_premium — why: server-side masking.
- Subscription billing runs through built-in payments: `src/lib/payments.functions.ts` creates embedded checkout/portal sessions and `src/routes/api/public/payments/webhook.ts` syncs subscription state onto `profiles` with the admin client — why: `can_post_deal` already reads those profile columns, so SQL enforcement stays unchanged.
- Subscription checkout and member prompts use the shared domain trial duration; only checkout completion/webhook activation starts a trial, never account signup — why: billing terms stay consistent and account creation cannot unlock unpaid access.
- Account email templates share `EmailBrandLogo` with an absolute public image URL — why: email clients cannot resolve app-relative image paths and shared branding stays consistent.

- Contractor listings on deals come from the `contractors_for_deal` RPC, which checks the caller (deal investor, matched realtor, admin) and billing — why: contractor contact details stay limited to people on the deal.
- Realtor on-market listings live in `realtor_listings`; investors read active rows via RLS and agent contact via the `listing_contacts` RPC — why: contact details stay limited to investors, the owner and admins.
- The deal strategies an investor picks when posting are one catalog in `src/lib/domain/deal-type.ts`, stored on `deals.deal_type` and mirrored by a CHECK constraint listing the same values — why: adding a strategy means editing the catalog and the constraint together, or posts get rejected.
- Accounts hold several member roles in `profiles.roles`; `profiles.role` is the active profile that drives screens/RLS, changed only via `switch_role`/`add_role`/`claim_roles` RPCs, while lead matching/discovery checks `roles` — why: one login can be investor, realtor and contractor without duplicating accounts or missing leads.
- Subscription price follows the account's roles (`required_plan` in SQL, `priceIdForRoles` in domain); the webhook stores the paid price as `billing_plan` and `has_active_billing` rejects a Contractor-only plan for accounts with a Realtor profile — why: one subscription covers all profiles at the right tier.
