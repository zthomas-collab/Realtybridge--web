ALTER TABLE public.complimentary_grants ADD COLUMN IF NOT EXISTS role public.user_role NOT NULL DEFAULT 'realtor';

CREATE OR REPLACE FUNCTION public.apply_complimentary_grant()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare g public.complimentary_grants;
begin
  select * into g from public.complimentary_grants where email = lower(new.email);
  if g.email is not null then
    new.complimentary := true;
    if new.role <> 'admin' then new.role := g.role; end if;
  end if;
  return new;
end;
$function$;

DROP FUNCTION IF EXISTS public.admin_grant_free(text, text);
CREATE OR REPLACE FUNCTION public.admin_grant_free(p_email text, p_note text DEFAULT NULL, p_role public.user_role DEFAULT 'realtor')
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare e text := lower(trim(p_email));
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_role not in ('realtor', 'contractor') then raise exception 'Free accounts are realtor or contractor accounts'; end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Enter a valid email'; end if;
  if exists (select 1 from public.profiles where lower(email) = e and role = 'admin') then
    raise exception 'That email belongs to an admin account';
  end if;
  insert into public.complimentary_grants(email, granted_by, note, role) values (e, auth.uid(), p_note, p_role)
    on conflict (email) do update set note = excluded.note, role = excluded.role;
  update public.profiles set complimentary = true, role = p_role where lower(email) = e and role <> 'admin';
  perform public.notify(id, 'You have free access',
    case when p_role = 'contractor' then 'An admin gave you a free contractor account — you''re listed on deals in your service area with no subscription.'
         else 'An admin gave you a free realtor account — send interest on deals with no subscription.' end,
    case when p_role = 'contractor' then '/profile' else '/browse' end)
    from public.profiles where lower(email) = e;
end;
$function$;
REVOKE ALL ON FUNCTION public.admin_grant_free(text, text, public.user_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_free(text, text, public.user_role) TO authenticated;