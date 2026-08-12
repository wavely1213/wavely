-- ============================================================================
--  와벨리 — 광고 과금 드레인 차단 (2026-08-12)
--  ⚠️ 민감(과금 로직). 사장님이 검토 후 Supabase SQL Editor에서 RUN.
--  전부 idempotent. 여러 번 실행해도 안전.
--
--  왜 지금인가 — 라이브 실측:
--    비로그인 상태로 log_ad_event(p_ad_id, p_type='click')를 호출했더니 204로 받아줬다.
--    광고 ID는 active_ads_public이 공개로 뿌리므로 누구나 알 수 있다.
--    = 광고주 잔액을 외부에서 임의로 태울 수 있는 상태.
--
--  기존 _DEPLOY_PHASE2_payment.sql의 30초 throttle만으로는 부족하다:
--    비로그인 actor 식별자가 'ip:' || x-forwarded-for 인데 이 헤더는 클라이언트가 정한다.
--    요청마다 다른 값을 넣으면 throttle이 매번 새 actor로 인식해 무제한 과금된다.
--
--  이 파일이 더하는 것 = 3중 상한:
--    [A] 비로그인 클릭은 과금하지 않는다 (로깅은 유지 — 통계는 살린다)
--    [B] 광고당 시간당 과금 클릭 상한 (계정을 여러 개 만들어도 피해가 유계)
--    [C] 월예산이 비어 있으면 캡이 작동하지 않으므로 기본값을 강제
--  + [D] ad_events anon 읽기 회수 (광고 성과가 경쟁 사장님에게 보이면 안 된다)
-- ============================================================================

begin;

-- ── [0] ★ 옛 2인자 오버로드 제거 — 이걸 안 지우면 이 파일 전체가 무의미하다 ──
-- 라이브에 log_ad_event(uuid,text)와 (uuid,text,text)가 **둘 다** 존재한다(실측: 양쪽 204).
-- 18_biz_money_reward.sql:131 / 20_ad_format_billing.sql:17 이 2인자판을 만들었고
-- 24_ad_auction_keywords.sql:126 이 3인자판을 추가하면서 옛것이 남았다.
-- 3인자판만 강화하면 공격자는 p_keyword를 빼고 부르면 그만이다.
-- 3인자판의 p_keyword에 DEFAULT가 있으므로 2인자 호출도 그대로 받는다 → 지워도 앱·웹 안 깨진다.
drop function if exists public.log_ad_event(uuid, text);

-- ── [C] 월예산 기본값 — 캡이 '설정된 광고'에만 걸리면 사실상 없는 것과 같다 ──
alter table public.ads add column if not exists monthly_budget int;
-- 기존 CPC 광고 중 예산 미설정분에 보수적 기본값(30만원). 사장님이 광고별로 올리면 된다.
update public.ads set monthly_budget = 300000
 where monthly_budget is null and format in ('rank','place','infeed');
alter table public.ads alter column monthly_budget set default 300000;

-- ── [B] 광고당 시간당 과금 클릭 상한 상태 테이블 ──
create table if not exists public.ad_click_guard (
  ad_id  uuid not null,
  actor  text not null,
  last_at timestamptz not null default now(),
  primary key (ad_id, actor)
);
alter table public.ad_click_guard enable row level security;
revoke all on table public.ad_click_guard from anon, authenticated;
-- 정의자 함수(log_ad_event)만 접근한다. RLS 정책을 두지 않아 직접 접근은 전부 차단.

-- 시간당 카운터
create table if not exists public.ad_click_rate (
  ad_id   uuid not null,
  hour_at timestamptz not null,
  n       int not null default 0,
  primary key (ad_id, hour_at)
);
alter table public.ad_click_rate enable row level security;
revoke all on table public.ad_click_rate from anon, authenticated;

