CREATE FUNCTION public.network_action(p_action text,p_payload jsonb DEFAULT '{}'::jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); r public.network_referrals; x public.network_responses; v_status text; rec record; content jsonb;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF p_action IN ('moderate','resolve_report') THEN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF p_action='resolve_report' THEN UPDATE public.network_reports SET resolved=true WHERE id=(p_payload->>'id')::uuid; RETURN '{}'::jsonb; END IF;
  SELECT * INTO r FROM public.network_referrals WHERE id=(p_payload->>'id')::uuid FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Referral unavailable'; END IF;
  UPDATE public.network_referrals SET hidden=(p_payload->>'hidden')::boolean,moderation_note=nullif(trim(p_payload->>'reason'),''),updated_at=now() WHERE id=r.id;
  INSERT INTO public.network_activity(referral_id,actor_id,event) VALUES(r.id,u,'realtor_network.moderated'); RETURN '{}'::jsonb;
 END IF;
 IF NOT public.network_eligible(u) THEN RAISE EXCEPTION 'A Realtor license number on file is required'; END IF;
 IF p_action='preferences' THEN
  INSERT INTO public.network_profiles(user_id,cities,zip_codes,primary_market,specialties,credentials,notify_area,notify_interest,notify_message,notify_connection,notify_status)
  VALUES(u,ARRAY(SELECT jsonb_array_elements_text(coalesce(p_payload->'cities','[]'))),ARRAY(SELECT jsonb_array_elements_text(coalesce(p_payload->'zip_codes','[]'))),p_payload->>'primary_market',ARRAY(SELECT jsonb_array_elements_text(coalesce(p_payload->'specialties','[]'))),p_payload->>'credentials',coalesce((p_payload->>'notify_area')::boolean,true),coalesce((p_payload->>'notify_interest')::boolean,true),coalesce((p_payload->>'notify_message')::boolean,true),coalesce((p_payload->>'notify_connection')::boolean,true),coalesce((p_payload->>'notify_status')::boolean,true))
  ON CONFLICT(user_id) DO UPDATE SET cities=excluded.cities,zip_codes=excluded.zip_codes,primary_market=excluded.primary_market,specialties=excluded.specialties,credentials=excluded.credentials,notify_area=excluded.notify_area,notify_interest=excluded.notify_interest,notify_message=excluded.notify_message,notify_connection=excluded.notify_connection,notify_status=excluded.notify_status;
  RETURN '{}'::jsonb;
 END IF;
 IF p_action='read_notifications' THEN UPDATE public.network_notifications SET read_at=now() WHERE user_id=u AND read_at IS NULL; RETURN '{}'::jsonb; END IF;
 IF p_action IN ('post','edit') THEN
  content:=p_payload->'input';
  IF p_action='edit' THEN SELECT * INTO r FROM public.network_referrals WHERE id=(p_payload->>'id')::uuid FOR UPDATE; IF r.id IS NULL OR r.owner_id<>u OR r.hidden THEN RAISE EXCEPTION 'Only the posting Realtor can edit this referral'; END IF; END IF;
  IF p_action='post' THEN
   INSERT INTO public.network_referrals(owner_id,referral_type,state,city,county,zip,property_type,min_price,max_price,description,preferred_experience,fee_offered,urgency)
   VALUES(u,content->>'referral_type',content->>'state',trim(content->>'city'),nullif(trim(content->>'county'),''),nullif(trim(content->>'zip'),''),content->>'property_type',(content->>'min_price')::numeric,(content->>'max_price')::numeric,trim(content->>'description'),trim(content->>'preferred_experience'),nullif(trim(content->>'fee_offered'),''),content->>'urgency') RETURNING * INTO r;
   INSERT INTO public.network_activity(referral_id,actor_id,event) VALUES(r.id,u,'realtor_network.posted');
   FOR rec IN SELECT p.id FROM public.profiles p WHERE p.id<>u AND public.network_area_match(p.id,r.state,r.city,r.county,r.zip) LOOP PERFORM public.network_notify(rec.id,r.id,'area',r.referral_type||' referral in '||r.city||', '||r.state); END LOOP;
  ELSE
   UPDATE public.network_referrals SET referral_type=content->>'referral_type',state=content->>'state',city=trim(content->>'city'),county=nullif(trim(content->>'county'),''),zip=nullif(trim(content->>'zip'),''),property_type=content->>'property_type',min_price=(content->>'min_price')::numeric,max_price=(content->>'max_price')::numeric,description=trim(content->>'description'),preferred_experience=trim(content->>'preferred_experience'),fee_offered=nullif(trim(content->>'fee_offered'),''),urgency=content->>'urgency',updated_at=now() WHERE id=r.id;
   INSERT INTO public.network_activity(referral_id,actor_id,event) VALUES(r.id,u,'realtor_network.edited');
  END IF;
  RETURN jsonb_build_object('id',r.id);
 END IF;
 IF p_action='message' AND p_payload ? 'response_id' THEN SELECT * INTO x FROM public.network_responses WHERE id=(p_payload->>'response_id')::uuid; SELECT * INTO r FROM public.network_referrals WHERE id=x.referral_id FOR UPDATE;
 ELSE SELECT * INTO r FROM public.network_referrals WHERE id=(p_payload->>'id')::uuid FOR UPDATE; END IF;
 IF r.id IS NULL OR r.hidden OR NOT public.network_can_read(r.id) THEN RAISE EXCEPTION 'Referral unavailable'; END IF;
 IF p_action IN ('interest','message') THEN
  IF x.id IS NULL THEN
   IF r.owner_id=u OR r.status NOT IN ('open','interested') THEN RAISE EXCEPTION 'This referral is not accepting new responses'; END IF;
   INSERT INTO public.network_responses(referral_id,realtor_id) VALUES(r.id,u) ON CONFLICT(referral_id,realtor_id) DO NOTHING;
   SELECT * INTO x FROM public.network_responses WHERE referral_id=r.id AND realtor_id=u;
  END IF;
  IF NOT public.network_thread_access(x.id) THEN RAISE EXCEPTION 'Private conversation'; END IF;
  IF p_action='interest' THEN
   IF r.status NOT IN ('open','interested') THEN RAISE EXCEPTION 'This referral is not accepting interest'; END IF;
   IF NOT x.interested THEN UPDATE public.network_responses SET interested=true WHERE id=x.id; UPDATE public.network_referrals SET status='interested',updated_at=now() WHERE id=r.id; PERFORM public.network_notify(r.owner_id,r.id,'interest','A Realtor is interested in your referral'); INSERT INTO public.network_activity(referral_id,actor_id,event) VALUES(r.id,u,'realtor_network.interest'); END IF;
  ELSE
   IF r.status IN ('cancelled','expired') THEN RAISE EXCEPTION 'Messaging is closed for this referral'; END IF;
   INSERT INTO public.network_messages(response_id,sender_id,body) VALUES(x.id,u,trim(p_payload->>'body'));
   PERFORM public.network_notify(CASE WHEN u=r.owner_id THEN x.realtor_id ELSE r.owner_id END,r.id,'message','New private Realtor Network message');
  END IF;
  RETURN jsonb_build_object('response_id',x.id);
 END IF;
 IF p_action='select' THEN
  IF r.owner_id<>u OR r.status NOT IN ('open','interested') THEN RAISE EXCEPTION 'Only the owner of an open referral can select a Realtor'; END IF;
  SELECT * INTO x FROM public.network_responses WHERE id=(p_payload->>'response_id')::uuid AND referral_id=r.id AND interested;
  IF x.id IS NULL OR NOT public.network_eligible(x.realtor_id) THEN RAISE EXCEPTION 'Choose an eligible interested Realtor'; END IF;
  UPDATE public.network_referrals SET selected_realtor_id=x.realtor_id,status='connected',updated_at=now() WHERE id=r.id;
  PERFORM public.network_notify(x.realtor_id,r.id,'connection','You were selected for a Realtor referral connection'); v_status:='connected';
 ELSIF p_action='status' THEN
  IF r.owner_id<>u THEN RAISE EXCEPTION 'Only the posting Realtor can change status'; END IF;
  v_status:=p_payload->>'status'; IF v_status IS NULL OR v_status NOT IN ('open','closed','cancelled','expired') THEN RAISE EXCEPTION 'Choose reopen, closed, cancelled or expired'; END IF;
  UPDATE public.network_referrals SET status=v_status,selected_realtor_id=CASE WHEN v_status='open' THEN NULL ELSE selected_realtor_id END,updated_at=now() WHERE id=r.id;
 ELSIF p_action='agreement' THEN
  IF r.status NOT IN ('connected','closed') OR (u<>r.owner_id AND u IS DISTINCT FROM r.selected_realtor_id) THEN RAISE EXCEPTION 'Only connected parties can record an agreement'; END IF;
  IF NOT coalesce((p_payload->>'brokerage_approved')::boolean,false) OR NOT coalesce((p_payload->>'licensing_confirmed')::boolean,false) OR nullif(trim(p_payload->>'reference'),'') IS NULL THEN RAISE EXCEPTION 'Confirm brokerage approval and licensing requirements and enter an agreement reference'; END IF;
  IF EXISTS(SELECT 1 FROM public.network_agreements WHERE referral_id=r.id) THEN RAISE EXCEPTION 'An agreement is already recorded'; END IF;
  INSERT INTO public.network_agreements(referral_id,recorded_by,reference,brokerage_approved,licensing_confirmed) VALUES(r.id,u,trim(p_payload->>'reference'),true,true); INSERT INTO public.network_activity(referral_id,actor_id,event) VALUES(r.id,u,'realtor_network.agreement_recorded'); RETURN '{}'::jsonb;
 ELSIF p_action='report' THEN
  INSERT INTO public.network_reports(referral_id,reporter_id,reported_user_id,reason) VALUES(r.id,u,CASE WHEN p_payload ? 'reported_user_id' THEN (p_payload->>'reported_user_id')::uuid ELSE r.owner_id END,trim(p_payload->>'reason')); RETURN '{}'::jsonb;
 ELSE RAISE EXCEPTION 'Unknown network action'; END IF;
 INSERT INTO public.network_activity(referral_id,actor_id,event) VALUES(r.id,u,'realtor_network.'||v_status);
 FOR rec IN SELECT DISTINCT realtor_id FROM public.network_responses WHERE referral_id=r.id LOOP PERFORM public.network_notify(rec.realtor_id,r.id,'status','Referral status: '||v_status); END LOOP;
 RETURN '{}'::jsonb;
END; $$;
REVOKE ALL ON FUNCTION public.network_action(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.network_action(text,jsonb) TO authenticated,service_role;