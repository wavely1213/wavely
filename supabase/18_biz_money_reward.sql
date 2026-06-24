-- 18_biz_money_reward.sql
-- 무료 비즈머니(적립 리워드). 단일 잔액(ad_balance) + 무료분 추적(ad_free, 1년 만료).
-- 적립: 게시글 +50(3/일)·채팅 +10(10/일)·출석 +30(1/일), 일일 총 200원 한도. 사장님(매장보유)만.
-- 무료 우선 소진: 차감 시 ad_free 먼저 감소(=유료분 보존). 만료 시 미사용 무료분을 ad_balance에서 회수.

-- 1) 컬럼
alter table public.profiles
  add column if not exists ad_free int not null default 0,
  add column if not exists ad_free_expires_at timestamptz;

-- 2) 만료 스윕(지연): 만료됐고 무료분 남았으면 ad_balance에서 회수
create or replace function public._expire_free(p_user uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  update public.profiles
     set ad_balance = greatest(0, ad_balance - ad_free), ad_free = 0, ad_free_expires_at = null
   where id = p_user and ad_free > 0 and ad_free_expires_at is not null and ad_free_expires_at < now();
end; $$;

-- 3) 적립(정의자 권한): 사장님 게이트 + 일일한도 + 적립 + 만료갱신 + 원장
create or replace function public._earn_biz(p_user uuid, p_action text)
returns int language plpgsql security definer set search_path=public as $$
declare amt int; per_cap int; cnt int; tot int; daily_cap int := 200; newbal int;
begin
  if p_user is null then return 0; end if;
  if not exists (select 1 from public.stores where owner_id = p_user) then return 0; end if;  -- 사장님만
  if    p_action='post'       then amt:=50; per_cap:=3;
  elsif p_action='chat'       then amt:=10; per_cap:=10;
  elsif p_action='attendance' then amt:=30; per_cap:=1;
  else return 0; end if;

  perform public._expire_free(p_user);

  select count(*) into cnt from public.ad_ledger
   where user_id=p_user and type='reward' and memo=p_action
     and (created_at at time zone 'Asia/Seoul')::date = (now() at time zone 'Asia/Seoul')::date;
  if cnt >= per_cap then return 0; end if;

  select coalesce(sum(amount),0) into tot from public.ad_ledger
   where user_id=p_user and type='reward'
     and (created_at at time zone 'Asia/Seoul')::date = (now() at time zone 'Asia/Seoul')::date;
  if tot + amt > daily_cap then amt := daily_cap - tot; end if;
  if amt <= 0 then return 0; end if;

  update public.profiles
     set ad_balance = ad_balance + amt, ad_free = ad_free + amt,
         ad_free_expires_at = now() + interval '365 days'
   where id = p_user
   returning ad_balance into newbal;
  insert into public.ad_ledger(user_id, type, amount, balance_after, ref, memo)
    values (p_user, 'reward', amt, newbal, p_action, p_action);
  return amt;
end; $$;

-- 4) 앱에서 호출(채팅·출석). 게시글은 트리거로 자동.
create or replace function public.earn_biz_money(p_action text)
returns int language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then return 0; end if;
  if p_action not in ('chat','attendance') then return 0; end if;  -- post는 트리거 전용
  return public._earn_biz(auth.uid(), p_action);
end; $$;
revoke all on function public.earn_biz_money(text) from anon, public;
grant execute on function public.earn_biz_money(text) to authenticated;

-- 5) 게시글 작성 트리거 → 작성자에게 적립
create or replace function public.trg_earn_post()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public._earn_biz(new.author_id, 'post');
  return new;
end; $$;
drop trigger if exists trg_earn_post_ins on public.posts;
create trigger trg_earn_post_ins after insert on public.posts
  for each row execute function public.trg_earn_post();

-- 6) 지갑 — 무료분/유료분/합계 (만료 스윕 후)
create or replace function public.my_wallet()
returns jsonb language plpgsql security definer set search_path=public as $function$
declare uid uuid := auth.uid(); res jsonb; v_admin boolean; v_bal int; v_free int; v_exp timestamptz;
begin
  if uid is null then return null; end if;
  perform public._expire_free(uid);
  select coalesce(is_admin,false), coalesce(ad_balance,0), coalesce(ad_free,0), ad_free_expires_at
    into v_admin, v_bal, v_free, v_exp from profiles where id=uid;
  select jsonb_build_object(
    'balance', v_bal,
    'free', v_free,
    'paid', greatest(0, v_bal - v_free),
    'free_expires_at', v_exp,
    'unlimited', v_admin,
    'card', (select jsonb_build_object('id',id,'card_name',card_name,'masked',card_number_masked)
             from billing_keys where user_id=uid and status='active' order by created_at desc limit 1),
    'ledger', coalesce((select jsonb_agg(jsonb_build_object('type',type,'amount',amount,'balance_after',balance_after,'memo',memo,'created_at',created_at) order by created_at desc)
             from (select * from ad_ledger where user_id=uid order by created_at desc limit 20) l),'[]'::jsonb)
  ) into res;
  return res;
end $function$;

-- 7) 차감 무료우선 — pay_ad_from_balance(배너): ad_balance 차감 시 ad_free 먼저 감소
create or replace function public.pay_ad_from_balance(p_ad_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $function$
declare uid uuid := auth.uid(); v_owner uuid; v_fee int; v_status text; v_admin boolean; v_bal int; v_new int;
begin
  if uid is null then return jsonb_build_object('ok', false, 'reason', '로그인이 필요해요'); end if;
  select owner_id, coalesce(monthly_fee,0), status into v_owner, v_fee, v_status from public.ads where id = p_ad_id;
  if not found then return jsonb_build_object('ok', false, 'reason', '광고를 찾을 수 없어요'); end if;
  if v_owner <> uid then return jsonb_build_object('ok', false, 'reason', '권한이 없어요'); end if;
  if v_status not in ('pending_payment') then return jsonb_build_object('ok', false, 'reason', '결제할 수 없는 상태예요'); end if;
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
  update public.profiles set ad_balance = v_new, ad_free = greatest(0, ad_free - v_fee) where id = uid;  -- 무료 우선
  insert into public.ad_ledger(user_id, type, amount, balance_after, ref, memo)
    values (uid, 'deduct', -v_fee, v_new, p_ad_id::text, '배너 광고비');
  update public.ads set status = 'under_review' where id = p_ad_id;
  return jsonb_build_object('ok', true, 'balance', v_new);
end $function$;

-- 8) 차감 무료우선 — log_ad_event(클릭): ad_balance 차감 시 ad_free 먼저 감소
create or replace function public.log_ad_event(p_ad_id uuid, p_type text)
returns void language plpgsql security definer set search_path=public as $function$
declare v_format text; v_status text; v_bid int; v_owner uuid; v_store uuid; v_admin boolean; v_bal int; v_new int;
begin
  if p_type not in ('impression','click') then return; end if;
  select format, status, coalesce(bid_amount,0), owner_id, store_id into v_format, v_status, v_bid, v_owner, v_store
  from public.ads where id = p_ad_id;
  if not found then return; end if;
  insert into public.ad_events(ad_id, store_id, type) values (p_ad_id, v_store, p_type);
  if p_type = 'click' and v_format = 'rank' and v_status = 'active' and v_bid > 0 then
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
