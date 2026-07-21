-- ============================================================
--  와벨리 — 알바 지원자 관리  (감사 feature-gap-2)
--  Supabase > SQL Editor 에 붙여넣고 RUN. idempotent.
--  선행: 36(job_posts).
--
--  지원(apply) 시 레코드 생성 → 사장님이 공고별 '지원자 N명' 목록 확인(채팅 인박스서 헤매지 않게).
--  미적용 동안 웹은 지원=채팅만 정상(applyToJob/fetch가 catch로 degrade → 지원자목록 빈값).
-- ============================================================

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

-- 지원자 본인만 지원(insert)
drop policy if exists jobapp_insert on public.job_applications;
create policy jobapp_insert on public.job_applications for insert with check (auth.uid() = applicant_id);

-- 조회: 지원자 본인 OR 그 공고의 작성자(사장님)
drop policy if exists jobapp_select on public.job_applications;
create policy jobapp_select on public.job_applications for select using (
  auth.uid() = applicant_id
  or exists (select 1 from public.job_posts j where j.id = job_id and j.author_id = auth.uid())
);

-- 지원 취소(delete)는 지원자 본인
drop policy if exists jobapp_delete on public.job_applications;
create policy jobapp_delete on public.job_applications for delete using (auth.uid() = applicant_id);

-- 확인(선택): select * from pg_policies where tablename='job_applications';
