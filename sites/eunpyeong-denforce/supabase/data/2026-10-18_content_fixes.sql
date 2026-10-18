-- 2026-10-18 내용 정리 (소유자 아침 확인 후 적용 — 아직 운영 DB 에 넣지 않음, I-040 ①⑤)
-- 다시 돌려도 같은 결과가 나오게 빈 칸/정확히 그 글자일 때만 바꾼다.

-- ① 오시는 길 — 비어 있는 '대중교통'/'주차' 칸만 채운다.
--    주차: 은평구시설관리공단 주차안내(https://www.efmc.or.kr/fmcs/47) '은평다목적체육관 30대 (장애인 2대, 여성 3대, 소형 2대 포함)'
--    대중교통: 구파발역 2번 출구 도보 약 10분(구립축구장 약도 글), 버스 정류장 '은평구민체육센터앞' 7720/7734(나무위키) — 공식 자료가 아니라 소유자 확인 필요
update public.club_settings
set venue_transit = '지하철 3호선 구파발역 2번 출구에서 걸어서 약 10분 / 버스 7720, 7734번 ''은평구민체육센터앞'' 정류장 하차'
where id = 1 and venue_transit is null;

update public.club_settings
set venue_parking = '체육관 주차장 30면 (장애인 2면 포함, 은평구시설관리공단 운영)'
where id = 1 and venue_parking is null;

-- ⑤ 구단소개 팀명 변천사 연도 — 연혁('2023 팀명 서울은평 ZD스포츠 FC로 변경')과 맞춘다.
--    근거: 연맹 영상 '[하이라이트] KFL 2023 FK CUP … 서울은평나인티플러스 - 2023.07', '[하이라이트] flex 2023-24 FK LEAGUE 슈퍼리그 4R 구미FS vs 서울은평ZD스포츠 - 2023.12.09'
update public.club_settings
set intro = replace(intro, '2024-2025 ''서울은평 ZD스포츠''', '2023-2025 ''서울은평 ZD스포츠''')
where id = 1 and intro like '%2024-2025 ''서울은평 ZD스포츠''%';
