-- 23_place_photos.sql — 매장/장소 대표사진 여러 장(갤러리) 저장용 컬럼
-- ============================================================================
-- 기존 stores.photo(cover 1장) + (places엔 photo 없음)에 더해, 네이버 플레이스 대표사진을
-- 4~5장씩 크롤해 담을 배열 컬럼(photos jsonb)을 추가한다. photos[0] = cover(= 기존 photo와 동일).
-- 정책: 인증매장(biz_verified)은 사장님이 관리자웹 '매장 설정'에서 직접 사진 관리 → 수집기 백필이
--   덮어쓰지 않음(backfill_photos.py가 biz_verified 제외). 미인증 매장/카탈로그 장소만 크롤로 채움.
-- 수집기: 260616 place_collector/backfill_photos.py 가 이 컬럼에 photo(cover)+photos[] 적재.
-- Supabase SQL 에디터에서 RUN.
-- ============================================================================

-- 1) stores: 갤러리 배열(기존 photo는 cover로 유지).
alter table public.stores
  add column if not exists photos jsonb not null default '[]'::jsonb;

-- 2) places(춘천 장소 카탈로그): cover + 갤러리 둘 다 신설.
alter table public.places
  add column if not exists photo text;
alter table public.places
  add column if not exists photos jsonb not null default '[]'::jsonb;

-- 3) 공개 읽기 권한(컬럼단위 grant 환경 대비 — 비로그인 목록 사진 노출).
grant select (photos) on public.stores to anon, authenticated;
grant select (photo, photos) on public.places to anon, authenticated;

notify pgrst, 'reload schema';
