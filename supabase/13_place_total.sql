-- 13_place_total.sql
-- 키워드별 전체 업체수(경쟁강도) 저장 — 앱에서 키워드별 N지수 추정 표시용.
-- N1 추정 = f(전체업체수, 검색량) 이므로 키워드마다 total_biz가 필요.
alter table public.place_rankings add column if not exists total_biz int;
notify pgrst, 'reload schema';
