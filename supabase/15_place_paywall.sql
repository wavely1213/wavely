-- 15_place_paywall.sql
-- 플레이스 분석 요금제(3단계):
--   · 무료        : 본인 매장 분석 7일에 1회. 경쟁사 분석 불가.
--   · 월 구독(basic, ₩20,000/30일)   : 본인 매장 무제한. 경쟁사 불가.
--   · 프리미엄(premium, ₩50,000/30일): 본인 무제한 + 경쟁사 비교·분석 + 1:1 상담.
-- 유료 판정 = place_pass_until > now(). 등급 = place_plan('basic'|'premium').
-- 결제 검증 후 백엔드(service_role)가 grant_place_pass()로 등급·만료를 설정(클라 자가지급 불가).
-- 적용: Supabase SQL Editor 또는 Management API.

------------------------------------------------------------
-- 1) 이용권 컬럼: 만료일시 + 등급
------------------------------------------------------------
alter table public.profiles add column if not exists place_pass_until timestamptz;
alter table public.profiles add column if not exists place_plan text;   -- 'basic' | 'premium' | null

-- 활성 이용권(등급 무관) 여부
create or replace function public.has_place_pass(uid uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((select place_pass_until from public.profiles where id = uid) > now(), false);
$$;

-- 활성 프리미엄(경쟁사 분석 가능) 여부
create or replace function public.has_place_premium(uid uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((select place_pass_until > now() and place_plan = 'premium'
                   from public.profiles where id = uid), false);
$$;

------------------------------------------------------------
-- 2) 분석요청 쿼터 강제(트리거) — 서버측 enforcement(클라 우회 불가)
--    · 시스템 자동요청(requested_by null = 워커 갱신)은 통과
--    · 경쟁사(프로브): 프리미엄만
--    · 본인매장: 유료(basic/premium) 무제한, 무료는 7일 1회
------------------------------------------------------------
create or replace function public.enforce_place_quota()
returns trigger language plpgsql security definer set search_path=public as $$
declare paid boolean; premium boolean; probe boolean; recent_cnt int;
begin
  if new.requested_by is null then
    return new;                          -- 워커 자동갱신 등 시스템 요청 통과
  end if;
  paid    := public.has_place_pass(new.requested_by);
  premium := public.has_place_premium(new.requested_by);
  select coalesce(is_probe, false) into probe from public.stores where id = new.store_id;

  if probe then
    if not premium then
      raise exception 'PAYWALL_COMPETITOR' using errcode = 'P0001';   -- 경쟁사 = 프리미엄 전용
    end if;
    return new;
  end if;

  -- 본인 매장
  if paid then
    return new;                          -- basic/premium: 무제한
  end if;

  -- 무료: 최근 7일 내 본인 분석요청 있으면 차단
  select count(*) into recent_cnt
  from public.place_analysis_requests
  where requested_by = new.requested_by
    and requested_at > now() - interval '7 days';
  if recent_cnt >= 1 then
    raise exception 'PAYWALL_WEEKLY_LIMIT' using errcode = 'P0001';   -- 무료 7일 1회 소진
  end if;

  return new;
end; $$;

drop trigger if exists trg_place_quota on public.place_analysis_requests;
create trigger trg_place_quota before insert on public.place_analysis_requests
  for each row execute function public.enforce_place_quota();

------------------------------------------------------------
-- 3) 경쟁사(프로브) 생성·분석: 관리자 OR 프리미엄 (12_admin_probe 확장)
------------------------------------------------------------
create or replace function public.guard_store_probe()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if coalesce(new.is_probe, false)
     and not coalesce((select is_admin from public.profiles where id = auth.uid()), false)
     and not public.has_place_premium(auth.uid()) then
    raise exception '경쟁사 매장 분석은 프리미엄 구독에서 이용할 수 있어요.';
  end if;
  return new;
end; $$;
-- (트리거 trg_store_probe_ins/upd 는 12_admin_probe 에서 생성됨 — 함수 본문만 교체)

drop policy if exists par_insert on public.place_analysis_requests;
create policy par_insert on public.place_analysis_requests for insert
  with check (exists (
    select 1 from public.stores s
    where s.id = store_id and s.owner_id = auth.uid()
      and (coalesce(s.biz_verified, false)
           or coalesce((select is_admin from public.profiles where id = auth.uid()), false)
           or public.has_place_pass(auth.uid()))));

------------------------------------------------------------
-- 4) 이용권 지급 — 결제 검증 백엔드(service_role)만 호출.
--    p_plan: 'basic'(월구독) | 'premium'. p_days: 보통 30. 잔여기간 있으면 누적 연장.
------------------------------------------------------------
create or replace function public.grant_place_pass(p_user uuid, p_plan text, p_days int)
returns timestamptz language plpgsql security definer set search_path=public as $$
declare base timestamptz; newval timestamptz;
begin
  if p_plan not in ('basic', 'premium') then
    raise exception 'invalid plan: %', p_plan;
  end if;
  select greatest(coalesce(place_pass_until, now()), now()) into base
  from public.profiles where id = p_user;
  newval := base + (p_days || ' days')::interval;
  update public.profiles set place_pass_until = newval, place_plan = p_plan where id = p_user;
  return newval;
end; $$;

revoke all on function public.grant_place_pass(uuid, text, int) from public, anon, authenticated;
-- service_role 만 실행 가능(결제 검증 성공 후 서버에서 호출).

notify pgrst, 'reload schema';
