-- 2026-10-18 경기결과 영상 주소 + 우리 팀 득점자 — 종료 경기 17건 (public.matches)
-- 먼저 마이그레이션 20261018100000_match_videos_scorers.sql (highlight_url / replay_url / scorers 열)을 적용한 뒤 1회 실행한다.
-- 다시 실행하면 그사이 관리자 › 경기에서 고친 값을 아래 값으로 덮어쓴다.
--
-- ■ 영상 (replay_url / highlight_url)
-- 출처: public.postings 중 kind = 'league'(한국풋살연맹 공식 유튜브 '한국풋살연맹 - KFL', D-032), 2026-10-18 읽기 전용 조회.
--   '[LIVE] …'        = 경기 전체 생중계 → replay_url (다시보기)
--   '[하이라이트] …'  = 하이라이트       → highlight_url
--   제목 속 경기 날짜(한국 시간)와 상대 팀이 우리 경기(matches.kickoff 를 Asia/Seoul 로 본 날짜, matches.opponent)와
--   둘 다 맞을 때만 넣었다. 하루에 우리 경기는 한 경기뿐이라 겹치는 것은 없다.
--   상대 이름: 연맹 영상 제목은 '전주시민풋살클럽', matches 는 '전주시민풋살구단'(연맹 경기기록지 표기) — 같은 팀으로 보았다
--   (2025-12-14 은 같은 날 하이라이트 제목이 '전주시민풋살구단', 경기기록지 상대도 '전주시민풋살구단').
--   2026 FK CUP 3R 영상은 제목에 [LIVE] 가 없지만 연맹 채널에서 '스트리밍' 2시간 18분 15초 영상(2026-10-15 수집한 채널 검색 화면)이라 경기 전체로 보았다.
--
-- ■ 득점자 (scorers) — 우리 팀만, '이름 골수' (1골은 이름만), 골 많은 순 → 먼저 넣은 순, 쉼표로 구분
-- 출처: 한국풋살연맹 경기기록지(2025-26 FK1리그 league_seq=108 경기번호 1~43, 2026 FK CUP league_seq=113 경기번호 23), 2026-10-15 저장본.
--   기록지 '골' 칸의 득점 시각 수로 셌고, 'og'(자책골) 표시는 상대 득점이라 우리 득점자에서 뺐다.
--   경기마다 (우리 득점 + 상대 자책골) = matches.score_us, (상대 득점 + 우리 자책골) = matches.score_them 이 모두 맞는 것을 확인했다.
--   선수별 합계도 2025-26 FK1 선수 기록(출전/득점)과 같다 (김영록 10, 백승하 7, 윤창욱 4, 원해연 3, 그 밖 1골씩).
--   김대현은 동명이인 두 사람(BR-025)이라 그 경기 기록지의 등번호를 붙였다 — 김대현(No.18) / 김대현(No.8).
--   구단 인스타그램 릴스 득점 글(2026-10-17_instagram_reels.sql)과도 맞는다 (예: 12/29 릴스 'No.18 김대현', 01/21 릴스 'No.8 김대현').
--
-- 경기 (한국 시간)           | 대회/라운드        | 상대             | 스코어 | 다시보기(LIVE)  | 하이라이트       | 득점자
-- 2025-11-15 02f3015c       | 2025-26 FK1 1R    | 강원FS          | 2:5   | ZcRT9Wob-TQ   | TYf4ZnmFpQM   | 원해연, 김영록
-- 2025-11-23 deece01d       | 2025-26 FK1 2R    | 노원제너FS       | 1:7   | Oqbs0EurgH4   | IUZBJMS3SP4   | 김영록
-- 2025-12-07 d8d5fbae       | 2025-26 FK1 4R    | 경기LBFS        | 0:8   | 2Bp-HMakZCI   | 없음           | (득점 없음)
-- 2025-12-14 7ece900a       | 2025-26 FK1 5R    | 전주시민풋살구단   | 1:2   | 1O-2DyDIMr8   | tIbZ-9Bd0Qs   | 최은우
-- 2025-12-21 af0f0c94       | 2025-26 FK1 6R    | 강원FS (원정)    | 1:5   | HWu3JnKEGOU   | cuLgmb4a01U   | 김영록
-- 2025-12-28 55aa5d16       | 2025-26 FK1 3R    | 고양불스풋살클럽(원정) | 4:4 | lbpS8HPavU8 | 054M0p7-VI0   | 최진규, 김영록, 백승하, 김대현(No.18)
-- 2026-01-10 4b43f933       | 2025-26 FK1 7R    | 노원제너FS (원정)  | 1:6   | HgxX6-frozA   | 없음           | 이승민
-- 2026-01-11 bd51a515       | 2025-26 FK1 8R    | 고양불스풋살클럽   | 4:4   | XmeB8ILxMXA   | 없음           | 백승하 2, 김대현(No.8), 김영록 (최진규 자책골 1 = 상대 득점)
-- 2026-02-07 bd78ee77       | 2025-26 FK1 9R    | 경기LBFS (원정)  | 1:15  | CN5KHR-7Iug   | 없음           | 김영록 (윤창욱 자책골 1)
-- 2026-02-21 759d0aca       | 2025-26 FK1 10R   | 전주시민풋살구단(원정) | 3:0 | 없음        | 없음           | 넣지 않음 — 홈팀(전주) 몰수패 공식 기록, 기록지에 득점 없음
-- 2026-02-28 564000ee       | 2025-26 FK1 11R   | 강원FS          | 4:4   | -J605WvhPi4   | x5WShJYUYrk   | 백승하, 김경모, 윤창욱, 최태진
-- 2026-03-08 32a042d6       | 2025-26 FK1 12R   | 노원제너FS (원정)  | 2:8   | yUv2c2dTIFk   | IrR8hKc2lsg   | 원해연, 윤창욱 (박종현 자책골 1)
-- 2026-03-14 7d887bf3       | 2025-26 FK1 13R   | 고양불스풋살클럽   | 2:7   | 3FY7cxe0Ku0   | DBvZGx8eLSs   | 김영록, 원해연
-- 2026-03-21 5de62836       | 2025-26 FK1 14R   | 경기LBFS (원정)  | 1:9   | ZIBw2EgZvnE   | MJMPUXB7GXQ   | 윤창욱 (김대현(No.8) 자책골 1)
-- 2026-03-28 97dc76e9       | 2025-26 FK1 15R   | 전주시민풋살구단   | 7:5   | j6qnJgoohsU   | j0B59Yg523Y   | 백승하 3, 김영록 3, 윤창욱
-- 2026-04-04 6d7d7de0       | 2025-26 승강 PO   | 화성FS          | 3:4   | jSRqL1-wI1k   | zGnuqoldt7M   | 넣지 않음 — 저장한 연맹 기록지(승강플레이오프)가 빈 양식이라 확인 불가
-- 2026-08-25 a5991b61       | 2026 FK CUP 3R    | 인천ZD스포츠      | 3:3   | CVy3g6RNsAA   | 없음           | 김영록 2, 윤창욱 (최진규 자책골 1)
-- (영상 ID 는 https://www.youtube.com/watch?v=<ID>)
--
-- 넣지 않은 연맹 영상 (2025-11 이후): '[인터뷰] … 15R 2026/03/28 - 김영록' (Df_ofScDaRs) — 경기 영상이 아님.
-- 그 이전 시즌(2018-19 ~ 2024-25) 연맹 영상은 matches 에 그 경기가 없어 맞출 대상이 없다.
-- 참고: kind = 'news' 의 PMGSPORTS '[다시보기] 2025/12/28 고양불스풋살클럽vs서울은평 덴포스' (UnWPT1fy35I)는 연맹 채널이 아니라 쓰지 않았다 (같은 경기 연맹 [LIVE] 가 있음).

begin;

update public.matches set replay_url = 'https://www.youtube.com/watch?v=ZcRT9Wob-TQ', highlight_url = 'https://www.youtube.com/watch?v=TYf4ZnmFpQM', scorers = '원해연, 김영록'
where id = '02f3015c-17f6-491b-9600-a3ff0f94e5af'; -- 2025-11-15 1R 강원FS 2:5

update public.matches set replay_url = 'https://www.youtube.com/watch?v=Oqbs0EurgH4', highlight_url = 'https://www.youtube.com/watch?v=IUZBJMS3SP4', scorers = '김영록'
where id = 'deece01d-6d8d-458e-8cb0-36f55144fdef'; -- 2025-11-23 2R 노원제너FS 1:7

update public.matches set replay_url = 'https://www.youtube.com/watch?v=2Bp-HMakZCI'
where id = 'd8d5fbae-d57e-4351-9c91-e7c985b07bf3'; -- 2025-12-07 4R 경기LBFS 0:8 (하이라이트 없음, 득점 없음)

update public.matches set replay_url = 'https://www.youtube.com/watch?v=1O-2DyDIMr8', highlight_url = 'https://www.youtube.com/watch?v=tIbZ-9Bd0Qs', scorers = '최은우'
where id = '7ece900a-c2af-41a7-9ff4-368667440f9a'; -- 2025-12-14 5R 전주시민풋살구단 1:2

update public.matches set replay_url = 'https://www.youtube.com/watch?v=HWu3JnKEGOU', highlight_url = 'https://www.youtube.com/watch?v=cuLgmb4a01U', scorers = '김영록'
where id = 'af0f0c94-2579-4f37-a504-c276e2137e12'; -- 2025-12-21 6R 강원FS(원정) 1:5

update public.matches set replay_url = 'https://www.youtube.com/watch?v=lbpS8HPavU8', highlight_url = 'https://www.youtube.com/watch?v=054M0p7-VI0', scorers = '최진규, 김영록, 백승하, 김대현(No.18)'
where id = '55aa5d16-aaa1-4a41-be6c-878585857247'; -- 2025-12-28 3R 고양불스풋살클럽(원정) 4:4

update public.matches set replay_url = 'https://www.youtube.com/watch?v=HgxX6-frozA', scorers = '이승민'
where id = '4b43f933-b439-4a0e-9d3e-74bb5d8092e2'; -- 2026-01-10 7R 노원제너FS(원정) 1:6 (하이라이트 없음)

update public.matches set replay_url = 'https://www.youtube.com/watch?v=XmeB8ILxMXA', scorers = '백승하 2, 김대현(No.8), 김영록'
where id = 'bd51a515-a7a4-4961-9374-a5304b04e779'; -- 2026-01-11 8R 고양불스풋살클럽 4:4 (하이라이트 없음)

update public.matches set replay_url = 'https://www.youtube.com/watch?v=CN5KHR-7Iug', scorers = '김영록'
where id = 'bd78ee77-f22b-4c9b-8e44-70f1b88197ac'; -- 2026-02-07 9R 경기LBFS(원정) 1:15 (하이라이트 없음)

-- 2026-02-21 10R 전주시민풋살구단(원정) 3:0 (759d0aca-4309-4e5e-94ea-72b9d9a49f72): 몰수 경기 — 영상/득점자 없음, 고치지 않는다

update public.matches set replay_url = 'https://www.youtube.com/watch?v=-J605WvhPi4', highlight_url = 'https://www.youtube.com/watch?v=x5WShJYUYrk', scorers = '백승하, 김경모, 윤창욱, 최태진'
where id = '564000ee-867b-4762-86ef-b259319891dd'; -- 2026-02-28 11R 강원FS 4:4

update public.matches set replay_url = 'https://www.youtube.com/watch?v=yUv2c2dTIFk', highlight_url = 'https://www.youtube.com/watch?v=IrR8hKc2lsg', scorers = '원해연, 윤창욱'
where id = '32a042d6-417c-4834-a7df-e1fb088934fc'; -- 2026-03-08 12R 노원제너FS(원정) 2:8

update public.matches set replay_url = 'https://www.youtube.com/watch?v=3FY7cxe0Ku0', highlight_url = 'https://www.youtube.com/watch?v=DBvZGx8eLSs', scorers = '김영록, 원해연'
where id = '7d887bf3-421c-49be-a465-79f7a7b49002'; -- 2026-03-14 13R 고양불스풋살클럽 2:7

update public.matches set replay_url = 'https://www.youtube.com/watch?v=ZIBw2EgZvnE', highlight_url = 'https://www.youtube.com/watch?v=MJMPUXB7GXQ', scorers = '윤창욱'
where id = '5de62836-a7de-4327-8784-aaf625c4e44a'; -- 2026-03-21 14R 경기LBFS(원정) 1:9

update public.matches set replay_url = 'https://www.youtube.com/watch?v=j6qnJgoohsU', highlight_url = 'https://www.youtube.com/watch?v=j0B59Yg523Y', scorers = '백승하 3, 김영록 3, 윤창욱'
where id = '97dc76e9-36f6-40ed-a0e8-46c79dd4ec41'; -- 2026-03-28 15R 전주시민풋살구단 7:5

update public.matches set replay_url = 'https://www.youtube.com/watch?v=jSRqL1-wI1k', highlight_url = 'https://www.youtube.com/watch?v=zGnuqoldt7M'
where id = '6d7d7de0-4201-47ee-895a-5789123d669b'; -- 2026-04-04 승강 플레이오프 화성FS 3:4 (득점자 미확인)

update public.matches set replay_url = 'https://www.youtube.com/watch?v=CVy3g6RNsAA', scorers = '김영록 2, 윤창욱'
where id = 'a5991b61-6a37-4262-851f-9971edcd8ca7'; -- 2026-08-25 2026 FK CUP 3R 인천ZD스포츠 3:3 (하이라이트 없음)

commit;
