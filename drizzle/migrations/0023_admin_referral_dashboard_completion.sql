ALTER TABLE public.referral_agreements ADD COLUMN dashboard_completed_at timestamptz;
COMMENT ON COLUMN public.referral_agreements.dashboard_completed_at IS 'Admin dashboard completion only; independent of agreement status, commission payment and deal outcome.';
CREATE OR REPLACE FUNCTION public.complete_referral_dashboard_item(p_match_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
 UPDATE public.referral_agreements SET dashboard_completed_at = coalesce(dashboard_completed_at, now()) WHERE match_id = p_match_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Referral agreement unavailable'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_referral_dashboard_item(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_referral_dashboard_item(uuid) TO authenticated;