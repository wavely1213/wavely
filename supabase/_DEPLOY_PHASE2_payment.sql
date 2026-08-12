-- ============================================================================
--  와벨리 PHASE-2 결제·과금 보강 SQL  (2026-07-23)
--  ⚠️ 민감(과금 로직). 사장님이 검토 후 RUN. 선행: _DEPLOY_2026-07-22.sql(24/29/32) 적용됨.
--  전부 idempotent(create or replace / add column if not exists / create table if not exists).
--
--  [P1] 클릭사기 드레인 방지 — log_ad_event에 소유자 자기클릭 제외 + (ad,actor) 30초 throttle.
--       ※ 근본책은 '노출 nonce'(active_ads_public이 발급→클릭에서 소비)지만 클라 변경이 커서 후속.
--         이건 캐주얼/자동 반복클릭 드레인을 크게 완화(IP는 위조가능·다계정 우회여지 → 완전차단 아님).
--  [P2] CPC 월예산 강제 — ads.monthly_budget 컬럼 + 월누적(KST) 초과 시 광고 pause·과금 skip.
--       ※ AdBuilder(관리자웹)가 monthly_budget을 저장하도록 하는 코드변경 별도(리포트). 월초 자동재개는 크론 후속.
--  [P3] pay_ad_from_balance 레이스 — ads 행 FOR UPDATE로 배너 잔액결제 이중차감 방지.
--  [P4] admin_activate_ad — 사장님 지정 광고기간(starts_at/ends_at) 보존(항상 30일 덮어쓰기 수정).
--  [P5] ad_spend RPC — 지출을 ad_ledger(실과금)로 합산(대시보드 KPI 추정오차·limit20 언더카운트 해소용).
-- ============================================================================


-- ========================== [P2 컬럼] ads.monthly_budget ====================
alter table public.ads add column if not exists monthly_budget int;   -- CPC 월 예산(원). null=무제한(현행)


-- ========================== [P1 테이블] ad_click_guard ======================
-- 클릭 throttle 상태(정의자 함수 log_ad_event만 접근). 직접접근 차단.
create table if not exists public.ad_click_guard (
  ad_id   uuid not null,
  actor   text not null,          -- 로그인 uid 또는 'ip:<xff>'
  last_at timestamptz not null default now(),
  primary key (ad_id, actor)
);
revoke all on public.ad_click_guard from anon, authenticated;   -- SECURITY DEFINER 함수만 사용


-- ========================== [P1+P2] log_ad_event — 이 파일에서 제거됨 ==========
-- ⛔ 여기 있던 log_ad_event 정의를 지웠다. _DEPLOY_AD_BILLING_GUARD.sql(2026-08-12)이
--    같은 함수를 더 강하게 다시 정의하는데, 이 파일을 나중에 실행하면 그 수정을 덮어써
--    구멍이 되살아난다(create or replace라 조용히 되돌아간다).
--
--    여기 있던 버전이 못 막는 것:
--      · 비로그인 throttle이 x-forwarded-for 기반 → 헤더 위조로 무력화(요청마다 새 actor)
--      · 2인자 오버로드 log_ad_event(uuid,text)가 살아 있어 p_keyword 빼고 부르면 우회
--
--    광고 과금 관련은 전부 _DEPLOY_AD_BILLING_GUARD.sql 하나만 본다.
--    이 파일은 P3(레이스)·P4(기간보존)·P5(지출 SSOT)만 담당한다.
-- ============================================================================

