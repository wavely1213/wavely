-- 29_superadmin.sql — 슈퍼관리자(is_admin) 콘솔용 RPC + 보안 하드닝.
-- 관리자 RPC는 전부 SECURITY DEFINER + is_admin() 게이트. is_admin()은 25/28에서 생성.
-- ⚠️ Supabase SQL Editor 에 통째로 붙여넣고 Run. 멱등(여러 번 실행 안전).
--    한 트랜잭션이라 중간에 하나라도 에러나면 전체 취소됨 → 에러 뜨면 그 메시지 그대로 알려줘.

-- ========================================================================
-- (0) is_admin 컬럼 보장 (is_admin()이 읽는 컬럼).
-- ========================================================================
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- ========================================================================
-- (A) 🔐 남 비즈머니 잔액 열람 차단 + 본인/관리자 조회 RPC
--     Supabase 기본 grant 가 테이블단위라 남의 ad_balance 를 로그인 유저 누구나 읽을 수 있었음.
-- ========================================================================
revoke select (ad_balance) on public.profiles from authenticated, anon;
revoke update (is_admin)   on public.profiles from authenticated, anon;

-- 본인 전체행(잔액/관리자여부 포함) — SECURITY DEFINER 라 컬럼회수 우회.
create or replace function public.my_profile()
returns json language sql stable security definer set search_path = public as $$
  select to_json(p) from public.profiles p where p.id = auth.uid();
$$;
revoke all on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;

