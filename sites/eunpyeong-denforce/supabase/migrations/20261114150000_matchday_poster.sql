-- 매치데이 포스터 (D-096) — 경기 날 홈 팝업. MATCH DAY 포스터(경기 날 0시 ~ 경기 끝)와 FULL TIME 포스터(올라오면 그날 23:59 까지).
-- 출처: 구단 구글 드라이브 날짜 폴더('MM/DD vs 상대 (HOME|AWAY)' 안 MATCH-DAY / FULL…)를 서버 함수 matchday-poster-sync 가 읽어
--       비어 있는 칸에만 넣는다. 관리자 › 경기 폼에서 직접 올린 값이 우선이고, 관리자가 지운 칸은 다시 채우지 않는다(기록 표, D-090 방식).
-- 쓰기는 서버 함수(서버 키)와 관리자. 공개 읽기는 matches 그대로.

alter table public.matches
  add column if not exists matchday_poster_url text
    constraint matches_matchday_poster_url_check check (matchday_poster_url is null or (matchday_poster_url ~ '^https://' and length(matchday_poster_url) <= 500)),
  add column if not exists fulltime_poster_url text
    constraint matches_fulltime_poster_url_check check (fulltime_poster_url is null or (fulltime_poster_url ~ '^https://' and length(fulltime_poster_url) <= 500));

-- 포스터 폴더 (관리자 › 설정, 최고 관리자). 처음 값은 소유자가 준 폴더(2026-11-15, 링크 공개 폴더 ID — 비밀값 아님)
alter table public.club_settings
  add column if not exists matchday_folder_id text;
alter table public.club_settings drop constraint if exists club_settings_matchday_folder_id_check;
alter table public.club_settings add constraint club_settings_matchday_folder_id_check
  check (matchday_folder_id is null or matchday_folder_id ~ '^[A-Za-z0-9_-]{10,100}$');
update public.club_settings set matchday_folder_id = '1qqH_3qT6zSOm63gbtaHpUCxlEDmiu5Wo' where id = 1 and matchday_folder_id is null;

-- 실행 상태 (한 줄). last_status: ok / no_key(드라이브 키 없음) / no_folder / error / skipped(경기 날 아님, 3시간 안 됨)
create table if not exists public.matchday_poster_sync_state (
  id smallint primary key default 1 check (id = 1),
  last_run_at timestamptz,
  last_ok_at timestamptz,
  last_status text check (last_status is null or last_status in ('ok', 'no_key', 'no_folder', 'error')),
  last_error text check (last_error is null or length(last_error) <= 500),
  last_applied text check (last_applied is null or length(last_applied) <= 2000),
  last_notes text check (last_notes is null or length(last_notes) <= 2000)
);
insert into public.matchday_poster_sync_state (id) values (1) on conflict (id) do nothing;

-- 이 함수가 넣은 칸 — 지금 비어 있으면 관리자가 지운 것으로 보고 다시 넣지 않는다
create table if not exists public.matchday_poster_sync_applied (
  match_id uuid not null references public.matches (id) on delete cascade,
  field text not null check (field in ('matchday_poster_url', 'fulltime_poster_url')),
  file_id text not null check (file_id ~ '^[A-Za-z0-9_-]{10,100}$'),
  applied_at timestamptz not null default now(),
  primary key (match_id, field)
);

alter table public.matchday_poster_sync_state enable row level security;
alter table public.matchday_poster_sync_applied enable row level security;
drop policy if exists matchday_poster_sync_state_admin_read on public.matchday_poster_sync_state;
create policy matchday_poster_sync_state_admin_read on public.matchday_poster_sync_state for select to authenticated using (public.is_admin());
drop policy if exists matchday_poster_sync_applied_admin_read on public.matchday_poster_sync_applied;
create policy matchday_poster_sync_applied_admin_read on public.matchday_poster_sync_applied for select to authenticated using (public.is_admin());
revoke all on public.matchday_poster_sync_state, public.matchday_poster_sync_applied from anon, authenticated;
grant select on public.matchday_poster_sync_state, public.matchday_poster_sync_applied to authenticated;

-- 호출 확인용 비밀 값 — DB 안에서 만들어 Vault 에만 둔다
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'matchday_poster_sync_secret', '매치데이 포스터 자동 연결 예약 실행 확인용 (D-096)')
where not exists (select 1 from vault.secrets where name = 'matchday_poster_sync_secret');

create or replace function public.matchday_poster_sync_secret_ok(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'matchday_poster_sync_secret' and decrypted_secret = p_secret and length(p_secret) >= 32
  );
$$;
revoke execute on function public.matchday_poster_sync_secret_ok(text) from public, anon, authenticated;
grant execute on function public.matchday_poster_sync_secret_ok(text) to service_role;
