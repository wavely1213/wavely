-- ============================================================
--  와벨리 — promote_job 요금을 pricing 테이블에서 읽도록 수정
--  선행: 42(job_boost / promote_job), pricing 테이블(가격설정 시스템).
--  Supabase > SQL Editor 붙여넣기 → RUN. idempotent(함수 교체만).
--
--  이유: 개발자 가격설정 시스템이 pricing(job_boost/job_extend/job_instant/job_extra)을
--        바꿔도 기존 promote_job은 3000·500·1000을 하드코딩 → 표시가와 실제 과금이 어긋남.
--        이제 단가를 pricing에서 읽고(없으면 기본값 폴백) 앱·웹 표시가와 일치.
--  변경 최소: 단가 소싱만 교체, 나머지 로직(잔액·원장·게시반영)은 42와 동일.
-- ============================================================

create or replace function public.promote_job(p_job uuid, p_action text, p_days int default 1)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); v_owner uuid; v_admin bool; v_bal int; v_free int; v_fee int; v_new int; v_unit int;
        v_days int := greatest(1, coalesce(p_days, 1));
begin
  if uid is null then return jsonb_build_object('ok', false, 'reason', '로그인이 필요해요'); end if;
  select author_id into v_owner from public.job_posts where id = p_job;
  if v_owner is null or v_owner <> uid then return jsonb_build_object('ok', false, 'reason', '본인 공고만 가능해요'); end if;

  -- 단가 = pricing 테이블(개발자 설정) 우선, 없으면 기본값. instant/extra=1회성, boost/extend=일수 비례.
  v_unit := case p_action
    when 'instant' then coalesce((select amount from public.pricing where key = 'job_instant'), 1000)
    when 'extra'   then coalesce((select amount from public.pricing where key = 'job_extra'),   1000)
    when 'boost'   then coalesce((select amount from public.pricing where key = 'job_boost'),   3000)
    when 'extend'  then coalesce((select amount from public.pricing where key = 'job_extend'),   500)
    else -1 end;
  if v_unit < 0 then return jsonb_build_object('ok', false, 'reason', '알 수 없는 항목'); end if;
  v_fee := case when p_action in ('instant', 'extra') then v_unit else v_unit * v_days end;

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

-- 확인(선택): select public.promote_job('00000000-0000-0000-0000-000000000000','boost',1);  -- 본인공고아님 reason 반환 정상