-- 관리자 전용 유저목록(비즈머니 충전 대상) — is_admin 게이트.
create or replace function public.admin_list_users(p_q text default null)
returns table(id uuid, nickname text, role text, ad_balance int, is_admin boolean, biz_verified boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select p.id, p.nickname::text, p.role::text,
           coalesce(p.ad_balance, 0)::int, coalesce(p.is_admin, false), coalesce(p.biz_verified, false)
    from public.profiles p
    where p_q is null or btrim(p_q) = '' or p.nickname ilike '%' || btrim(p_q) || '%'
    order by coalesce(p.ad_balance, 0) desc
    limit 40;
end; $$;
revoke all on function public.admin_list_users(text) from public, anon;
grant execute on function public.admin_list_users(text) to authenticated;

-- ========================================================================
-- (B) 🔐 권한상승 차단 트리거 — authenticated/anon 세션이 신뢰필드를 직접 바꾸면 안전값 강제.
--     (컬럼 grant/RLS 우회와 무관. 관리자 RPC·service_role·SQL Editor 는 current_user 가 달라 통과.)
-- ========================================================================
create or replace function public.profiles_guard_privileged()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    if TG_OP = 'UPDATE' then
      new.is_admin        := old.is_admin;
      new.ad_balance      := old.ad_balance;
      new.biz_verified    := old.biz_verified;
      new.company_id      := old.company_id;
      new.place_plan      := old.place_plan;
      new.place_pass_until := old.place_pass_until;
      -- role 은 동결 안 함: 손님↔사장님 전환은 set_role 로 사용자가 바꾸는 정상 기능(권한은 biz_verified·매장소유로 게이팅).
    elsif TG_OP = 'INSERT' then
      new.is_admin     := false;
      new.biz_verified := false;
      new.ad_balance   := 0;
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_profiles_guard on public.profiles;
create trigger trg_profiles_guard before insert or update on public.profiles
  for each row execute function public.profiles_guard_privileged();

-- ========================================================================
-- (C) 🔐 승인된 광고 입찰가 동결 — 광고주가 자기 active 광고 bid 를 0으로 낮춰 무료노출·CPC회피 차단.
-- ========================================================================
create or replace function public.ads_guard_active_bid()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') and old.status = 'active' then
    new.bid_amount  := old.bid_amount;
    new.monthly_fee := old.monthly_fee;
  end if;
  return new;
end; $$;
drop trigger if exists trg_ads_guard_bid on public.ads;
create trigger trg_ads_guard_bid before update on public.ads
  for each row execute function public.ads_guard_active_bid();

-- ========================================================================
-- (D) 매장 부스트 재계산 — 광고 하나 승인/반려/정지가 매장의 다른 활성광고 부스트를
--     덮어쓰거나 끄지 않도록, 매장의 'active non-banner 광고 집합'에서 도출.
-- ========================================================================
create or replace function public.recompute_store_boost(p_store uuid)
returns void language plpgsql security definer set search_path = public as $$
declare w int;
begin
  select coalesce(max(
           case when a.plan = 'bid' then least(round(coalesce(a.bid_amount,0) / 500.0)::int, 18)
                when coalesce(a.monthly_fee,0) >= 90000 then 12
                when coalesce(a.monthly_fee,0) >= 50000 then 8 else 5 end
         ), 0)
    into w
  from public.ads a
  where a.store_id = p_store and a.status = 'active' and coalesce(a.format,'') <> 'banner';
  update public.stores set is_ad = (w > 0), ad_weight = w where id = p_store;
end; $$;

-- ========================================================================
-- (1) 비즈머니 임의 충전 — 관리자만.
-- ========================================================================
create or replace function public.admin_credit_ad_balance(p_user uuid, p_amount int, p_memo text default '관리자 충전')
returns int language plpgsql security definer set search_path = public as $$
declare v_after int;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.profiles set ad_balance = coalesce(ad_balance, 0) + p_amount where id = p_user
    returning ad_balance into v_after;
  if v_after is null then raise exception 'user not found'; end if;
  begin
    insert into public.ad_ledger(user_id, type, amount, balance_after, ref, memo)
    values (p_user, 'charge', p_amount, v_after, 'admin', p_memo);
  exception when others then null; end;
  return v_after;
end; $$;
revoke all on function public.admin_credit_ad_balance(uuid, int, text) from public, anon;
grant execute on function public.admin_credit_ad_balance(uuid, int, text) to authenticated;

-- ========================================================================
-- (2) 광고 승인·활성화 — 관리자만.
-- ========================================================================
create or replace function public.admin_activate_ad(p_ad uuid, p_days int default 30)
returns text language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select id, store_id into r from public.ads where id = p_ad;
  if r.id is null then raise exception 'ad not found'; end if;
  update public.ads set status = 'active', starts_at = now(), ends_at = now() + (p_days || ' days')::interval where id = p_ad;
  perform public.recompute_store_boost(r.store_id);
  return 'active';
end; $$;
revoke all on function public.admin_activate_ad(uuid, int) from public, anon;
grant execute on function public.admin_activate_ad(uuid, int) to authenticated;

-- ========================================================================
-- (3) 광고 반려/일시정지/재검수 — 관리자만.
-- ========================================================================
create or replace function public.admin_set_ad_status(p_ad uuid, p_status text, p_reason text default null)
returns text language plpgsql security definer set search_path = public as $$
declare v_store uuid;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_status not in ('rejected', 'paused', 'under_review') then raise exception 'bad status'; end if;
  select store_id into v_store from public.ads where id = p_ad;
  update public.ads set status = p_status,
         reject_reason = case when p_status = 'rejected' then p_reason else reject_reason end
   where id = p_ad;
  if v_store is not null then perform public.recompute_store_boost(v_store); end if;
  return p_status;
end; $$;
revoke all on function public.admin_set_ad_status(uuid, text, text) from public, anon;
grant execute on function public.admin_set_ad_status(uuid, text, text) to authenticated;

-- ========================================================================
-- (4) reports(신고/문의) — 관리자 SELECT + 신고 INSERT 정책(순서안전).
-- ========================================================================
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='reports') then
    execute 'alter table public.reports enable row level security';
    execute 'drop policy if exists reports_admin_read on public.reports';
    execute 'create policy reports_admin_read on public.reports for select to authenticated using (public.is_admin() or reporter_id = auth.uid())';
    if not exists (select 1 from pg_policies where schemaname='public' and tablename='reports' and cmd='INSERT') then
      execute 'create policy reports_insert_self on public.reports for insert to authenticated with check (reporter_id = auth.uid())';
    end if;
  end if;
end $$;

notify pgrst, 'reload schema';

-- ========================================================================
-- (Z) ⚡ 슈퍼관리자 = wavely1213@motmot.co.kr 계정 하나만. 나머지 전부 해제.
--     그 이메일로 먼저 가입돼 있어야 함(없으면 아무것도 안 바꾸고 안내만 → 현재 관리자 유지).
--     ※ 다른 이메일로 바꾸려면 아래 두 군데 이메일만 수정.
-- ========================================================================
do $$
declare v_id uuid;
begin
  select id into v_id from auth.users where email = 'wavely1213@motmot.co.kr';
  if v_id is null then
    raise notice '⚠️ wavely1213@motmot.co.kr 가 auth.users 에 없음 — 그 이메일로 먼저 가입 후 (Z) 만 다시 실행. is_admin 변경 안 함.';
  else
    update public.profiles set is_admin = false where is_admin = true and id <> v_id;
    update public.profiles set is_admin = true  where id = v_id;
    raise notice '✅ wavely1213@motmot.co.kr 만 슈퍼관리자로 설정됨.';
  end if;
end $$;
