CREATE OR REPLACE FUNCTION public.realtors_for_deal(p_deal_id uuid)
RETURNS TABLE (
 id uuid, first_name text, last_name text, brokerage_name text, avatar_url text,
 avg_rating numeric, review_count int, services public.realtor_service[], closed_deals int, cancelled_deals int
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE d public.deals;
BEGIN
 SELECT * INTO d FROM public.deals WHERE deals.id = p_deal_id AND investor_id = auth.uid();
 IF d.id IS NULL THEN RAISE EXCEPTION 'This deal is not available'; END IF;
 RETURN QUERY
 SELECT p.id, p.first_name, p.last_name, p.brokerage_name, p.avatar_url,
        s.avg_rating, coalesce(s.review_count, 0), p.services, pp.closed_deals, pp.cancelled_deals
 FROM public.profiles p
 JOIN public.public_profiles pp ON pp.id = p.id
 LEFT JOIN public.rating_summaries_by_state s ON s.user_id = p.id AND s.state = d.state
 WHERE p.role = 'realtor' AND p.verification_status = 'verified'
   AND (p.license_state = d.state OR d.state = ANY(p.markets))
   AND (d.county IS NULL
     OR NOT EXISTS (SELECT 1 FROM unnest(p.counties) c WHERE c LIKE d.state || ':%')
     OR (d.state || ':' || d.county) = ANY(p.counties))
   AND NOT public.is_blocked_from_deal(p.id, d)
 ORDER BY s.avg_rating DESC NULLS LAST, p.first_name, p.last_name, p.id;
END;
$$;
REVOKE ALL ON FUNCTION public.realtors_for_deal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.realtors_for_deal(uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.realtors_for_deal(uuid) IS 'Owner-only local realtor discovery using the same service-area rules as deal lead notifications. No contact details, applications, or connections are created.';