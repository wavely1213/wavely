-- 29_superadmin.sql — 슈퍼관리자(is_admin) 콘솔용 RPC + 보안 하드닝.
-- 관리자 RPC는 전부 SECURITY DEFINER + is_admin() 게이트. is_admin()은 25/28에서 생성.
-- 보안감사(적대적 8건) 반영: 데이터노출·권한상승·과금회피·정렬반전·store부스트 클로버링 차단.
-- ⚠️ Supabase SQL Editor Run. 멱등.

-- ========================================================================
-- (0) is_admin 컬럼 보장 — is_admin()이 읽는 profiles.is_admin 이 없으면 게이트가 깨짐.
--     본인 계정은 맨 아래 (Z) UPDATE 로 true 로 켜야 슈퍼콘솔이 열림.
-- ========================================================================
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- ========================================================================
-- (A) 🔐 민감컬럼 SELECT/UPDATE 잠금 (감사 HIGH: 남 잔액·관리자식별 열람 차단)
--     Supabase 기본 grant 가 테이블단위라, 남의 ad_balance/is_admin 을 로그인 유저 누구나
--     sb.from('profiles').select('ad_balance,is_admin') 로 열람 가능했음 → 컬럼단위 회수.
--     본인/관리자는 아래 RPC(my_profile / admin_list_users)로만 읽음.
-- ========================================================================
revoke select (ad_balance, is_admin) on public.profiles from authenticated, anon;
revoke update (is_admin)             on public.profiles from authenticated, anon;

-- 본인 전체행(잔액/관리자여부 포함) 읽기 — SECURITY DEFINER 라 컬럼회수 우회.
create or replace function public.my_profile()
returns json language sql stable security definer set search_path = public as $$
  select to_json(x) from (
    select p.id, p.nickname, p.role,
           coalesce(p.ad_balance, 0)   as ad_balance,
           coalesce(p.is_admin, false) as is_admin,
           coalesce(p.biz_verified, false) as biz_verified
    from public.profiles p where p.id = auth.uid()
  ) x;
$$;
revoke all on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;

