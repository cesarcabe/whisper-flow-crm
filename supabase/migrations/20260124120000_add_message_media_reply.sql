alter table public.messages
  add column if not exists client_id text,
  add column if not exists media_type text,
  add column if not exists media_path text,
  add column if not exists thumbnail_path text,
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint,
  add column if not exists duration_ms integer,
  add column if not exists thumbnail_url text,
  add column if not exists provider_reply_id text;

create index if not exists messages_client_id_idx on public.messages (client_id);
create index if not exists messages_provider_reply_id_idx on public.messages (provider_reply_id);
create index if not exists messages_media_path_idx on public.messages (media_path);
