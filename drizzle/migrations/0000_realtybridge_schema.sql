-- RealtyBridge schema (consolidated from the original 0001 + 0002 migrations; license uploads removed)
create extension if not exists "pgcrypto";

create type public.user_role as enum ('investor', 'realtor', 'admin');
create type public.verification_status as enum ('not_submitted', 'pending_review', 'verified', 'action_needed');
create type public.deal_status as enum ('pending_approval', 'live', 'matched', 'sold', 'withdrawn', 'rejected');
create type public.agent_need as enum ('listing_agent', 'buyers_agent');
create type public.interest_status as enum ('interested', 'accepted', 'declined', 'withdrawn');
create type public.match_status as enum ('active', 'completed', 'cancelled');
create type public.realtor_service as enum ('novation', 'flat_fee_listing', 'buyers_agent', 'short_sale');
create type public.match_outcome as enum ('sold', 'cancelled');
create type public.subscription_status as enum ('none', 'trialing', 'active', 'past_due', 'canceled', 'incomplete');

create or replace function public.is_valid_us_state(code text)
returns boolean language sql immutable set search_path = public as $$
  select code = any (array[
    'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA',
    'ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR',
    'PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
  ]);
$$;

create or replace function public.are_valid_us_states(codes text[])
returns boolean language sql immutable set search_path = public as $$
  select coalesce(bool_and(public.is_valid_us_state(c)), true) from unnest(codes) c;
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ───────── Profiles ─────────
create table public.profiles (
  id                   uuid primary key references auth.users (id) on delete cascade,
  role                 public.user_role not null default 'investor',
  email                text not null,
  first_name           text,
  last_name            text,
  company_name         text,
  phone                text check (phone is null or phone ~ '^\+1[2-9][0-9]{2}[2-9][0-9]{6}$'),
  avatar_url           text,
  bio                  text check (char_length(bio) <= 2000),
  markets              text[] not null default '{}' check (public.are_valid_us_states(markets)),
  verification_status  public.verification_status not null default 'not_submitted',
  verified_at          timestamptz,
  verification_note    text,
  license_number       text check (license_number is null or char_length(license_number) between 2 and 40),
  license_state        text check (license_state is null or public.is_valid_us_state(license_state)),
  brokerage_name       text,
  services             public.realtor_service[] not null default '{}',
  push_notifications   boolean not null default true,
  terms_version        text,
  terms_accepted_at    timestamptz,
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  subscription_status     public.subscription_status not null default 'none',
  trial_ends_at           timestamptz,
  current_period_end      timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.protect_profile_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user <> 'authenticated' or public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.verification_status is distinct from old.verification_status
     or new.verified_at is distinct from old.verified_at
     or new.terms_version is distinct from old.terms_version
     or new.terms_accepted_at is distinct from old.terms_accepted_at
     or new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.stripe_subscription_id is distinct from old.stripe_subscription_id
     or new.subscription_status is distinct from old.subscription_status
     or new.trial_ends_at is distinct from old.trial_ends_at
     or new.current_period_end is distinct from old.current_period_end then
    raise exception 'Not allowed to modify protected profile fields';
  end if;
  return new;
end;
$$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- License status is derived: a realtor with a license number is 'verified' (shown as "License # on file").
create or replace function public.sync_license_status()
returns trigger language plpgsql set search_path = public as $$
begin
  new.license_number := nullif(trim(new.license_number), '');
  if new.role = 'realtor' and new.license_number is not null then
    if new.verification_status is distinct from 'verified' then
      new.verification_status := 'verified';
      new.verified_at := now();
    end if;
  elsif new.role <> 'admin' then
    new.verification_status := 'not_submitted';
    new.verified_at := null;
  end if;
  new.verification_note := null;
  return new;
end;
$$;
create trigger profiles_sync_license before insert or update on public.profiles
  for each row execute function public.sync_license_status();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requested text := coalesce(new.raw_user_meta_data ->> 'role', 'investor');
begin
  insert into public.profiles (id, email, role, first_name, last_name, avatar_url)
  values (
    new.id,
    new.email,
    case when requested = 'realtor' then 'realtor'::public.user_role else 'investor'::public.user_role end,
    coalesce(new.raw_user_meta_data ->> 'given_name', new.raw_user_meta_data ->> 'first_name'),
    coalesce(new.raw_user_meta_data ->> 'family_name', new.raw_user_meta_data ->> 'last_name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────── Terms ─────────
create or replace function public.current_terms_version()
returns text language sql immutable set search_path = public as $$ select '2026-10-10'; $$;

create or replace function public.has_accepted_terms(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = uid and terms_version = public.current_terms_version() and terms_accepted_at is not null
  );
$$;

create table public.terms_acceptances (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  version     text not null,
  accepted_at timestamptz not null default now(),
  user_agent  text
);
grant select on public.terms_acceptances to authenticated;
grant all on public.terms_acceptances to service_role;
create index terms_acceptances_user_idx on public.terms_acceptances (user_id);

create or replace function public.accept_terms(p_version text, p_user_agent text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_version is distinct from public.current_terms_version() then
    raise exception 'These terms are out of date. Reload the page to see the current version.';
  end if;
  insert into public.terms_acceptances (user_id, version, user_agent)
  values (auth.uid(), p_version, left(p_user_agent, 500));
  update public.profiles set terms_version = p_version, terms_accepted_at = now() where id = auth.uid();
end;
$$;

-- ───────── Deals ─────────
create table public.deals (
  id             uuid primary key default gen_random_uuid(),
  investor_id    uuid not null references public.profiles (id) on delete cascade,
  agent_need     public.agent_need not null default 'listing_agent',
  title          text not null check (char_length(title) between 3 and 140),
  address_line   text,
  city           text not null,
  state          text not null check (public.is_valid_us_state(state)),
  zip            text check (zip is null or zip ~ '^[0-9]{5}$'),
  property_type  text not null default 'single_family',
  beds           numeric(3,1),
  baths          numeric(3,1),
  sqft           integer check (sqft is null or sqft > 0),
  asking_price   numeric(12,2) check (asking_price is null or asking_price > 0),
  arv            numeric(12,2) check (arv is null or arv > 0),
  terms          text check (terms is null or char_length(terms) <= 2000),
  description    text check (char_length(description) <= 5000),
  status         public.deal_status not null default 'live',
  reviewed_by    uuid references public.profiles (id),
  reviewed_at    timestamptz,
  rejection_reason text,
  sold_at        timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
grant select, update on public.deals to authenticated;
grant all on public.deals to service_role;
create index deals_investor_idx on public.deals (investor_id);
create index deals_live_state_idx on public.deals (state, agent_need) where status = 'live';
create trigger deals_updated_at before update on public.deals
  for each row execute function public.set_updated_at();

create or replace function public.can_post_deal(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid
      and p.role = 'investor'
      and public.has_accepted_terms(p.id)
      and p.first_name is not null and p.last_name is not null and p.phone is not null
      and cardinality(p.markets) > 0
      and (
        p.subscription_status = 'active'
        or (p.subscription_status = 'trialing' and p.trial_ends_at > now())
      )
  );
$$;

create or replace function public.protect_deal_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user <> 'authenticated' or public.is_admin() then
    return new;
  end if;
  if new.investor_id is distinct from old.investor_id
     or new.reviewed_by is distinct from old.reviewed_by
     or new.reviewed_at is distinct from old.reviewed_at then
    raise exception 'Not allowed to modify protected deal fields';
  end if;
  if new.status is distinct from old.status and new.status <> 'withdrawn' then
    raise exception 'Use the deal workflow to change status';
  end if;
  return new;
end;
$$;
create trigger deals_protect before update on public.deals
  for each row execute function public.protect_deal_columns();

-- ───────── Interests & matches ─────────
create table public.deal_interests (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid not null references public.deals (id) on delete cascade,
  realtor_id  uuid not null references public.profiles (id) on delete cascade,
  message     text check (char_length(message) <= 1000),
  status      public.interest_status not null default 'interested',
  created_at  timestamptz not null default now(),
  unique (deal_id, realtor_id)
);
grant select, update on public.deal_interests to authenticated;
grant all on public.deal_interests to service_role;
create index deal_interests_deal_idx on public.deal_interests (deal_id);

create table public.matches (
  id            uuid primary key default gen_random_uuid(),
  deal_id       uuid not null references public.deals (id) on delete cascade,
  investor_id   uuid not null references public.profiles (id) on delete cascade,
  realtor_id    uuid not null references public.profiles (id) on delete cascade,
  interest_id   uuid not null references public.deal_interests (id) on delete cascade,
  status        public.match_status not null default 'active',
  investor_outcome      public.match_outcome,
  investor_reported_at  timestamptz,
  realtor_outcome       public.match_outcome,
  realtor_reported_at   timestamptz,
  resolved_by_admin     boolean not null default false,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);
grant select on public.matches to authenticated;
grant all on public.matches to service_role;
create unique index matches_one_active_per_deal on public.matches (deal_id) where status = 'active';

-- ───────── Reviews ─────────
create table public.reviews (
  id                 uuid primary key default gen_random_uuid(),
  match_id           uuid not null references public.matches (id) on delete cascade,
  reviewer_id        uuid not null references public.profiles (id) on delete cascade,
  reviewee_id        uuid not null references public.profiles (id) on delete cascade,
  state              text not null check (public.is_valid_us_state(state)),
  rating             smallint not null check (rating between 1 and 5),
  communication      smallint check (communication between 1 and 5),
  contract_accuracy  smallint check (contract_accuracy between 1 and 5),
  speed_to_close     smallint check (speed_to_close between 1 and 5),
  market_knowledge   smallint check (market_knowledge between 1 and 5),
  body               text check (char_length(body) <= 3000),
  is_flagged         boolean not null default false,
  flag_reason        text,
  hidden             boolean not null default false,
  created_at         timestamptz not null default now(),
  unique (match_id, reviewer_id),
  check (reviewer_id <> reviewee_id)
);
grant select, insert, update on public.reviews to authenticated;
grant all on public.reviews to service_role;
create index reviews_reviewee_idx on public.reviews (reviewee_id) where not hidden;

create or replace function public.validate_review()
returns trigger language plpgsql set search_path = public as $$
declare m public.matches;
begin
  select * into m from public.matches where id = new.match_id;
  if not (
    (new.reviewer_id = m.investor_id and new.reviewee_id = m.realtor_id) or
    (new.reviewer_id = m.realtor_id and new.reviewee_id = m.investor_id)
  ) then
    raise exception 'Reviews can only be left between the two parties of a match';
  end if;
  new.state := (select state from public.deals where id = m.deal_id);
  return new;
end;
$$;
create trigger reviews_validate before insert on public.reviews
  for each row execute function public.validate_review();

create or replace function public.protect_review_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user <> 'authenticated' or public.is_admin() then
    return new;
  end if;
  if new.hidden is distinct from old.hidden
     or new.rating is distinct from old.rating
     or new.body is distinct from old.body
     or new.communication is distinct from old.communication
     or new.contract_accuracy is distinct from old.contract_accuracy
     or new.speed_to_close is distinct from old.speed_to_close
     or new.market_knowledge is distinct from old.market_knowledge then
    raise exception 'Not allowed to modify this review';
  end if;
  return new;
end;
$$;
create trigger reviews_protect before update on public.reviews
  for each row execute function public.protect_review_columns();

create view public.rating_summaries with (security_invoker = false) as
select
  reviewee_id as user_id,
  count(*)::int                             as review_count,
  round(avg(rating)::numeric, 2)            as avg_rating,
  round(avg(communication)::numeric, 2)     as avg_communication,
  round(avg(contract_accuracy)::numeric, 2) as avg_contract_accuracy,
  round(avg(speed_to_close)::numeric, 2)    as avg_speed_to_close,
  round(avg(market_knowledge)::numeric, 2)  as avg_market_knowledge
from public.reviews
where not hidden
group by reviewee_id;

create view public.rating_summaries_by_state with (security_invoker = false) as
select reviewee_id as user_id, state, count(*)::int as review_count, round(avg(rating)::numeric, 2) as avg_rating
from public.reviews
where not hidden
group by reviewee_id, state;

create view public.public_profiles with (security_invoker = false) as
select p.id, p.role, p.first_name, p.last_name, p.company_name, p.avatar_url, p.brokerage_name,
       p.verification_status, p.markets, p.license_state, p.bio, p.created_at, p.services,
       s.avg_rating, coalesce(s.review_count, 0) as review_count,
       (select count(*) from public.matches m
         where m.status = 'completed' and p.id in (m.investor_id, m.realtor_id))::int as closed_deals,
       (select count(*) from public.matches m
         where m.status = 'cancelled' and p.id in (m.investor_id, m.realtor_id))::int as cancelled_deals,
       case when p.role = 'realtor' then p.license_number end as license_number
from public.profiles p
left join public.rating_summaries s on s.user_id = p.id;

grant select on public.rating_summaries, public.rating_summaries_by_state, public.public_profiles to authenticated;
grant all on public.rating_summaries, public.rating_summaries_by_state, public.public_profiles to service_role;

create or replace function public.member_track_record(p_user uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  with mine as (
    select m.*, case when m.investor_id = p_user then m.realtor_id else m.investor_id end as counterparty_id
    from public.matches m
    where p_user in (m.investor_id, m.realtor_id)
  ), closed as (
    select m.id as match_id, m.completed_at, m.counterparty_id, d.id as deal_id, d.title, d.city, d.state, d.agent_need
    from mine m join public.deals d on d.id = m.deal_id
    where m.status = 'completed'
  )
  select jsonb_build_object(
    'completed_deals',           (select count(*) from closed),
    'cancelled_deals',           (select count(*) from mine where status = 'cancelled'),
    'as_listing',                (select count(*) from closed where agent_need = 'listing_agent'),
    'as_buyers',                 (select count(*) from closed where agent_need = 'buyers_agent'),
    'counterparties_worked_with', (select count(distinct counterparty_id) from closed),
    'active_matches',            (select count(*) from mine where status = 'active'),
    'states', coalesce((select jsonb_agg(jsonb_build_object('state', state, 'count', n) order by n desc, state)
                        from (select state, count(*) as n from closed group by state) s), '[]'::jsonb),
    'recent', coalesce((select jsonb_agg(jsonb_build_object(
                          'match_id', c.match_id, 'deal_id', c.deal_id, 'title', c.title, 'city', c.city,
                          'state', c.state, 'agent_need', c.agent_need, 'closed_at', c.completed_at,
                          'counterparty_id', c.counterparty_id) order by c.completed_at desc)
                        from (select * from closed order by completed_at desc limit 10) c), '[]'::jsonb)
  )
  where auth.uid() is not null;
$$;

-- ───────── Blocks ─────────
create table public.blocked_users (
  id          uuid primary key default gen_random_uuid(),
  blocker_id  uuid not null references public.profiles (id) on delete cascade,
  blocked_id  uuid not null references public.profiles (id) on delete cascade,
  deal_id     uuid references public.deals (id) on delete cascade,
  reason      text,
  created_at  timestamptz not null default now(),
  check (blocker_id <> blocked_id)
);
grant select, insert, delete on public.blocked_users to authenticated;
grant all on public.blocked_users to service_role;
create unique index blocked_users_unique
  on public.blocked_users (blocker_id, blocked_id, coalesce(deal_id, '00000000-0000-0000-0000-000000000000'::uuid));

create or replace function public.is_blocked_from_deal(viewer uuid, d public.deals)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocked_users b
    where b.blocker_id = d.investor_id and b.blocked_id = viewer
      and (b.deal_id is null or b.deal_id = d.id)
  );
$$;

-- ───────── Notifications ─────────
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  title       text not null,
  body        text,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
create index notifications_user_unread_idx on public.notifications (user_id) where read_at is null;

create or replace function public.notify(uid uuid, t text, b text, l text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, title, body, link) values (uid, t, b, l);
$$;
revoke execute on function public.notify(uuid, text, text, text) from public, anon, authenticated;

create or replace function public.notify_realtors_of_deal(d public.deals)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, title, body, link)
  select p.id,
         case d.agent_need when 'buyers_agent' then 'Buyer''s agent needed in ' else 'Listing agent needed in ' end
           || d.city || ', ' || d.state,
         d.title, '/deals/' || d.id
  from public.profiles p
  where p.role = 'realtor' and p.verification_status = 'verified'
    and (p.license_state = d.state or d.state = any (p.markets))
    and not public.is_blocked_from_deal(p.id, d);
$$;
revoke execute on function public.notify_realtors_of_deal(public.deals) from public, anon, authenticated;

-- ───────── Workflow RPCs ─────────
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
    investor_id, agent_need, title, address_line, city, state, zip, property_type,
    beds, baths, sqft, asking_price, arv, terms, description, status
  ) values (
    auth.uid(), coalesce(payload ->> 'agent_need', 'listing_agent')::public.agent_need, payload ->> 'title', payload ->> 'address_line', payload ->> 'city', payload ->> 'state',
    nullif(payload ->> 'zip', ''), coalesce(payload ->> 'property_type', 'single_family'),
    (payload ->> 'beds')::numeric, (payload ->> 'baths')::numeric, (payload ->> 'sqft')::int,
    (payload ->> 'asking_price')::numeric, (payload ->> 'arv')::numeric,
    payload ->> 'terms', payload ->> 'description', 'live'
  ) returning * into d;
  perform public.notify_realtors_of_deal(d);
  return d;
end;
$$;

-- Google sign-ups can't carry role metadata, so the app claims it right after sign-up.
create or replace function public.claim_role(p_role public.user_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_role not in ('investor', 'realtor') then raise exception 'Invalid role'; end if;
  update public.profiles p set role = p_role
  where p.id = auth.uid()
    and p.role <> 'admin'
    and p.license_number is null
    and p.created_at > now() - interval '1 hour'
    and not exists (select 1 from public.deals where investor_id = p.id)
    and not exists (select 1 from public.deal_interests where realtor_id = p.id);
end;
$$;

-- Until Stripe is connected: an investor can start the free 14-day trial once.
create or replace function public.start_trial()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
     set subscription_status = 'trialing', trial_ends_at = now() + interval '14 days'
   where id = auth.uid() and role = 'investor' and subscription_status = 'none' and trial_ends_at is null;
end;
$$;

create or replace function public.express_interest(p_deal_id uuid, p_message text default null)
returns public.deal_interests language plpgsql security definer set search_path = public as $$
declare d public.deals; me public.profiles; i public.deal_interests;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.role <> 'realtor' then raise exception 'Only realtors can express interest'; end if;
  if me.verification_status <> 'verified' then raise exception 'Add your license number to your profile first'; end if;
  if not public.has_accepted_terms(me.id) then raise exception 'Accept the Professional Conduct Agreement first'; end if;
  select * into d from public.deals where id = p_deal_id;
  if d.status <> 'live' then raise exception 'This deal is not accepting interest'; end if;
  if public.is_blocked_from_deal(me.id, d) then raise exception 'This deal is not available'; end if;
  insert into public.deal_interests (deal_id, realtor_id, message)
  values (p_deal_id, me.id, p_message) returning * into i;
  perform public.notify(d.investor_id, 'New realtor interest',
    coalesce(me.first_name, 'A realtor') || ' is interested in ' || d.title, '/deals/' || d.id);
  return i;
end;
$$;

create or replace function public.accept_interest(p_interest_id uuid)
returns public.matches language plpgsql security definer set search_path = public as $$
declare i public.deal_interests; d public.deals; m public.matches;
begin
  select * into i from public.deal_interests where id = p_interest_id;
  select * into d from public.deals where id = i.deal_id;
  if d.investor_id <> auth.uid() then raise exception 'Not your deal'; end if;
  if d.status <> 'live' then raise exception 'Deal is not live'; end if;
  update public.deal_interests set status = 'accepted' where id = i.id;
  update public.deal_interests set status = 'declined'
    where deal_id = d.id and id <> i.id and status = 'interested';
  update public.deals set status = 'matched' where id = d.id;
  insert into public.matches (deal_id, investor_id, realtor_id, interest_id)
  values (d.id, d.investor_id, i.realtor_id, i.id) returning * into m;
  perform public.notify(i.realtor_id, 'You''ve been matched!', d.title, '/deals/' || d.id);
  return m;
end;
$$;

create or replace function public.decline_interest(p_interest_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.deal_interests i set status = 'declined'
  from public.deals d
  where i.id = p_interest_id and d.id = i.deal_id and d.investor_id = auth.uid();
end;
$$;

create or replace function public.finalize_match(p_match_id uuid, p_outcome public.match_outcome, p_by_admin boolean)
returns void language plpgsql security definer set search_path = public as $$
declare m public.matches;
begin
  update public.matches set
    status = case p_outcome when 'sold' then 'completed' else 'cancelled' end::public.match_status,
    completed_at = now(),
    resolved_by_admin = p_by_admin
  where id = p_match_id and status = 'active'
  returning * into m;
  if m.id is null then raise exception 'This match is already closed'; end if;
  update public.deals set
    status = case p_outcome when 'sold' then 'sold' else 'live' end::public.deal_status,
    sold_at = case p_outcome when 'sold' then now() else null end
  where id = m.deal_id;
  perform public.notify(m.investor_id,
    case p_outcome when 'sold' then 'Deal confirmed sold — leave a review' else 'Match confirmed cancelled' end,
    null, '/deals/' || m.deal_id);
  perform public.notify(m.realtor_id,
    case p_outcome when 'sold' then 'Deal confirmed sold — leave a review' else 'Match confirmed cancelled' end,
    null, '/deals/' || m.deal_id);
end;
$$;
revoke execute on function public.finalize_match(uuid, public.match_outcome, boolean) from public, anon, authenticated;

create or replace function public.report_match_outcome(p_match_id uuid, p_outcome public.match_outcome)
returns void language plpgsql security definer set search_path = public as $$
declare m public.matches; me uuid := auth.uid(); other uuid;
begin
  select * into m from public.matches where id = p_match_id;
  if m.id is null or me not in (m.investor_id, m.realtor_id) then raise exception 'Not your match'; end if;
  if m.status <> 'active' then raise exception 'This match is already closed'; end if;
  if me = m.investor_id then
    update public.matches set investor_outcome = p_outcome, investor_reported_at = now() where id = m.id returning * into m;
    other := m.realtor_id;
  else
    update public.matches set realtor_outcome = p_outcome, realtor_reported_at = now() where id = m.id returning * into m;
    other := m.investor_id;
  end if;
  if m.investor_outcome is not null and m.investor_outcome = m.realtor_outcome then
    perform public.finalize_match(m.id, p_outcome, false);
  elsif m.investor_outcome is not null and m.realtor_outcome is not null then
    perform public.notify(other, 'Outcome disagreement',
      'You and your match reported different outcomes. An admin will review.', '/deals/' || m.deal_id);
    insert into public.notifications (user_id, title, body, link)
    select id, 'Match outcome disputed', 'Investor and realtor reported different outcomes.', '/admin'
    from public.profiles where role = 'admin';
  else
    perform public.notify(other,
      case p_outcome when 'sold' then 'Please confirm: deal marked sold' else 'Please confirm: match marked cancelled' end,
      'It closes once you confirm the same outcome.', '/deals/' || m.deal_id);
  end if;
end;
$$;

create or replace function public.admin_resolve_match(p_match_id uuid, p_outcome public.match_outcome)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  perform public.finalize_match(p_match_id, p_outcome, true);
end;
$$;

create or replace function public.browse_deals(
  p_state text default null,
  p_deal_id uuid default null,
  p_agent_need public.agent_need default null,
  p_city text default null
)
returns table (
  id uuid, investor_id uuid, agent_need public.agent_need, title text, city text, state text, zip text, property_type text,
  beds numeric, baths numeric, sqft int, asking_price numeric, arv numeric,
  terms text, description text, status public.deal_status, created_at timestamptz
) language sql stable security definer set search_path = public as $$
  select d.id, d.investor_id, d.agent_need, d.title, d.city, d.state, d.zip, d.property_type,
         d.beds, d.baths, d.sqft, d.asking_price, d.arv, d.terms, d.description, d.status, d.created_at
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

create or replace function public.interested_deals()
returns table (
  id uuid, investor_id uuid, agent_need public.agent_need, title text, address_line text, city text, state text, zip text, property_type text,
  beds numeric, baths numeric, sqft int, asking_price numeric, arv numeric,
  terms text, description text, status public.deal_status, rejection_reason text,
  sold_at timestamptz, created_at timestamptz
) language sql stable security definer set search_path = public as $$
  select d.id, d.investor_id, d.agent_need, d.title,
         case when exists (select 1 from public.matches m where m.deal_id = d.id and m.realtor_id = auth.uid())
              then d.address_line end,
         d.city, d.state, d.zip, d.property_type, d.beds, d.baths, d.sqft, d.asking_price, d.arv,
         d.terms, d.description, d.status, null::text, d.sold_at, d.created_at
  from public.deals d
  where exists (select 1 from public.deal_interests i where i.deal_id = d.id and i.realtor_id = auth.uid());
$$;

create or replace function public.match_contact(p_match_id uuid)
returns table (email text, phone text) language sql stable security definer set search_path = public as $$
  select p.email, p.phone
  from public.matches m
  join public.profiles p on p.id = case when m.investor_id = auth.uid() then m.realtor_id else m.investor_id end
  where m.id = p_match_id and auth.uid() in (m.investor_id, m.realtor_id);
$$;

create or replace function public.agents_in_state(p_state text)
returns table (
  id uuid, first_name text, last_name text, brokerage_name text, avatar_url text,
  avg_rating numeric, review_count int, services public.realtor_service[], closed_deals int, cancelled_deals int
) language sql stable security definer set search_path = public as $$
  select p.id, p.first_name, p.last_name, p.brokerage_name, p.avatar_url,
         s.avg_rating, coalesce(s.review_count, 0), p.services, pp.closed_deals, pp.cancelled_deals
  from public.profiles p
  join public.public_profiles pp on pp.id = p.id
  left join public.rating_summaries_by_state s on s.user_id = p.id and s.state = p_state
  where p.role = 'realtor' and p.verification_status = 'verified'
    and (p.license_state = p_state or p_state = any (p.markets))
    and auth.uid() is not null
  order by s.avg_rating desc nulls last, p.first_name;
$$;

create or replace function public.investor_metrics()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'deals_posted',        (select count(*) from deals where investor_id = auth.uid()),
    'live_deals',          (select count(*) from deals where investor_id = auth.uid() and status = 'live'),
    'realtors_interested', (select count(*) from deal_interests i join deals d on d.id = i.deal_id
                             where d.investor_id = auth.uid() and i.status <> 'withdrawn'),
    'matches_made',        (select count(*) from matches where investor_id = auth.uid()),
    'sold_deals',          (select count(*) from matches where investor_id = auth.uid() and status = 'completed'),
    'cancelled_matches',   (select count(*) from matches where investor_id = auth.uid() and status = 'cancelled'),
    'avg_rating',          (select avg_rating from rating_summaries where user_id = auth.uid()),
    'review_count',        (select coalesce(review_count, 0) from rating_summaries where user_id = auth.uid())
  );
$$;

-- ───────── Row Level Security ─────────
alter table public.profiles          enable row level security;
alter table public.terms_acceptances enable row level security;
alter table public.deals             enable row level security;
alter table public.deal_interests    enable row level security;
alter table public.matches           enable row level security;
alter table public.reviews           enable row level security;
alter table public.blocked_users     enable row level security;
alter table public.notifications     enable row level security;

create policy profiles_self_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin());

create policy terms_acceptances_read on public.terms_acceptances for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy deals_read on public.deals for select to authenticated using (
  investor_id = auth.uid() or public.is_admin()
  or exists (select 1 from public.matches m where m.deal_id = deals.id and m.realtor_id = auth.uid())
);
create policy deals_owner_update on public.deals for update to authenticated using (investor_id = auth.uid() or public.is_admin());

create policy interests_read on public.deal_interests for select to authenticated using (
  realtor_id = auth.uid() or public.is_admin()
  or exists (select 1 from public.deals d where d.id = deal_id and d.investor_id = auth.uid())
);
create policy interests_withdraw on public.deal_interests for update to authenticated
  using (realtor_id = auth.uid()) with check (status = 'withdrawn');

create policy matches_read on public.matches for select to authenticated
  using (investor_id = auth.uid() or realtor_id = auth.uid() or public.is_admin());

create policy reviews_read on public.reviews for select to authenticated using (
  not hidden or reviewer_id = auth.uid() or reviewee_id = auth.uid() or public.is_admin()
);
create policy reviews_insert on public.reviews for insert to authenticated with check (
  reviewer_id = auth.uid()
  and exists (select 1 from public.matches m where m.id = match_id and m.status = 'completed')
);
create policy reviews_flag on public.reviews for update to authenticated using (reviewee_id = auth.uid() or public.is_admin());

create policy blocks_read on public.blocked_users for select to authenticated using (blocker_id = auth.uid() or public.is_admin());
create policy blocks_insert on public.blocked_users for insert to authenticated with check (blocker_id = auth.uid());
create policy blocks_delete on public.blocked_users for delete to authenticated using (blocker_id = auth.uid());

create policy notifications_read on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated using (user_id = auth.uid());

alter publication supabase_realtime add table public.notifications, public.deal_interests;

-- ───────── Storage (profile photos, private bucket; files under <user id>/) ─────────
create policy "avatars owner write" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars owner update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars member read" on storage.objects for select to authenticated using (bucket_id = 'avatars');