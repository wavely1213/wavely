-- 2026-27 FK리그1 1R 종료 순위 — 연맹 일정표(game_leagueTab03, league_seq=116) 2026-11-16 확인:
-- 노원제너FS 7:0 서울은평 덴포스, 강원FS 3:1 용인지솔FS, 고양불스풋살클럽 0:0 화성FS. played/points 는 생성 열. 2026-11-16 운영 적용.
-- (연맹 기록 자동 수집 kfl-sync 가 배포되면 순위는 일정표 스코어로 자동 계산된다 — BR-034)
begin;
with v(team, w, d, l, gf, ga) as (values
  ('노원제너FS', 1, 0, 0, 7, 0),
  ('강원FS', 1, 0, 0, 3, 1),
  ('고양불스풋살클럽', 0, 1, 0, 0, 0),
  ('화성FS', 0, 1, 0, 0, 0),
  ('용인지솔FS', 0, 0, 1, 1, 3),
  ('서울은평 덴포스', 0, 0, 1, 0, 7)
)
update public.standings s
set win = v.w, draw = v.d, loss = v.l, goals_for = v.gf, goals_against = v.ga
from v
where s.season = '키움증권 2026-27 FK리그1' and s.team = v.team;
do $$
begin
  if (select count(*) from public.standings where season = '키움증권 2026-27 FK리그1' and played = 1) <> 6 then
    raise exception '1R 순위: 6팀이 모두 1경기로 바뀌지 않음';
  end if;
end $$;
commit;
