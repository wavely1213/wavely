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


-- ========================== [P1+P2] log_ad_event 강화 =======================
-- 24판(키워드단가 과금) 기반 + (a)소유자 자기클릭 제외 (b)30초 throttle (c)월예산 캡.
create or replace function public.log_ad_event(p_ad_id uuid, p_type text, p_keyword text default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_format text; v_status text; v_bid int; v_owner uuid; v_store uuid;
        v_admin boolean; v_bal int; v_new int; v_charge int;
        v_budget int; v_month_spent int; v_actor text; v_last timestamptz;
begin
  if p_type not in ('impression','click') then return; end if;
  select format, status, coalesce(bid_amount,0), owner_id, store_id, monthly_budget
    into v_format, v_status, v_bid, v_owner, v_store, v_budget
    from public.ads where id = p_ad_id;
  if not found then return; end if;
  insert into public.ad_events(ad_id, store_id, type, keyword) values (p_ad_id, v_store, p_type, p_keyword);

  -- 과금은 CPC 포맷 클릭 + active 만
  if p_type = 'click' and v_format in ('rank','place','infeed') and v_status = 'active' then
    -- (a) 소유자 본인 클릭은 과금 제외
    if auth.uid() is not null and auth.uid() = v_owner then return; end if;

    -- (b) 클릭 throttle: 같은 actor가 같은 광고를 30초 내 재클릭하면 과금 skip(로깅은 위에서 이미 됨)
    v_actor := coalesce(auth.uid()::text,
                        'ip:' || coalesce((current_setting('request.headers', true))::json ->> 'x-forwarded-for', 'unknown'));
    select last_at into v_last from public.ad_click_guard where ad_id = p_ad_id and actor = v_actor;
    if v_last is not null and v_last > now() - interval '30 seconds' then
      update public.ad_click_guard set last_at = now() where ad_id = p_ad_id and actor = v_actor;
      return;
    end if;
    insert into public.ad_click_guard(ad_id, actor, last_at) values (p_ad_id, v_actor, now())
      on conflict (ad_id, actor) do update set last_at = now();

    -- 단가: 플레이스+키워드면 그 키워드 단가, 아니면 기본 입찰가
    if v_format in ('place','rank') and p_keyword is not null then
      select bid_amount into v_charge from public.ad_keywords
       where ad_id = p_ad_id and keyword ilike '%' || p_keyword || '%'
       order by bid_amount desc limit 1;
    end if;
    v_charge := coalesce(v_charge, v_bid);
    if v_charge <= 0 then return; end if;

    select coalesce(is_admin,false) into v_admin from public.profiles where id = v_owner;
    if v_admin then return; end if;                          -- 개발자 무제한

    -- (c) 월예산 캡(KST 월누적). 초과 시 광고 pause + 과금 skip.
    if v_budget is not null and v_budget > 0 then
      select coalesce(sum(-amount),0) into v_month_spent from public.ad_ledger
       where ref = p_ad_id::text and type = 'deduct'
         and created_at >= (date_trunc('month', (now() at time zone 'Asia/Seoul')) at time zone 'Asia/Seoul');
      if v_month_spent + v_charge > v_budget then
        update public.ads set status = 'paused' where id = p_ad_id;
        update public.stores set is_ad = false, ad_weight = 0 where id = v_store;
        return;
      end if;
    end if;

    perform public._expire_free(v_owner);
    select ad_balance into v_bal from public.profiles where id = v_owner for update;
    v_bal := coalesce(v_bal, 0);
    v_new := greatest(v_bal - v_charge, 0);
    update public.profiles set ad_balance = v_new, ad_free = greatest(0, ad_free - (v_bal - v_new)) where id = v_owner;
    insert into public.ad_ledger(user_id, type, amount, balance_after, ref, memo)
      values (v_owner, 'deduct', -(v_bal - v_new), v_new, p_ad_id::text,
              case when p_keyword is not null then '클릭 광고비 (' || p_keyword || ')' else '클릭 광고비' end);
    if v_new <= 0 then
      update public.ads set status = 'paused' where id = p_ad_id;
      update public.stores set is_ad = false, ad_weight = 0 where id = v_store;
    end if;
  end if;
end $$;
revoke all on function public.log_ad_event(uuid, text, text) from public;
grant execute on function public.log_ad_event(uuid, text, text) to anon, authenticated;


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
