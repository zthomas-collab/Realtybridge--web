ALTER TABLE public.profiles ADD COLUMN buybox_deal_types text[] NOT NULL DEFAULT '{}' CHECK (buybox_deal_types <@ ARRAY['novation','fix_n_flip','seller_finance','rentals','sub_to']::text[]);
COMMENT ON COLUMN public.profiles.buybox_deal_types IS 'Investor buy box: selected deal strategies';
CREATE OR REPLACE VIEW public.public_profiles WITH (security_invoker = false) AS
SELECT p.id, p.role, p.first_name, p.last_name, p.company_name, p.avatar_url, p.brokerage_name,
 p.verification_status, p.markets, p.license_state, p.bio, p.created_at, p.services,
 s.avg_rating, coalesce(s.review_count, 0) AS review_count,
 (SELECT count(*) FROM public.matches m WHERE m.status = 'completed' AND p.id IN (m.investor_id,m.realtor_id))::int AS closed_deals,
 (SELECT count(*) FROM public.matches m WHERE m.status = 'cancelled' AND p.id IN (m.investor_id,m.realtor_id))::int AS cancelled_deals,
 CASE WHEN p.role = 'realtor' THEN p.license_number END AS license_number,
 CASE WHEN p.role = 'investor' THEN p.buybox_min_price END AS buybox_min_price,
 CASE WHEN p.role = 'investor' THEN p.buybox_max_price END AS buybox_max_price,
 CASE WHEN p.role = 'investor' THEN p.buybox_property_types END AS buybox_property_types,
 CASE WHEN p.role = 'investor' THEN p.buybox_notes END AS buybox_notes,
 p.counties,
 CASE WHEN p.role = 'realtor' THEN p.deals_last_year END AS deals_last_year,
 CASE WHEN p.role = 'realtor' THEN p.experience_history END AS experience_history,
 CASE WHEN p.role = 'investor' THEN p.buybox_deal_types ELSE '{}'::text[] END AS buybox_deal_types
FROM public.profiles p LEFT JOIN public.rating_summaries s ON s.user_id = p.id;