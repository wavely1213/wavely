-- 2026-27 FK1리그 참가 6팀 — 개막 전 0점 (D-020, D-030)
-- 경기LBFS 해체로 서울은평 덴포스가 FK1(1부)로 복귀 (소유자 확인 2026-10-16). 나머지 5팀은 연맹 FK리그 구단소개 mng_FKLeagueTeam.action 의 FK1 명단.
-- 2026-27 시즌 행만 지우고 다시 넣는다 (FK2 로 넣었던 표 포함, 지난 시즌 표는 그대로). 공개 화면은 0점 동률이라 팀명 가나다순 (BR-001).
-- 개막 후 승·무·패·득실은 관리자 화면 리그순위에서 고친다.

begin;

delete from public.standings where season in ('2026-27 FK1리그', '2026-27 FK2리그');
insert into public.standings (season, team, is_us) values
  ('2026-27 FK1리그', '노원제너FS', false),
  ('2026-27 FK1리그', '강원FS', false),
  ('2026-27 FK1리그', '고양불스풋살클럽', false),
  ('2026-27 FK1리그', '화성FS', false),
  ('2026-27 FK1리그', '용인대흥FS', false),
  ('2026-27 FK1리그', '서울은평 덴포스', true);

commit;
