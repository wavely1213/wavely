-- 더미 매장 삭제 — "PortOne 테스트 매장"
-- 왜: 실서버 우리동네 지도에 biz_verified=true 로 떠 있었다. 인증 매장은 줌과 무관하게
--     클러스터에 묶이지 않는 규칙(app.jsx의 prio)이라, 광역 화면에서도 항상 노출됐다.
--     좌표도 37.8813/127.73 = 춘천시청(지도 기본 중심)이라 정중앙에 박혀 있었다.
-- 대상: id = b24fb184-138d-4055-83ab-34c35b8537d1 (2026-07-13 생성, naver_place_id='1000000001')
--
-- 참조 무결성: stores(id)를 참조하는 컬럼은 전부 on delete cascade 또는 set null 이다.
--   cascade  → place_rankings / place_analysis / store_managers / place_coach
--   set null → jobs(store_id)
-- 따라서 stores 한 줄만 지우면 고아 행이 남지 않는다. ads 는 스키마 정의를 찾지 못해
-- 아래에서 존재할 때만 방어적으로 먼저 지운다(FK가 cascade가 아닐 경우 대비).

begin;

-- ① 지우기 전에 무엇을 지우는지 눈으로 확인
select id, name, owner_id, biz_verified, lat, lng, created_at
from public.stores
where id = 'b24fb184-138d-4055-83ab-34c35b8537d1';

-- ② ads 테이블·컬럼이 있으면 해당 광고부터 정리
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ads' and column_name = 'store_id'
  ) then
    delete from public.ads where store_id = 'b24fb184-138d-4055-83ab-34c35b8537d1';
    raise notice 'ads 정리 완료';
  else
    raise notice 'ads.store_id 없음 — 건너뜀';
  end if;
end $$;

-- ③ 매장 삭제
delete from public.stores
where id = 'b24fb184-138d-4055-83ab-34c35b8537d1';

-- ④ 확인 — 0건이어야 한다
select count(*) as remaining
from public.stores
where id = 'b24fb184-138d-4055-83ab-34c35b8537d1';

commit;

-- 남은 더미가 더 있는지 점검(참고용). 결과가 나오면 알려주세요.
select id, name, biz_verified, naver_place_id, created_at
from public.stores
where name ilike '%test%' or name ilike '%테스트%' or name ilike '%portone%'
   or naver_place_id like '10000000%'
order by created_at;
