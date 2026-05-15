-- Eco AI · Supabase schema
-- Run this in your Supabase project's SQL editor.

create table if not exists public.profiles (
  uid text primary key,
  email text,
  display_name text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id text primary key,
  user_uid text not null references public.profiles(uid) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id text primary key,
  conversation_id text not null references public.conversations(id) on delete cascade,
  user_uid text not null references public.profiles(uid) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  images jsonb,
  created_at timestamptz not null default now()
);

create index if not exists conversations_user_uid_idx on public.conversations(user_uid);
create index if not exists messages_conversation_id_idx on public.messages(conversation_id);
create index if not exists messages_user_uid_idx on public.messages(user_uid);
create index if not exists messages_created_at_idx on public.messages(created_at);

-- Lock down the tables: only the service role (used by the Next.js API) can read/write.
alter table public.profiles      enable row level security;
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;

-- (Optional) If you ever want anon clients to read their own rows you can add
-- policies here. For now we keep RLS strict and route everything through the
-- server-side service-role client.
