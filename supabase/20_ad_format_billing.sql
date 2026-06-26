-- 20_ad_format_billing.sql — 광고 format 어휘 불일치로 인한 과금 누수 수정 (DRAFT, 검토 후 적용)
-- ============================================================================
-- 문제: log_ad_event(18_biz_money_reward.sql)는 클릭 과금을 v_format='rank'에만 적용.
--   그런데 관리자웹(wavely-admin)은 CPC 광고를 format='place'|'infeed'로 저장 → active·노출·클릭
--   되지만 클릭당 광고비가 0원으로 차감 안 됨(무료 클릭 = 매출 누수). 앱은 'rank'를 써서 정상.
-- 수정: 클릭 과금 조건의 format을 ('rank','place','infeed')로 확장. (나머지 로직은 18과 동일)
-- ⚠️ 빌링 함수이므로 적용 전 검토. Supabase SQL 에디터에서 수동 RUN. 18의 정의를 대체함(create or replace).
--
-- ✅ 적용 가능 — 선결 조건이 이번 세션에 모두 충족됨(2026-06-26):
--   (a) 관리자웹 AdBuilder가 CPC 광고의 bid_amount에 '클릭당 단가'(플레이스 220·인피드 180, 슬라이더 조정)를
--       저장하도록 수정됨. '예산'은 예상 클릭 산정용 표시값일 뿐 DB에 안 들어감. → 클릭 1회=클릭당 단가 차감(정상).
--       부수효과로 ad_weight=round(bid/500) 도 정상화(과거 총예산 저장 때 항상 18로 포화되던 문제 해소).
--   (b) 앱(explore.tsx)·소비자웹(main.jsx)이 부스트 매장 카드 클릭 시 active_ads_public()로 store_id→ad_id를
--       매핑해 log_ad_event('click')를 호출하도록 배선됨(22_active_ads_public.sql 동반 적용 필요).
--   → 적용 순서: 18 → (19) → 20(이 파일) → 22. 셋 다 적용해야 place/infeed CPC 과금이 끝까지 동작.
-- ============================================================================
create or replace function public.log_ad_event(p_ad_id uuid, p_type text)
returns void language plpgsql security definer set search_path=public as $function$
declare v_format text; v_status text; v_bid int; v_owner uuid; v_store uuid; v_admin boolean; v_bal int; v_new int;
begin
  if p_type not in ('impression','click') then return; end if;
  select format, status, coalesce(bid_amount,0), owner_id, store_id into v_format, v_status, v_bid, v_owner, v_store
  from public.ads where id = p_ad_id;
  if not found then return; end if;
  insert into public.ad_events(ad_id, store_id, type) values (p_ad_id, v_store, p_type);
  if p_type = 'click' and v_format in ('rank','place','infeed') and v_status = 'active' and v_bid > 0 then
    select coalesce(is_admin,false) into v_admin from public.profiles where id = v_owner;
    if v_admin then return; end if;
    perform public._expire_free(v_owner);
    select ad_balance into v_bal from public.profiles where id = v_owner for update;
    v_bal := coalesce(v_bal, 0);
    v_new := greatest(v_bal - v_bid, 0);
    update public.profiles set ad_balance = v_new, ad_free = greatest(0, ad_free - (v_bal - v_new)) where id = v_owner;  -- 무료 우선
    insert into public.ad_ledger(user_id, type, amount, balance_after, ref, memo)
      values (v_owner, 'deduct', -(v_bal - v_new), v_new, p_ad_id::text, '클릭 광고비');
    if v_new <= 0 then
      update public.ads set status = 'paused' where id = p_ad_id;
      update public.stores set is_ad = false, ad_weight = 0 where id = v_store;
    end if;
  end if;
end $function$;

notify pgrst, 'reload schema';
