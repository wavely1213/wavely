-- ============================================================
--  핫픽스 v2: refresh_unlocks / get_level_card 의 좋아요 집계를 다형성 스키마로 수정
--  증상: get_level_card 가 42703 "column l.post_id does not exist" 로 실패 → 레벨카드가 아예 안 뜸.
--  원인: likes 는 (target_type,target_id) 구조인데 이 함수들이 l.post_id 로 조인했음.
--  → 이미 _DRAFT_level_system.sql 을 RUN 한 경우 아래 두 함수만 다시 실행하면 됨(재실행 안전).
--     (또는 갱신된 _DRAFT_level_system.sql 전체를 다시 RUN 해도 동일)
-- ============================================================

create or replace function public.refresh_unlocks(p_user uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_lvl int; v_created timestamptz; v_biz boolean;
begin
  if p_user is null then return; end if;
  select coalesce(lvl,1), created_at, coalesce(biz_verified,false)
    into v_lvl, v_created, v_biz from public.profiles where id=p_user;
  if not found then return; end if;

  -- 레벨 칭호 — 키는 NEIGHBORHOOD_LEVEL.md §4가 정본. (이전 초안의 newbie_neighbor/elder는 스펙에 없는 키라
  -- 클라 상수표와 조인이 안 돼 도감에서 영원히 '잠김'으로 보였다.)
  insert into public.user_unlocks(user_id,kind,item_key) values (p_user,'title','rookie') on conflict do nothing;
  if v_lvl >= 10 then insert into public.user_unlocks(user_id,kind,item_key) values (p_user,'title','guardian') on conflict do nothing; end if;
  if v_lvl >= 20 then insert into public.user_unlocks(user_id,kind,item_key) values (p_user,'title','captain') on conflict do nothing; end if;

  -- 배경 해금(v3 §3-4): 레벨 도달 시 자동 지급. plain은 기본 제공이라 시드 불필요.
  insert into public.user_unlocks(user_id,kind,item_key) values (p_user,'background','wave') on conflict do nothing;
  if v_lvl >= 5  then insert into public.user_unlocks(user_id,kind,item_key) values (p_user,'background','dots') on conflict do nothing; end if;
  if v_lvl >= 15 then insert into public.user_unlocks(user_id,kind,item_key) values (p_user,'background','ripple') on conflict do nothing; end if;
  if v_lvl >= 25 then insert into public.user_unlocks(user_id,kind,item_key) values (p_user,'background','mountain') on conflict do nothing; end if;
  if v_lvl >= 40 then insert into public.user_unlocks(user_id,kind,item_key) values (p_user,'background','lake') on conflict do nothing; end if;

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
                and (select count(*) from public.likes l where l.target_type='post' and l.target_id=p.id::text) >= 50) then
    insert into public.user_unlocks(user_id,kind,item_key) values (p_user,'badge','popular') on conflict do nothing;
  end if;
  -- 업적: 댓글 작성 300 → 수다쟁이 / 받은 좋아요 누적 500 → 사랑받는 글쟁이
  -- 둘 다 스펙 §4의 **칭호**다(이전 초안은 chatterbox 키 + beloved를 badge로 넣어 도감에 안 떴다).
  if (select count(*) from public.comments where author_id=p_user) >= 300 then
    insert into public.user_unlocks(user_id,kind,item_key) values (p_user,'title','chatter') on conflict do nothing;
  end if;
  if (select count(*) from public.likes l join public.posts p on p.id=l.target_id::uuid where l.target_type='post' and p.author_id=p_user) >= 500 then
    insert into public.user_unlocks(user_id,kind,item_key) values (p_user,'title','beloved') on conflict do nothing;
  end if;
end; $$;

create or replace function public.get_level_card(p_user uuid)
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare v_xp bigint; v_lvl int; v_tier text; v_cur bigint; v_next bigint; v_nick text; v_title text; v_border text; v_bg text;
        v_created timestamptz; v_dong text;
        v_posts int; v_comments int; v_likes int;
begin
  if p_user is null then return null; end if;
  select coalesce(xp,0), coalesce(lvl,1), nickname, equipped_title, equipped_border, equipped_background, created_at, home_dong
    into v_xp, v_lvl, v_nick, v_title, v_border, v_bg, v_created, v_dong from public.profiles where id=p_user;
  if not found then return null; end if;
  v_tier := public.tier_for_level(v_lvl);
  v_cur  := public.xp_for_level(v_lvl);
  v_next := public.xp_for_level(v_lvl+1);
  -- 활동 신호(화면 B). **원테이블 count로 센다** — xp_ledger 집계는 일일캡·품앗이캡에 걸린 이벤트가
  -- 원장에 아예 안 남아서 실제 활동량보다 항상 작게 나온다.
  select count(*) into v_posts    from public.posts    where author_id=p_user;
  select count(*) into v_comments from public.comments where author_id=p_user;
  select count(*) into v_likes    from public.likes l join public.posts p on p.id=l.target_id::uuid where l.target_type='post' and p.author_id=p_user;
  return jsonb_build_object(
    'nickname', v_nick, 'xp', v_xp, 'level', v_lvl, 'tier', v_tier,
    'equipped_title', v_title,
    'equipped_border', coalesce(v_border, v_tier),
    'equipped_background', coalesce(v_bg, 'plain'),
    'xp_into_level', v_xp - v_cur,
    'xp_span', greatest(1, v_next - v_cur),
    'progress_pct', round(100.0 * (v_xp - v_cur) / greatest(1, v_next - v_cur))::int,
    'dong', v_dong, 'joined_at', v_created,
    -- 화면 B 활동 신호 존. 아직 소스 테이블이 없는 항목(인증방문·연속출석)은 **키를 내리지 않는다**
    -- → 클라가 0으로 오해해 "인증방문 0곳"을 그리지 않고 칩 자체를 생략한다.
    'activity', jsonb_build_object('posts', v_posts, 'comments', v_comments, 'likes_received', v_likes),
    'unlocks', coalesce((select jsonb_agg(jsonb_build_object('kind',kind,'key',item_key,'earned_at',earned_at) order by earned_at)
                          from public.user_unlocks where user_id=p_user),'[]'::jsonb)
  );
end; $$;

notify pgrst, 'reload schema';
