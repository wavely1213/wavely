-- ============================================================
--  글 사진 업로드 설정
--  Supabase > SQL Editor 에 붙여넣고 RUN 하세요.
-- ============================================================

-- 1) 글에 사진 주소 칸 추가
alter table public.posts add column if not exists image_url text;

-- 2) 사진 저장 공간(버킷) 만들기 — 공개 읽기
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

-- 3) 권한: 로그인한 사람은 업로드 / 누구나 보기
drop policy if exists "post_images_upload" on storage.objects;
create policy "post_images_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-images');

drop policy if exists "post_images_read" on storage.objects;
create policy "post_images_read" on storage.objects
  for select using (bucket_id = 'post-images');
