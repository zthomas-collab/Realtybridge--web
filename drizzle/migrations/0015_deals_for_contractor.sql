CREATE OR REPLACE FUNCTION public.deals_for_contractor()
 RETURNS TABLE(id uuid, title text, city text, state text, county text, status text, created_at timestamptz, in_county boolean, investor_name text, investor_email text, investor_phone text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare p public.profiles;
begin
  select * into p from public.profiles where profiles.id = auth.uid();
  if p.id is null or p.role::text <> 'contractor' or not public.has_active_billing(p.id) then return; end if;
  return query
    select d.id, d.title::text, d.city::text, d.state::text, d.county::text, d.status::text, d.created_at,
           (d.county is not null and (d.state || ':' || d.county) = any (p.counties)) as in_county,
           trim(coalesce(i.first_name,'') || ' ' || coalesce(i.last_name,''))::text, i.email::text, i.phone::text
      from public.deals d
      join public.profiles i on i.id = d.investor_id
     where d.status in ('live','matched')
       and d.state = any (p.markets)
       and (d.county is null
            or not exists (select 1 from unnest(p.counties) c where c like d.state || ':%')
            or (d.state || ':' || d.county) = any (p.counties))
     order by 8 desc, d.created_at desc
     limit 100;
end;
$function$;
REVOKE ALL ON FUNCTION public.deals_for_contractor() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.deals_for_contractor() TO authenticated;