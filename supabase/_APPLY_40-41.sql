-- ============================================================
--  와벨리 — 대기 SQL 합본 (40 마감일 + 41 지원자관리)
--  Supabase > SQL Editor 에 통째로 붙여넣고 RUN. 전부 idempotent(재실행 안전).
--  선행: 36(job_posts) — 이미 적용됨(35-39 run 완료 기준).
-- ============================================================

-- ── 40: 알바 마감일(자동마감) ──
alter table public.job_posts add column if not exists deadline date;
create index if not exists job_posts_deadline_idx on public.job_posts (deadline) where deadline is not null;

-- ── 41: 알바 지원자 관리 ──
create table if not exists public.job_applications (
  job_id       uuid not null references public.job_posts(id) on delete cascade,
  applicant_id uuid not null references auth.users(id)       on delete cascade,
  status       text not null default 'applied' check (status in ('applied','accepted','rejected')),
  created_at   timestamptz not null default now(),
  primary key (job_id, applicant_id)
);
create index if not exists job_applications_job_idx       on public.job_applications (job_id, created_at desc);
create index if not exists job_applications_applicant_idx on public.job_applications (applicant_id, created_at desc);

alter table public.job_applications enable row level security;

drop policy if exists jobapp_insert on public.job_applications;
create policy jobapp_insert on public.job_applications for insert with check (auth.uid() = applicant_id);

drop policy if exists jobapp_select on public.job_applications;
create policy jobapp_select on public.job_applications for select using (
  auth.uid() = applicant_id
  or exists (select 1 from public.job_posts j where j.id = job_id and j.author_id = auth.uid())
);

drop policy if exists jobapp_delete on public.job_applications;
create policy jobapp_delete on public.job_applications for delete using (auth.uid() = applicant_id);
