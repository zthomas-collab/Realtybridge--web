ALTER TABLE public.deals ADD COLUMN referral_required boolean NOT NULL DEFAULT false;
ALTER TABLE public.deal_interests ADD COLUMN referral_acknowledged_at timestamptz;
ALTER TABLE public.deal_interests ADD COLUMN referral_acknowledgment text;
CREATE TABLE public.referral_agreements (match_id uuid PRIMARY KEY REFERENCES public.matches(id),agreement_status text NOT NULL DEFAULT 'pending' CHECK(agreement_status IN ('pending','sent','signed')),agreement_reference text,sent_at timestamptz,signed_at timestamptz,commission_basis numeric CHECK(commission_basis>=0),referral_fee numeric GENERATED ALWAYS AS(round(commission_basis*0.25,2)) STORED,fee_paid_at timestamptz,notes text,updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.referral_agreements TO authenticated;
GRANT ALL ON public.referral_agreements TO service_role;
ALTER TABLE public.referral_agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY referral_agreements_read ON public.referral_agreements FOR SELECT TO authenticated USING(public.is_admin() OR EXISTS(SELECT 1 FROM public.matches m WHERE m.id=match_id AND(m.investor_id=auth.uid() OR m.realtor_id=auth.uid())));
CREATE FUNCTION public.set_listing_referral() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.referral_required:=NEW.agent_need='listing_agent'; RETURN NEW; END $$;
CREATE TRIGGER listing_referral_on_insert BEFORE INSERT ON public.deals FOR EACH ROW EXECUTE FUNCTION public.set_listing_referral();
CREATE OR REPLACE FUNCTION public.protect_deal_columns() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF current_user<>'authenticated' OR public.is_admin() THEN RETURN NEW; END IF;
 IF NEW.investor_id IS DISTINCT FROM OLD.investor_id OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at OR NEW.referral_required IS DISTINCT FROM OLD.referral_required THEN RAISE EXCEPTION 'Not allowed to modify protected deal fields'; END IF;
 IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status<>'withdrawn' THEN RAISE EXCEPTION 'Use the deal workflow to change status'; END IF; RETURN NEW; END $$;
CREATE FUNCTION public.protect_referral_acknowledgment() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF current_user='authenticated' AND(NEW.referral_acknowledged_at IS DISTINCT FROM OLD.referral_acknowledged_at OR NEW.referral_acknowledgment IS DISTINCT FROM OLD.referral_acknowledgment) THEN RAISE EXCEPTION 'Use the application workflow to acknowledge the referral'; END IF; RETURN NEW; END $$;
CREATE TRIGGER protect_referral_acknowledgment BEFORE UPDATE ON public.deal_interests FOR EACH ROW EXECUTE FUNCTION public.protect_referral_acknowledgment();
CREATE FUNCTION public.referral_flags(p_ids uuid[]) RETURNS TABLE(id uuid,referral_required boolean) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT d.id,d.referral_required FROM public.deals d WHERE d.id=ANY(p_ids) AND auth.uid() IS NOT NULL AND(d.investor_id=auth.uid() OR public.is_admin() OR EXISTS(SELECT 1 FROM public.deal_interests i WHERE i.deal_id=d.id AND i.realtor_id=auth.uid()) OR EXISTS(SELECT 1 FROM public.browse_deals(p_deal_id=>d.id))); $$;
REVOKE ALL ON FUNCTION public.referral_flags(uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.referral_flags(uuid[]) TO authenticated;
CREATE FUNCTION public.apply_for_opportunity(p_deal_id uuid,p_message text DEFAULT NULL,p_acknowledged boolean DEFAULT false) RETURNS public.deal_interests LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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
  IF NOT(d.state=ANY(me.markets)) OR(cardinality(me.counties)>0 AND NOT(coalesce(d.state||':'||d.county,'')=ANY(me.counties))) THEN RAISE EXCEPTION 'This opportunity is outside your service area'; END IF;
 END IF;
 IF char_length(coalesce(p_message,''))>1000 THEN RAISE EXCEPTION 'Application note must be 1000 characters or less'; END IF;
 INSERT INTO public.deal_interests(deal_id,realtor_id,message,referral_acknowledged_at,referral_acknowledgment) VALUES(d.id,me.id,p_message,CASE WHEN d.referral_required THEN now() END,CASE WHEN d.referral_required THEN 'I understand that, if selected for this listing opportunity, a 25% referral fee will be payable to Brock''s brokerage under a separate referral agreement.' END)
 ON CONFLICT(deal_id,realtor_id) DO UPDATE SET message=EXCLUDED.message,status='interested',created_at=now(),referral_acknowledged_at=EXCLUDED.referral_acknowledged_at,referral_acknowledgment=EXCLUDED.referral_acknowledgment WHERE deal_interests.status='withdrawn' RETURNING * INTO i;
 IF i.id IS NULL THEN RAISE EXCEPTION 'You have already applied for this opportunity'; END IF;
 PERFORM public.notify(d.investor_id,CASE WHEN d.referral_required THEN 'New realtor application' ELSE 'New realtor interest' END,coalesce(me.first_name,'A realtor')||' applied for '||d.title,'/deals/'||d.id); RETURN i;
END $$;
REVOKE ALL ON FUNCTION public.apply_for_opportunity(uuid,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.apply_for_opportunity(uuid,text,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.express_interest(p_deal_id uuid,p_message text DEFAULT NULL) RETURNS public.deal_interests LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN RETURN public.apply_for_opportunity(p_deal_id,p_message,false); END $$;
CREATE OR REPLACE FUNCTION public.accept_interest(p_interest_id uuid) RETURNS public.matches LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE i public.deal_interests; d public.deals; m public.matches;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
 SELECT * INTO i FROM public.deal_interests WHERE id=p_interest_id;
 IF i.id IS NULL THEN RAISE EXCEPTION 'Application unavailable'; END IF;
 SELECT * INTO d FROM public.deals WHERE id=i.deal_id FOR UPDATE;
 IF d.investor_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Not your deal'; END IF;
 SELECT * INTO i FROM public.deal_interests WHERE id=p_interest_id FOR UPDATE;
 IF d.status<>'live' THEN RAISE EXCEPTION 'Deal is not live'; END IF;
 IF i.status<>'interested' THEN RAISE EXCEPTION 'Application is no longer open'; END IF;
 IF d.referral_required AND i.referral_acknowledged_at IS NULL THEN RAISE EXCEPTION 'Realtor must acknowledge the brokerage referral before selection'; END IF;
 UPDATE public.deal_interests SET status='accepted' WHERE id=i.id;
 UPDATE public.deal_interests SET status='declined' WHERE deal_id=d.id AND id<>i.id AND status='interested';
 UPDATE public.deals SET status='matched' WHERE id=d.id;
 INSERT INTO public.matches(deal_id,investor_id,realtor_id,interest_id) VALUES(d.id,d.investor_id,i.realtor_id,i.id) RETURNING * INTO m;
 IF d.referral_required THEN
 INSERT INTO public.referral_agreements(match_id) VALUES(m.id);
 PERFORM public.notify(i.realtor_id,'Selected for listing opportunity',concat_ws(', ',d.address_line,d.city,d.state)||' — '||d.title||'. Brock''s team will prepare a separate 25% brokerage referral agreement for signatures.','/deals/'||d.id);
 ELSE PERFORM public.notify(i.realtor_id,'You''ve been matched!',d.title,'/deals/'||d.id); END IF; RETURN m;
END $$;
CREATE FUNCTION public.update_referral_agreement(p_match_id uuid,p_status text,p_reference text DEFAULT NULL,p_commission numeric DEFAULT NULL,p_paid boolean DEFAULT false,p_notes text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m public.matches; a public.referral_agreements;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
 IF p_status NOT IN('pending','sent','signed') OR p_status IS NULL THEN RAISE EXCEPTION 'Invalid agreement status'; END IF;
 SELECT * INTO m FROM public.matches WHERE id=p_match_id;
 SELECT * INTO a FROM public.referral_agreements WHERE match_id=p_match_id FOR UPDATE;
 IF a.match_id IS NULL THEN RAISE EXCEPTION 'Referral agreement unavailable'; END IF;
 IF p_status='signed' AND nullif(trim(p_reference),'') IS NULL THEN RAISE EXCEPTION 'Record the executed brokerage agreement reference before marking signed'; END IF;
 IF p_commission IS NOT NULL AND(p_commission<0 OR p_status<>'signed' OR m.status<>'completed') THEN RAISE EXCEPTION 'Record commission only after the agreement is signed and the transaction closes'; END IF;
 IF p_paid AND(p_commission IS NULL OR p_status<>'signed' OR m.status<>'completed') THEN RAISE EXCEPTION 'Payment requires a signed agreement, closed transaction and commission basis'; END IF;
 UPDATE public.referral_agreements SET agreement_status=p_status,agreement_reference=nullif(trim(p_reference),''),sent_at=CASE WHEN p_status IN('sent','signed') THEN coalesce(a.sent_at,now()) END,signed_at=CASE WHEN p_status='signed' THEN coalesce(a.signed_at,now()) END,commission_basis=p_commission,fee_paid_at=CASE WHEN p_paid THEN coalesce(a.fee_paid_at,now()) END,notes=p_notes,updated_at=now() WHERE match_id=p_match_id;
END $$;
REVOKE ALL ON FUNCTION public.update_referral_agreement(uuid,text,text,numeric,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_referral_agreement(uuid,text,text,numeric,boolean,text) TO authenticated;