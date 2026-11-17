REVOKE EXECUTE ON FUNCTION public.can_post_deal(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_blocked_from_deal(uuid, public.deals) FROM anon;

CREATE OR REPLACE FUNCTION public.can_post_deal(uid uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
 SELECT (uid = auth.uid() OR public.is_admin() OR auth.role() = 'service_role')
   AND public.can_access_platform(uid) AND EXISTS (
   SELECT 1 FROM public.profiles p
   WHERE p.id=uid AND p.role='investor' AND public.has_accepted_terms(p.id)
   AND p.first_name IS NOT NULL AND p.last_name IS NOT NULL AND p.phone IS NOT NULL
   AND cardinality(p.markets)>0
 );
$function$;

CREATE OR REPLACE FUNCTION public.is_blocked_from_deal(viewer uuid, d deals)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select (viewer = auth.uid() or d.investor_id = auth.uid() or public.is_admin() or auth.role() = 'service_role')
   and exists (
    select 1 from public.blocked_users b
    where b.blocker_id = d.investor_id and b.blocked_id = viewer
      and (b.deal_id is null or b.deal_id = d.id)
  );
$function$;

CREATE OR REPLACE FUNCTION public.member_track_record(p_user uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE full_view boolean := (p_user = auth.uid() OR public.is_admin());
BEGIN PERFORM public.require_platform_access(); RETURN (
  with mine as (
    select m.*, case when m.investor_id = p_user then m.realtor_id else m.investor_id end as counterparty_id
    from public.matches m where p_user in (m.investor_id, m.realtor_id)
  ), closed as (
    select m.id as match_id, m.completed_at, m.counterparty_id, d.id as deal_id, d.title, d.city, d.state, d.agent_need
    from mine m join public.deals d on d.id = m.deal_id where m.status = 'completed'
  )
  select jsonb_build_object(
    'completed_deals', (select count(*) from closed),
    'cancelled_deals', (select count(*) from mine where status = 'cancelled'),
    'as_listing', (select count(*) from closed where agent_need = 'listing_agent'),
    'as_buyers', (select count(*) from closed where agent_need = 'buyers_agent'),
    'counterparties_worked_with', (select count(distinct counterparty_id) from closed),
    'active_matches', (select count(*) from mine where status = 'active'),
    'states', coalesce((select jsonb_agg(jsonb_build_object('state', state, 'count', n) order by n desc, state)
                        from (select state, count(*) as n from closed group by state) s), '[]'::jsonb),
    'recent', case when full_view then coalesce((select jsonb_agg(jsonb_build_object(
                          'match_id', c.match_id, 'deal_id', c.deal_id, 'title', c.title, 'city', c.city,
                          'state', c.state, 'agent_need', c.agent_need, 'closed_at', c.completed_at,
                          'counterparty_id', c.counterparty_id) order by c.completed_at desc)
                        from (select * from closed order by completed_at desc limit 10) c), '[]'::jsonb)
              else '[]'::jsonb end
  ) where auth.uid() is not null); END;$function$;

CREATE OR REPLACE FUNCTION public.sync_license_status()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
begin
  new.license_number := nullif(trim(new.license_number), '');
  if new.license_number is null then
    if new.role <> 'admin' then
      new.verification_status := 'not_submitted';
      new.verified_at := null;
    end if;
    return new;
  end if;
  if current_user <> 'authenticated' or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT'
     or new.license_number is distinct from old.license_number
     or new.license_state is distinct from old.license_state then
    new.verification_status := 'pending_review';
    new.verified_at := null;
    new.verification_note := null;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_review_license(p_user uuid, p_approve boolean, p_note text DEFAULT NULL)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update public.profiles set
    verification_status = case when p_approve then 'verified'::verification_status else 'action_needed'::verification_status end,
    verified_at = case when p_approve then now() else null end,
    verification_note = case when p_approve then null else left(p_note, 500) end
  where id = p_user and license_number is not null;
end;
$function$;
REVOKE EXECUTE ON FUNCTION public.admin_review_license(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_license(uuid, boolean, text) TO authenticated, service_role;