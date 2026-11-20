-- 연맹 결과기록지 자동 수집 (D-082, 명세 docs/KFL_RECORDS_SPEC.md 1.2, 1.3)
-- 쓰기는 서버 함수 kfl-sync(서버 키). 관리자(최고 관리자/관리자)는 확인/연결/번호표/나무위키 칸만.
-- matches / players / standings 에는 열을 추가하지 않는다.
-- 명세 이름은 20261114100000 이었지만 D-090(kfl_video_sync) 과 시각이 겹쳐 뒤로 옮겼다.
-- C4/C7/C8 에서 쓰는 칸(stats_live, namu_round_done, namu_outline, namu_player_docs)도 여기서 만든다(운영 승인 한 번).

create table public.kfl_clubs (
  club_id text primary key check (club_id ~ '^[a-z0-9_]{2,30}$'),     -- 소문자로 저장(연맹 표기: fsseoul / FSSeoul)
  fed_name text not null check (length(fed_name) between 1 and 60),   -- 연맹 표기
  name text not null check (length(name) between 1 and 40),           -- 사이트 표기(matches.opponent, standings.team)
  is_us boolean not null default false,
  namu_doc text check (namu_doc is null or length(namu_doc) between 1 and 100),
  namu_outline jsonb check (namu_outline is null or (is_us and jsonb_typeof(namu_outline) = 'object'
                                                    and length(namu_outline::text) <= 2000)),
  updated_at timestamptz not null default now(), updated_by text
);
create unique index kfl_clubs_one_us on public.kfl_clubs (is_us) where is_us;

create table public.kfl_leagues (
  league_seq integer primary key check (league_seq > 0),
  league_type smallint not null default 10 check (league_type > 0),
  season text not null check (season ~ '^\d{4}-\d{2}$'),
  competition text not null check (length(competition) between 1 and 60),
  active boolean not null default false,
  stats_live boolean not null default false,                          -- 첫 경기 명단 확인 뒤 켬 (BR-032)
  namu_round_done smallint check (namu_round_done between 0 and 99),  -- 나무위키에 반영한 마지막 라운드 (D-083)
  updated_at timestamptz not null default now(), updated_by text
);

create table public.kfl_games (
  league_seq integer not null references public.kfl_leagues on delete cascade,
  game_number integer not null check (game_number between 1 and 999),
  home_club text not null check (home_club ~ '^[A-Za-z0-9_]{2,30}$'),  -- 연맹이 준 대소문자 그대로(기록지 주소용)
  away_club text not null check (away_club ~ '^[A-Za-z0-9_]{2,30}$'),
  kickoff timestamptz not null,
  venue text not null default '' check (length(venue) <= 60),
  list_page smallint not null check (list_page between 1 and 50),
  home_score smallint check (home_score between 0 and 99),
  away_score smallint check (away_score between 0 and 99),
  is_ours boolean not null default false,
  match_id uuid unique references public.matches(id) on delete set null,
  state text not null default 'waiting' check (state in ('waiting','recorded','review','reviewed','error')),
  seen_hash text, applied_hash text,
  opp_own_goals smallint not null default 0 check (opp_own_goals between 0 and 99),
  checked_at timestamptz, next_check_at timestamptz,
  rechecks_left smallint not null default 0 check (rechecks_left between 0 and 7),
  fails smallint not null default 0 check (fails between 0 and 99),
  note text check (note is null or length(note) <= 2000),
  updated_at timestamptz not null default now(), updated_by text,
  primary key (league_seq, game_number),
  check ((home_score is null) = (away_score is null))
);
create index kfl_games_due_idx on public.kfl_games (next_check_at) where is_ours and next_check_at is not null;

create table public.kfl_sheet_snapshots (
  league_seq integer not null, game_number integer not null,
  hash text not null, fetched_at timestamptz not null default now(),
  html text not null check (length(html) <= 400000),
  parsed jsonb not null,
  primary key (league_seq, game_number, hash),
  foreign key (league_seq, game_number) references public.kfl_games on delete cascade
);

create table public.player_season_numbers (
  season text not null check (season ~ '^\d{4}-\d{2}$'),
  number integer not null check (number between 0 and 99),
  player_id uuid not null references public.players(id) on delete cascade,
  updated_at timestamptz not null default now(), updated_by text,
  primary key (season, number)
);

