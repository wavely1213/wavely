-- ============================================================
--  와벨리 — 알바 유료 상위노출/게시 타이밍 (boost)
--  Supabase > SQL Editor 에 붙여넣고 RUN. idempotent.
--  선행: 36(job_posts), 18(ad_balance/ad_ledger), 38(컬럼권한 하드닝).
--
--  무료: published_at=생성+1h, expires_at=생성+1d, 하루 1회.
--  유료(광고잔액 차감): 즉시게시·기간연장·상위노출·하루제한초과 추가게시.
--  fetchJobs가 published_at≤now AND (expires_at is null OR >now) 만 노출 → 지연게시·자동만료.
-- ============================================================

alter table public.job_posts add column if not exists published_at timestamptz default now();
alter table public.job_posts add column if not exists expires_at   timestamptz;
alter table public.job_posts add column if not exists boost_until  timestamptz;
alter table public.job_posts add column if not exists is_paid      boolean not null default false;

-- 기존 공고: 즉시 게시 처리(안 그러면 published_at null → 필터서 사라짐)
update public.job_posts set published_at = created_at where published_at is null;

create index if not exists job_posts_window_idx on public.job_posts (status, published_at, expires_at);

-- 참고: 38에서 authenticated의 job_posts UPDATE를 특정 컬럼으로만 grant → 신규 컬럼(published_at/expires_at/boost_until/is_paid/boost)은
--       authenticated가 직접 UPDATE 불가. 아래 SECURITY DEFINER RPC로만 변경(가격/차감 서버강제).

-- 오늘 올린 무료 구인글 수(하루 제한 판정)
create or replace function public.my_free_jobs_today()
returns int language sql security definer set search_path=public as $$
  select count(*)::int from public.job_posts
   where author_id = auth.uid() and kind = 'hire' and coalesce(is_paid,false) = false
     and created_at >= date_trunc('day', now());
$$;
grant execute on function public.my_free_jobs_today() to authenticated;

-- 유료 프로모션: 광고잔액(ad_balance, 무료분 우선) 차감 + 적용. pay_ad_from_balance 패턴.
--   p_action: instant(즉시게시) | extra(하루제한 초과 즉시게시) | boost(상위노출 p_days일) | extend(노출 p_days일 연장)
create or replace function public.promote_job(p_job uuid, p_action text, p_days int default 1)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); v_owner uuid; v_admin bool; v_bal int; v_free int; v_fee int; v_new int;
        v_days int := greatest(1, coalesce(p_days, 1));
begin
  if uid is null then return jsonb_build_object('ok', false, 'reason', '로그인이 필요해요'); end if;
  select author_id into v_owner from public.job_posts where id = p_job;
  if v_owner is null or v_owner <> uid then return jsonb_build_object('ok', false, 'reason', '본인 공고만 가능해요'); end if;

  v_fee := case p_action
    when 'instant' then 1000
    when 'extra'   then 1000
    when 'boost'   then 3000 * v_days
    when 'extend'  then 500 * v_days
    else -1 end;
  if v_fee < 0 then return jsonb_build_object('ok', false, 'reason', '알 수 없는 항목'); end if;

  select coalesce(is_admin,false), coalesce(ad_balance,0), coalesce(ad_free,0)
    into v_admin, v_bal, v_free from public.profiles where id = uid for update;

  if not v_admin then
    if v_bal < v_fee then
      return jsonb_build_object('ok', false, 'reason', '광고잔액이 부족해요', 'balance', v_bal, 'need', v_fee);
    end if;
    v_new := v_bal - v_fee;
    update public.profiles set ad_balance = v_new, ad_free = greatest(0, v_free - v_fee) where id = uid;  -- 무료분 우선
    insert into public.ad_ledger(user_id, type, amount, balance_after, ref, memo)
      values (uid, 'deduct', -v_fee, v_new, p_job::text, '알바 ' || p_action);
  else
    v_new := v_bal;  -- 관리자 무제한
  end if;

  if p_action in ('instant', 'extra') then
    update public.job_posts set published_at = now(), is_paid = true where id = p_job;
  elsif p_action = 'boost' then
    update public.job_posts
       set boost = greatest(coalesce(boost,0), 100),
           boost_until = greatest(coalesce(boost_until, now()), now()) + (v_days || ' days')::interval,
           is_paid = true
     where id = p_job;
  elsif p_action = 'extend' then
    update public.job_posts
       set expires_at = greatest(coalesce(expires_at, now()), now()) + (v_days || ' days')::interval,
           is_paid = true
     where id = p_job;
  end if;

  return jsonb_build_object('ok', true, 'balance', v_new);
end $$;
grant execute on function public.promote_job(uuid, text, int) to authenticated;

-- 확인(선택): select public.my_free_jobs_today();  select column_name from information_schema.columns where table_name='job_posts' and column_name in ('published_at','expires_at','boost_until','is_paid');
