-- 연맹 기록 수집 시드 (D-082, 명세 docs/KFL_RECORDS_SPEC.md 1.4). 마이그레이션 20261114140000_kfl_records.sql 뒤에 실행.
-- 한 트랜잭션, 여러 번 실행해도 같다. 검사 4개 중 하나라도 실패하면 전체 취소.
-- 사이트 이름(matches.opponent, standings.team)은 절대 바꾸지 않는다. 맞지 않으면 실패로 보고만 한다.
begin;

insert into public.kfl_clubs (club_id, fed_name, name, is_us, updated_by) values
  ('eunpyeongfs', '서울은평덴포스', '서울은평 덴포스', true, 'seed'),
  ('fsseoul', '노원제너FS', '노원제너FS', false, 'seed'),
  ('gwfsclub', '강원FS', '강원FS', false, 'seed'),
  ('goyangbulls', '고양불스풋살클럽', '고양불스풋살클럽', false, 'seed'),
  ('hwaseongfs', '화성FS', '화성FS', false, 'seed'),
  -- 연맹이 옛 용인대흥FS 를 용인지솔FS 로 바꿈. 사이트는 이미 '용인지솔FS' (BR-030, 소유자 결정 10)
  ('yongintmt', '용인지솔FS', '용인지솔FS', false, 'seed')
on conflict (club_id) do nothing;

insert into public.kfl_leagues (league_seq, league_type, season, competition, active, stats_live, updated_by)
values (116, 10, '2026-27', '키움증권 2026-27 FK리그1', true, false, 'seed')  -- 대회명 D-072
on conflict (league_seq) do nothing;

-- 시즌 번호표: 이미 채워진 시즌은 건너뛴다. 활동 선수끼리 번호가 겹치면 PK 오류로 전체 실패(의도한 검사)
insert into public.player_season_numbers (season, number, player_id, updated_by)
select '2026-27', number, id, 'seed' from public.players
where is_active and number is not null
  and not exists (select 1 from public.player_season_numbers where season = '2026-27');

do $$
declare
  comp constant text := '키움증권 2026-27 FK리그1';
  missing text;
  us_name text;
  n integer;
begin
  -- 1. 상대 5팀 이름이 경기와 순위에 그대로 있다
  select string_agg(c.name, ', ') into missing from public.kfl_clubs c
  where not c.is_us and (
    not exists (select 1 from public.matches m where m.competition = comp and m.opponent = c.name)
    or not exists (select 1 from public.standings s where s.season = comp and s.team = c.name));
  if missing is not null then raise exception '시드 검사 1 실패: 경기/순위에 없는 팀 이름 %', missing; end if;

  -- 2. 우리 이름 = 순위표 우리 행
  select name into us_name from public.kfl_clubs where is_us;
  if not exists (select 1 from public.standings where season = comp and is_us and team = us_name) then
    raise exception '시드 검사 2 실패: 순위표 우리 행 이름이 % 이 아님', us_name;
  end if;

  -- 3. 동명이인 4줄은 번호로만 갈린다
  select count(*) into n from public.player_season_numbers sn join public.players p on p.id = sn.player_id
  where sn.season = '2026-27' and (sn.number, p.slug, p.name) in
    ((6, 'no-8', '김대현'), (18, 'no-18', '김대현'), (22, 'no-22', '김종호'), (30, 'kim-jongho', '김종호'));
  if n <> 4 then raise exception '시드 검사 3 실패: 동명이인 번호표 % 줄 (4 줄이어야 함)', n; end if;

  -- 4. 116 대회명 경기가 15경기
  select count(*) into n from public.matches m join public.kfl_leagues l on l.competition = m.competition where l.league_seq = 116;
  if n <> 15 then raise exception '시드 검사 4 실패: 116 경기 % 개 (15 개여야 함)', n; end if;
end $$;

commit;
