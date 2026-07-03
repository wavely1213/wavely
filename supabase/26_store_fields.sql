-- 26_store_fields.sql — 웹 매장등록 폼용 stores 컬럼 추가
-- Supabase SQL Editor에 Run. (미적용이어도 웹 매장등록은 코어 필드만 저장하는 graceful 폴백 있음 —
--  적용하면 추천메뉴·주차·사업자등록증까지 저장됨.)
alter table public.stores
  add column if not exists menu         text,   -- 추천메뉴
  add column if not exists parking      text,   -- 주차: 주차 가능/불가/주변 유료주차/발렛
  add column if not exists biz_cert_url text;   -- 사업자등록증 이미지 URL(관리자 인증검토용)

notify pgrst, 'reload schema';
