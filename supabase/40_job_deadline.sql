-- ============================================================
--  와벨리 — 알바 공고 마감일(자동마감)  (감사 feature-gap-8)
--  Supabase > SQL Editor 에 붙여넣고 RUN. idempotent.
--  선행: 36(job_posts).
--
--  deadline(마감일) 지나면 fetchJobs가 조회단에서 제외 → status batch/cron 없이 '유령공고' 자동 소멸.
--  미적용 동안 웹은 deadline 없이 동작(fetchJobs·createJob이 컬럼 에러 시 자동 폴백=degrade-safe).
-- ============================================================

alter table public.job_posts add column if not exists deadline date;

-- 조회 최적화(선택): 마감일 필터용
create index if not exists job_posts_deadline_idx on public.job_posts (deadline) where deadline is not null;

-- 확인(선택): select column_name from information_schema.columns where table_name='job_posts' and column_name='deadline';
