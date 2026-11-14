-- 리그순위를 시즌(대회)별로 보관 (D-020)
-- season 은 경기의 대회명과 같은 표기("2026-27 FK2리그"). 지금 시즌은 config LEAGUE.currentCompetition,
-- 나머지 시즌은 공개 리그순위 페이지의 '지난 리그' 목록에 최종 순위로 보인다.
-- 이 마이그레이션 전의 행은 2025-26 FK1리그 최종 순위다.
alter table public.standings add column season text;
update public.standings set season = '2025-26 FK1리그';
alter table public.standings alter column season set not null;
alter table public.standings add constraint standings_season_len check (length(season) between 1 and 40);
create index standings_season_idx on public.standings (season);
