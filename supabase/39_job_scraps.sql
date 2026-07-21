-- ============================================================
--  와벨리 — 알바 공고 저장(찜) 테이블  (감사 feature-gap-4 / retention-1)
--  Supabase > SQL Editor 에 붙여넣고 RUN. idempotent(create if not exists / drop policy if exists).
--  선행: 36(job_posts, _APPLY_35-37.sql).
--
--  구직자가 관심 공고를 저장 → 마이페이지 '스크랩' 탭에서 다시 조회(재방문·전환 훅).
--  미적용 동안 웹은 찜 버튼이 조용히 no-op(fetchScrappedJobIds/toggleJobScrap가 catch로 degrade).
-- ============================================================

create table if not exists public.job_scraps (
  user_id    uuid not null references auth.users(id)      on delete cascade,
  job_id     uuid not null references public.job_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, job_id)
);
create index if not exists job_scraps_user_idx on public.job_scraps (user_id, created_at desc);

alter table public.job_scraps enable row level security;

-- 본인 것만 조회/추가/삭제
drop policy if exists job_scraps_own_select on public.job_scraps;
create policy job_scraps_own_select on public.job_scraps for select using (auth.uid() = user_id);

drop policy if exists job_scraps_own_insert on public.job_scraps;
create policy job_scraps_own_insert on public.job_scraps for insert with check (auth.uid() = user_id);

drop policy if exists job_scraps_own_delete on public.job_scraps;
create policy job_scraps_own_delete on public.job_scraps for delete using (auth.uid() = user_id);

-- 확인(선택): select * from pg_policies where tablename='job_scraps';
