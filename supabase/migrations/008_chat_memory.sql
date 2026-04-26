-- Chat memory + indexes for cross-session continuity
-- Run via Supabase SQL editor or `supabase db push`.

-- Indexes that should have existed for fast session lookups
create index if not exists chat_sessions_case_id_idx       on chat_sessions(case_id);
create index if not exists chat_sessions_document_id_idx   on chat_sessions(document_id);
create index if not exists chat_sessions_firm_updated_idx  on chat_sessions(firm_id, updated_at desc);
create index if not exists chat_sessions_user_updated_idx  on chat_sessions(user_id, updated_at desc);
create index if not exists chat_messages_session_created   on chat_messages(session_id, created_at);

-- Distilled per-case "memory facts" written by the assistant after each turn
create table if not exists case_memory (
  id                uuid primary key default gen_random_uuid(),
  firm_id           uuid not null references firms(id) on delete cascade,
  case_id           uuid not null references cases(id) on delete cascade,
  fact              text not null,
  source_session_id uuid references chat_sessions(id) on delete set null,
  created_at        timestamptz not null default now()
);

create index if not exists case_memory_case_idx on case_memory(case_id, created_at desc);
create index if not exists case_memory_firm_idx on case_memory(firm_id, created_at desc);

-- RLS — same firm isolation pattern as everything else
alter table case_memory enable row level security;

drop policy if exists case_memory_all_firm on case_memory;
create policy case_memory_all_firm on case_memory
  for all
  using       (firm_id = auth_firm_id())
  with check  (firm_id = auth_firm_id());
