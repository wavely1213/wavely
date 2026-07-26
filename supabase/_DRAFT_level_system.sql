-- ============================================================
--  와벨리 동네레벨 시스템 — DB 초안 (DRAFT, 미배포)
--  설계문서: ../LEVEL_SYSTEM_SPEC.md
--  ⚠ 검토 후 RUN. 출시/심사·결제방화벽(PHASE3) 이후 배포 권고.
--  idempotent: 재실행 안전 (add if not exists / create or replace / drop if exists).
--  실스키마 기준: likes(user_id,post_id,id) scraps(user_id,post_id,id)
--                comments(id,post_id,author_id) posts(id,author_id)
--                profiles(id,nickname,role,biz_verified,created_at,is_admin)
--                stores(owner_id,biz_verified)
-- ============================================================

-- ---------- 0) profiles 컬럼 ----------
alter table public.profiles
  add column if not exists xp bigint not null default 0,
  add column if not exists lvl int not null default 1,
  add column if not exists equipped_title text,
  add column if not exists equipped_border text;

-- ---------- 1) 원장 (일일캡·품앗이·소급회수 소스) ----------
create table if not exists public.xp_ledger (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,  -- 수령자
  actor_id   uuid references public.profiles(id) on delete set null,          -- 유발자(반응한 사람)
  source     text not null,
  delta      int  not null,
  xp_after   bigint not null,
  ref        text,
  created_at timestamptz not null default now()
);
create index if not exists xp_ledger_user_day on public.xp_ledger(user_id, created_at);
create index if not exists xp_ledger_pair_day on public.xp_ledger(user_id, actor_id, created_at);
create index if not exists xp_ledger_ref on public.xp_ledger(user_id, source, ref);

-- ---------- 2) 보유 아이템 (뱃지·칭호·테두리) ----------
create table if not exists public.user_unlocks (
  user_id   uuid not null references public.profiles(id) on delete cascade,
  kind      text not null check (kind in ('badge','title','border')),
  item_key  text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, kind, item_key)
);

-- ---------- 3) 순수 함수 (레벨 곡선/등급) ----------
-- 누적XP(Lv L 도달) = 100·(L-1) + 20·(L-1)^2
create or replace function public.xp_for_level(p_lvl int)
returns bigint language sql immutable as $$
  select (100::bigint * (greatest(p_lvl,1)-1)) + (20::bigint * (greatest(p_lvl,1)-1) * (greatest(p_lvl,1)-1));
$$;

create or replace function public.xp_to_level(p_xp bigint)
returns int language sql immutable as $$
  select greatest(1, floor((-100 + sqrt(10000 + 80 * greatest(p_xp,0)::numeric)) / 40)::int + 1);
$$;

create or replace function public.tier_for_level(p_lvl int)
returns text language sql immutable as $$
  select case
    when p_lvl >= 50 then 'diamond'
    when p_lvl >= 35 then 'platinum'
    when p_lvl >= 20 then 'gold'
    when p_lvl >= 10 then 'silver'
    else 'bronze' end;
$$;

create or replace function public.tier_rank(p_tier text)
returns int language sql immutable as $$
  select case p_tier
    when 'diamond' then 5 when 'platinum' then 4 when 'gold' then 3
    when 'silver' then 2 else 1 end;
$$;

-- ---------- 4) 언락 재평가 (뱃지·레벨칭호) ----------
create or replace function public.refresh_unlocks(p_user uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_lvl int; v_created timestamptz; v_biz boolean;
begin
  if p_user is null then return; end if;
  select coalesce(lvl,1), created_at, coalesce(biz_verified,false)
    into v_lvl, v_created, v_biz from public.profiles where id=p_user;
  if not found then return; end if;

  -- 레벨 칭호
  insert into public.user_unlocks(user_id,kind,item_key) values (p_user,'title','newbie_neighbor') on conflict do nothing;
  if v_lvl >= 10 then insert into public.user_unlocks(user_id,kind,item_key) values (p_user,'title','guardian') on conflict do nothing; end if;
  if v_lvl >= 20 then insert into public.user_unlocks(user_id,kind,item_key) values (p_user,'title','elder') on conflict do nothing; end if;

  -- 사실기반 뱃지
  if exists (select 1 from public.stores where owner_id=p_user) then
    insert into public.user_unlocks(user_id,kind,item_key) values (p_user,'badge','owner') on conflict do nothing;
  end if;
  if v_biz or exists (select 1 from public.stores where owner_id=p_user and coalesce(biz_verified,false)) then
    insert into public.user_unlocks(user_id,kind,item_key) values (p_user,'badge','biz') on conflict do nothing;
  end if;
  if v_created is not null and v_created < now() - interval '180 days' then
    insert into public.user_unlocks(user_id,kind,item_key) values (p_user,'badge','resident_6m') on conflict do nothing;
  end if;
  if exists (select 1 from public.posts p
              where p.author_id=p_user
                and (select count(*) from public.likes l where l.post_id=p.id) >= 50) then
    insert into public.user_unlocks(user_id,kind,item_key) values (p_user,'badge','popular') on conflict do nothing;
  end if;
end; $$;

-- ---------- 5) XP 적립 코어 (내부/트리거 전용) ----------
create or replace function public._add_xp(p_user uuid, p_actor uuid, p_source text, p_ref text)
returns int language plpgsql security definer set search_path=public as $$
declare
  v_delta int; v_src_cap int; v_is_recv boolean;
  v_cnt int; v_pair int; v_tot int;
  v_daily_cap int := 120; v_pair_cap int := 3;
  v_newxp bigint; v_newlvl int; v_oldlvl int; v_today date;
