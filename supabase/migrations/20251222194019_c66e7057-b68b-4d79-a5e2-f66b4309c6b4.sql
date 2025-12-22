-- Security hardening: set immutable search_path on SECURITY DEFINER function
-- (required by Supabase linter)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  insert into public.profiles (id, email, full_name, created_at, updated_at)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', now(), now())
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();
  return new;
end;
$$;