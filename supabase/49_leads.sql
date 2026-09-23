-- ============================================================
--  와벨리 — leads (마케팅 대행 사이트 mulgyeol.kr 상담·무료체험 신청)
--  2026-09-23 운영 적용 완료. 웹 저장소(wavely1213/wavely-web) 의
--  wavely-web/sql/01_leads.sql 로 먼저 작성해 적용한 뒤 여기로 옮겼다(원본 그대로).
--  Supabase > SQL Editor 붙여넣기 → RUN. idempotent.
--  선행: public.is_admin().
-- ============================================================

-- 보안 설계 (SECURITY_GUIDELINES 참고):
--   - 익명 방문자가 insert 만 할 수 있다 (상담 신청은 비로그인으로 동작해야 한다 — 불변식).
--   - 읽기는 관리자만. 신청자 본인도 다시 읽을 수 없다 (연락처가 새어나갈 경로를 만들지 않는다).
--   - update/delete 는 아무에게도 열지 않는다. 상태 변경은 관리자 화면에서 service_role 로 한다.
--   - 권한(grant)도 RLS 와 같은 모양으로 좁힌다 — RLS 한 겹에만 기대지 않는다.
--   - 같은 연락처 반복 신청·짧은 시간 폭주는 트리거가 막는다 (KI-001 의 1차 방어).
--
-- 보관 기간: 신청일로부터 1년 (개인정보처리방침 "상담·무료체험 신청" 항목과 같은 값).
--   파기는 맨 아래 purge_expired_leads() 를 월 1회 실행한다.

create table if not exists public.leads (
  id           uuid primary key default gen_random_uuid(),
  store_name   text        not null,
  contact      text        not null,
  category     text        not null,
  product      text,                                    -- 'trial'(무료 체험) | 'care'(케어 패키지) | 'visit_review'(방문 체험단) | null
  memo         text,
  status       text        not null default 'new',      -- new → contacted → quoted → won | lost
  lost_reason  text,
  created_at   timestamptz not null default now(),

  constraint leads_store_name_len check (char_length(store_name) between 2 and 60),
  constraint leads_contact_len    check (char_length(contact) between 9 and 20),
  constraint leads_category_len   check (char_length(category) between 1 and 30),
  constraint leads_memo_len       check (memo is null or char_length(memo) <= 1000),
  constraint leads_status_valid   check (status in ('new', 'contacted', 'quoted', 'won', 'lost'))
);

create index if not exists leads_status_created_idx
  on public.leads (status, created_at desc);

create index if not exists leads_contact_created_idx
  on public.leads (contact, created_at desc);

alter table public.leads enable row level security;

-- ── 권한: 익명은 넣기만, 로그인은 넣기·읽기(읽기는 아래 RLS 가 관리자로 다시 좁힌다)
revoke all on public.leads from anon, authenticated;
grant insert on public.leads to anon, authenticated;
grant select on public.leads to authenticated;

-- 익명·로그인 사용자 모두 신청만 가능. 상태는 기본값(new) 그대로여야 한다.
drop policy if exists leads_insert_anyone on public.leads;
create policy leads_insert_anyone
  on public.leads for insert
  to anon, authenticated
  with check (
    status = 'new'                                       -- 신청자가 상태를 조작하지 못하게 고정
    and lost_reason is null
  );

-- 읽기는 관리자만. 기존 public.is_admin() 을 쓴다 — profiles 를 직접 조인하면
-- profiles 의 RLS 를 다시 타서 관리자도 못 읽는 경우가 생긴다.
drop policy if exists leads_select_admin on public.leads;
create policy leads_select_admin
  on public.leads for select
  to authenticated
  using ( public.is_admin() );

-- update/delete 정책은 만들지 않는다 → RLS 가 전부 거부한다 (service_role 만 통과)

-- ── 스팸 방어: 같은 연락처는 1시간에 1번, 전체는 10분에 30건까지
-- security definer 인 이유: 익명은 leads 를 읽을 수 없으므로, 중복 확인은 함수 권한으로 한다.
create or replace function public.leads_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.leads
    where contact = new.contact and created_at > now() - interval '1 hour'
  ) then
    raise exception '같은 연락처로 방금 신청이 접수됐어요. 곧 연락드릴게요.'
      using errcode = 'P0001';
  end if;

  if (select count(*) from public.leads where created_at > now() - interval '10 minutes') >= 30 then
    raise exception '지금 신청이 몰려 잠시 받을 수 없어요. 잠시 후 다시 시도해주세요.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.leads_guard() from public;

drop trigger if exists leads_guard_before_insert on public.leads;
create trigger leads_guard_before_insert
  before insert on public.leads
  for each row execute function public.leads_guard();

-- ── 파기: 신청일로부터 1년이 지난 행을 지운다. 지운 건수를 돌려준다.
-- 실행: SQL Editor 에서  select public.purge_expired_leads();  (월 1회)
-- pg_cron 을 켜 두었다면 아래 주석을 풀어 매월 1일 새벽 4시에 자동 실행할 수 있다.
create or replace function public.purge_expired_leads()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  delete from public.leads where created_at < now() - interval '1 year';
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.purge_expired_leads() from public, anon, authenticated;

-- select cron.schedule('purge-expired-leads', '0 4 1 * *', $$select public.purge_expired_leads()$$);

comment on table public.leads is
  '상담·무료체험 신청. 익명 insert 허용, 조회는 관리자만, 1년 보관 후 파기. 개인정보 최소수집(상호명·연락처·업종) — BR-006';
