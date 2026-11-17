alter table public.deals add column if not exists county text;

create or replace function public.post_deal(payload jsonb)
returns public.deals language plpgsql security definer set search_path = public as $$
declare d public.deals;
begin
  if not public.can_post_deal(auth.uid()) then
    raise exception 'PAYWALL: accept the terms, complete your profile and start a trial or subscription to post deals';
  end if;
  if char_length(trim(coalesce(payload ->> 'terms', ''))) < 10 then
    raise exception 'Add the terms for this listing so agents know what you''re offering';
  end if;
  insert into public.deals (
    investor_id, agent_need, title, address_line, city, state, zip, county, property_type,
    beds, baths, sqft, asking_price, arv, terms, description, status
  ) values (
    auth.uid(), coalesce(payload ->> 'agent_need', 'listing_agent')::public.agent_need, payload ->> 'title', payload ->> 'address_line', payload ->> 'city', payload ->> 'state',
    nullif(payload ->> 'zip', ''), nullif(trim(coalesce(payload ->> 'county', '')), ''), coalesce(payload ->> 'property_type', 'single_family'),
    (payload ->> 'beds')::numeric, (payload ->> 'baths')::numeric, (payload ->> 'sqft')::int,
    (payload ->> 'asking_price')::numeric, (payload ->> 'arv')::numeric,
    payload ->> 'terms', payload ->> 'description', 'live'
  ) returning * into d;
  perform public.notify_realtors_of_deal(d);
  return d;
end;
$$;

-- Realtors who picked counties in the deal's state only hear about deals in those counties;
-- realtors with no counties in that state still hear about every deal there.
create or replace function public.notify_realtors_of_deal(d public.deals)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, title, body, link)
  select p.id,
         case d.agent_need when 'buyers_agent' then 'Buyer''s agent needed in ' else 'Listing agent needed in ' end
           || coalesce(d.county || ', ', d.city || ', ') || d.state,
         d.title, '/deals/' || d.id
  from public.profiles p
  where p.role = 'realtor' and p.verification_status = 'verified'
    and (p.license_state = d.state or d.state = any (p.markets))
    and (
      d.county is null
      or not exists (select 1 from unnest(p.counties) c where c like d.state || ':%')
      or (d.state || ':' || d.county) = any (p.counties)
    )
    and not public.is_blocked_from_deal(p.id, d);
$$;
revoke execute on function public.notify_realtors_of_deal(public.deals) from public, anon, authenticated;

drop function if exists public.browse_deals(text, uuid, public.agent_need, text);
create function public.browse_deals(
  p_state text default null,
  p_deal_id uuid default null,
  p_agent_need public.agent_need default null,
  p_city text default null
)
returns table (
  id uuid, investor_id uuid, agent_need public.agent_need, title text, city text, state text, zip text, property_type text,
  beds numeric, baths numeric, sqft int, asking_price numeric, arv numeric,
  terms text, description text, status public.deal_status, created_at timestamptz, county text
) language sql stable security definer set search_path = public as $$
  select d.id, d.investor_id, d.agent_need, d.title, d.city, d.state, d.zip, d.property_type,
         d.beds, d.baths, d.sqft, d.asking_price, d.arv, d.terms, d.description, d.status, d.created_at, d.county
  from public.deals d
  where d.status = 'live'
    and (p_state is null or d.state = p_state)
    and (p_deal_id is null or d.id = p_deal_id)
    and (p_agent_need is null or d.agent_need = p_agent_need)
    and (nullif(trim(p_city), '') is null or d.city ilike replace(replace(trim(p_city), '%', ''), '_', '') || '%')
    and d.investor_id <> auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'realtor' and p.verification_status = 'verified')
    and not public.is_blocked_from_deal(auth.uid(), d)
  order by d.created_at desc;
$$;
revoke execute on function public.browse_deals(text, uuid, public.agent_need, text) from public, anon;
grant execute on function public.browse_deals(text, uuid, public.agent_need, text) to authenticated;