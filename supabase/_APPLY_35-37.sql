-- ============================================================
--  와벨리 — 대기 마이그레이션 35 + 36 + 37 (합본)
--  Supabase > SQL Editor 에 통째로 붙여넣고 RUN 하세요.
--  전부 idempotent(create if not exists / drop policy if exists / add column if not exists)
--  → 이미 일부 적용돼 있어도(예: 36) 안전하게 재실행됩니다.
--
--  35 = 매장 소유자 삭제/수정 RLS  (내 매장 관리: 수정·삭제)
--  36 = 알바 구인구직 테이블 + 역할게이트 RLS  (알바 탭)
--  37 = 게시글 지역 다중태그 컬럼  (글쓰기 주소지+희망지역, 지역 필터)
-- ============================================================


-- ─────────────────────────────────────────────
-- 35_store_owner_delete — 매장 소유자 삭제/수정
-- ─────────────────────────────────────────────
alter table public.stores enable row level security;

drop policy if exists stores_delete on public.stores;
create policy stores_delete on public.stores
  for delete using (auth.uid() = owner_id);

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'stores' and policyname = 'stores_update'
  ) then
    execute 'alter policy stores_update on public.stores '
         || 'using (auth.uid() = owner_id) with check (auth.uid() = owner_id)';
  end if;
end $$;


-- ─────────────────────────────────────────────
-- 36_job_board — 알바 구인구직 (하이퍼로컬)
--   구인(hire)=사장님/직장인만 · 구직(seek)=로그인 누구나
-- ─────────────────────────────────────────────
create table if not exists public.job_posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references auth.users(id) on delete cascade,
  store_id    uuid references public.stores(id) on delete set null,
  kind        text not null check (kind in ('hire','seek')),
  title       text not null,
  body        text,
  category    text,
  wage        int,
  wage_type   text default '시급' check (wage_type in ('시급','일급','월급','협의')),
  work_time   text,
  dong        text,
  lat         double precision,
  lng         double precision,
  status      text not null default 'open' check (status in ('open','closed')),
  boost       int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists job_posts_kind_idx   on public.job_posts (kind, status, created_at desc);
create index if not exists job_posts_author_idx on public.job_posts (author_id);

alter table public.job_posts enable row level security;

drop policy if exists job_read on public.job_posts;
create policy job_read on public.job_posts for select using (true);

drop policy if exists job_insert on public.job_posts;
create policy job_insert on public.job_posts for insert with check (
  auth.uid() = author_id
  and (
    kind = 'seek'
    or (kind = 'hire' and exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner','staff')
    ))
  )
);

drop policy if exists job_update on public.job_posts;
create policy job_update on public.job_posts for update using (auth.uid() = author_id) with check (auth.uid() = author_id);
drop policy if exists job_delete on public.job_posts;
create policy job_delete on public.job_posts for delete using (auth.uid() = author_id);


-- ─────────────────────────────────────────────
-- 37_post_regions — 게시글 지역 다중태그
--   posts.dong(단일=대표) 유지 + dongs(배열) 추가. null/[] = 춘천 전체
-- ─────────────────────────────────────────────
alter table public.posts add column if not exists dongs text[];
create index if not exists posts_dongs_idx on public.posts using gin (dongs);


-- ============================================================
--  확인(선택): 아래 주석 풀어서 실행하면 적용 결과 확인
-- ============================================================
-- select 'stores'   as tbl, policyname, cmd from pg_policies where tablename='stores'   and policyname in ('stores_delete','stores_update')
-- union all
-- select 'job_posts', policyname, cmd from pg_policies where tablename='job_posts';
-- select column_name from information_schema.columns where table_name='posts' and column_name='dongs';