-- 관리자 전용 유저목록(비즈머니 충전 대상 검색) — is_admin 게이트.
create or replace function public.admin_list_users(p_q text default null)
returns table(id uuid, nickname text, role text, ad_balance int, is_admin boolean, biz_verified boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select p.id, p.nickname, p.role,
           coalesce(p.ad_balance, 0), coalesce(p.is_admin, false), coalesce(p.biz_verified, false)
    from public.profiles p
    where p_q is null or btrim(p_q) = '' or p.nickname ilike '%' || btrim(p_q) || '%'
    order by coalesce(p.ad_balance, 0) desc
    limit 40;
end; $$;
revoke all on function public.admin_list_users(text) from public, anon;
grant execute on function public.admin_list_users(text) to authenticated;

-- ========================================================================
-- (B) 🔐 권한상승 차단(방탄 트리거) — 감사 HIGH/LOW
--     authenticated/anon 세션이 신뢰필드를 직접 INSERT/UPDATE 하면 안전값으로 강제.
--     (컬럼 grant/RLS 우회와 무관. 관리자 RPC·service_role 은 current_user 가 달라 통과.)
--     UPDATE=OLD 로 원복, INSERT=안전기본값(is_admin/biz_verified=false, ad_balance/ad_free=0).
-- ========================================================================
do $$
declare
  trust text[] := array['is_admin','ad_balance','biz_verified','role','company_id',
                        'place_plan','place_pass_until','place_pass','ad_free','ad_free_expires_at'];
  c text; upd text := ''; ins text := '';
begin
  foreach c in array trust loop
    if exists (select 1 from information_schema.columns
               where table_schema='public' and table_name='profiles' and column_name=c) then
      upd := upd || format('        new.%1$I := old.%1$I;'||chr(10), c);
      if c in ('is_admin','biz_verified') then
        ins := ins || format('        new.%1$I := false;'||chr(10), c);
      elsif c in ('ad_balance','ad_free') then
        ins := ins || format('        new.%1$I := 0;'||chr(10), c);
      elsif c in ('company_id','place_plan','place_pass_until','place_pass','ad_free_expires_at') then
        ins := ins || format('        new.%1$I := null;'||chr(10), c);
      end if;
      -- role 은 가입시 지정(guest/owner)하므로 INSERT 에서 건드리지 않음(UPDATE 는 동결).
    end if;
  end loop;
  execute format($f$
    create or replace function public.profiles_guard_privileged()
    returns trigger language plpgsql as $g$
    begin
      if current_user in ('authenticated','anon') then
        if TG_OP = 'UPDATE' then
%s        elsif TG_OP = 'INSERT' then
%s        end if;
      end if;
      return new;
    end $g$;
  $f$, upd, ins);
end $$;
drop trigger if exists trg_profiles_guard on public.profiles;
create trigger trg_profiles_guard before insert or update on public.profiles
  for each row execute function public.profiles_guard_privileged();

-- ========================================================================
-- (C) 🔐 광고 입찰가 동결 (감사 HIGH: 승인된 광고 bid_amount 를 0으로 낮춰 무료노출·CPC회피)
--     authenticated/anon 세션이 active 광고의 bid_amount/monthly_fee 를 바꾸면 원복.
--     (관리자 RPC 는 SECURITY DEFINER 라 통과. headline 등 다른 필드 수정은 정상.)
-- ========================================================================
create or replace function public.ads_guard_active_bid()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated','anon') and old.status = 'active' then
    new.bid_amount  := old.bid_amount;
    new.monthly_fee := old.monthly_fee;
  end if;
  return new;
end; $$;
drop trigger if exists trg_ads_guard_bid on public.ads;
create trigger trg_ads_guard_bid before update on public.ads
  for each row execute function public.ads_guard_active_bid();

-- ad_keywords 가 있으면(24 적용시) 키워드 단가도 active 광고에 대해 동결.
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='ad_keywords') then
    execute $f$
      create or replace function public.adkw_guard_bid()
      returns trigger language plpgsql as $g$
      begin
        if current_user in ('authenticated','anon')
           and exists (select 1 from public.ads a where a.id = old.ad_id and a.status='active') then
          new.bid_amount := old.bid_amount;
        end if;
        return new;
      end $g$;
    $f$;
    execute 'drop trigger if exists trg_adkw_guard_bid on public.ad_keywords';
    execute 'create trigger trg_adkw_guard_bid before update on public.ad_keywords for each row execute function public.adkw_guard_bid()';
  end if;
end $$;

-- ========================================================================
-- (D) 매장 부스트 재계산 헬퍼 — 감사 MED: 광고 하나 승인/반려/정지가 매장의 다른 활성광고
--     부스트를 덮어쓰거나 통째로 끄는 문제 해소. 매장의 '현재 active non-banner 광고' 집합에서 도출.
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
-- (1) 비즈머니(ad_balance) 임의 충전 — 관리자만.
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
  exception when others then null; end;   -- 원장 스키마 다르면 스킵(잔액반영은 유지)
  return v_after;
end; $$;
revoke all on function public.admin_credit_ad_balance(uuid, int, text) from public, anon;
grant execute on function public.admin_credit_ad_balance(uuid, int, text) to authenticated;

-- ========================================================================
-- (2) 광고 승인·활성화 — 관리자만. ad-activate 엣지함수와 동일 계약(엣지 배포 불필요).
--     store 부스트는 recompute_store_boost 로 매장의 활성광고 집합에서 재계산(덮어쓰기 아님).
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
-- (3) 광고 반려/일시정지/재검수 — 관리자만. store 부스트는 남은 활성광고 기준 재계산.
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
-- (4) reports(신고/문의) — 관리자 SELECT 정책 + INSERT 정책 보강(감사 LOW: 순서안전).
--     09 보다 29 를 먼저 Run 해도 신고 접수(INSERT)가 막히지 않게.
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
-- (Z) ⚡ 본인 계정을 슈퍼관리자로 — 이메일만 본인 것으로 바꿔서 이 한 줄을 Run.
--     (윗부분과 따로 실행해도 됨. 이거 안 하면 슈퍼콘솔 안 보임. SQL Editor=postgres 라 트리거 통과.)
-- ========================================================================
-- update public.profiles set is_admin = true
--   where id = (select id from auth.users where email = 'mulgyeoli2@gmail.com');
