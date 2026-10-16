-- 2026-27 FK2리그 참가 8팀 — 개막 전 0점 (연맹 FK리그 구단소개 mng_FKLeagueTeam.action, 2026-10 기준, D-020)
-- 2026-27 FK2리그 행만 지우고 다시 넣는다 (지난 시즌 표는 그대로). 공개 화면은 0점 동률이라 팀명 가나다순 (BR-001).
-- 개막 후 승·무·패·득실은 관리자 화면 리그순위에서 고친다.

begin;

delete from public.standings where season = '2026-27 FK2리그';
insert into public.standings (season, team, is_us) values
  ('2026-27 FK2리그', '인천남동풋살클럽', false),
  ('2026-27 FK2리그', '구미FS', false),
  ('2026-27 FK2리그', '대구FS', false),
  ('2026-27 FK2리그', '전주시민풋살구단', false),
  ('2026-27 FK2리그', '드림허브군산FS', false),
  ('2026-27 FK2리그', '청주팔라시오FS', false),
  ('2026-27 FK2리그', '제천풋살클럽', false),
  ('2026-27 FK2리그', '서울은평 덴포스', true);

commit;