begin
  if p_user is null then return 0; end if;

  case p_source
    when 'like_recv'     then v_delta:=2;  v_src_cap:=30; v_is_recv:=true;
    when 'scrap_recv'    then v_delta:=4;  v_src_cap:=20; v_is_recv:=true;
    when 'comment_recv'  then v_delta:=3;  v_src_cap:=20; v_is_recv:=true;
    when 'visit_verified' then v_delta:=15; v_src_cap:=3; v_is_recv:=false;
    when 'post_write'    then v_delta:=5;  v_src_cap:=3;  v_is_recv:=false;
    when 'comment_write' then v_delta:=2;  v_src_cap:=10; v_is_recv:=false;
    when 'attendance'    then v_delta:=5;  v_src_cap:=1;  v_is_recv:=false;
    else return 0;
  end case;

  -- 받은신호 자기유발 제외 (자기 좋아요/자기 댓글)
  if v_is_recv and p_actor is not null and p_actor = p_user then return 0; end if;

  -- 신규계정 쿨다운: 이메일 미인증이면 적립 보류
  if exists (select 1 from auth.users u where u.id=p_user and u.email_confirmed_at is null) then
    return 0;
  end if;

  v_today := (now() at time zone 'Asia/Seoul')::date;

  -- 소스별 일일 캡(횟수)
  select count(*) into v_cnt from public.xp_ledger
   where user_id=p_user and source=p_source and delta>0
     and (created_at at time zone 'Asia/Seoul')::date = v_today;
  if v_cnt >= v_src_cap then return 0; end if;

  -- 품앗이 감쇠(같은 쌍 하루 한도)
  if v_is_recv and p_actor is not null then
    select count(*) into v_pair from public.xp_ledger
     where user_id=p_user and actor_id=p_actor and delta>0
       and (created_at at time zone 'Asia/Seoul')::date = v_today;
    if v_pair >= v_pair_cap then return 0; end if;
  end if;

  -- 총 일일 캡
  select coalesce(sum(delta),0) into v_tot from public.xp_ledger
   where user_id=p_user and delta>0
     and (created_at at time zone 'Asia/Seoul')::date = v_today;
  if v_tot >= v_daily_cap then return 0; end if;
  if v_tot + v_delta > v_daily_cap then v_delta := v_daily_cap - v_tot; end if;
  if v_delta <= 0 then return 0; end if;

  -- 적립 + 레벨 재계산
  update public.profiles set xp = coalesce(xp,0) + v_delta
    where id=p_user returning xp, coalesce(lvl,1) into v_newxp, v_oldlvl;
  if not found then return 0; end if;
  v_newlvl := public.xp_to_level(v_newxp);
  if v_newlvl <> v_oldlvl then
    update public.profiles set lvl=v_newlvl where id=p_user;
  end if;

  insert into public.xp_ledger(user_id, actor_id, source, delta, xp_after, ref)
    values (p_user, p_actor, p_source, v_delta, v_newxp, p_ref);

  -- 레벨업 시에만 언락 재평가(비용 절감)
  if v_newlvl <> v_oldlvl then perform public.refresh_unlocks(p_user); end if;
  return v_delta;
end; $$;

-- ---------- 6) XP 소급 회수 (삭제/블라인드) ----------
create or replace function public._reverse_xp(p_user uuid, p_source text, p_ref text)
returns void language plpgsql security definer set search_path=public as $$
declare v_amt int; v_newxp bigint;
begin
  if p_user is null or p_ref is null then return; end if;
  select delta into v_amt from public.xp_ledger
    where user_id=p_user and source=p_source and ref=p_ref and delta>0
    order by created_at limit 1;
  if v_amt is null then return; end if;
  if exists (select 1 from public.xp_ledger
              where user_id=p_user and ref=p_ref and source=p_source||'_revoke') then return; end if;
  update public.profiles set xp = greatest(0, coalesce(xp,0) - v_amt)
    where id=p_user returning xp into v_newxp;
  update public.profiles set lvl = public.xp_to_level(coalesce(v_newxp,0)) where id=p_user;
  insert into public.xp_ledger(user_id, actor_id, source, delta, xp_after, ref)
    values (p_user, null, p_source||'_revoke', -v_amt, coalesce(v_newxp,0), p_ref);
