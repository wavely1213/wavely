-- 29_superadmin.sql — 슈퍼관리자(is_admin) 콘솔용 RPC. 전부 SECURITY DEFINER + is_admin 게이트로
-- RLS/컬럼권한을 안전하게 우회(관리자만 남 잔액·광고 조작). is_admin()은 25/28에서 생성됨.
-- ⚠️ Supabase SQL Editor Run. 멱등.

-- (0) is_admin 컬럼 보장 — is_admin()이 읽는 profiles.is_admin 이 없으면 모든 게이트가 깨짐.
--     본인 계정은 하단 (5) UPDATE 로 true 로 켜야 슈퍼콘솔이 열림.
alter table public.profiles add column if not exists is_admin boolean not null default false;
grant select (is_admin) on public.profiles to authenticated;
revoke update (is_admin) on public.profiles from authenticated, anon;  -- 컬럼단위(방어선1, 아래 트리거가 진짜 방패)

-- (0-b) 🔐 권한상승 차단(방탄) — 컬럼권한/RLS 우회와 무관하게 신뢰필드를 잠금.
--   Supabase 기본 grant 는 테이블단위 UPDATE 라 컬럼 revoke 가 무효 → 일반 유저가
--   update profiles set is_admin=true where id=자기 로 갓모드 탈취 가능. 이 트리거가 그걸 막음.
--   authenticated/anon 세션이 직접 신뢰필드를 바꾸면 OLD 값으로 원복. 관리자 RPC·엣지함수는
--   SECURITY DEFINER(소유자=postgres)·service_role 로 돌아 current_user 가 authenticated 가 아니라 통과.
do $$
declare cols text[] := array['is_admin','ad_balance','biz_verified','role','company_id','place_plan','place_pass_until','place_pass'];
        c text; body text := '';
begin
  foreach c in array cols loop
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name=c) then
      body := body || format('      new.%1$I := old.%1$I;'||chr(10), c);
    end if;
  end loop;
  execute format($f$
    create or replace function public.profiles_guard_privileged()
    returns trigger language plpgsql as $g$
    begin
      if current_user in ('authenticated','anon') then
%s      end if;
      return new;
    end $g$;
  $f$, body);
end $$;
drop trigger if exists trg_profiles_guard on public.profiles;
create trigger trg_profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard_privileged();

-- (1) 비즈머니(ad_balance) 임의 충전 — 관리자만. (자가충전 차단 우회는 이 RPC로만)
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

-- (2) 광고 승인·활성화 — 관리자만. ad-activate 엣지함수와 동일 계약을 RPC로(엣지 배포 불필요).
create or replace function public.admin_activate_ad(p_ad uuid, p_days int default 30)
returns text language plpgsql security definer set search_path = public as $$
declare r record; w int;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select id, store_id, format, plan, bid_amount, monthly_fee into r from public.ads where id = p_ad;
  if r.id is null then raise exception 'ad not found'; end if;
  update public.ads set status = 'active', starts_at = now(), ends_at = now() + (p_days || ' days')::interval where id = p_ad;
  if coalesce(r.format, '') <> 'banner' then   -- 가산점형만 노출가중치(배너는 별도 슬롯)
    w := case when r.plan = 'bid' then least(round(coalesce(r.bid_amount, 0) / 500.0)::int, 18)
              when coalesce(r.monthly_fee, 0) >= 90000 then 12
              when coalesce(r.monthly_fee, 0) >= 50000 then 8 else 5 end;
    update public.stores set is_ad = true, ad_weight = w where id = r.store_id;
  end if;
  return 'active';
end; $$;
revoke all on function public.admin_activate_ad(uuid, int) from public, anon;
grant execute on function public.admin_activate_ad(uuid, int) to authenticated;

-- (3) 광고 반려/일시정지/재개대기 — 관리자만. (active화는 (2)로만)
create or replace function public.admin_set_ad_status(p_ad uuid, p_status text, p_reason text default null)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_status not in ('rejected', 'paused', 'under_review') then raise exception 'bad status'; end if;
  update public.ads set status = p_status,
         reject_reason = case when p_status = 'rejected' then p_reason else reject_reason end
   where id = p_ad;
  if p_status in ('rejected', 'paused') then
    update public.stores set is_ad = false, ad_weight = 0 where id = (select store_id from public.ads where id = p_ad);
  end if;
  return p_status;
end; $$;
revoke all on function public.admin_set_ad_status(uuid, text, text) from public, anon;
grant execute on function public.admin_set_ad_status(uuid, text, text) to authenticated;

-- (4) reports(신고/문의)를 관리자가 읽게 — RLS 정책 추가
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'reports') then
    execute 'alter table public.reports enable row level security';
    execute 'drop policy if exists reports_admin_read on public.reports';
    execute 'create policy reports_admin_read on public.reports for select to authenticated using (public.is_admin() or reporter_id = auth.uid())';
  end if;
end $$;

notify pgrst, 'reload schema';

-- (5) ⚡ 본인 계정을 슈퍼관리자로 — 이메일만 본인 것으로 바꿔서 이 한 줄을 Run.
--     (윗부분과 따로 실행해도 됨. 이거 안 하면 슈퍼콘솔 안 보임.)
-- update public.profiles set is_admin = true
--   where id = (select id from auth.users where email = 'mulgyeoli2@gmail.com');
