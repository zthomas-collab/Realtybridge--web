CREATE TABLE public.realtor_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  address_line text,
  city text NOT NULL,
  state text NOT NULL,
  county text,
  zip text,
  property_type text NOT NULL DEFAULT 'single_family',
  beds numeric,
  baths numeric,
  sqft integer,
  list_price numeric,
  days_on_market integer,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','removed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.realtor_listings TO authenticated;
GRANT ALL ON public.realtor_listings TO service_role;
ALTER TABLE public.realtor_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY listings_read ON public.realtor_listings FOR SELECT TO authenticated
  USING (realtor_id = auth.uid() OR public.is_admin()
    OR (status = 'active' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'investor')));
CREATE POLICY listings_insert ON public.realtor_listings FOR INSERT TO authenticated
  WITH CHECK (realtor_id = auth.uid() AND public.is_valid_us_state(state)
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'realtor')
    AND public.has_active_billing(auth.uid()));
CREATE POLICY listings_update ON public.realtor_listings FOR UPDATE TO authenticated
  USING (realtor_id = auth.uid() OR public.is_admin());

-- Investors see listing agent contact info right away
CREATE OR REPLACE FUNCTION public.listing_contacts()
RETURNS TABLE(listing_id uuid, first_name text, last_name text, brokerage_name text, avatar_url text, email text, phone text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.id, p.first_name, p.last_name, p.brokerage_name, p.avatar_url, p.email, p.phone
  FROM public.realtor_listings l JOIN public.profiles p ON p.id = l.realtor_id
  WHERE l.status = 'active'
    AND (public.is_admin() OR l.realtor_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles me WHERE me.id = auth.uid() AND me.role = 'investor'));
$$;
REVOKE ALL ON FUNCTION public.listing_contacts() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.listing_contacts() TO authenticated;