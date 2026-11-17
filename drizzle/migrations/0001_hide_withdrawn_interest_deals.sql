CREATE OR REPLACE FUNCTION public.interested_deals()
 RETURNS TABLE(id uuid, investor_id uuid, agent_need agent_need, title text, address_line text, city text, state text, zip text, property_type text, beds numeric, baths numeric, sqft integer, asking_price numeric, arv numeric, terms text, description text, status deal_status, rejection_reason text, sold_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select d.id, d.investor_id, d.agent_need, d.title,
         case when exists (select 1 from public.matches m where m.deal_id = d.id and m.realtor_id = auth.uid())
              then d.address_line end,
         d.city, d.state, d.zip, d.property_type, d.beds, d.baths, d.sqft, d.asking_price, d.arv,
         d.terms, d.description, d.status, null::text, d.sold_at, d.created_at
  from public.deals d
  where exists (select 1 from public.deal_interests i
                where i.deal_id = d.id and i.realtor_id = auth.uid() and i.status <> 'withdrawn');
$function$;