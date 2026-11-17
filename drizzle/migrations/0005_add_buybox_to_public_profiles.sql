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
       case when p.role = 'investor' then p.buybox_notes end as buybox_notes
from public.profiles p
left join public.rating_summaries s on s.user_id = p.id;