create table public.match_appearances (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  shirt_number integer not null check (shirt_number between 0 and 99),
  sheet_name text not null default '' check (length(sheet_name) <= 40),
  link text not null check (link in ('auto','confirmed','review','ignored')),
  player_id uuid references public.players(id) on delete restrict,             -- 출전 기록이 있는 선수는 지워지지 않는다
  suggested_player_id uuid references public.players(id) on delete set null,
  started boolean not null default false,                                      -- P
  bench boolean not null default false,                                        -- S
  yellow_minutes smallint[] not null default '{}',
  red_minutes smallint[] not null default '{}',
  goal_minutes smallint[] not null default '{}',
  own_goal_minutes smallint[] not null default '{}',
  note text check (note is null or length(note) <= 300),
  updated_at timestamptz not null default now(), updated_by text,
  unique (match_id, shirt_number),
  check ((link in ('auto','confirmed')) = (player_id is not null)),
  check (started or bench),
  check (cardinality(yellow_minutes) <= 2 and cardinality(red_minutes) <= 1
         and cardinality(goal_minutes) <= 13 and cardinality(own_goal_minutes) <= 13),
  check (0 <= all(yellow_minutes || red_minutes || goal_minutes || own_goal_minutes)
         and 99 >= all(yellow_minutes || red_minutes || goal_minutes || own_goal_minutes))  -- null 원소(읽을 수 없는 분)는 통과
);
create unique index match_appearances_player_once on public.match_appearances (match_id, player_id) where player_id is not null;
create index match_appearances_player_idx on public.match_appearances (player_id) where player_id is not null;

create table public.kfl_sync_state (
  id smallint primary key default 1 check (id = 1),
  running_since timestamptz, last_run_at timestamptz, last_ok_at timestamptz,
  last_error text check (last_error is null or length(last_error) <= 500),
  last_warning text check (last_warning is null or length(last_warning) <= 500),
  last_list_at timestamptz,
  list_due boolean not null default false,
  shape_error_at timestamptz,
  req_day date, req_count integer not null default 0,
  paused_until timestamptz,
  fail_streak smallint not null default 0 check (fail_streak between 0 and 20),
  club_roster jsonb, club_roster_hash text,
  club_roster_changed_at timestamptz,
  club_roster_ack_at timestamptz
);
insert into public.kfl_sync_state (id) values (1);

create table public.namu_player_docs (
  player_id uuid primary key references public.players(id) on delete cascade,
  doc text not null check (length(doc) between 1 and 100),
  updated_at timestamptz not null default now(), updated_by text
);

create view public.player_season_stats with (security_invoker = true) as
select l.competition, l.season, a.player_id,
       count(*)::int as apps,
       count(*) filter (where a.started)::int as starts,
       coalesce(sum(cardinality(a.goal_minutes)), 0)::int as goals,
       coalesce(sum(cardinality(a.yellow_minutes)), 0)::int as yellows,
       coalesce(sum(cardinality(a.red_minutes)), 0)::int as reds
from public.match_appearances a
join public.kfl_games g on g.match_id = a.match_id
join public.kfl_leagues l on l.league_seq = g.league_seq
where a.player_id is not null
group by l.competition, l.season, a.player_id;

-- 감사 기록 (kfl_sync_state, kfl_sheet_snapshots 에는 updated_* 열이 없어 달지 않는다)
create trigger kfl_clubs_audit before insert or update on public.kfl_clubs for each row execute function public.set_audit();
create trigger kfl_leagues_audit before insert or update on public.kfl_leagues for each row execute function public.set_audit();
create trigger kfl_games_audit before insert or update on public.kfl_games for each row execute function public.set_audit();
create trigger player_season_numbers_audit before insert or update on public.player_season_numbers for each row execute function public.set_audit();
create trigger match_appearances_audit before insert or update on public.match_appearances for each row execute function public.set_audit();
create trigger namu_player_docs_audit before insert or update on public.namu_player_docs for each row execute function public.set_audit();

-- 권한 (명세 1.3): 먼저 모두 거두고 필요한 것만 준다
revoke all on public.kfl_clubs, public.kfl_leagues, public.kfl_games, public.kfl_sheet_snapshots,
  public.player_season_numbers, public.match_appearances, public.kfl_sync_state, public.namu_player_docs,
  public.player_season_stats from anon, authenticated;

