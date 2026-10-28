-- 관리자 등급 보완 (D-057 검토) — 미디어 계정은 '자기가 올린 글'만 보고/고치고/지운다.
-- 그전에는 미디어가 최고 관리자/관리자의 비공개 초안을 고칠 수 있었고, 올린 사람(created_by)이 그대로라
-- '검토 대기'에 잡히지 않아 검토 없이 공개될 수 있었다. 또 created_by 를 직접 바꿔 검토 대기에서 뺄 수 있었다.
-- 수정 정책의 with check 에도 같은 조건을 넣어 미디어는 created_by 를 남의 이메일로 바꿀 수 없다.
-- 다시 실행해도 된다 (정책은 alter, 함수는 create or replace).

-- 올린 사람 이메일은 소문자로 저장 (비교를 단순하게)
create or replace function public.set_created_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_by := coalesce(lower(auth.jwt() ->> 'email'), new.created_by);
  return new;
end;
$$;

-- 지금 사용자가 올린 글인지 (미디어 정책용)
create or replace function public.is_own_post(created_by text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select created_by is not null and lower(created_by) = lower(auth.jwt() ->> 'email');
$$;

revoke all on function public.is_own_post(text) from public;
grant execute on function public.is_own_post(text) to anon, authenticated;

-- 구단소식
alter policy "news_posts: 공개 글 조회" on public.news_posts
  using (published or public.is_admin() or (public.is_media() and public.is_own_post(created_by)));
alter policy "news_posts: 미디어 수정" on public.news_posts
  using (public.is_media() and public.is_own_post(created_by))
  with check (public.is_media() and public.is_own_post(created_by));
alter policy "news_posts: 미디어 삭제" on public.news_posts
  using (public.is_media() and public.is_own_post(created_by) and (not published or public.media_can('edit_published')));

-- 포스팅
alter policy "postings: 공개 글 조회" on public.postings
  using (published or public.is_admin() or (public.is_media() and public.is_own_post(created_by)));
alter policy "postings: 미디어 수정" on public.postings
  using (public.is_media() and public.is_own_post(created_by))
  with check (public.is_media() and public.is_own_post(created_by));
alter policy "postings: 미디어 삭제" on public.postings
  using (public.is_media() and public.is_own_post(created_by) and (not published or public.media_can('edit_published')));
