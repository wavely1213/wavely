-- 주의(2026-11-14, D-082 C2): 운영 DB 는 D-072 이름 '키움증권 2026-27 FK리그1'. 새 환경에서 이 파일 뒤에 D-072 이름 변경을 먼저 실행할 것.
-- 2026-27 FK1리그 참가 6팀 — 개막 전 0점 (D-020, D-030)
-- 경기LBFS 해체로 서울은평 덴포스가 FK1(1부)로 복귀 (소유자 확인 2026-10-16). 나머지 5팀은 연맹 FK리그 구단소개 mng_FKLeagueTeam.action 의 FK1 명단.
-- 2026-27 시즌 행만 지우고 다시 넣는다 (FK2 로 넣었던 표 포함, 지난 시즌 표는 그대로). 공개 화면은 0점 동률이라 팀명 가나다순 (BR-001).
-- 개막 후 승·무·패·득실은 관리자 화면 리그순위에서 고친다.

begin;

-- 운영 실행 막기(2026-11-15 검토): 운영 DB 에는 이미 D-072 이름으로 들어가 있어, 다시 실행하면 중복 경기/표가 생긴다. 새 환경 전용.
do $$ begin
  if exists (select 1 from public.matches where competition = '키움증권 2026-27 FK리그1')
     or exists (select 1 from public.standings where season = '키움증권 2026-27 FK리그1') then
    raise exception 'D-072 이름의 2026-27 시즌이 이미 있음 — 새 환경 전용 파일 (운영 DB 에서 실행 금지)';
  end if;
end $$;

delete from public.standings where season in ('2026-27 FK1리그', '2026-27 FK2리그');
insert into public.standings (season, team, is_us) values
  ('2026-27 FK1리그', '노원제너FS', false),
  ('2026-27 FK1리그', '강원FS', false),
  ('2026-27 FK1리그', '고양불스풋살클럽', false),
  ('2026-27 FK1리그', '화성FS', false),
  ('2026-27 FK1리그', '용인지솔FS', false),  -- 2026-11-05 일정표 표기 (전 용인대흥FS, BR-030)
  ('2026-27 FK1리그', '서울은평 덴포스', true);

commit;
