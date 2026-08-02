-- posts.like_count 신설 — 없어서 네 곳이 동시에 죽어 있었다.
--
-- 실측 근거: GET /rest/v1/posts?select=id,like_count
--            → 42703 "column posts.like_count does not exist"
-- schema.sql:40~47 의 posts 정의에 이 컬럼이 처음부터 없다. 그런데 참조하는 곳은 넷이다.
--   ① wavely-web fetchMyComments / fetchMyScraps  → 쿼리 전체가 400 → 마이페이지 '댓글 단 글'·'스크랩'이
--      영구 빈 화면이었다. (2026-08-03 코드에서 select 제거해 우회함 — 아래를 적용하면 되살릴 수 있다)
--   ② mapPost 의 likes: p.like_count ?? 0        → 전 화면 좋아요 수가 항상 0
--   ③ refresh_w_scores() (24_ad_auction_keywords.sql:49) → sum(like_count). **W지수의 가중치 30%가 이것**이라
--      함수가 실행되면 에러가 난다. 광고 옥션 점수에 직결된다.
--   ④ seed_community_posts.sql:11 의 insert
--
-- likes 는 폴리모픽이다: (target_type, target_id, user_id), target_id 는 대상의 UUID.
-- 글 = target_type 'post'. 매장 = 'store'. 예전에 post_id 를 가정한 트리거가 매장 좋아요에서도
-- 터진 적이 있으므로, 아래 트리거는 반드시 target_type 을 먼저 걸러낸다.

begin;

-- ── 1) 컬럼 ────────────────────────────────────────────────
alter table public.posts
  add column if not exists like_count integer not null default 0;

-- ── 2) 기존 좋아요 백필 ────────────────────────────────────
-- target_id 는 text 로 비교한다. uuid 캐스팅은 비-uuid 값이 하나라도 있으면 통째로 실패한다.
update public.posts p
   set like_count = sub.c
  from (
    select l.target_id as pid, count(*)::int as c
      from public.likes l
     where l.target_type = 'post'
     group by l.target_id
  ) sub
 where p.id::text = sub.pid
   and p.like_count is distinct from sub.c;

-- 좋아요가 하나도 없는 글은 0으로(기본값이라 사실상 no-op, 재실행 안전용)
update public.posts p set like_count = 0
 where p.like_count <> 0
   and not exists (select 1 from public.likes l where l.target_type = 'post' and l.target_id = p.id::text);

-- ── 3) 동기화 트리거 ───────────────────────────────────────
create or replace function public.likes_sync_post_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- 글이 아닌 좋아요(매장 등)는 손대지 않는다. 이 가드가 없으면 매장 좋아요에서 터진다.
  if tg_op = 'INSERT' then
    if new.target_type = 'post' then
      update public.posts set like_count = like_count + 1 where id::text = new.target_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.target_type = 'post' then
      update public.posts set like_count = greatest(0, like_count - 1) where id::text = old.target_id;
    end if;
    return old;
  end if;
  return null;
end $$;

drop trigger if exists likes_sync_post_count_ins on public.likes;
create trigger likes_sync_post_count_ins
  after insert on public.likes
  for each row execute function public.likes_sync_post_count();

drop trigger if exists likes_sync_post_count_del on public.likes;
create trigger likes_sync_post_count_del
  after delete on public.likes
  for each row execute function public.likes_sync_post_count();

-- ── 4) 권한 ────────────────────────────────────────────────
-- likes_read 정책이 이미 'select using (true)'라 좋아요 수는 공개 정보다(19_rls_followup.sql:20).
-- 컬럼 단위 GRANT 가 걸려 있으면 새 컬럼은 자동 포함되지 않으므로 명시적으로 준다.
grant select (like_count) on public.posts to anon, authenticated;

-- ── 5) 인기순 정렬용 인덱스 ────────────────────────────────
create index if not exists posts_like_count_idx on public.posts (like_count desc, created_at desc);

commit;

-- ── 확인 ───────────────────────────────────────────────────
select count(*) as 글수,
       count(*) filter (where like_count > 0) as 좋아요있는글,
       coalesce(sum(like_count), 0) as 좋아요합
  from public.posts;

-- likes 원본과 어긋난 글이 있는지(0이어야 정상)
select count(*) as 불일치
  from public.posts p
  left join (
    select target_id as pid, count(*)::int as c
      from public.likes where target_type = 'post' group by target_id
  ) l on l.pid = p.id::text
 where p.like_count is distinct from coalesce(l.c, 0);

-- 적용 후 할 일:
--  · 소비자웹은 이 컬럼을 '있으면 쓰고 없으면 건너뛰는' 방식으로 배선해 뒀다(postFeatures()).
--    이 SQL을 돌리면 재배포 없이 다음 방문부터 좋아요 수가 뜬다.
--  · refresh_w_scores() 를 한 번 돌려 W지수를 다시 계산하면 좋다: select public.refresh_w_scores();
