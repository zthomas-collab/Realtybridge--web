ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contractor_services text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  requested text := coalesce(new.raw_user_meta_data ->> 'role', 'investor');
begin
  insert into public.profiles (id, email, role, first_name, last_name, avatar_url)
  values (
    new.id, new.email,
    case when requested = 'realtor' then 'realtor'::public.user_role
         when requested = 'contractor' then 'contractor'::public.user_role
         else 'investor'::public.user_role end,
    coalesce(new.raw_user_meta_data ->> 'given_name', new.raw_user_meta_data ->> 'first_name'),
    coalesce(new.raw_user_meta_data ->> 'family_name', new.raw_user_meta_data ->> 'last_name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.claim_role(p_role user_role)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if p_role not in ('investor', 'realtor', 'contractor') then raise exception 'Invalid role'; end if;
  update public.profiles p set role = p_role
  where p.id = auth.uid()
    and p.role <> 'admin'
    and not p.complimentary
    and p.license_number is null
    and p.created_at > now() - interval '1 hour'
    and not exists (select 1 from public.deals where investor_id = p.id)
    and not exists (select 1 from public.deal_interests where realtor_id = p.id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.start_trial()
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  update public.profiles set subscription_status = 'trialing', trial_ends_at = now() + interval '14 days'
   where id = auth.uid() and role in ('realtor', 'contractor') and subscription_status = 'none' and trial_ends_at is null;
end;
$function$;

-- Paying (or trialing) contractors who cover the deal's state/county; visible to the deal's investor, its matched realtor, and admins.
CREATE OR REPLACE FUNCTION public.contractors_for_deal(p_deal_id uuid)
 RETURNS TABLE(id uuid, first_name text, last_name text, company_name text, avatar_url text, email text, phone text, website text, contractor_services text[], counties text[], bio text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
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
     where p.role = 'contractor'
       and public.has_active_billing(p.id)
       and d.state = any (p.markets)
       and (d.county is null
            or not exists (select 1 from unnest(p.counties) c where c like d.state || ':%')
            or (d.state || ':' || d.county) = any (p.counties))
     order by (d.county is not null and (d.state || ':' || d.county) = any (p.counties)) desc, p.company_name nulls last, p.last_name;
end;
$function$;
REVOKE ALL ON FUNCTION public.contractors_for_deal(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.contractors_for_deal(uuid) TO authenticated;