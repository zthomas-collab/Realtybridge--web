CREATE OR REPLACE FUNCTION public.community_counts()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'investors', count(*) FILTER (WHERE p.role = 'investor'),
    'realtors', count(*) FILTER (WHERE p.role = 'realtor'),
    'contractors', count(*) FILTER (WHERE p.role = 'contractor'))
  FROM public.profiles p JOIN auth.users u ON u.id = p.id
  WHERE auth.uid() IS NOT NULL AND u.last_sign_in_at > now() - interval '30 days';
$$;
REVOKE ALL ON FUNCTION public.community_counts() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.community_counts() TO authenticated;