-- ── log_ad_event 재정의 ──
create or replace function public.log_ad_event(p_ad_id uuid, p_type text, p_keyword text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_format text; v_status text; v_bid int; v_owner uuid; v_store uuid;
  v_admin boolean; v_bal int; v_new int; v_charge int;
  v_budget int; v_month_spent int; v_actor text; v_last timestamptz;
  v_hour timestamptz; v_n int;
  -- 광고 하나가 한 시간에 과금될 수 있는 클릭 수 상한.
  -- 정상 트래픽으로 넘길 값이 아니고(춘천 로컬), 넘으면 공격이거나 이상이다.
  c_hourly_cap constant int := 60;
begin
  if p_type not in ('impression','click') then return; end if;

  select format, status, coalesce(bid_amount,0), owner_id, store_id, monthly_budget
    into v_format, v_status, v_bid, v_owner, v_store, v_budget
    from public.ads where id = p_ad_id;
  if not found then return; end if;          -- 존재하지 않는 광고 = 조용히 무시

  -- 로깅은 항상 한다(비로그인 포함). 통계와 과금은 별개다.
  insert into public.ad_events(ad_id, store_id, type, keyword)
    values (p_ad_id, v_store, p_type, p_keyword);

  if p_type <> 'click' then return; end if;
  if v_format not in ('rank','place','infeed') then return; end if;   -- CPC 포맷만 과금
  if v_status <> 'active' then return; end if;

  -- ── [A] 비로그인 클릭은 과금하지 않는다 ─────────────────────────────────
  -- IP 기반 식별은 x-forwarded-for 위조로 무력화된다(요청마다 새 actor).
  -- 로그인 사용자만 과금 대상으로 두면, 공격자는 실계정을 만들어야 하고
  -- 그건 Supabase auth 레이트리밋에 걸리며 추적도 된다.
  -- 대가: 비로그인 방문자의 정상 클릭이 과금되지 않는다(= 광고주에게 유리한 방향).
  if auth.uid() is null then return; end if;

  -- 소유자 본인 클릭 제외
  if auth.uid() = v_owner then return; end if;

  -- 30초 재클릭 throttle (같은 사람이 같은 광고를 연타)
  v_actor := auth.uid()::text;
  select last_at into v_last from public.ad_click_guard
    where ad_id = p_ad_id and actor = v_actor;
  if v_last is not null and v_last > now() - interval '30 seconds' then
    update public.ad_click_guard set last_at = now()
      where ad_id = p_ad_id and actor = v_actor;
    return;
  end if;
  insert into public.ad_click_guard(ad_id, actor, last_at) values (p_ad_id, v_actor, now())
    on conflict (ad_id, actor) do update set last_at = now();

  -- ── [B] 광고당 시간당 상한 — 다계정 우회까지 피해를 유계로 만든다 ────────
  v_hour := date_trunc('hour', now());
  insert into public.ad_click_rate(ad_id, hour_at, n) values (p_ad_id, v_hour, 1)
    on conflict (ad_id, hour_at) do update set n = public.ad_click_rate.n + 1
    returning n into v_n;
  if v_n > c_hourly_cap then return; end if;   -- 상한 초과분은 로깅만 되고 과금 안 됨

  -- 단가: 플레이스/랭크 + 키워드면 그 키워드 단가, 아니면 기본 입찰가
  if v_format in ('place','rank') and p_keyword is not null then
    select bid_amount into v_charge from public.ad_keywords
     where ad_id = p_ad_id and keyword ilike '%' || p_keyword || '%'
     order by bid_amount desc limit 1;
  end if;
  v_charge := coalesce(v_charge, v_bid);
  if v_charge <= 0 then return; end if;

  select coalesce(is_admin,false) into v_admin from public.profiles where id = v_owner;
  if v_admin then return; end if;              -- 개발자 계정 무제한

  -- ── [C] 월예산 캡(KST 기준). 초과하면 광고를 내리고 과금하지 않는다 ─────
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
  update public.profiles
     set ad_balance = v_new,
         ad_free = greatest(0, ad_free - (v_bal - v_new))
   where id = v_owner;
  insert into public.ad_ledger(user_id, type, amount, balance_after, ref, memo)
    values (v_owner, 'deduct', -(v_bal - v_new), v_new, p_ad_id::text,
            case when p_keyword is not null then '클릭 광고비 (' || p_keyword || ')'
                 else '클릭 광고비' end);
  if v_new <= 0 then                            -- 잔액 소진 → 광고 내림
    update public.ads set status = 'paused' where id = p_ad_id;
    update public.stores set is_ad = false, ad_weight = 0 where id = v_store;
  end if;
end $$;

revoke all on function public.log_ad_event(uuid, text, text) from public;
grant execute on function public.log_ad_event(uuid, text, text) to anon, authenticated;
-- anon에게도 실행은 준다 — 비로그인 노출/클릭 '통계'는 받아야 하기 때문.
-- 과금은 함수 안에서 auth.uid() is null이면 빠져나가므로 anon은 돈을 태울 수 없다.

-- ── [D] ad_events anon 읽기 회수 ────────────────────────────────────────
-- 광고 성과(노출·클릭)는 경쟁 사장님에게 보이면 안 된다. 쓰기는 정의자 함수로만 일어난다.
revoke select on table public.ad_events from anon;

commit;

-- ============================================================================
-- 남는 위험 (이 SQL로 다 막히지 않는 것 — 알고 계셔야 합니다)
--   · 실계정을 여러 개 만들어 시간당 상한(60)까지 반복하면 여전히 태울 수 있다.
--     피해는 '광고당 시간당 60클릭 × 단가'로 유계이고, 월예산 캡이 최종 천장이다.
--     완전 차단은 '노출 nonce'(active_ads_public이 1회용 토큰 발급 → 클릭에서 소비)가 필요하고
--     그건 클라이언트 3종(웹·앱·관리자)을 같이 고쳐야 해서 별건이다.
--   · 비로그인 정상 클릭은 과금되지 않는다. 광고주에게 유리한 방향이라 안전한 손실이다.
--     로그인 사용자 비중이 올라가면 자연히 회복된다.
--
-- 배포 후 확인
--   1) 비로그인으로 클릭을 쏘고 ad_ledger에 deduct가 안 생기는지
--   2) ad_events에는 기록이 남는지(통계 유지)
--   3) 로그인 상태 정상 클릭 1회 → deduct 1건, 30초 내 재클릭 → 추가 deduct 없음
--
-- 후속(코드 필요)
--   · 관리자웹 AdBuilder가 광고 생성 시 monthly_budget을 저장하도록 (지금은 기본값 30만원)
--   · 월초 자동 재개 크론 (예산 초과로 paused된 광고)
--   · ad_click_guard / ad_click_rate 오래된 행 정리 크론
-- ============================================================================
