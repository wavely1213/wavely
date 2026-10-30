-- ============================================================
--  와벨리 — cases (마케팅 대행 사이트 mulgyeol.kr '사례' 페이지)
--  2026-10-30 운영 적용 완료. 웹 저장소(wavely1213/wavely-web) 의 사례 화면
--  wavely-web/src/pages/cases.jsx 가 이 테이블을 읽는다(fetchCases).
--  Supabase > SQL Editor 붙여넣기 → RUN. idempotent.
--  선행: public.is_admin(), public.stores.
-- ============================================================

-- 규칙 (웹 저장소 docs/DOMAIN_KNOWLEDGE.md BR-005):
--   - 실측 수치만 올린다. 예시·가상 수치를 성과처럼 두지 않는다.
--   - 결과가 아직 없으면 after_value 를 비워 둔다 (화면은 진행 중으로 보인다).
--
-- 보안 설계:
--   - 익명은 공개(is_public) 행만 읽는다. 새 행은 기본 비공개 — 검수한 뒤 공개로 바꾼다.
--   - 쓰기는 관리자만. 권한(grant)도 RLS 와 같은 모양으로 좁힌다.

create table if not exists public.cases (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid references public.stores(id) on delete set null,   -- 순위 근거(place_rankings)를 찾는 연결. 화면에는 안 나간다
  store_name    text        not null,
  category      text        not null,
  summary       text,
  before_value  text,                                   -- 예: '14위'
  after_value   text,                                   -- 결과가 나오기 전엔 null
  metric        text,                                   -- 예: '춘천뷰카페 순위'
  period        text,                                   -- 예: '2026년 10월 ~ 진행 중'
  is_public     boolean     not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint cases_store_name_len check (char_length(store_name) between 1 and 60),
  constraint cases_category_len   check (char_length(category) between 1 and 30),
  constraint cases_summary_len    check (summary is null or char_length(summary) <= 300),
  constraint cases_values_len     check (coalesce(char_length(before_value), 0) <= 30
                                     and coalesce(char_length(after_value), 0) <= 30
                                     and coalesce(char_length(metric), 0) <= 40
                                     and coalesce(char_length(period), 0) <= 40)
);

create index if not exists cases_public_created_idx
  on public.cases (is_public, created_at desc);

alter table public.cases enable row level security;

-- ── 권한: 익명은 읽기만, 로그인은 읽기·쓰기(쓰기는 아래 RLS 가 관리자로 다시 좁힌다)
revoke all on public.cases from anon, authenticated;
grant select on public.cases to anon, authenticated;
grant insert, update, delete on public.cases to authenticated;

drop policy if exists cases_select on public.cases;
create policy cases_select
  on public.cases for select
  to anon, authenticated
  using ( is_public or public.is_admin() );

drop policy if exists cases_write_admin on public.cases;
create policy cases_write_admin
  on public.cases for all
  to authenticated
  using ( public.is_admin() )
  with check ( public.is_admin() );

-- updated_at 자동 갱신
create or replace function public.cases_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists cases_touch on public.cases;
create trigger cases_touch
  before update on public.cases
  for each row execute function public.cases_touch();

-- 확인: 테이블과 정책 2개가 나와야 한다.
select policyname, cmd from pg_policies where schemaname = 'public' and tablename = 'cases' order by policyname;
