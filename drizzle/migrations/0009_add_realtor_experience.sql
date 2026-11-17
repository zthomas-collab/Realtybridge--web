ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deals_last_year integer CHECK (deals_last_year IS NULL OR (deals_last_year >= 0 AND deals_last_year <= 10000));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience_history text CHECK (experience_history IS NULL OR char_length(experience_history) <= 4000);

create or replace view public.public_profiles with (security_invoker = false) as
select p.id, p.role, p.first_name, p.last_name, p.company_name, p.avatar_url, p.brokerage_name,
       p.verification_status, p.markets, p.license_state, p.bio, p.created_at, p.services,
       s.avg_rating, coalesce(s.review_count, 0) as review_count,
       (select count(*) from public.matches m
         where m.status = 'completed' and p.id in (m.investor_id, m.realtor_id))::int as closed_deals,
       (select count(*) from public.matches m
         where m.status = 'cancelled' and p.id in (m.investor_id, m.realtor_id))::int as cancelled_deals,
       case when p.role = 'realtor' then p.license_number end as license_number,
       case when p.role = 'investor' then p.buybox_min_price end as buybox_min_price,
       case when p.role = 'investor' then p.buybox_max_price end as buybox_max_price,
       case when p.role = 'investor' then p.buybox_property_types end as buybox_property_types,
       case when p.role = 'investor' then p.buybox_notes end as buybox_notes,
       p.counties,
       case when p.role = 'realtor' then p.deals_last_year end as deals_last_year,
       case when p.role = 'realtor' then p.experience_history end as experience_history
from public.profiles p
left join public.rating_summaries s on s.user_id = p.id;