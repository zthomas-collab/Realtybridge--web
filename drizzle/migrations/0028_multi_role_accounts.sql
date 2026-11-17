-- Accounts can hold several member roles; profiles.role stays the active role used by the app.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS roles public.user_role[] NOT NULL DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_plan text;
UPDATE public.profiles SET roles = ARRAY[role] WHERE role <> 'admin' AND cardinality(roles) = 0;
UPDATE public.profiles SET billing_plan = CASE role WHEN 'realtor' THEN 'investor_monthly' WHEN 'contractor' THEN 'contractor_monthly' END
  WHERE stripe_subscription_id IS NOT NULL AND billing_plan IS NULL;

CREATE OR REPLACE FUNCTION public.normalize_roles(p_roles public.user_role[])
RETURNS public.user_role[] LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT coalesce(array_agg(r ORDER BY r), '{}') FROM (SELECT DISTINCT r FROM unnest(p_roles) r WHERE r <> 'admin') s;
$$;

-- Price lookup key an account's roles require: any Realtor role = $25 plan, Contractor without Realtor = $6 plan, Investor only = free.
CREATE OR REPLACE FUNCTION public.required_plan(p_roles public.user_role[])
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE WHEN 'realtor' = any(p_roles) THEN 'investor_monthly'
              WHEN 'contractor' = any(p_roles) THEN 'contractor_monthly' END;
$$;

CREATE OR REPLACE FUNCTION public.profiles_default_roles()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
begin
  if new.role <> 'admin' and not (new.role = any(new.roles)) then
    new.roles := public.normalize_roles(new.roles || new.role);
  end if;
  return new;
end; $$;
DROP TRIGGER IF EXISTS profiles_default_roles ON public.profiles;
CREATE TRIGGER profiles_default_roles BEFORE INSERT OR UPDATE OF role, roles ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_default_roles();

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  requested text := coalesce(new.raw_user_meta_data ->> 'role', 'investor');
  extra public.user_role[] := '{}';
