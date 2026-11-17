ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS grandfathered_premium boolean NOT NULL DEFAULT false;
UPDATE public.profiles SET grandfathered_premium = true
 WHERE 'realtor' = ANY(roles) AND (complimentary OR subscription_status IN ('active','trialing'));

CREATE OR REPLACE FUNCTION public.protect_grandfathered_premium() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF current_user = 'authenticated' AND NOT public.is_admin() AND new.grandfathered_premium IS DISTINCT FROM old.grandfathered_premium THEN
    RAISE EXCEPTION 'Not allowed to modify protected profile fields';
  END IF;
  RETURN new;
END $$;
DROP TRIGGER IF EXISTS protect_grandfathered_premium ON public.profiles;
CREATE TRIGGER protect_grandfathered_premium BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_grandfathered_premium();

CREATE OR REPLACE FUNCTION public.has_active_billing(uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select exists (select 1 from public.profiles p where p.id = uid and (
    p.complimentary or p.grandfathered_premium
    or ((p.subscription_status = 'active' or (p.subscription_status = 'trialing' and p.trial_ends_at > now()) or (p.subscription_status in ('canceled','past_due') and p.current_period_end > now()))
        and (p.stripe_subscription_id is null or p.billing_plan is null
             or p.billing_plan in ('investor_monthly','realtor_yearly')
             or public.required_plan(p.roles) is distinct from 'investor_monthly'))));
$$;

CREATE OR REPLACE FUNCTION public.can_access_platform(uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
 SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = uid AND (
   p.role = 'admin' OR 'admin' = ANY(p.roles)
   OR 'realtor' = ANY(p.roles)
   OR NOT (p.roles && ARRAY['realtor','contractor']::public.user_role[])
   OR public.has_active_billing(p.id)));
$$;

CREATE OR REPLACE FUNCTION public.browse_deals(p_state text DEFAULT NULL::text, p_deal_id uuid DEFAULT NULL::uuid, p_agent_need agent_need DEFAULT NULL::agent_need, p_city text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, investor_id uuid, agent_need agent_need, title text, city text, state text, zip text, property_type text, deal_type text, beds numeric, baths numeric, sqft integer, asking_price numeric, arv numeric, terms text, description text, status deal_status, created_at timestamp with time zone, county text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE pro boolean;
BEGIN PERFORM public.require_platform_access();
 pro := public.has_active_billing(auth.uid()) OR public.is_admin();
 RETURN QUERY
  select d.id,
         case when pro then d.investor_id else null end,
         d.agent_need,
         case when pro then d.title else initcap(d.property_type) || ' opportunity in ' || d.city end,
         d.city, d.state, d.zip, d.property_type, d.deal_type,
         case when pro then d.beds end, case when pro then d.baths end, case when pro then d.sqft end,
         case when pro then d.asking_price end, case when pro then d.arv end, case when pro then d.terms end,
         case when pro then d.description else left(coalesce(d.description,''), 120) || case when length(coalesce(d.description,'')) > 120 then '…' else '' end end,
         d.status, d.created_at, d.county
  from public.deals d
  where d.status = 'live'
    and (p_state is null or d.state = p_state)
    and (p_deal_id is null or d.id = p_deal_id)
    and (p_agent_need is null or d.agent_need = p_agent_need)
    and (nullif(trim(p_city), '') is null or d.city ilike replace(replace(trim(p_city), '%', ''), '_', '') || '%')
    and d.investor_id <> auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'realtor' and p.verification_status = 'verified')
    and not public.is_blocked_from_deal(auth.uid(), d)
  order by d.created_at desc; END;$function$;

CREATE OR REPLACE FUNCTION public.interest_investor_contact(p_deal_id uuid) RETURNS TABLE(email text, phone text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  PERFORM public.require_platform_access();
  IF NOT public.has_active_billing(auth.uid()) THEN RETURN; END IF;
  RETURN QUERY
  SELECT p.email, p.phone FROM public.deals d JOIN public.profiles p ON p.id = d.investor_id
  WHERE d.id = p_deal_id
    AND EXISTS (SELECT 1 FROM public.profiles me WHERE me.id = auth.uid() AND me.role = 'realtor' AND me.verification_status = 'verified')
    AND NOT public.is_blocked_from_deal(auth.uid(), d)
    AND (EXISTS (SELECT 1 FROM public.browse_deals(p_deal_id => p_deal_id) visible WHERE visible.id = d.id)
      OR EXISTS (SELECT 1 FROM public.deal_interests i WHERE i.deal_id = d.id AND i.realtor_id = auth.uid() AND i.status <> 'withdrawn')
      OR EXISTS (SELECT 1 FROM public.matches m WHERE m.deal_id = d.id AND m.realtor_id = auth.uid()));
END; $function$;

CREATE OR REPLACE FUNCTION public.match_contact(p_match_id uuid) RETURNS TABLE(email text, phone text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN PERFORM public.require_platform_access(); RETURN QUERY
  select p.email, p.phone from public.matches m
  join public.profiles p on p.id = case when m.investor_id = auth.uid() then m.realtor_id else m.investor_id end
  where m.id = p_match_id and auth.uid() in (m.investor_id, m.realtor_id)
    and (public.has_active_billing(m.realtor_id) or public.is_admin()); END; $function$;

CREATE OR REPLACE FUNCTION public.require_premium_message() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_active_billing(new.sender_id) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'RealtyBridge Pro is required to send messages';
  END IF;
  RETURN new;
END $$;
DROP TRIGGER IF EXISTS require_premium_message ON public.network_messages;
CREATE TRIGGER require_premium_message BEFORE INSERT ON public.network_messages FOR EACH ROW EXECUTE FUNCTION public.require_premium_message();