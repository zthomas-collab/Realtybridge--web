CREATE OR REPLACE FUNCTION public.apply_complimentary_grant()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
begin
  if exists (select 1 from public.complimentary_grants g where g.email = lower(new.email)) then
    new.complimentary := true;
    if new.role <> 'admin' then new.role := 'realtor'; end if;
  end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.admin_grant_free(p_email text, p_note text DEFAULT NULL)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
declare e text := lower(trim(p_email));
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Enter a valid email'; end if;
  if exists (select 1 from public.profiles where lower(email) = e and role = 'admin') then
    raise exception 'That email belongs to an admin account';
  end if;
  insert into public.complimentary_grants(email, granted_by, note) values (e, auth.uid(), p_note)
    on conflict (email) do update set note = excluded.note;
  update public.profiles set complimentary = true, role = 'realtor' where lower(email) = e and role <> 'admin';
  perform public.notify(id, 'You have free access', 'An admin gave you a free realtor account — send interest on deals with no subscription.', '/browse')
    from public.profiles where lower(email) = e;
end;
$$;

-- A free (complimentary) account always stays a realtor, even if a different role is picked at sign-up.
CREATE OR REPLACE FUNCTION public.claim_role(p_role public.user_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_role not in ('investor', 'realtor') then raise exception 'Invalid role'; end if;
  update public.profiles p set role = p_role
  where p.id = auth.uid()
    and p.role <> 'admin'
    and not p.complimentary
    and p.license_number is null
    and p.created_at > now() - interval '1 hour'
    and not exists (select 1 from public.deals where investor_id = p.id)
    and not exists (select 1 from public.deal_interests where realtor_id = p.id);
end;
$$;