end; $$;

-- ---------- 7) 트리거 함수 ----------
create or replace function public.trg_xp_like_ins() returns trigger language plpgsql security definer set search_path=public as $$
declare v_a uuid; begin
  select author_id into v_a from public.posts where id=new.post_id;
  if v_a is not null then perform public._add_xp(v_a, new.user_id, 'like_recv', new.id::text); end if;
  return new; end; $$;
create or replace function public.trg_xp_like_del() returns trigger language plpgsql security definer set search_path=public as $$
declare v_a uuid; begin
  select author_id into v_a from public.posts where id=old.post_id;
  if v_a is not null then perform public._reverse_xp(v_a, 'like_recv', old.id::text); end if;
  return old; end; $$;

create or replace function public.trg_xp_scrap_ins() returns trigger language plpgsql security definer set search_path=public as $$
declare v_a uuid; begin
  select author_id into v_a from public.posts where id=new.post_id;
  if v_a is not null then perform public._add_xp(v_a, new.user_id, 'scrap_recv', new.id::text); end if;
  return new; end; $$;
create or replace function public.trg_xp_scrap_del() returns trigger language plpgsql security definer set search_path=public as $$
declare v_a uuid; begin
  select author_id into v_a from public.posts where id=old.post_id;
  if v_a is not null then perform public._reverse_xp(v_a, 'scrap_recv', old.id::text); end if;
  return old; end; $$;

create or replace function public.trg_xp_comment_ins() returns trigger language plpgsql security definer set search_path=public as $$
declare v_a uuid; begin
  perform public._add_xp(new.author_id, new.author_id, 'comment_write', new.id::text);
  select author_id into v_a from public.posts where id=new.post_id;
  if v_a is not null and v_a <> new.author_id then
    perform public._add_xp(v_a, new.author_id, 'comment_recv', new.id::text);
  end if;
  return new; end; $$;

create or replace function public.trg_xp_post_ins() returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public._add_xp(new.author_id, new.author_id, 'post_write', new.id::text);
  return new; end; $$;

drop trigger if exists xp_like_ins on public.likes;
create trigger xp_like_ins after insert on public.likes for each row execute function public.trg_xp_like_ins();
drop trigger if exists xp_like_del on public.likes;
create trigger xp_like_del after delete on public.likes for each row execute function public.trg_xp_like_del();

drop trigger if exists xp_scrap_ins on public.scraps;
create trigger xp_scrap_ins after insert on public.scraps for each row execute function public.trg_xp_scrap_ins();
drop trigger if exists xp_scrap_del on public.scraps;
create trigger xp_scrap_del after delete on public.scraps for each row execute function public.trg_xp_scrap_del();

drop trigger if exists xp_comment_ins on public.comments;
create trigger xp_comment_ins after insert on public.comments for each row execute function public.trg_xp_comment_ins();

drop trigger if exists xp_post_ins on public.posts;
create trigger xp_post_ins after insert on public.posts for each row execute function public.trg_xp_post_ins();

-- reviews(인증방문) XP: reviews 스키마(author 컬럼명·verified) 확인 후 활성화 — v1.1
-- create or replace function public.trg_xp_review_verify() returns trigger ... 'visit_verified' ...

-- ---------- 8) 조회/장착/수여 RPC ----------
create or replace function public.get_level_card(p_user uuid)
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare v_xp bigint; v_lvl int; v_tier text; v_cur bigint; v_next bigint; v_nick text; v_title text; v_border text;
begin
  if p_user is null then return null; end if;
  select coalesce(xp,0), coalesce(lvl,1), nickname, equipped_title, equipped_border
    into v_xp, v_lvl, v_nick, v_title, v_border from public.profiles where id=p_user;
  if not found then return null; end if;
  v_tier := public.tier_for_level(v_lvl);
  v_cur  := public.xp_for_level(v_lvl);
  v_next := public.xp_for_level(v_lvl+1);
  return jsonb_build_object(
    'nickname', v_nick, 'xp', v_xp, 'level', v_lvl, 'tier', v_tier,
    'equipped_title', v_title,
    'equipped_border', coalesce(v_border, v_tier),
    'xp_into_level', v_xp - v_cur,
    'xp_span', greatest(1, v_next - v_cur),
    'progress_pct', round(100.0 * (v_xp - v_cur) / greatest(1, v_next - v_cur))::int,
    'unlocks', coalesce((select jsonb_agg(jsonb_build_object('kind',kind,'key',item_key,'earned_at',earned_at) order by earned_at)
                          from public.user_unlocks where user_id=p_user),'[]'::jsonb)
  );
