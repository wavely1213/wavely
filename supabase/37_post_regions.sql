-- 37_post_regions.sql — 게시글 지역 다중태그(주소지 + 희망지역).
-- posts.dong(단일=대표지역)은 유지, dongs(배열)로 여러 동네 태그. null/빈배열 = 춘천 전체.
-- 적용: Supabase SQL Editor Run. (미적용이어도 submitPost가 dong 단일로 graceful 저장)
alter table public.posts add column if not exists dongs text[];
create index if not exists posts_dongs_idx on public.posts using gin (dongs);
