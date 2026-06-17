-- 11_place_volume.sql — 키워드별 검색량(월) 표시·정렬용 컬럼
-- place_rankings 각 행(키워드)에 네이버 검색광고 월 검색량 저장. 수집기 push/워커가 적재.
alter table public.place_rankings add column if not exists search_volume int;
notify pgrst, 'reload schema';
