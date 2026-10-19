-- 미디어 계정이 빼거나 바꾼 사진 정리 (I-043) — '자기가 올렸고 어느 글도 쓰지 않는' 사진만 지울 수 있다.
-- 그전에는 미디어에게 Storage 지우기 권한이 없어, 사진을 빼거나 글을 지워도 옛 파일이 공개 주소로 계속 열렸다.
-- 공개된 글이 쓰는 사진은 (자기가 올렸어도) 지울 수 없다 — 글에서 먼저 빼야 한다. 앱은 DB 저장이 끝난 뒤 지운다.
-- 다시 실행해도 된다.

-- 이 Storage 파일(media 버킷 안 경로)을 구단소식/포스팅 글이 쓰고 있는지 — 미디어가 못 보는 글까지 봐야 해서 security definer
create or replace function public.media_file_in_use(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with s as (select '/storage/v1/object/public/media/' || object_name as suffix)
  select exists (
      select 1 from public.news_posts n, s
      where right(n.thumbnail_url, length(s.suffix)) = s.suffix
         or exists (select 1 from unnest(n.images) i where right(i, length(s.suffix)) = s.suffix)
    )
    or exists (
      select 1 from public.postings p, s
      where right(p.thumbnail_url, length(s.suffix)) = s.suffix
    );
$$;

revoke all on function public.media_file_in_use(text) from public;
grant execute on function public.media_file_in_use(text) to authenticated;

-- 지우기는 조회 권한도 필요하다 (Storage 가 지운 행을 돌려받는다) — 자기가 올린 news/·postings/ 파일만
drop policy if exists "media: 미디어 자기 사진 조회" on storage.objects;
create policy "media: 미디어 자기 사진 조회" on storage.objects for select to authenticated
  using (
    bucket_id = 'media' and public.is_media() and owner_id = (select auth.uid())::text
    and (name like 'news/%' or name like 'postings/%')
  );

drop policy if exists "media: 미디어 안 쓰는 자기 사진 삭제" on storage.objects;
create policy "media: 미디어 안 쓰는 자기 사진 삭제" on storage.objects for delete to authenticated
  using (
    bucket_id = 'media' and public.is_media() and owner_id = (select auth.uid())::text
    and (name like 'news/%' or name like 'postings/%')
    and not public.media_file_in_use(name)
  );