alter table public.kfl_clubs enable row level security;
alter table public.kfl_leagues enable row level security;
alter table public.kfl_games enable row level security;
alter table public.kfl_sheet_snapshots enable row level security;
alter table public.player_season_numbers enable row level security;
alter table public.match_appearances enable row level security;
alter table public.kfl_sync_state enable row level security;
alter table public.namu_player_docs enable row level security;

-- 공개 4표: 행은 모두 공개, 열은 grant 로 고른다 (updated_by, note, 해시 등은 anon 에서 뺀다)
create policy kfl_clubs_read on public.kfl_clubs for select to anon, authenticated using (true);
create policy kfl_leagues_read on public.kfl_leagues for select to anon, authenticated using (true);
create policy kfl_games_read on public.kfl_games for select to anon, authenticated using (true);
create policy match_appearances_read on public.match_appearances for select to anon, authenticated using (true);

grant select (club_id, fed_name, name, is_us, namu_doc) on public.kfl_clubs to anon;
grant select (league_seq, season, competition, active, stats_live) on public.kfl_leagues to anon;
grant select (league_seq, game_number, home_club, away_club, kickoff, venue, home_score, away_score, is_ours, match_id)
  on public.kfl_games to anon;
grant select (id, match_id, shirt_number, sheet_name, link, player_id, started, bench,
              yellow_minutes, red_minutes, goal_minutes, own_goal_minutes) on public.match_appearances to anon;
grant select on public.kfl_clubs, public.kfl_leagues, public.kfl_games, public.match_appearances to authenticated;
grant select on public.player_season_stats to anon, authenticated;

-- 관리자 쓰기 (owner/admin)
create policy kfl_clubs_admin_insert on public.kfl_clubs for insert to authenticated with check (public.is_admin());
create policy kfl_clubs_admin_update on public.kfl_clubs for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy kfl_clubs_admin_delete on public.kfl_clubs for delete to authenticated using (public.is_admin());
create policy kfl_leagues_admin_insert on public.kfl_leagues for insert to authenticated with check (public.is_admin());
create policy kfl_leagues_admin_update on public.kfl_leagues for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy kfl_leagues_admin_delete on public.kfl_leagues for delete to authenticated using (public.is_admin());
grant insert, update, delete on public.kfl_clubs, public.kfl_leagues to authenticated;

create policy kfl_games_admin_update on public.kfl_games for update to authenticated using (public.is_admin()) with check (public.is_admin());
grant update (state, next_check_at) on public.kfl_games to authenticated;

create policy match_appearances_admin_update on public.match_appearances for update to authenticated using (public.is_admin()) with check (public.is_admin());
grant update (link, player_id, suggested_player_id) on public.match_appearances to authenticated;

-- 관리자만 보는 표
create policy player_season_numbers_admin_read on public.player_season_numbers for select to authenticated using (public.is_admin());
create policy player_season_numbers_admin_write on public.player_season_numbers for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.player_season_numbers to authenticated;

create policy namu_player_docs_admin_read on public.namu_player_docs for select to authenticated using (public.is_admin());
create policy namu_player_docs_admin_write on public.namu_player_docs for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.namu_player_docs to authenticated;

create policy kfl_sheet_snapshots_admin_read on public.kfl_sheet_snapshots for select to authenticated using (public.is_admin());
grant select on public.kfl_sheet_snapshots to authenticated;

create policy kfl_sync_state_admin_read on public.kfl_sync_state for select to authenticated using (public.is_admin());
create policy kfl_sync_state_admin_update on public.kfl_sync_state for update to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.kfl_sync_state to authenticated;
grant update (paused_until, fail_streak, club_roster_ack_at) on public.kfl_sync_state to authenticated;

-- 호출 확인용 비밀 값 — DB 안에서 만들어 Vault 에만 둔다 (instagram-sync 와 같은 방식)
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'kfl_sync_secret', '연맹 기록 수집 예약 실행 확인용 (D-082)');

create or replace function public.kfl_sync_secret_ok(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'kfl_sync_secret' and decrypted_secret = p_secret and length(p_secret) >= 32
  );
$$;
revoke execute on function public.kfl_sync_secret_ok(text) from public, anon, authenticated;
grant execute on function public.kfl_sync_secret_ok(text) to service_role;
