ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS complimentary boolean NOT NULL DEFAULT false;

CREATE TABLE public.complimentary_grants (
  email text PRIMARY KEY,
  granted_by uuid REFERENCES public.profiles(id),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.complimentary_grants TO authenticated;
GRANT ALL ON public.complimentary_grants TO service_role;
ALTER TABLE public.complimentary_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY comp_admin_read ON public.complimentary_grants FOR SELECT TO authenticated USING (public.is_admin());

-- protect the new flag from self-edit
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
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
     or new.current_period_end is distinct from old.current_period_end
     or new.complimentary is distinct from old.complimentary then
    raise exception 'Not allowed to modify protected profile fields';
  end if;
  return new;
end;
$$;

-- new sign-ups pick up a pending free grant for their email
CREATE OR REPLACE FUNCTION public.apply_complimentary_grant()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
begin
  if exists (select 1 from public.complimentary_grants g where g.email = lower(new.email)) then
    new.complimentary := true;
  end if;
  return new;
end;
$$;
CREATE TRIGGER profiles_apply_complimentary BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.apply_complimentary_grant();

CREATE OR REPLACE FUNCTION public.admin_grant_free(p_email text, p_note text DEFAULT NULL)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
declare e text := lower(trim(p_email));
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Enter a valid email'; end if;
  insert into public.complimentary_grants(email, granted_by, note) values (e, auth.uid(), p_note)
    on conflict (email) do update set note = excluded.note;
  update public.profiles set complimentary = true where lower(email) = e;
  perform public.notify(id, 'You have free access', 'An admin gave your account free access to post deals.', '/dashboard')
    from public.profiles where lower(email) = e;
end;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_free(p_email text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
declare e text := lower(trim(p_email));
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  delete from public.complimentary_grants where email = e;
  update public.profiles set complimentary = false where lower(email) = e;
end;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_grant_free(text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_free(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_grant_free(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_free(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_post_deal(uid uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid
      and p.role = 'investor'
      and public.has_accepted_terms(p.id)
      and p.first_name is not null and p.last_name is not null and p.phone is not null
      and cardinality(p.markets) > 0
      and (
        p.complimentary
        or p.subscription_status = 'active'
        or (p.subscription_status = 'trialing' and p.trial_ends_at > now())
      )
  );
$$;