-- ============================================================
--  와벨리 — places.n_score (우리동네 catalog 대량 N지수)
--  우리동네 리스트는 대부분 catalog `places`(5천곳). fetchStores는 limit 30이라
--  등록매장만 stores.n_score를 받음 → catalog엔 N지수가 안 닿음.
--  → places에 n_score 캐시 컬럼을 두고, 대량 드라이버(wavely_mass.py)가 직접 채움.
--  소비자웹 fetchPlaces가 이 컬럼을 읽어 랭킹에 반영(degrade-safe, 없으면 폴백).
--  Supabase > SQL Editor 붙여넣기 → RUN. idempotent.
-- ============================================================

alter table public.places add column if not exists n_score numeric not null default 0;   -- 0~2 (_n_score/calcNScore 동일 스케일)
create index if not exists places_nscore_idx on public.places (n_score desc) where n_score > 0;

notify pgrst, 'reload schema';

-- 확인(선택): select id,name,src_id,n_score from public.places where n_score > 0 order by n_score desc limit 20;
