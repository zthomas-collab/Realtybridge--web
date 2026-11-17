create or replace function public.interest_investor_contact(p_deal_id uuid)
returns table(email text, phone text)
language sql
stable security definer
set search_path to 'public'
as $$
  select p.email, p.phone
  from public.deals d
  join public.profiles p on p.id = d.investor_id
  where d.id = p_deal_id
    and exists (
      select 1 from public.deal_interests i
      where i.deal_id = d.id and i.realtor_id = auth.uid() and i.status <> 'withdrawn'
    );
$$;