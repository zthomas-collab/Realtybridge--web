drop policy reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert to authenticated with check (
  reviewer_id = auth.uid()
  and exists (
    select 1 from public.matches m
    where m.id = match_id
      and (
        m.status in ('completed', 'cancelled')
        or (m.investor_id = auth.uid() and m.investor_outcome is not null)
        or (m.realtor_id = auth.uid() and m.realtor_outcome is not null)
      )
  )
);