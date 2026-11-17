ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS buybox_min_price numeric,
  ADD COLUMN IF NOT EXISTS buybox_max_price numeric,
  ADD COLUMN IF NOT EXISTS buybox_property_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS buybox_notes text;

COMMENT ON COLUMN public.profiles.buybox_min_price IS 'Buy box: minimum purchase price (investor preference, optional)';
COMMENT ON COLUMN public.profiles.buybox_max_price IS 'Buy box: maximum purchase price (investor preference, optional)';
COMMENT ON COLUMN public.profiles.buybox_property_types IS 'Buy box: property types the investor buys (single_family, townhome, condo, multi_family, manufactured, land)';
COMMENT ON COLUMN public.profiles.buybox_notes IS 'Buy box: free-form criteria such as strategy, condition, neighborhoods';
