create extension if not exists pgcrypto;

create table leads (
  id uuid primary key default gen_random_uuid(),
  site text not null, name text, phone text, email text, vehicle text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index leads_site_phone on leads (site, phone) where phone is not null;
create unique index leads_site_email on leads (site, lower(email)) where phone is null and email is not null;

create table conversations (
  id uuid primary key, site text not null, visitor_id text not null,
  lead_id uuid references leads(id), page_url text, ip_hash text,
  verified_at timestamptz, message_count int not null default 0, last_message_at timestamptz,
  summary text, services text[], intent text, unanswered text[], outcome text,
  insights_claimed_at timestamptz, insights_at timestamptz,
  created_at timestamptz not null default now()
);
comment on column conversations.message_count is 'User messages only: the 20-message limit is per user message.';
create index conversations_ip_recent on conversations (ip_hash, last_message_at);

create table messages (
  id uuid primary key default gen_random_uuid(), site text not null,
  conversation_id uuid not null references conversations(id),
  role text not null check (role in ('user','assistant')), content text not null,
  created_at timestamptz not null default now()
);
create index messages_conversation on messages (conversation_id, created_at);

create table requests (
  id uuid primary key default gen_random_uuid(), site text not null,
  idempotency_key text not null unique,
  source text not null check (source in ('chat','contact_form','quote_form')),
  service text, lead_id uuid references leads(id), conversation_id uuid references conversations(id),
  subject text, message text, vehicle text, page_url text,
  email_status text check (email_status in ('sent','failed')), email_error text,
  created_at timestamptz not null default now()
);

create table ai_usage_daily (
  site text not null, day date not null,
  input_tokens bigint not null default 0, cached_input_tokens bigint not null default 0,
  output_tokens bigint not null default 0, cost_eur numeric(10,4) not null default 0,
  calls int not null default 0, created_at timestamptz not null default now(),
  primary key (site, day)
);

create table chat_state (
  site text primary key, status text not null default 'active' check (status in ('active','paused')),
  paused_at timestamptz, pause_reason text, resumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table playbooks (
  id uuid primary key default gen_random_uuid(), site text not null, intent text not null,
  version int not null, content text not null, conversation_count int not null default 0,
  active boolean not null default false, created_at timestamptz not null default now(),
  unique (site, intent, version)
);
create unique index playbooks_one_active on playbooks (site, intent) where active;
