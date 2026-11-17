CREATE OR REPLACE FUNCTION public.can_access_platform(uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
 SELECT EXISTS (
   SELECT 1 FROM public.profiles p WHERE p.id = uid AND (
     p.role = 'admin' OR 'admin' = ANY(p.roles)
     OR NOT (p.roles && ARRAY['realtor','contractor']::public.user_role[])
     OR public.has_active_billing(p.id)
   )
 );
$$;
REVOKE ALL ON FUNCTION public.can_access_platform(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_platform(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.require_platform_access()
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_access_platform(auth.uid()) THEN
   RAISE EXCEPTION 'PAYWALL: Activate your subscription in Settings & Billing to enter RealtyBridge.' USING ERRCODE = '42501';
 END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.require_platform_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.require_platform_access() TO authenticated, service_role;

-- Restrictive policies combine with, rather than replace, existing ownership and privacy rules.
DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['deals','deal_interests','matches','blocked_users','reviews','notifications','realtor_listings','referral_agreements','network_profiles','network_referrals','network_responses','network_messages','network_agreements','network_agreement_history','network_activity','network_notifications','network_reports'] LOOP
   EXECUTE format('CREATE POLICY active_platform_required ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.can_access_platform(auth.uid())) WITH CHECK (public.can_access_platform(auth.uid()))',t);
 END LOOP;
END;
$$;

-- SECURITY DEFINER member RPCs bypass RLS, so enforce the same gate before their existing logic.
-- Preserve the signatures, defaults, security settings and current business logic verbatim.
DO $$
DECLARE f record; definition text; body text;
BEGIN
 FOR f IN
 SELECT p.oid,p.proname,p.prosrc,p.proretset,l.lanname
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE n.nspname='public' AND p.proname = ANY(ARRAY[
 'post_deal','apply_for_opportunity','express_interest','accept_interest','decline_interest','report_match_outcome',
 'browse_deals','interested_deals','match_contact','interest_investor_contact','agents_in_state','investor_metrics',
 'contractors_for_deal','deals_for_contractor','realtors_for_deal','listing_contacts','referral_flags','member_track_record',
 'network_action','network_members','network_admin_message_count','complete_referral_dashboard_item','update_referral_agreement','admin_resolve_match'
 ])
 LOOP
   definition := pg_get_functiondef(f.oid);
   IF f.lanname='plpgsql' THEN
     body := regexp_replace(f.prosrc,'\mBEGIN\M','BEGIN PERFORM public.require_platform_access();','i');
   ELSIF f.lanname='sql' THEN
     body := regexp_replace(trim(f.prosrc),';\s*$','');
     IF f.proretset THEN
       body := 'BEGIN PERFORM public.require_platform_access(); RETURN QUERY ' || body || '; END;';
     ELSE
       body := 'BEGIN PERFORM public.require_platform_access(); RETURN (' || body || '); END;';
     END IF;
     definition := replace(definition,'LANGUAGE sql','LANGUAGE plpgsql');
   ELSE
     RAISE EXCEPTION 'Unsupported member function language: %',f.proname;
   END IF;
   IF body=f.prosrc THEN RAISE EXCEPTION 'Unable to guard member function: %',f.proname; END IF;
   definition := replace(definition,'AS $function$' || f.prosrc || '$function$','AS $function$' || body || '$function$');
   EXECUTE definition;
 END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_post_deal(uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
 SELECT public.can_access_platform(uid) AND EXISTS (
   SELECT 1 FROM public.profiles p
   WHERE p.id=uid AND p.role='investor' AND public.has_accepted_terms(p.id)
   AND p.first_name IS NOT NULL AND p.last_name IS NOT NULL AND p.phone IS NOT NULL
   AND cardinality(p.markets)>0
 );
$$;