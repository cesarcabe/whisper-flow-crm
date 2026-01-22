-- Fix function search_path for recalc_customer_recurrence
CREATE OR REPLACE FUNCTION public.recalc_customer_recurrence(p_workspace uuid, p_contact uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
declare
  last_date date;
  avg_days int;
begin
  select max(purchased_at) into last_date
  from public.purchases
  where workspace_id = p_workspace and contact_id = p_contact;

  -- média simples: diferença média entre compras (últimas 6)
  with last6 as (
    select purchased_at
    from public.purchases
    where workspace_id = p_workspace and contact_id = p_contact
    order by purchased_at desc
    limit 6
  ),
  diffs as (
    select (purchased_at - lag(purchased_at) over (order by purchased_at))::int as diff
    from last6
    order by purchased_at
  )
  select avg(diff)::int into avg_days
  from diffs
  where diff is not null and diff > 0;

  insert into public.customer_recurrence (contact_id, workspace_id, last_purchase_at, avg_days_between_purchases, status, updated_at)
  values (p_contact, p_workspace, last_date, avg_days,
          case
            when last_date is null then 'new'
            when last_date >= current_date - interval '10 days' then 'active'
            when last_date >= current_date - interval '20 days' then 'warming'
            when last_date >= current_date - interval '45 days' then 'cold'
            else 'lost'
          end,
          now())
  on conflict (contact_id) do update set
    workspace_id = excluded.workspace_id,
    last_purchase_at = excluded.last_purchase_at,
    avg_days_between_purchases = excluded.avg_days_between_purchases,
    status = excluded.status,
    updated_at = now();
end;
$$;

-- Fix function search_path for set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;