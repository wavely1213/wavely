-- 미디어 계정이 빼거나 바꾼 사진 정리 (I-043) — '자기가 올렸고 어느 글도 쓰지 않는' 사진만 지울 수 있다.
-- 그전에는 미디어에게 Storage 지우기 권한이 없어, 사진을 빼거나 글을 지워도 옛 파일이 공개 주소로 계속 열렸다.
-- 글이 쓰는 사진은 (자기가 올렸어도) 지울 수 없다 — 글에서 먼저 빼야 한다. 앱은 DB 저장이 끝난 뒤 지운다.
-- 우회 막기: 미디어가 글에 넣는 사진 주소는 이 사이트 Storage 의 정해진 모양만 (주소 끝에 ?·#·% 를 붙여 '사용 중' 검사를 피하지 못하게),
-- 미디어가 올리는 파일 이름도 앱이 만드는 모양(news|postings/uuid.확장자)만.
-- 다시 실행해도 된다.

-- 미디어가 글에 넣을 수 있는 사진 주소 — 이 사이트 media 버킷의 news/·postings/ 파일 공개 주소 그대로 (null 은 사진 없음)
create or replace function public.media_image_url_ok(url text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select url is null
      or url ~ '^https://[^/?#%]+/storage/v1/object/public/media/(news|postings)/[0-9a-f-]{36}\.(jpg|png|webp|gif)$';
$$;

-- 이 Storage 파일(media 버킷 안 경로)을 구단소식/포스팅 글이 쓰고 있는지 — 미디어가 못 보는 글까지 봐야 해서 security definer.
-- 주소 안에 경로가 들어 있으면 '사용 중' (뒤에 무엇이 붙어도). 관리자 화면 계정이 아니면 늘 '사용 중'(닫힌 쪽)
create or replace function public.media_file_in_use(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with s as (select '/storage/v1/object/public/media/' || object_name as part)
  select not public.is_staff()
    or exists (
      select 1 from public.news_posts n, s
      where strpos(n.thumbnail_url, s.part) > 0
         or exists (select 1 from unnest(n.images) i where strpos(i, s.part) > 0)
    )
    or exists (
      select 1 from public.postings p, s
      where strpos(p.thumbnail_url, s.part) > 0
    );
$$;

revoke all on function public.media_file_in_use(text) from public;
revoke execute on function public.media_file_in_use(text) from anon;
grant execute on function public.media_file_in_use(text) to authenticated;

-- 미디어 업로드: 앱이 만드는 이름 모양만 (news|postings/uuid.확장자)
alter policy "media: 미디어 업로드" on storage.objects
  with check (
    bucket_id = 'media' and public.is_media()
    and name ~ '^(news|postings)/[0-9a-f-]{36}\.(jpg|png|webp|gif)$'
  );

-- 지우기는 조회 권한도 필요하다 (Storage 가 지운 행을 돌려받는다) — 자기가 올린 news/·postings/ 파일만
drop policy if exists "media: 미디어 자기 사진 조회" on storage.objects;
create policy "media: 미디어 자기 사진 조회" on storage.objects for select to authenticated
  using (
    bucket_id = 'media' and public.is_media() and owner_id = (select auth.uid())::text
    and name ~ '^(news|postings)/'
  );

drop policy if exists "media: 미디어 안 쓰는 자기 사진 삭제" on storage.objects;
create policy "media: 미디어 안 쓰는 자기 사진 삭제" on storage.objects for delete to authenticated
  using (
    bucket_id = 'media' and public.is_media() and owner_id = (select auth.uid())::text
    and name ~ '^(news|postings)/'
    and not public.media_file_in_use(name)
  );

-- 미디어 글 규칙에 사진 주소 검사를 더한다 (새로 넣거나 바꾼 주소만 — 최고 관리자가 넣어 둔 주소는 그대로 둘 수 있다)
create or replace function public.news_media_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_media() then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.published and not public.media_can('edit_published') then
    raise exception '미디어 계정은 공개된 글을 고칠 수 없습니다' using errcode = '42501';
  end if;
  if new.published and (tg_op = 'INSERT' or not old.published) and not public.media_can('publish') then
    raise exception '미디어 계정은 글을 공개할 수 없습니다 (검토 후 공개)' using errcode = '42501';
  end if;
  if new.featured and (tg_op = 'INSERT' or not old.featured) and not public.media_can('feature') then
    raise exception '미디어 계정은 메인 배너 고정을 켤 수 없습니다' using errcode = '42501';
  end if;
  if ((tg_op = 'INSERT' or new.thumbnail_url is distinct from old.thumbnail_url) and not public.media_image_url_ok(new.thumbnail_url))
     or exists (
       select 1 from unnest(new.images) i
       where not public.media_image_url_ok(i) and (tg_op = 'INSERT' or not (i = any (coalesce(old.images, '{}'))))
     ) then
    raise exception '미디어 계정은 이 사이트에 올린 사진만 쓸 수 있습니다' using errcode = '42501';
  end if;
  if not public.media_can('set_date') then
    if tg_op = 'INSERT' then
      new.date := to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM-DD');
    else
      new.date := old.date;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.postings_media_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_media() then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.published and not public.media_can('edit_published') then
    raise exception '미디어 계정은 공개된 글을 고칠 수 없습니다' using errcode = '42501';
  end if;
  if new.published and (tg_op = 'INSERT' or not old.published) and not public.media_can('publish') then
    raise exception '미디어 계정은 글을 공개할 수 없습니다 (검토 후 공개)' using errcode = '42501';
  end if;
  if (tg_op = 'INSERT' or new.thumbnail_url is distinct from old.thumbnail_url) and not public.media_image_url_ok(new.thumbnail_url) then
    raise exception '미디어 계정은 이 사이트에 올린 사진만 쓸 수 있습니다' using errcode = '42501';
  end if;
  return new;
end;
$$;
