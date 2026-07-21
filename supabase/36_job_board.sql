-- 36_job_board.sql — 알바 구인구직 (하이퍼로컬)
-- 권한: 구인(hire)=사장님/직장인만 · 구직(seek)=로그인 누구나(손님·알바 포함).
-- 지원은 기존 채팅(DM)으로 연결 → 별도 applications 테이블 없음(MVP).
-- 적용: Supabase SQL Editor Run.

create table if not exists public.job_posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references auth.users(id) on delete cascade,
  store_id    uuid references public.stores(id) on delete set null,   -- 구인 시 내 매장 연결(선택)
  kind        text not null check (kind in ('hire','seek')),          -- hire=구인 / seek=구직
  title       text not null,
  body        text,
  category    text,                                                   -- 직종/업종(예: 홀서빙, 주방, 배달)
  wage        int,                                                    -- 금액
  wage_type   text default '시급' check (wage_type in ('시급','일급','월급','협의')),
  work_time   text,                                                   -- 근무 시간대(예: 평일 18-22시)
  dong        text,
  lat         double precision,
  lng         double precision,
  status      text not null default 'open' check (status in ('open','closed')),
  boost       int not null default 0,                                 -- 상위노출(유료, 추후 옥션)
  created_at  timestamptz not null default now()
);
create index if not exists job_posts_kind_idx on public.job_posts (kind, status, created_at desc);
create index if not exists job_posts_author_idx on public.job_posts (author_id);

alter table public.job_posts enable row level security;

-- 조회: 공개(비로그인도 목록 열람 가능)
drop policy if exists job_read on public.job_posts;
create policy job_read on public.job_posts for select using (true);

-- 등록: 본인 author + kind별 역할 게이트(profiles.role)
--   seek=로그인 누구나 / hire=owner·staff 만
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

-- 수정/삭제: 작성자만
drop policy if exists job_update on public.job_posts;
create policy job_update on public.job_posts for update using (auth.uid() = author_id) with check (auth.uid() = author_id);
drop policy if exists job_delete on public.job_posts;
create policy job_delete on public.job_posts for delete using (auth.uid() = author_id);

-- 확인용:
-- select policyname, cmd from pg_policies where tablename='job_posts';
