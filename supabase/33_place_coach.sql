-- 33_place_coach.sql — 플레이스 코칭(경쟁사 스냅샷 + AI 채팅 로그 + 레이트리밋).
-- ⚠️ Supabase SQL Editor Run. 멱등. 선행: is_admin()(25_*), stores(id uuid, owner_id).
-- 지수(n1/n2/n3)·실적(save/visit/blog)·순위추이는 기존 place_analysis / place_rankings 재사용(중복 저장 안 함).
begin;

-- (1) 경쟁사 스냅샷 (같은 키워드 상위 매장 요약) — 수집기 service_role이 upsert
create table if not exists public.place_coach (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores(id) on delete cascade,
  place_id    text,
  keyword     text not null,
  my_rank     numeric,
  competitors jsonb not null default '[]'::jsonb,   -- [{place_id,name,rank,visit,n2}, ...]
  snap_date   date not null default current_date,
  updated_at  timestamptz not null default now(),
  unique (store_id, keyword, snap_date)
);
create index if not exists place_coach_store_idx on public.place_coach (store_id, snap_date desc);

-- (2) AI 코칭 대화 로그 (멀티턴 히스토리 서버 보관)
create table if not exists public.coach_chats (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references public.stores(id) on delete cascade,
  user_id    uuid,
  role       text not null check (role in ('user','assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);
create index if not exists coach_chats_store_idx on public.coach_chats (store_id, created_at);

-- (3) 레이트리밋 (매장·날짜별 질문 카운트)
create table if not exists public.coach_usage (
  store_id   uuid not null references public.stores(id) on delete cascade,
  usage_date date not null default current_date,
  cnt        int  not null default 0,
  primary key (store_id, usage_date)
);

-- (4) RLS — 소유자/관리자만 SELECT. 쓰기는 서버(service_role)만(정책 미부여 = RLS 우회).
alter table public.place_coach enable row level security;
alter table public.coach_chats enable row level security;
alter table public.coach_usage enable row level security;

drop policy if exists pc_select on public.place_coach;
create policy pc_select on public.place_coach for select using (
  exists (select 1 from public.stores s where s.id = store_id
          and (s.owner_id = auth.uid()
               or coalesce((select is_admin from public.profiles where id=auth.uid()),false)))
);
drop policy if exists cc_select on public.coach_chats;
create policy cc_select on public.coach_chats for select using (
  exists (select 1 from public.stores s where s.id = store_id
          and (s.owner_id = auth.uid()
               or coalesce((select is_admin from public.profiles where id=auth.uid()),false)))
);

revoke all on public.place_coach from anon;
revoke all on public.coach_chats from anon;
revoke all on public.coach_usage from anon, authenticated;
grant select on public.place_coach, public.coach_chats to authenticated;

-- (5) 레이트리밋 원자 증가 RPC (서버 service_role 호출). 한도초과=-1, 아니면 남은횟수 반환.
create or replace function public.coach_bump_usage(p_store uuid, p_limit int default 20)
returns int language plpgsql security definer set search_path=public as $$
declare v int;
begin
  insert into public.coach_usage(store_id, usage_date, cnt) values (p_store, current_date, 1)
  on conflict (store_id, usage_date) do update set cnt = public.coach_usage.cnt + 1
  returning cnt into v;
  if v > p_limit then return -1; end if;
  return p_limit - v;
end $$;
revoke all on function public.coach_bump_usage(uuid,int) from public, anon, authenticated;

commit;
notify pgrst, 'reload schema';
