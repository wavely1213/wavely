-- 연맹 기록 표 확인 (D-082, 명세 1.3). 로컬 DB 전용 (운영 금지 — 테스트 행을 쓰고 지운다, 끝에 rollback).
-- 실행: 마이그레이션 + supabase/data/2026-11-14_kfl_seed.sql 뒤에 psql (postgres 사용자) 로.
--   psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/kfl-records.sql
begin;
do $$
declare
  pid uuid; mid uuid; n integer;
begin
  -- 1. kfl_sync_state, kfl_sheet_snapshots 에 audit 트리거 없음
  select count(*) into n from pg_trigger where not tgisinternal
    and tgrelid in ('public.kfl_sync_state'::regclass, 'public.kfl_sheet_snapshots'::regclass);
  if n <> 0 then raise exception '확인 1 실패: 상태/스냅샷 표에 트리거 % 개', n; end if;

  -- 2. 출전 기록이 있는 선수 삭제는 23503, 뷰 합계
  insert into public.players (slug, name, position) values ('kfl-check', '확인', 'ALA') returning id into pid;
  insert into public.matches (competition, kickoff, opponent) values ('키움증권 2026-27 FK리그1', '2027-03-01T00:00:00Z', '확인') returning id into mid;
  insert into public.kfl_games (league_seq, game_number, home_club, away_club, kickoff, list_page, is_ours, match_id)
    values (116, 999, 'eunpyeongfs', 'fsseoul', '2027-03-01T00:00:00Z', 1, true, mid);
  insert into public.match_appearances (match_id, shirt_number, link, player_id, started, goal_minutes, yellow_minutes)
    values (mid, 99, 'auto', pid, true, '{3,null}', '{10}');
  select apps * 100 + goals * 10 + yellows into n from public.player_season_stats where player_id = pid;
  if n <> 121 then raise exception '확인 2 실패: 뷰 값 % (출전 1, 골 2, 경고 1 이어야 함)', n; end if;
  begin
    delete from public.players where id = pid;
    raise exception '확인 2 실패: 출전 기록이 있는 선수가 지워짐';
  exception when foreign_key_violation then null;
  end;

  -- 3. 제약: 연결 안 된 auto 줄, P/S 없는 줄, 100분 거부
  begin
    insert into public.match_appearances (match_id, shirt_number, link, started) values (mid, 98, 'auto', true);
    raise exception '확인 3 실패: player_id 없는 auto 줄이 들어감';
  exception when check_violation then null;
  end;
  begin
    insert into public.match_appearances (match_id, shirt_number, link) values (mid, 97, 'review');
    raise exception '확인 3 실패: P/S 없는 줄이 들어감';
  exception when check_violation then null;
  end;
  begin
    insert into public.match_appearances (match_id, shirt_number, link, bench, goal_minutes) values (mid, 96, 'review', true, '{100}');
    raise exception '확인 3 실패: 100분 골이 들어감';
  exception when check_violation then null;
  end;

  -- 4. 서버 함수가 보낸 updated_by 가 남는다 (auth.uid() 없음)
  update public.kfl_games set note = 'x', updated_by = 'kfl-sync' where league_seq = 116 and game_number = 999;
  if (select updated_by from public.kfl_games where league_seq = 116 and game_number = 999) <> 'kfl-sync' then
    raise exception '확인 4 실패: updated_by';
  end if;
  raise notice 'kfl-records: ALL PASS';
end $$;
rollback;
