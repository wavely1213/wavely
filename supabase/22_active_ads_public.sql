-- 22_active_ads_public.sql — 활성 광고 공개 조회 RPC (DRAFT, 검토 후 Supabase SQL 에디터에서 RUN)
-- ============================================================================
-- 문제: ads 테이블 SELECT는 소유자/관리자 전용(RLS). 그래서 소비자웹 fetchActiveAds()의
--   직접 `from('ads').select(...)`는 "남의 광고"를 못 읽어 [] 반환 → 광고 마켓플레이스가
--   다른 사장님 광고를 전혀 노출하지 못함(현재 광고 0건이라 잠복). 또한 우리동네 목록의
--   플레이스 광고(is_ad 부스트 매장)를 클릭해도 ad_id를 알 수 없어 CPC 클릭 과금이 0이었음.
-- 해결: 입찰가/소유자/결제 정보를 빼고 '활성 광고'만 공개로 반환하는 보안정의 RPC.
--   (배너 전용 active_banners()의 일반화 버전. 렌더링 + store_id→ad_id 매핑 둘 다 이걸로 해결.)
-- 노출 필드: id, format, headline, banner_image, store_id, 매장 일부(name/category/rating/
--   review_count/address/photo). bid_amount·monthly_fee·owner_id는 절대 노출하지 않음.
-- ============================================================================
create or replace function public.active_ads_public()
returns jsonb language sql security definer set search_path=public stable as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'format', a.format,
    'headline', a.headline,
    'banner_image', a.banner_image,
    'store_id', a.store_id,
    'stores', case when s.id is null then null else jsonb_build_object(
        'name', s.name, 'category', s.category, 'rating', s.rating,
        'review_count', s.review_count, 'address', s.address, 'photo', s.photo) end
  )), '[]'::jsonb)
  from (select id, format, headline, banner_image, store_id
        from public.ads where status = 'active'
        order by created_at desc limit 50) a
  left join public.stores s on s.id = a.store_id;
$$;

revoke all on function public.active_ads_public() from public;
grant execute on function public.active_ads_public() to anon, authenticated;

notify pgrst, 'reload schema';
