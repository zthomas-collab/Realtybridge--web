CREATE OR REPLACE FUNCTION public.apply_for_opportunity(p_deal_id uuid,p_message text DEFAULT NULL,p_acknowledged boolean DEFAULT false) RETURNS public.deal_interests LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.deals; me public.profiles; i public.deal_interests;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
 SELECT * INTO me FROM public.profiles WHERE id=auth.uid();
 IF me.role IS DISTINCT FROM 'realtor'::public.user_role THEN RAISE EXCEPTION 'Only realtors can apply'; END IF;
 IF me.verification_status IS DISTINCT FROM 'verified'::public.verification_status THEN RAISE EXCEPTION 'Add your license number to your profile first'; END IF;
 IF NOT public.has_accepted_terms(me.id) THEN RAISE EXCEPTION 'Accept the Professional Conduct Agreement first'; END IF;
 IF NOT public.has_active_billing(me.id) THEN RAISE EXCEPTION 'Start your free trial or subscribe to express interest in deals'; END IF;
 SELECT * INTO d FROM public.deals WHERE id=p_deal_id FOR UPDATE;
 IF d.id IS NULL OR d.status<>'live' THEN RAISE EXCEPTION 'This deal is not accepting applications'; END IF;
 IF public.is_blocked_from_deal(me.id,d) THEN RAISE EXCEPTION 'This deal is not available'; END IF;
 IF d.referral_required THEN
  IF NOT coalesce(p_acknowledged,false) THEN RAISE EXCEPTION 'Acknowledge the 25%% brokerage referral before applying'; END IF;
  IF NOT (coalesce(me.license_state=d.state,false) OR d.state=ANY(me.markets)) OR EXISTS(SELECT 1 FROM unnest(me.counties) c WHERE c LIKE d.state||':%') AND NOT(coalesce(d.state||':'||d.county,'')=ANY(me.counties)) THEN RAISE EXCEPTION 'This opportunity is outside your service area'; END IF;
 END IF;
 IF char_length(coalesce(p_message,''))>1000 THEN RAISE EXCEPTION 'Application note must be 1000 characters or less'; END IF;
 INSERT INTO public.deal_interests(deal_id,realtor_id,message,referral_acknowledged_at,referral_acknowledgment) VALUES(d.id,me.id,p_message,CASE WHEN d.referral_required THEN now() END,CASE WHEN d.referral_required THEN 'I understand that, if selected for this listing opportunity, a 25% brokerage referral fee will be payable under a separate referral agreement.' END)
 ON CONFLICT(deal_id,realtor_id) DO UPDATE SET message=EXCLUDED.message,status='interested',created_at=now(),referral_acknowledged_at=EXCLUDED.referral_acknowledged_at,referral_acknowledgment=EXCLUDED.referral_acknowledgment WHERE deal_interests.status='withdrawn' RETURNING * INTO i;
 IF i.id IS NULL THEN RAISE EXCEPTION 'You have already applied for this opportunity'; END IF;
 PERFORM public.notify(d.investor_id,CASE WHEN d.referral_required THEN 'New realtor application' ELSE 'New realtor interest' END,coalesce(me.first_name,'A realtor')||' applied for '||d.title,'/deals/'||d.id); RETURN i;
END $$;