begin
  if jsonb_typeof(new.raw_user_meta_data -> 'roles') = 'array' then
    select coalesce(array_agg(x::public.user_role), '{}') into extra
      from jsonb_array_elements_text(new.raw_user_meta_data -> 'roles') x
     where x in ('investor', 'realtor', 'contractor');
  end if;
  insert into public.profiles (id, email, role, roles, first_name, last_name, avatar_url)
  values (
    new.id, new.email,
    case when requested = 'realtor' then 'realtor'::public.user_role
         when requested = 'contractor' then 'contractor'::public.user_role
         else 'investor'::public.user_role end,
    public.normalize_roles(extra),
    coalesce(new.raw_user_meta_data ->> 'given_name', new.raw_user_meta_data ->> 'first_name'),
    coalesce(new.raw_user_meta_data ->> 'family_name', new.raw_user_meta_data ->> 'last_name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.apply_complimentary_grant()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare g public.complimentary_grants;
begin
  select * into g from public.complimentary_grants where email = lower(new.email);
  if g.email is not null then
    new.complimentary := true;
    if new.role <> 'admin' then
      new.role := g.role;
      new.roles := public.normalize_roles(new.roles || g.role);
    end if;
  end if;
  return new;
end;
$function$;

-- Paid features need a subscription whose plan covers the account's roles (complimentary and app trials always cover).
CREATE OR REPLACE FUNCTION public.has_active_billing(uid uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.profiles p where p.id = uid and (
    p.complimentary
    or ((p.subscription_status = 'active' or (p.subscription_status = 'trialing' and p.trial_ends_at > now()))
        and (p.stripe_subscription_id is null or p.billing_plan is null
             or p.billing_plan = 'investor_monthly'
             or public.required_plan(p.roles) is distinct from 'investor_monthly'))));
$function$;

CREATE OR REPLACE FUNCTION public.start_trial()
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  update public.profiles set subscription_status = 'trialing', trial_ends_at = now() + interval '14 days'
   where id = auth.uid() and public.required_plan(roles) is not null and subscription_status = 'none' and trial_ends_at is null;
end;
$function$;

-- Sign-up choice (any mix of Investor / Realtor / Contractor), only right after account creation.
CREATE OR REPLACE FUNCTION public.claim_roles(p_roles public.user_role[])
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare r public.user_role[] := public.normalize_roles(p_roles);
begin
  if cardinality(r) = 0 or 'admin' = any(p_roles) then raise exception 'Invalid role'; end if;
  update public.profiles p
     set roles = r,
         role = case when 'realtor' = any(r) then 'realtor'::public.user_role
                     when 'contractor' = any(r) then 'contractor'::public.user_role
                     else 'investor'::public.user_role end
   where p.id = auth.uid()
     and p.role <> 'admin'
     and not p.complimentary
     and p.license_number is null
     and p.created_at > now() - interval '1 hour'
     and not exists (select 1 from public.deals where investor_id = p.id)
     and not exists (select 1 from public.deal_interests where realtor_id = p.id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.claim_role(p_role user_role)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ begin perform public.claim_roles(array[p_role]); end; $function$;

-- Add another member profile to an existing account and switch to it.
CREATE OR REPLACE FUNCTION public.add_role(p_role public.user_role)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if p_role not in ('investor', 'realtor', 'contractor') then raise exception 'Invalid role'; end if;
  update public.profiles set roles = public.normalize_roles(roles || p_role), role = p_role
   where id = auth.uid() and role <> 'admin';
  if not found then raise exception 'Not allowed'; end if;
end;
$function$;

-- Switch which of the account's profiles is active.
CREATE OR REPLACE FUNCTION public.switch_role(p_role public.user_role)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  update public.profiles set role = p_role
   where id = auth.uid() and role <> 'admin' and p_role <> 'admin' and p_role = any(roles);
  if not found then raise exception 'That profile is not on your account'; end if;
end;
$function$;

GRANT EXECUTE ON FUNCTION public.claim_roles(public.user_role[]), public.add_role(public.user_role), public.switch_role(public.user_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_roles(public.user_role[]), public.add_role(public.user_role), public.switch_role(public.user_role) FROM anon, public;

CREATE OR REPLACE FUNCTION public.protect_profile_columns()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
begin
  if current_user <> 'authenticated' or public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.roles is distinct from old.roles
     or new.billing_plan is distinct from old.billing_plan
     or new.verification_status is distinct from old.verification_status
     or new.verified_at is distinct from old.verified_at
     or new.terms_version is distinct from old.terms_version
     or new.terms_accepted_at is distinct from old.terms_accepted_at
     or new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.stripe_subscription_id is distinct from old.stripe_subscription_id
     or new.subscription_status is distinct from old.subscription_status
     or new.trial_ends_at is distinct from old.trial_ends_at
     or new.current_period_end is distinct from old.current_period_end
     or new.complimentary is distinct from old.complimentary then
    raise exception 'Not allowed to modify protected profile fields';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.network_eligible(p_user uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$ SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_user AND 'realtor' = any(roles) AND nullif(trim(license_number),'') IS NOT NULL); $function$;

-- Lead matching and discovery reach every account holding the role, not just its active profile.
CREATE OR REPLACE FUNCTION public.notify_realtors_of_deal(d deals)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  insert into public.notifications (user_id, title, body, link)
  select p.id,
         case d.agent_need when 'buyers_agent' then 'Buyer''s agent needed in ' else 'Listing agent needed in ' end
           || coalesce(d.county || ', ', d.city || ', ') || d.state,
         d.title, '/deals/' || d.id
  from public.profiles p
  where 'realtor' = any(p.roles) and p.verification_status = 'verified'
    and (p.license_state = d.state or d.state = any (p.markets))
    and (
      d.county is null
      or not exists (select 1 from unnest(p.counties) c where c like d.state || ':%')
      or (d.state || ':' || d.county) = any (p.counties)
    )
    and not public.is_blocked_from_deal(p.id, d);
$function$;

CREATE OR REPLACE FUNCTION public.realtors_for_deal(p_deal_id uuid)
 RETURNS TABLE(id uuid, first_name text, last_name text, brokerage_name text, avatar_url text, avg_rating numeric, review_count integer, services realtor_service[], closed_deals integer, cancelled_deals integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE d public.deals;
BEGIN
 SELECT * INTO d FROM public.deals WHERE deals.id = p_deal_id AND investor_id = auth.uid();
 IF d.id IS NULL THEN RAISE EXCEPTION 'This deal is not available'; END IF;
 RETURN QUERY
 SELECT p.id, p.first_name, p.last_name, p.brokerage_name, p.avatar_url,
        s.avg_rating, coalesce(s.review_count, 0), p.services, pp.closed_deals, pp.cancelled_deals
 FROM public.profiles p
 JOIN public.public_profiles pp ON pp.id = p.id
 LEFT JOIN public.rating_summaries_by_state s ON s.user_id = p.id AND s.state = d.state
 WHERE 'realtor' = any(p.roles) AND p.verification_status = 'verified'
   AND (p.license_state = d.state OR d.state = ANY(p.markets))
   AND (d.county IS NULL
     OR NOT EXISTS (SELECT 1 FROM unnest(p.counties) c WHERE c LIKE d.state || ':%')
     OR (d.state || ':' || d.county) = ANY(p.counties))
   AND NOT public.is_blocked_from_deal(p.id, d)
 ORDER BY s.avg_rating DESC NULLS LAST, p.first_name, p.last_name, p.id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.agents_in_state(p_state text)
 RETURNS TABLE(id uuid, first_name text, last_name text, brokerage_name text, avatar_url text, avg_rating numeric, review_count integer, services realtor_service[], closed_deals integer, cancelled_deals integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.id, p.first_name, p.last_name, p.brokerage_name, p.avatar_url,
         s.avg_rating, coalesce(s.review_count, 0), p.services, pp.closed_deals, pp.cancelled_deals
  from public.profiles p
  join public.public_profiles pp on pp.id = p.id
  left join public.rating_summaries_by_state s on s.user_id = p.id and s.state = p_state
  where 'realtor' = any(p.roles) and p.verification_status = 'verified'
    and (p.license_state = p_state or p_state = any (p.markets))
    and auth.uid() is not null
  order by s.avg_rating desc nulls last, p.first_name;
$function$;

CREATE OR REPLACE FUNCTION public.contractors_for_deal(p_deal_id uuid)
 RETURNS TABLE(id uuid, first_name text, last_name text, company_name text, avatar_url text, email text, phone text, website text, contractor_services text[], counties text[], bio text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare d public.deals;
begin
  select * into d from public.deals where deals.id = p_deal_id;
  if d.id is null then return; end if;
  if not (d.investor_id = auth.uid() or public.is_admin()
          or exists (select 1 from public.matches m where m.deal_id = d.id and m.realtor_id = auth.uid() and m.status <> 'cancelled')) then
    return;
  end if;
  return query
    select p.id, p.first_name, p.last_name, p.company_name, p.avatar_url, p.email, p.phone, p.website, p.contractor_services, p.counties, p.bio
      from public.profiles p
     where 'contractor' = any(p.roles)
       and public.has_active_billing(p.id)
       and d.state = any (p.markets)
       and (d.county is null
            or not exists (select 1 from unnest(p.counties) c where c like d.state || ':%')
            or (d.state || ':' || d.county) = any (p.counties))
     order by (d.county is not null and (d.state || ':' || d.county) = any (p.counties)) desc, p.company_name nulls last, p.last_name;
end;
$function$;