-- 34_coach_community_bonus.sql — 커뮤니티 활동으로 무료 AI 진단 토큰 충전.
-- 규칙: 오늘 쓴 게시글 1개=+1, 답글 3개=+1, 하루 보너스 최대 +3. 기본 5회 + 보너스 = 하루 최대 8회.
-- ⚠️ Supabase SQL Editor Run. 멱등. (33의 coach_bump_usage를 동적한도 버전으로 교체)
drop function if exists public.coach_bump_usage(uuid, int);
create or replace function public.coach_bump_usage(p_store uuid, p_base int default 5)
returns int language plpgsql security definer set search_path=public as $$
declare v int; v_owner uuid; v_posts int; v_comments int; v_bonus int; v_limit int;
begin
  select owner_id into v_owner from public.stores where id = p_store;
  -- 오늘(서버기준) 매장주가 쓴 커뮤니티 활동 → 보너스 토큰
  select count(*) into v_posts    from public.posts    where author_id = v_owner and created_at >= current_date;
  select count(*) into v_comments from public.comments where author_id = v_owner and created_at >= current_date;
  v_bonus := least(3, coalesce(v_posts, 0) + floor(coalesce(v_comments, 0) / 3.0)::int);
  v_limit := coalesce(p_base, 5) + v_bonus;
  insert into public.coach_usage(store_id, usage_date, cnt) values (p_store, current_date, 1)
  on conflict (store_id, usage_date) do update set cnt = public.coach_usage.cnt + 1
  returning cnt into v;
  if v > v_limit then return -1; end if;
  return v_limit - v;   -- 남은 횟수(기본+보너스−사용)
end $$;
revoke all on function public.coach_bump_usage(uuid, int) from public, anon, authenticated;
notify pgrst, 'reload schema';
