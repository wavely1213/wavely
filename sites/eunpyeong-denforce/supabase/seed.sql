-- 초기 데이터 — 현재 src/data 의 정적 데이터와 같은 내용.
-- 선수·경기·순위는 자리표시(KNOWN_ISSUES I-002). 운영 시작 시 관리자 화면에서 교체한다.
-- 적용: 마이그레이션 다음에 SQL Editor 에서 1회 실행.

insert into public.club_settings (id, intro, contact_email, instagram_url)
values (
  1,
  E'서울은평 덴포스는 2012년 창단한 서울 은평구 연고의 풋살팀으로, 대한민국 풋살 세미프로 리그 FK리그에 참가하고 있습니다.\n\n2025-26 시즌을 앞두고 의류 브랜드 덴포스(Denforce)와 네이밍 스폰서 계약을 맺고 ''서울은평 덴포스''로 새 출발했습니다.',
  'futbol10@naver.com',
  'https://www.instagram.com/eunpyeong_denforce'
)
on conflict (id) do nothing;

insert into public.history_items (year, text, sort_order) values
  ('2025', '덴포스(Denforce) 네이밍 스폰서 계약 — 팀명 ''서울은평 덴포스''로 변경', 1),
  ('2023', '팀명 ''서울은평 ZD스포츠 FC''로 변경', 2),
  ('2021-22', 'FK리그 (1부, 슈퍼리그) 3위', 3),
  ('2021', 'FK컵 3위', 4),
  ('2020-21', 'FK리그 (1부, 슈퍼리그) 준우승', 5),
  ('2020', 'FK컵 3위 · 팀명 ''서울은평 나인티플러스 FC''로 변경', 6),
  ('2018-19', 'FK리그 (2부, 드림리그) 우승 — 1부 승격', 7),
  ('2018', 'FK컵 3위', 8),
  ('2017-18', 'FK리그 (2부, 드림리그) 준우승', 9),
  ('2012-13', 'FK리그 첫 참가', 11),
  ('2012', '''서울은평 FS'' 창단 (11월 17일)', 12);

insert into public.players (slug, number, name, position) values
  ('no-1', 1, '선수 1', 'GK'),
  ('no-12', 12, '선수 12', 'GK'),
  ('no-3', 3, '선수 3', 'FIXO'),
  ('no-4', 4, '선수 4', 'FIXO'),
  ('no-5', 5, '선수 5', 'FIXO'),
  ('no-7', 7, '선수 7', 'ALA'),
  ('no-8', 8, '선수 8', 'ALA'),
  ('no-10', 10, '선수 10', 'ALA'),
  ('no-11', 11, '선수 11', 'ALA'),
  ('no-14', 14, '선수 14', 'ALA'),
  ('no-9', 9, '선수 9', 'PIVO'),
  ('no-19', 19, '선수 19', 'PIVO');

insert into public.staff (role, name, sort_order) values
  ('감독', '장성호', 1),
  ('코치', '미정', 2),
  ('골키퍼 코치', '미정', 3),
  ('트레이너', '미정', 4);

insert into public.matches (competition, round, kickoff, venue, is_home, opponent, status, score_us, score_them) values
  ('FK리그 2026-27', '1R', '2026-10-03T15:00:00+09:00', '은평다목적체육관', true, '상대팀 A', 'finished', 4, 2),
  ('FK리그 2026-27', '2R', '2026-10-10T17:00:00+09:00', '원정 경기장', false, '상대팀 B', 'finished', 2, 2),
  ('FK리그 2026-27', '3R', '2026-10-24T15:00:00+09:00', '은평다목적체육관', true, '상대팀 C', 'scheduled', null, null),
  ('FK리그 2026-27', '4R', '2026-10-31T17:00:00+09:00', '원정 경기장', false, '상대팀 D', 'scheduled', null, null),
  ('FK리그 2026-27', '5R', '2026-11-07T15:00:00+09:00', '은평다목적체육관', true, '상대팀 E', 'scheduled', null, null);

-- 리그순위 season = 지금 시즌(config LEAGUE.currentCompetition) 자리표시
insert into public.standings (season, team, win, draw, loss, goals_for, goals_against, is_us) values
  ('2026-27 FK1리그', '서울은평 덴포스', 1, 1, 0, 6, 4, true),
  ('2026-27 FK1리그', '상대팀 A', 1, 0, 1, 5, 5, false),
  ('2026-27 FK1리그', '상대팀 B', 0, 2, 0, 3, 3, false),
  ('2026-27 FK1리그', '상대팀 C', 0, 1, 1, 2, 4, false);

insert into public.news_posts (category, title, date, thumbnail_url, summary, body) values
  ('notice', '서울은평 덴포스 공식 홈페이지 오픈 안내', '2026-10-15', null,
   '구단 공식 홈페이지가 문을 열었습니다. 경기 일정과 구단 소식을 이곳에서 전해드립니다.',
   E'구단 공식 홈페이지가 문을 열었습니다.\n\n경기 일정, 선수단, 구단 소식을 순차적으로 채워 나가겠습니다.'),
  ('news', '덴포스(Denforce)와 네이밍 스폰서 계약 체결', '2025-10-01', '/photos/kit.webp',
   '의류 브랜드 덴포스와 네이밍 스폰서 계약을 맺고 ''서울은평 덴포스''로 새 출발합니다.',
   E'서울은평 풋살팀이 의류 브랜드 덴포스(Denforce)와 네이밍 스폰서 계약을 체결했습니다.\n\n팀명은 ''서울은평 덴포스''로 변경됩니다.'),
  ('photo', '2018-19 FK리그 드림리그 우승', '2019', '/photos/hero-dreamleague-2019.webp',
   '드림리그 우승으로 1부 리그 승격을 확정했습니다.', '2018-19 FK리그 드림리그(2부) 우승 기념 사진입니다.'),
  ('photo', '2020-21 FK리그 슈퍼리그 준우승', '2021', '/photos/superleague-2021-runnerup.webp',
   '승격 첫 시즌 슈퍼리그 준우승을 차지했습니다.', '2020-21 FK리그 슈퍼리그(1부) 준우승 기념 사진입니다.'),
  ('photo', 'U-15 유소년팀 창단', '', '/photos/u15.webp',
   '아카데미 산하 U-15 유소년팀이 창단했습니다.', '서울은평 U-15 유소년팀 창단식 사진입니다.');

-- 스폰서 순서는 소유자 지시 (D-029). 로고는 관리자 화면에서 올린다 (운영 로고: Storage media/sponsors/)
insert into public.sponsors (name, tier, sort_order) values
  ('은평구', 'partner', 1),
  ('은평구체육회', 'partner', 2),
  ('은평풋살연맹', 'partner', 3),
  ('덴포스스포츠', 'naming', 4),
  ('풋살사관학교', 'partner', 5),
  ('꽁병지TV', 'partner', 6);
