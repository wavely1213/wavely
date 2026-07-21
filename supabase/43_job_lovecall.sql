-- ============================================================
--  와벨리 — 익명 구직 + 러브콜  (구직자 프라이버시 보존형)
--  Supabase > SQL Editor 에 붙여넣고 RUN. idempotent.
--  선행: 36(job_posts).
--
--  구직(seek)을 익명(대략 나이)으로 게시 → 매장(owner/staff)이 '러브콜' → 구직자 수락 시 채팅·닉 공개.
--  수락 전엔 구직자 신원 비공개(job_posts는 profiles PII 조인 안 함). 러브콜=매장→구직글 관심표시.
-- ============================================================

-- 구직 익명용 대략 나이(예: '20대 중반'). null이면 미표기.
alter table public.job_posts add column if not exists age_range text;

create table if not exists public.job_love_calls (
  job_id     uuid not null references public.job_posts(id) on delete cascade,   -- 구직글(seek)
  from_user  uuid not null references auth.users(id)       on delete cascade,   -- 러브콜 보낸 매장(사장님)
  message    text,
  status     text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  primary key (job_id, from_user)
);
create index if not exists job_love_calls_job_idx  on public.job_love_calls (job_id, created_at desc);
create index if not exists job_love_calls_from_idx on public.job_love_calls (from_user, created_at desc);

alter table public.job_love_calls enable row level security;

-- 조회: 보낸 매장(from_user) 또는 받는 구직자(구직글 author)만
drop policy if exists lovecall_select on public.job_love_calls;
create policy lovecall_select on public.job_love_calls for select using (
  auth.uid() = from_user
  or exists (select 1 from public.job_posts j where j.id = job_id and j.author_id = auth.uid())
);

-- 발송: 본인(from_user)이고 사장님/직장인(owner/staff)이며 대상이 구직(seek)글
drop policy if exists lovecall_insert on public.job_love_calls;
create policy lovecall_insert on public.job_love_calls for insert with check (
  auth.uid() = from_user
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner','staff'))
  and exists (select 1 from public.job_posts j where j.id = job_id and j.kind = 'seek')
);

-- 수락/거절(status 변경): 구직글 author(당사자)만
drop policy if exists lovecall_update on public.job_love_calls;
create policy lovecall_update on public.job_love_calls for update using (
  exists (select 1 from public.job_posts j where j.id = job_id and j.author_id = auth.uid())
) with check (
  exists (select 1 from public.job_posts j where j.id = job_id and j.author_id = auth.uid())
);

-- 발송 취소(delete): 보낸 매장 본인
drop policy if exists lovecall_delete on public.job_love_calls;
create policy lovecall_delete on public.job_love_calls for delete using (auth.uid() = from_user);

-- 확인(선택): select * from pg_policies where tablename='job_love_calls';
