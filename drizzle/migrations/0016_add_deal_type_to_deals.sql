-- Investors pick a deal strategy when they post; agents see it before raising their hand.
alter table public.deals add column if not exists deal_type text
  check (deal_type is null or deal_type in ('novation','fix_n_flip','seller_finance','rentals','sub_to','short_sale'));
comment on column public.deals.deal_type is 'Deal strategy the investor posted (novation, fix n flip, seller finance, rentals, sub to, short sale); null on deals posted before this column existed';

-- post_deal: store the chosen strategy, ignoring anything outside the catalog.
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
    investor_id, agent_need, title, address_line, city, state, zip, county, property_type, deal_type,
    beds, baths, sqft, asking_price, arv, terms, description, status
  ) values (
    auth.uid(), coalesce(payload ->> 'agent_need', 'listing_agent')::public.agent_need, payload ->> 'title', payload ->> 'address_line', payload ->> 'city', payload ->> 'state',
    nullif(payload ->> 'zip', ''), nullif(trim(coalesce(payload ->> 'county', '')), ''), coalesce(payload ->> 'property_type', 'single_family'),
    case when payload ->> 'deal_type' in ('novation','fix_n_flip','seller_finance','rentals','sub_to','short_sale') then payload ->> 'deal_type' end,
    (payload ->> 'beds')::numeric, (payload ->> 'baths')::numeric, (payload ->> 'sqft')::int,
    (payload ->> 'asking_price')::numeric, (payload ->> 'arv')::numeric,
    payload ->> 'terms', payload ->> 'description', 'live'
  ) returning * into d;
  perform public.notify_realtors_of_deal(d);
  return d;
end;
$$;

-- browse_deals: return the strategy too. Dropping is required because the returned columns change.
drop function if exists public.browse_deals(text, uuid, public.agent_need, text);
create function public.browse_deals(
  p_state text default null,
  p_deal_id uuid default null,
  p_agent_need public.agent_need default null,
  p_city text default null
)
returns table (
  id uuid, investor_id uuid, agent_need public.agent_need, title text, city text, state text, zip text, property_type text, deal_type text,
  beds numeric, baths numeric, sqft int, asking_price numeric, arv numeric,
  terms text, description text, status public.deal_status, created_at timestamptz, county text
) language sql stable security definer set search_path = public as $$
  select d.id, d.investor_id, d.agent_need, d.title, d.city, d.state, d.zip, d.property_type, d.deal_type,
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

-- interested_deals: same, for deals a realtor already raised their hand on.
drop function if exists public.interested_deals();
create function public.interested_deals()
returns table (
  id uuid, investor_id uuid, agent_need public.agent_need, title text, address_line text, city text, state text, zip text, property_type text, deal_type text,
  beds numeric, baths numeric, sqft int, asking_price numeric, arv numeric,
  terms text, description text, status public.deal_status, rejection_reason text,
  sold_at timestamptz, created_at timestamptz
) language sql stable security definer set search_path = public as $$
  select d.id, d.investor_id, d.agent_need, d.title,
         case when exists (select 1 from public.matches m where m.deal_id = d.id and m.realtor_id = auth.uid())
              then d.address_line end,
         d.city, d.state, d.zip, d.property_type, d.deal_type, d.beds, d.baths, d.sqft, d.asking_price, d.arv,
         d.terms, d.description, d.status, null::text, d.sold_at, d.created_at
  from public.deals d
  where exists (select 1 from public.deal_interests i
                where i.deal_id = d.id and i.realtor_id = auth.uid() and i.status <> 'withdrawn');
$$;
revoke execute on function public.interested_deals() from public, anon;
grant execute on function public.interested_deals() to authenticated;