end; $$;

create or replace function public.my_level_refresh()
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return null; end if;
  perform public.refresh_unlocks(uid);
  return public.get_level_card(uid);
end; $$;

create or replace function public.equip_title(p_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return jsonb_build_object('ok',false,'reason','로그인이 필요해요'); end if;
  if p_key is not null and not exists (select 1 from public.user_unlocks where user_id=uid and kind='title' and item_key=p_key) then
    return jsonb_build_object('ok',false,'reason','보유하지 않은 칭호예요');
  end if;
  update public.profiles set equipped_title=p_key where id=uid;
  return jsonb_build_object('ok',true,'equipped_title',p_key);
end; $$;

create or replace function public.equip_border(p_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); v_lvl int; v_tier text;
begin
  if uid is null then return jsonb_build_object('ok',false,'reason','로그인이 필요해요'); end if;
  if p_key is null then
    update public.profiles set equipped_border=null where id=uid;
    return jsonb_build_object('ok',true,'equipped_border',null);
  end if;
  select coalesce(lvl,1) into v_lvl from public.profiles where id=uid;
  v_tier := public.tier_for_level(v_lvl);
  if p_key in ('bronze','silver','gold','platinum','diamond') then
    if public.tier_rank(p_key) > public.tier_rank(v_tier) then
      return jsonb_build_object('ok',false,'reason','아직 도달하지 못한 등급이에요');
    end if;
  elsif not exists (select 1 from public.user_unlocks where user_id=uid and kind='border' and item_key=p_key) then
    return jsonb_build_object('ok',false,'reason','보유하지 않은 테두리예요');
  end if;
  update public.profiles set equipped_border=p_key where id=uid;
  return jsonb_build_object('ok',true,'equipped_border',p_key);
end; $$;

create or replace function public.admin_grant_item(p_user uuid, p_kind text, p_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not coalesce((select is_admin from public.profiles where id=auth.uid()), false) then
    return jsonb_build_object('ok',false,'reason','권한이 없어요');
  end if;
  if p_kind not in ('badge','title','border') then return jsonb_build_object('ok',false,'reason','종류 오류'); end if;
  insert into public.user_unlocks(user_id, kind, item_key) values (p_user, p_kind, p_key) on conflict do nothing;
  return jsonb_build_object('ok',true);
end; $$;

-- ---------- 9) 권한/RLS ----------
-- 클라 직접 조작 차단(09 하드닝 패턴): xp·lvl·장착은 RPC로만
revoke update (xp, lvl, equipped_title, equipped_border) on public.profiles from authenticated;

alter table public.xp_ledger   enable row level security;
alter table public.user_unlocks enable row level security;

drop policy if exists xp_ledger_own on public.xp_ledger;
create policy xp_ledger_own on public.xp_ledger for select using (user_id = auth.uid());
drop policy if exists user_unlocks_own on public.user_unlocks;
create policy user_unlocks_own on public.user_unlocks for select using (user_id = auth.uid());
-- (남의 뱃지/레벨은 get_level_card(정의자)로만 노출)

revoke all on public.xp_ledger   from anon, authenticated;
grant  select on public.xp_ledger   to authenticated;
revoke all on public.user_unlocks from anon, authenticated;
grant  select on public.user_unlocks to authenticated;

-- 내부 함수는 클라 직접호출 차단(트리거는 소유자 권한으로 호출 가능)
revoke all on function public._add_xp(uuid,uuid,text,text)   from public, anon, authenticated;
revoke all on function public._reverse_xp(uuid,text,text)    from public, anon, authenticated;
revoke all on function public.refresh_unlocks(uuid)          from public, anon, authenticated;

-- 공개 조회(남 프로필 레벨/뱃지 표시) + 본인 조작 RPC
grant execute on function public.get_level_card(uuid) to anon, authenticated;
grant execute on function public.my_level_refresh()   to authenticated;
grant execute on function public.equip_title(text)    to authenticated;
grant execute on function public.equip_border(text)   to authenticated;
grant execute on function public.admin_grant_item(uuid,text,text) to authenticated;

notify pgrst, 'reload schema';

-- ============================================================
-- 배포 후 백필(선택): 기존 유저 레벨/뱃지 초기화
--   update public.profiles set lvl = public.xp_to_level(coalesce(xp,0));
--   -- 각 유저 refresh_unlocks 는 서버 스크립트(service_role)로 배치 실행 권장
-- ============================================================
