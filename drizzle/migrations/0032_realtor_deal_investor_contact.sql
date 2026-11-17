CREATE OR REPLACE FUNCTION public.interest_investor_contact(p_deal_id uuid)
RETURNS TABLE(email text, phone text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.require_platform_access();
  RETURN QUERY
  SELECT p.email, p.phone
  FROM public.deals d
  JOIN public.profiles p ON p.id = d.investor_id
  WHERE d.id = p_deal_id
    AND EXISTS (SELECT 1 FROM public.profiles me WHERE me.id = auth.uid() AND me.role = 'realtor' AND me.verification_status = 'verified')
    AND NOT public.is_blocked_from_deal(auth.uid(), d)
    AND (
      EXISTS (SELECT 1 FROM public.browse_deals(p_deal_id => p_deal_id) visible WHERE visible.id = d.id)
      OR EXISTS (SELECT 1 FROM public.deal_interests i WHERE i.deal_id = d.id AND i.realtor_id = auth.uid() AND i.status <> 'withdrawn')
      OR EXISTS (SELECT 1 FROM public.matches m WHERE m.deal_id = d.id AND m.realtor_id = auth.uid())
    );
END;
$$;
REVOKE ALL ON FUNCTION public.interest_investor_contact(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.interest_investor_contact(uuid) TO authenticated, service_role;