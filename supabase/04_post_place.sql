-- ============================================================
--  글에 장소(네이버 지역검색) 첨부용 칸 추가
--  Supabase > SQL Editor 에 붙여넣고 RUN 하세요.
-- ============================================================
alter table public.posts
  add column if not exists place_name    text,
  add column if not exists place_address text,
  add column if not exists place_link    text;
