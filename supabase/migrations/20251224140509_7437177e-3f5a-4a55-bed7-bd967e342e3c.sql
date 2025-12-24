-- Enable full row data for realtime UPDATE events
alter table public.messages replica identity full;
alter table public.conversations replica identity full;

-- Ensure tables are included in Supabase Realtime publication
DO $$
BEGIN
  BEGIN
    EXECUTE 'alter publication supabase_realtime add table public.messages';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    EXECUTE 'alter publication supabase_realtime add table public.conversations';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END;
$$;