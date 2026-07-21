-- ============================================================
--  와벨리 — 알바 "익명 구직 + 러브콜" 활성화 (한 번에 RUN)
--  = 43(age_range + job_love_calls + RLS) + 44(gender) + 러브콜 알림 트리거
--  Supabase > SQL Editor 붙여넣기 → RUN. idempotent(여러 번 실행 안전).
--  선행: 36(job_posts), profiles, notifications 존재.
--  실행 즉시 웹이 자동 감지(jobFeatures 프로브) → 익명·러브콜 UI 켜짐.
-- ============================================================

-- ── 1) 익명 나이대(선택) ──
alter table public.job_posts add column if not exists age_range text;

-- ── 2) 익명 성별(선택, 여/남) ──
alter table public.job_posts add column if not exists gender text
  check (gender is null or gender in ('여','남'));

-- ── 3) 러브콜 테이블 ──
create table if not exists public.job_love_calls (
  job_id     uuid not null references public.job_posts(id) on delete cascade,
  from_user  uuid not null references auth.users(id)       on delete cascade,
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

-- 발송: 본인(from_user)·사장님/직장인·대상이 구직(seek)글
drop policy if exists lovecall_insert on public.job_love_calls;
create policy lovecall_insert on public.job_love_calls for insert with check (
  auth.uid() = from_user
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner','staff'))
  and exists (select 1 from public.job_posts j where j.id = job_id and j.kind = 'seek')
);

-- 수락/거절(status): 구직글 author(당사자)만
drop policy if exists lovecall_update on public.job_love_calls;
create policy lovecall_update on public.job_love_calls for update using (
  exists (select 1 from public.job_posts j where j.id = job_id and j.author_id = auth.uid())
) with check (
  exists (select 1 from public.job_posts j where j.id = job_id and j.author_id = auth.uid())
);

-- 발송 취소(delete): 보낸 매장 본인
drop policy if exists lovecall_delete on public.job_love_calls;
create policy lovecall_delete on public.job_love_calls for delete using (auth.uid() = from_user);

-- ── 4) 러브콜 알림(구직자=수신, 매장=수락통지) ──
create or replace function public.notify_job_love_call()
returns trigger language plpgsql security definer set search_path=public as $$
declare seeker uuid; store_nick text; seek_title text;
begin
  select author_id, title into seeker, seek_title from public.job_posts where id = NEW.job_id;
  select nickname into store_nick from public.profiles where id = NEW.from_user;
  if (TG_OP = 'INSERT') then
    if seeker is not null then
      insert into public.notifications(user_id, type, title, body, link)
      values (seeker, 'job_lovecall', '💌 러브콜이 왔어요',
              coalesce(store_nick,'한 매장') || '님이 「' || coalesce(seek_title,'구직글')
                || '」에 관심을 보냈어요. 수락하면 채팅으로 연결돼요.', '/jobs');
    end if;
  elsif (TG_OP = 'UPDATE') and NEW.status = 'accepted'
        and coalesce(OLD.status,'') <> 'accepted' then
    insert into public.notifications(user_id, type, title, body, link)
    values (NEW.from_user, 'job_lovecall_ok', '러브콜 수락됨',
            '보낸 러브콜을 구직자가 수락했어요. 채팅으로 이야기 나눠보세요.', '/jobs');
  end if;
  return NEW;
end; $$;

drop trigger if exists trg_job_love_call on public.job_love_calls;
create trigger trg_job_love_call
  after insert or update on public.job_love_calls
  for each row execute function public.notify_job_love_call();

-- 확인(선택): select column_name from information_schema.columns
--   where table_name='job_posts' and column_name in ('age_range','gender');
-- select * from pg_policies where tablename='job_love_calls';
