-- 14_worker_heartbeat.sql
-- 수집 워커 심장박동 — 앱이 "수집 서버 가동 여부"를 알아 오프라인 시 친절히 안내.
-- 워커가 주기적으로 last_seen 갱신(service_role). 인증 사용자는 읽기만.
create table if not exists public.worker_heartbeat (
  id        int primary key default 1,
  last_seen timestamptz not null default now(),
  note      text,
  constraint worker_heartbeat_singleton check (id = 1)
);
insert into public.worker_heartbeat (id, last_seen) values (1, now())
  on conflict (id) do nothing;

alter table public.worker_heartbeat enable row level security;
drop policy if exists wh_select on public.worker_heartbeat;
create policy wh_select on public.worker_heartbeat for select
  using (auth.role() = 'authenticated');
-- insert/update 는 수집기(service_role)가 RLS 우회로 수행.

notify pgrst, 'reload schema';
