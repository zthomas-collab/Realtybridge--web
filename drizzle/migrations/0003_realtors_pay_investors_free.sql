CREATE OR REPLACE FUNCTION public.has_active_billing(uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select exists (select 1 from public.profiles p where p.id = uid and (p.complimentary or p.subscription_status = 'active' or (p.subscription_status = 'trialing' and p.trial_ends_at > now())));
$$;

CREATE OR REPLACE FUNCTION public.can_post_deal(uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role = 'investor' and public.has_accepted_terms(p.id)
      and p.first_name is not null and p.last_name is not null and p.phone is not null
      and cardinality(p.markets) > 0);
$$;

CREATE OR REPLACE FUNCTION public.express_interest(p_deal_id uuid, p_message text DEFAULT NULL::text)
 RETURNS deal_interests LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare d public.deals; me public.profiles; i public.deal_interests;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.role <> 'realtor' then raise exception 'Only realtors can express interest'; end if;
  if me.verification_status <> 'verified' then raise exception 'Add your license number to your profile first'; end if;
  if not public.has_accepted_terms(me.id) then raise exception 'Accept the Professional Conduct Agreement first'; end if;
  if not public.has_active_billing(me.id) then raise exception 'Start your free trial or subscribe to express interest in deals'; end if;
  select * into d from public.deals where id = p_deal_id;
  if d.status <> 'live' then raise exception 'This deal is not accepting interest'; end if;
  if public.is_blocked_from_deal(me.id, d) then raise exception 'This deal is not available'; end if;
  insert into public.deal_interests (deal_id, realtor_id, message)
  values (p_deal_id, me.id, p_message) returning * into i;
  perform public.notify(d.investor_id, 'New realtor interest',
    coalesce(me.first_name, 'A realtor') || ' is interested in ' || d.title, '/deals/' || d.id);
  return i;
end;
$function$;

CREATE OR REPLACE FUNCTION public.start_trial() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
begin
  update public.profiles set subscription_status = 'trialing', trial_ends_at = now() + interval '14 days'
   where id = auth.uid() and role = 'realtor' and subscription_status = 'none' and trial_ends_at is null;
end;
$$;