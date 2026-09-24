-- ============================================================
--  와벨리 — pricing: 매장 케어 패키지·방문 체험단 가격 (2026-09-23 소유자 확정)
--  2026-09-23 운영 적용 완료. 웹 저장소(wavely1213/wavely-web) 의
--  wavely-web/sql/02_pricing_care.sql 로 먼저 작성해 적용한 뒤 여기로 옮겼다(원본 그대로).
--  Supabase > SQL Editor 붙여넣기 → RUN. idempotent.
--  이후 가격 변경은 관리자(biz.mulgyeol.kr) 슈퍼관리자 → 가격 설정에서 한다.
-- ============================================================

update public.pricing
   set amount = 190000, label = '매장 케어 패키지(월)', updated_at = now()
 where key = 'care_monthly';

insert into public.pricing (key, amount, label)
select 'care_monthly', 190000, '매장 케어 패키지(월)'
 where not exists (select 1 from public.pricing where key = 'care_monthly');

update public.pricing
   set amount = 150000, label = '방문 체험단(1회, 블로거 실비 별도)', updated_at = now()
 where key = 'visit_review';

insert into public.pricing (key, amount, label)
select 'visit_review', 150000, '방문 체험단(1회, 블로거 실비 별도)'
 where not exists (select 1 from public.pricing where key = 'visit_review');

-- 확인: 두 행이 나와야 한다.
select key, amount, label from public.pricing where key in ('care_monthly', 'visit_review') order by key;