-- ========================== [P3] pay_ad_from_balance 레이스 =================
-- ads 행을 FOR UPDATE로 잠가 동시 2호출 이중차감 방지(두번째는 상태 재확인서 거절).
create or replace function public.pay_ad_from_balance(p_ad_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); v_owner uuid; v_fee int; v_status text; v_admin boolean; v_bal int; v_new int;
begin
  if uid is null then return jsonb_build_object('ok', false, 'reason', '로그인이 필요해요'); end if;
  select owner_id, coalesce(monthly_fee,0), status into v_owner, v_fee, v_status
    from public.ads where id = p_ad_id for update;   -- ★ 행 잠금(레이스 직렬화)
  if not found then return jsonb_build_object('ok', false, 'reason', '광고를 찾을 수 없어요'); end if;
  if v_owner <> uid then return jsonb_build_object('ok', false, 'reason', '권한이 없어요'); end if;
  if v_status not in ('pending_payment') then return jsonb_build_object('ok', false, 'reason', '이미 처리됐거나 결제할 수 없는 상태예요'); end if;
  select coalesce(is_admin,false) into v_admin from public.profiles where id = uid;
  if v_admin then
    update public.ads set status = 'under_review' where id = p_ad_id;
    insert into public.ad_ledger(user_id, type, amount, balance_after, ref, memo)
      values (uid, 'deduct', 0, coalesce((select ad_balance from public.profiles where id=uid),0), p_ad_id::text, '배너 광고비 (개발자 무제한)');
    return jsonb_build_object('ok', true, 'unlimited', true);
  end if;
  if v_fee <= 0 then return jsonb_build_object('ok', false, 'reason', '결제 금액이 올바르지 않아요'); end if;
  perform public._expire_free(uid);
  select ad_balance into v_bal from public.profiles where id = uid for update;
  v_bal := coalesce(v_bal, 0);
  if v_bal < v_fee then return jsonb_build_object('ok', false, 'reason', '잔액이 부족해요', 'balance', v_bal, 'need', v_fee); end if;
  v_new := v_bal - v_fee;
  update public.profiles set ad_balance = v_new, ad_free = greatest(0, ad_free - v_fee) where id = uid;
  insert into public.ad_ledger(user_id, type, amount, balance_after, ref, memo)
    values (uid, 'deduct', -v_fee, v_new, p_ad_id::text, '배너 광고비');
  update public.ads set status = 'under_review' where id = p_ad_id;
  return jsonb_build_object('ok', true, 'balance', v_new);
end $$;


-- ========================== [P4] admin_activate_ad 기간 보존 =================
-- 사장님이 지정한 광고 시작·종료일을 보존(미래 예약 시작 유지, 과거/미설정만 now 기준).
create or replace function public.admin_activate_ad(p_ad uuid, p_days int default 30)
returns text language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select id, store_id into r from public.ads where id = p_ad;
  if r.id is null then raise exception 'ad not found'; end if;
  update public.ads set status = 'active',
         starts_at = case when starts_at > now() then starts_at else now() end,                       -- 미래 예약 보존
         ends_at   = case when ends_at   > now() then ends_at   else now() + (p_days || ' days')::interval end
   where id = p_ad;
  perform public.recompute_store_boost(r.store_id);
  return 'active';
end $$;
revoke all on function public.admin_activate_ad(uuid, int) from public, anon;
grant execute on function public.admin_activate_ad(uuid, int) to authenticated;


-- ========================== [P5] ad_spend RPC (지출 SSOT) ====================
-- 대시보드 지출을 클릭×입찰가 추정 대신 ad_ledger(실과금) 합산으로. 소유자/관리자만.
create or replace function public.ad_spend(p_store uuid, p_from timestamptz, p_to timestamptz)
returns int language plpgsql stable security definer set search_path=public as $$
declare v int;
begin
  if not (public.is_admin() or exists (select 1 from public.stores where id = p_store and owner_id = auth.uid())) then
    raise exception 'forbidden';
  end if;
  select coalesce(sum(-l.amount),0)::int into v
    from public.ad_ledger l
    join public.ads a on a.id::text = l.ref
   where a.store_id = p_store and l.type = 'deduct'
     and l.created_at >= p_from and l.created_at < p_to;
  return v;
end $$;
revoke all on function public.ad_spend(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.ad_spend(uuid, timestamptz, timestamptz) to authenticated;

notify pgrst, 'reload schema';

-- ── (후속 메모, 코드/크론 필요 — 이 SQL만으론 미완) ──
--  · P2: 관리자웹 AdBuilder createAd가 CPC 광고에 monthly_budget 저장하도록 코드변경 필요(리포트).
--  · P2: 월예산 초과로 pause된 광고의 '월초 자동재개'는 크론(pg_cron 또는 외부)에서 처리 필요.
--  · P1: ad_click_guard 오래된 행 정리(주기적 delete where last_at < now()-1day) 크론 권장.
--  · P5: 관리자웹 대시보드 spend/월지출을 ad_spend RPC로 교체하는 코드변경 필요(리포트).
