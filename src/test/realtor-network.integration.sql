-- Run with an authorized privileged test connection:
-- psql -X -v ON_ERROR_STOP=1 -f src/test/realtor-network.integration.sql.
-- Every fixture and action is rolled back. No emails or legacy workflow calls.
BEGIN;
CREATE TEMP TABLE network_test_users AS SELECT id,row_number() OVER(ORDER BY id) AS n FROM public.profiles WHERE role='realtor' AND nullif(trim(license_number),'') IS NOT NULL AND ('NC'=ANY(markets) OR license_state='NC') AND NOT EXISTS(SELECT 1 FROM unnest(counties) c WHERE c LIKE 'NC:%') LIMIT 3;
DO $$ BEGIN IF (SELECT count(*) FROM network_test_users)<3 THEN RAISE EXCEPTION 'Three licensed Realtor fixtures required'; END IF; END; $$;
CREATE TEMP TABLE network_test_baseline AS SELECT (SELECT count(*) FROM public.deals) deals,(SELECT count(*) FROM public.matches) matches,(SELECT count(*) FROM public.referral_agreements) agreements,(SELECT count(*) FROM public.notifications) notifications;
CREATE TEMP TABLE network_test_result(referral_id uuid,response_id uuid);
DO $$ DECLARE owner_id uuid; respondent uuid; stranger uuid; r uuid; x uuid; blocked boolean; BEGIN
 SELECT id INTO owner_id FROM network_test_users WHERE n=1; SELECT id INTO respondent FROM network_test_users WHERE n=2; SELECT id INTO stranger FROM network_test_users WHERE n=3;
 IF NOT public.network_area_match(respondent,'NC','Charlotte','Mecklenburg County','28202') THEN RAISE EXCEPTION 'Geographic matching failed'; END IF;
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 r:=(public.network_action('post',jsonb_build_object('input',jsonb_build_object('referral_type','Buyer','state','NC','city','Charlotte','county','Mecklenburg County','zip','28202','property_type','Single Family','min_price',450000,'max_price',550000,'description','Rollback-only network integration fixture','preferred_experience','Local buyer representation','urgency','Within 30 Days')))->>'id')::uuid;
 IF EXISTS(SELECT 1 FROM public.network_referrals WHERE id=r AND (referral_source<>'realtor_network' OR selected_realtor_id IS NOT NULL)) THEN RAISE EXCEPTION 'Automatic assignment or incorrect source'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.network_notifications WHERE user_id=respondent AND referral_id=r AND event='realtor_network.area') THEN RAISE EXCEPTION 'Area notification missing'; END IF;
 PERFORM set_config('request.jwt.claim.sub',respondent::text,true);
 x:=(public.network_action('interest',jsonb_build_object('id',r))->>'response_id')::uuid;
 PERFORM public.network_action('interest',jsonb_build_object('id',r));
 IF (SELECT count(*) FROM public.network_responses WHERE referral_id=r AND realtor_id=respondent)<>1 THEN RAISE EXCEPTION 'Duplicate interest'; END IF;
 PERFORM public.network_action('message',jsonb_build_object('response_id',x,'body','Private integration fixture'));
 PERFORM set_config('request.jwt.claim.sub',stranger::text,true);
 IF public.network_thread_access(x) THEN RAISE EXCEPTION 'Stranger can read private thread'; END IF;
 blocked:=false; BEGIN PERFORM public.network_action('select',jsonb_build_object('id',r,'response_id',x)); EXCEPTION WHEN OTHERS THEN blocked:=true; END; IF NOT blocked THEN RAISE EXCEPTION 'Nonowner selected Realtor'; END IF;
 blocked:=false; BEGIN PERFORM public.network_action('message',jsonb_build_object('response_id',x,'body','Unauthorized')); EXCEPTION WHEN OTHERS THEN blocked:=true; END; IF NOT blocked THEN RAISE EXCEPTION 'Unauthorized message accepted'; END IF;
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 PERFORM public.network_action('select',jsonb_build_object('id',r,'response_id',x));
 IF NOT EXISTS(SELECT 1 FROM public.network_referrals WHERE id=r AND status='connected' AND selected_realtor_id=respondent) THEN RAISE EXCEPTION 'Owner selection failed'; END IF;
 PERFORM set_config('request.jwt.claim.sub',stranger::text,true);
 blocked:=false; BEGIN PERFORM public.network_action('interest',jsonb_build_object('id',r)); EXCEPTION WHEN OTHERS THEN blocked:=true; END; IF NOT blocked THEN RAISE EXCEPTION 'Connected referral accepts new interest'; END IF;
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 blocked:=false; BEGIN PERFORM public.network_action('agreement',jsonb_build_object('id',r,'reference','Fixture','brokerage_approved',false,'licensing_confirmed',true)); EXCEPTION WHEN OTHERS THEN blocked:=true; END; IF NOT blocked THEN RAISE EXCEPTION 'Agreement accepts missing approval'; END IF;
 PERFORM public.network_action('agreement',jsonb_build_object('id',r,'reference','Rollback fixture agreement','brokerage_approved',true,'licensing_confirmed',true));
 PERFORM public.network_action('status',jsonb_build_object('id',r,'status','closed'));
 PERFORM public.network_action('status',jsonb_build_object('id',r,'status','open'));
 IF EXISTS(SELECT 1 FROM public.network_agreements WHERE referral_id=r) OR NOT EXISTS(SELECT 1 FROM public.network_agreement_history WHERE referral_id=r AND realtor_id=respondent) THEN RAISE EXCEPTION 'Reopen exposes stale agreement to future connection'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.network_referrals WHERE id=r AND status='open' AND selected_realtor_id IS NULL) THEN RAISE EXCEPTION 'Reopen failed'; END IF;
 PERFORM set_config('request.jwt.claim.sub',respondent::text,true);
 PERFORM public.network_action('preferences',jsonb_build_object('notify_message',false));
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 PERFORM public.network_action('message',jsonb_build_object('response_id',x,'body','Muted message fixture'));
 IF EXISTS(SELECT 1 FROM public.network_notifications WHERE referral_id=r AND user_id=respondent AND event='realtor_network.message') THEN RAISE EXCEPTION 'Notification preference ignored'; END IF;
 INSERT INTO network_test_result VALUES(r,x);
 IF EXISTS(SELECT 1 FROM network_test_baseline b WHERE b.deals<>(SELECT count(*) FROM public.deals) OR b.matches<>(SELECT count(*) FROM public.matches) OR b.agreements<>(SELECT count(*) FROM public.referral_agreements) OR b.notifications<>(SELECT count(*) FROM public.notifications)) THEN RAISE EXCEPTION 'Legacy referral data changed'; END IF;
END; $$;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM network_test_users WHERE n=3),true) AS subject \gset
GRANT SELECT ON network_test_result TO authenticated;
SET LOCAL ROLE authenticated;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.network_messages WHERE response_id=(SELECT response_id FROM network_test_result)) THEN RAISE EXCEPTION 'RLS exposes private messages to stranger'; END IF; END; $$;
RESET ROLE;
ROLLBACK;
\echo Network integration checks passed; all test data rolled back.